import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea muestra de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: responsable identificable, la tarea no filtra
 * datos de cuenta, y el responsable sin nombre.
 *
 * Cada scenario se comprueba en las dos lecturas que devuelven tareas —la tarea
 * suelta y la lista—, porque las sirven transformers distintos y el requisito
 * vale para las dos.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const hoy = '2026-10-06'

  async function sesion(client: any, fullName: string | null, email: string) {
    const user = await User.create({ fullName, email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return { user, token: response.body().data.token as string }
  }

  async function lecturas(client: any, token: string, task: Task) {
    const suelta = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today: hoy })
      .header('Authorization', `Bearer ${token}`)
    suelta.assertStatus(200)

    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)
    lista.assertStatus(200)

    const enLista = lista.body().data.find((t: { id: number }) => t.id === task.id)

    return { suelta: suelta.body().data.assignee, enLista: enLista.assignee }
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const { user, token } = await sesion(client, 'Ada Lovelace', 'ada@example.com')
    const task = await Task.create({ title: 'Escribir el algoritmo', assigneeId: user.id })

    const { suelta, enLista } = await lecturas(client, token, task)

    for (const assignee of [suelta, enLista]) {
      assert.equal(assignee.fullName, 'Ada Lovelace')
      assert.equal(assignee.initials, 'AL')
    }
  })

  test('el responsable de una tarea no expone el email ni datos de acceso', async ({
    client,
    assert,
  }) => {
    const { user, token } = await sesion(client, 'Ada Lovelace', 'ada@example.com')
    const task = await Task.create({ title: 'Escribir el algoritmo', assigneeId: user.id })

    const { suelta, enLista } = await lecturas(client, token, task)

    for (const [donde, assignee] of [
      ['tarea suelta', suelta],
      ['lista', enLista],
    ]) {
      assert.notProperty(assignee, 'email', `en la ${donde}`)
      assert.notProperty(assignee, 'password', `en la ${donde}`)

      const serialized = JSON.stringify(assignee)
      assert.notInclude(serialized, 'ada@example.com', `en la ${donde}`)
      assert.notInclude(serialized, 'secreto123', `en la ${donde}`)
      assert.notInclude(serialized, token, `en la ${donde}`)
    }
  })

  test('un responsable sin nombre llega con nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const { user, token } = await sesion(client, null, 'sin-nombre@example.com')
    const task = await Task.create({ title: 'Escribir el algoritmo', assigneeId: user.id })

    const { suelta, enLista } = await lecturas(client, token, task)

    for (const assignee of [suelta, enLista]) {
      assert.property(assignee, 'fullName')
      assert.isNull(assignee.fullName)
      assert.equal(assignee.initials, 'SE')
    }
  })
})
