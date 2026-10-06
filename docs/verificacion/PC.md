# Matriz de trazabilidad — «Lo que cada tarea muestra de su responsable»

Requisito: `openspec/specs/tasks/spec.md` → *Requirement: Lo que cada tarea muestra de su responsable*.
Tests: `backend/tests/functional/tasks/assignee.spec.ts` (grupo `Tasks | responsable`). Cada test pide la tarea de las dos maneras en que se puede obtener: suelta (`GET /api/v1/tasks/:id?today=…`) y dentro de la lista (`GET /api/v1/tasks`).

> Scenarios en el requisito: 3 — Cubiertos: 3 (1 de ellos con el test en ROJO: la app incumple el scenario)

| Scenario | Test que lo cubre | Estado | Qué te faltó |
|---|---|---|---|
| Al obtener una tarea cuyo responsable se llama "Ada Lovelace", su `assignee` trae el nombre "Ada Lovelace" y sus iniciales | `Tasks \| responsable / el responsable llega con su nombre y sus iniciales` | Cubierto — 🟢 pasa | |
| Al obtener cualquier tarea (suelta o en la lista), su `assignee` no incluye el email ni ningún otro dato de acceso de la cuenta | `Tasks \| responsable / el responsable de una tarea no expone el email ni datos de acceso` | Cubierto — 🔴 falla | |
| Si el responsable se registró sin nombre, el `assignee` de la tarea trae nombre nulo y las iniciales siguen llegando | `Tasks \| responsable / un responsable sin nombre llega con nombre nulo y con iniciales` | Cubierto — 🟢 pasa | |

Ejecución (`cd backend && npm test`): **22 passed, 1 failed (23)**.

## Qué afirma cada test

- **Nombre e iniciales**: en la tarea suelta y en la lista, `assignee.fullName === 'Ada Lovelace'` y `assignee.initials === 'AL'`.
- **Sin datos de cuenta**: en la tarea suelta y en la lista, `assignee` no tiene las propiedades `email` ni `password`, y su JSON no contiene el email (`ada@example.com`), la contraseña ni el token de la sesión.
- **Sin nombre**: en la tarea suelta y en la lista, `assignee` tiene la propiedad `fullName` con valor `null` y `initials === 'SE'` (derivadas de `sin-nombre@example.com`, según el requisito de iniciales de `auth`).

## El test en rojo

```
Tasks | responsable / el responsable de una tarea no expone el email ni datos de acceso
AssertionError: en la lista: expected { id: 1, …(5) } to not have nested property 'email'
```

La tarea suelta cumple. **La lista no.** `TasksController.index` serializa con `TaskTransformer`, que construye el `assignee` con `UserTransformer` (`id, fullName, email, createdAt, updatedAt, initials`). La tarea suelta usa `TaskDetailTransformer` → `TaskAssigneeTransformer` (`id, fullName, initials`), que sí respeta el requisito. Lo mismo pasa en la respuesta de `POST /tasks` y `PATCH /tasks/:id/status`, que también usan `TaskTransformer`, aunque estos tests no las ejercitan. No se arregló: el test se deja en rojo a propósito.

---

## Parte B — Las tres líneas

1. **Creía 1 de 3 cubierto, estaban 0.** No había ni un solo test de tasks — todos los tests existentes eran de auth. La suite entera (20 tests en verde) no toca ni una ruta de tareas.
2. **El scenario "la tarea no filtra datos de cuenta"** me hizo dudar: la spec dice que el assignee no debe exponer email "en cualquier tarea, suelta o dentro de la lista". ¿Faltaba un test o faltaba la regla en el código? Resultó que la regla sí está en la spec pero el código la cumple solo a medias — la tarea suelta cumple (usa TaskAssigneeTransformer) y la lista no (usa UserTransformer que incluye email).
3. **Tuve que decidir qué iniciales esperar para una cuenta sin nombre.** El scenario dice "sus iniciales siguen llegando" pero no dice cuáles. Elegí `sin-nombre@example.com` como email de prueba, lo que da iniciales "SE" según la lógica de auth (primeras letras del email antes y después del @). El scenario no determina ese valor.

---

## Revisión adversarial

Se corrió un subagente adversarial (read-only, contexto limpio) contrastando el código contra los 3 scenarios del requisito. Herramienta: Cursor (subagente generalPurpose). El subagente solo podía leer código — no podía modificar nada.

### Hallazgos

| # | Severidad | Hallazgo | Archivo | Detalle |
|---|---|---|---|---|
| 1 | 🔴 CRÍTICO | Fuga de email en 3 endpoints | `backend/app/transformers/task_transformer.ts` | `TaskTransformer` usa `UserTransformer` (que expone `email`, `createdAt`, `updatedAt`) en la lista, creación y cambio de estado. Solo la tarea suelta usa `TaskAssigneeTransformer` correctamente. Coincide con el test en rojo de A.2. |
| 2 | 🔴 CRÍTICO | `isOverdueOn()` no excluye tareas `done` | `backend/app/models/task.ts` | La spec dice que una tarea hecha NO está vencida aunque su fecha haya pasado. El método calcula vencimiento sin verificar el estado. |
| 3 | 🟡 ALTO | Fechas de cuenta expuestas en el assignee | `backend/app/transformers/user_transformer.ts` | `UserTransformer` expone `createdAt` y `updatedAt` del usuario en el assignee. La spec dice que solo debe mostrar nombre e iniciales. |
| 4 | 🔵 MEDIO | Iniciales derivadas del email pueden confundir | `backend/app/models/user.ts` | El cálculo de iniciales sin nombre toma letras del email antes y después del `@`. No es un bug pero podría dar resultados confusos. |
| 5 | 🔵 MEDIO | Test existente contradice el código | `backend/tests/functional/tasks/assignee.spec.ts` | El test de "no expone email" verifica tanto la tarea suelta como la lista, y la lista falla. Esto es correcto: el test detecta el bug. |
| 6 | ⚪ BAJO | Iniciales con nombres de 3+ palabras | `backend/app/models/user.ts` | El getter de `initials` toma la primera letra de las dos primeras palabras. Con "Ana María López" da "AM", no "AL". No viola la spec pero puede sorprender. |

### Conclusión

El hallazgo #1 ya lo habíamos atrapado con el test en rojo de la trazabilidad. El #2 (`isOverdueOn`) es un bug nuevo fuera del alcance de este requisito (pertenece al requisito "Cuándo una tarea está vencida"). El #3 confirma que el `UserTransformer` expone más datos de los que la spec permite.
