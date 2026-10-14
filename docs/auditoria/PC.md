# Auditoría de las reglas de proceso — PC

Se contrastan las 5 reglas de la sección «Reglas de proceso» de `CLAUDE.md` contra los últimos 15 commits de `s5/start` (`b955a72..eff1686`) y contra mis PRs #15, #26, #49 y #71 en `LIDR-academy/flowsync-ai4devs-202609-seniors-2`.

### Expectativa previa (antes de revisar el historial)

| # | Regla | Creía |
|---|---|---|
| 1 | Rama por unidad de trabajo | Sí se cumple |
| 2 | Commit por petición con `/commit` | Sí se cumple |
| 3 | OpenAPI + README al día en cambios de rutas/controllers | Ni idea |
| 4 | PR + adversarial solo al final | No se cumple |
| 5 | Solo URL al abrir PR | No se cumple |

### Tabla de auditoría

| Qué pide la regla | Qué se revisó | Veredicto | Evidencia | Qué harías con ella |
|---|---|---|---|---|
| 1. Una rama `feat/<slug>` por unidad de trabajo; nunca commitear directo en `main` ni en `sN/*`. | `git log --graph --oneline --decorate -25 --all`; `git branch -a --contains <hash>` de los 15 commits; ramas de los PRs | no se cumple | Los 14 commits `4427afc..eff1686` solo están en `s5/start`/`upstream/s4/end`, en línea recta y sin merges. No hay ninguna rama `feat/*`. Mis ramas (`harness-PC`, `alcance-PC`, `spec-viva-PC`, `trazabilidad-PC`) tampoco siguen `feat/<slug>`. | Convertirla en comprobación automática: un hook `pre-commit` que rechace commits en `main`/`sN/*` y un check de CI sobre el nombre de la rama. |
| 2. Un commit por petición, hecho con la skill `/commit` (conventional commits). | `git log -15 --format='%h \| %s'`; `git log` de mis 4 ramas; `.claude/skills/commit/SKILL.md`; 7 transcripciones de `~/.claude/projects/<este repo>/` (2026-09-18 → 2026-10-14) | no se cumple | De mis 5 commits, ninguno sale de `/commit`. La skill se invocó una sola vez (sesión `02ea2236`, 2026-09-30 01:13Z) y generó `docs(spec-viva): …`, pero ese commit no sobrevivió: la rama quedó en `5fa1f54` «spec viva: cuentas y acceso + prompts», hecho a las 01:44Z sin ningún `git commit` en las transcripciones. Los otros 4 tampoco aparecen en ninguna sesión, y ninguno de los 5 es convencional. | Convertirla en comprobación automática: `commitlint` en un hook `commit-msg` y en CI. Borrar la exigencia de usar `/commit`, porque no deja rastro en el repo. | Convertirla en comprobación automática: `commitlint` en un hook `commit-msg` y en CI. Borrar la exigencia de usar `/commit`, porque no se puede comprobar. |
| 3. Si se tocan rutas, controladores, validadores o transformers, el mismo commit actualiza `.adonisjs/` (OpenAPI) y `docs/capabilities/<nombre>/README.md`. | `git show --stat` de `cbe9617`, `ea5db1f` y `4e03d1f` (los únicos de los 15 que tocan esas capas) | se cumple | El único commit posterior a la regla (`160fbc7`) que la activa, `cbe9617`, toca 3 controladores y `docs/capabilities/tasks/README.md` en el mismo commit; no cambia rutas, así que no hay diff de `.adonisjs/`. Los anteriores no la cumplen: `4e03d1f` toca un transformer sin README y `ea5db1f`, `start/routes.ts` sin README. | Convertirla en comprobación automática: un CI que regenere `.adonisjs/` (`git diff --exit-code`) y falle si el diff toca `app/{controllers,validators,transformers}` o `start/routes.ts` sin tocar `docs/capabilities/`. |
| 4. Al terminar la unidad, una sola vez: `gh pr create` con una descripción completa y, como último paso, el subagente `adversarial-reviewer`. | `gh pr view <n> --json body,comments,reviews` de #71, #49, #26 y #15; `git log --all -i --grep=adversari` | no se cumple | Los cuerpos tienen 36, 98, 103 y 406 caracteres (#71: «Ejercicio S4: Matriz de trazabilidad»). Los únicos comentarios son de CodeRabbit (con «Review skipped») y del revisor del curso (`LIDR-AI4Devs`). Ningún PR deja rastro del `adversarial-reviewer`. | Dejarla, convirtiendo parte en comprobación automática: una plantilla de PR con secciones obligatorias y un check de CI que exija un comentario con la salida del `adversarial-reviewer`. |
| 5. Al abrir el PR, en el chat se responde solo con la URL, sin repetir el resumen. | Repo completo (commits, PRs); llamadas a `gh pr create` en las 7 transcripciones de `~/.claude/projects/<este repo>/` y la respuesta siguiente del agente | no se cumple | Solo una sesión abre un PR (`02ea2236`, rama `spec-viva-PC`, con la regla vigente en `s3/start:CLAUDE.md:133`). La primera respuesta tras abrirlo tiene 292 caracteres: explica que el adversarial sigue corriendo y por qué la base es `s3/start`, y después da la URL. Solo el cierre (01:15:46Z) es la URL sola. | Borrarla como regla de proceso. Es una preferencia de interacción que solo se ve en transcripciones locales; si interesa, va a la memoria del usuario. |

## Notas

- **Regla 1:** los 15 commits revisados son de la rama de partida del curso: `upstream/s4/end` contiene exactamente los mismos commits, así que no son trabajo mío. Aun así, la regla tal como está escrita no se cumple en el historial.
- **Regla 3:** `4e03d1f` y `ea5db1f` son anteriores a `160fbc7`, el commit que introdujo la regla, así que no cuentan como incumplimiento. Que `cbe9617` no tenga diff de `.adonisjs/` es coherente con que no toque rutas, pero sin regenerar no se puede descartar que el diff fuera necesario.
- **Regla 4:** el texto actual es de `0e56705` (2026-08-20), pero la exigencia de PR + `adversarial-reviewer` ya estaba desde `8f871d3` (2026-07-25). Mis PRs tienen como base las ramas `sN/start`, no `main`. Las transcripciones muestran que el `adversarial-reviewer` sí corrió una vez (sesión `02ea2236`, 2 invocaciones), pero sobre `pcastelo/flowsync-ai4devs-202609-seniors-2#1`, un PR del fork hoy cerrado, no sobre #49. El veredicto de la fila se mantiene porque los PRs del curso no dejan rastro.
- **Reglas 2 y 5 (alcance de la segunda pasada):**
  - Las transcripciones solo cubren mis sesiones en esta máquina. Los 15 commits de `s5/start` son del equipo del curso, así que no se puede saber si usaron `/commit`; para eso harían falta sus transcripciones o una marca que la skill deje en el commit (por ejemplo, un trailer).
  - La muestra de la regla 5 es una sola apertura de PR, porque #15, #26, #49 y #71 no se abrieron desde Claude Code.
  - Claude Code borra las transcripciones al cabo de `cleanupPeriodDays` (30 días por defecto), así que sesiones más antiguas pueden no estar.
  - Se excluyó la sesión de esta auditoría (`df74c2f1`).

---

## Parte B — Las tres líneas

1. **La regla en la que más me equivoqué: la regla 2 (commit con `/commit`).** Creía que se cumplía porque los mensajes de los commits del curso seguían conventional commits. Pero la auditoría reveló que mis propios 5 commits no son convencionales, la skill `/commit` se usó una sola vez y ese commit ni siquiera sobrevivió. La apariencia de cumplimiento era de los commits del instructor, no de los míos.
2. **La regla que no se puede comprobar: la regla 2 (uso de la skill `/commit`).** El formato del mensaje se puede validar con un hook, pero saber si se usó la skill es imposible desde git porque no deja rastro. Para verificarla habría que: (a) que la skill deje un trailer en el commit (ej. `Skill: /commit`), o (b) aceptar que lo comprobable es el formato y no el mecanismo, y reescribir la regla como "commit con formato conventional commits" sin mencionar la skill.
3. **La regla que eliminaría: la regla 5 (solo URL al abrir PR).** Es una preferencia de interacción del chat que no deja evidencia en el repositorio. No se puede auditar, no se puede automatizar, y su incumplimiento no tiene impacto en el código ni en el equipo. La única forma de verificarla es revisar transcripciones locales de Claude Code, que se borran a los 30 días. Si interesa, va a la memoria del usuario, no a las reglas del proyecto.
