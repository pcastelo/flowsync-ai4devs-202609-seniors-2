# Prompts

## Prompt 1 — Exploración de reglas e historial

**Modelo:** Opus 5.5
**Herramienta:** Claude Code v2.1.296

```
Estoy en el repo FlowSync, rama s5/start.

Necesito auditar las reglas de proceso del proyecto. Hacé lo siguiente SIN MODIFICAR ningún archivo:

1. Leé la sección "Reglas de proceso" de CLAUDE.md y listá cada regla numerada con un resumen de una línea.
2. Ejecutá git log --oneline -15 y mostrámelo.
3. Ejecutá git log -15 --format='%h | %s' para ver los mensajes de commit.
4. Fijate desde cuándo existe cada regla: git log -S"Reglas de proceso" -- CLAUDE.md
5. Listá qué hay en .claude/agents/ y .claude/skills/
6. Listá mis propios PRs en el repo del curso: gh pr list --repo LIDR-academy/flowsync-ai4devs-202609-seniors-2 --author pcastelo --state all
7. Fijate qué ramas tengo: git branch -a

Mostrá todo. NO modifiques ningún archivo.
```

**Qué salió:** Listó las 5 reglas, los 15 commits, las skills de openspec, el adversarial-reviewer, mis 4 PRs (#15, #26, #49, #71) y todas las ramas. Funcionó a la primera.

---

## Prompt 2 — Auditoría: tabla de veredictos

**Modelo:** Opus 5.5
**Herramienta:** Claude Code v2.1.296

```
Seguimos en FlowSync, rama s5/start. Ahora construí la tabla de auditoría.

Para cada una de las 5 reglas de proceso de CLAUDE.md, contrastá contra los últimos 15 commits Y contra mis PRs anteriores (#71, #49, #26, #15).

Investigá con evidencia:
- Regla 1 (rama por unidad de trabajo): git branch -a --contains <hash>, git log --graph --oneline --decorate -25 --all. ¿Los commits están en ramas feat/* o directos en sN/*?
- Regla 2 (commit con /commit): git log -15 --format='%h | %s'. ¿Siguen conventional commits? ¿Se puede saber si usaron la skill?
- Regla 3 (OpenAPI + README al día): git show --stat <hash> de cada commit que toque controllers/validators/transformers. ¿En el MISMO commit hay .adonisjs/ y docs/capabilities/?
- Regla 4 (PR + adversarial al final): gh pr view <num> --repo LIDR-academy/flowsync-ai4devs-202609-seniors-2 --json body,comments para cada uno de mis PRs. ¿Tienen descripción completa? ¿Hay evidencia del adversarial?
- Regla 5 (solo URL al abrir PR): ¿hay rastro en el repo? Si no, decilo.

Guardá en docs/auditoria/PC.md (creá la carpeta). Formato: una fila por regla, 5 columnas:

| Qué pide la regla | Qué se revisó | Veredicto | Evidencia | Qué harías con ella |
|---|---|---|---|---|
| (una frase) | (comando o archivo) | se cumple / no se cumple / no se puede comprobar | (una línea concreta) | Dejarla / borrarla / convertirla en comprobación automática |

SOLO escribí docs/auditoria/PC.md. NO hagas commit. NO abras PR.
```

**Qué salió:** Construyó la tabla con los 5 veredictos. Usó gh pr view para verificar los PRs. Regla 1 "no se cumple", regla 3 "se cumple", regla 4 "no se cumple" (PRs con cuerpo corto, sin adversarial), reglas 2 y 5 "no se puede comprobar". ~67 segundos.

---

## Prompt 3 — Refutación: segunda pasada con transcripciones

**Modelo:** Opus 5.5
**Herramienta:** Claude Code v2.1.296

```
Seguimos en FlowSync. Revisá la tabla de docs/auditoria/PC.md.

Para cada veredicto "no se puede comprobar", intentá una segunda pasada:
- Regla 2: buscá transcripciones de sesión de Claude en ~/.claude/projects/ y fijate si hay invocaciones de la skill /commit.
- Regla 5: igual, buscá en transcripciones si hay alguna ejecución de gh pr create y qué respondió el agente después.

Si con la evidencia nueva podés cambiar algún veredicto, actualizá la fila en docs/auditoria/PC.md. Si no, dejalo y explicá qué faltaría para comprobarlo.

NO hagas commit. NO abras PR.
```

**Qué salió:** Revisó las 7 transcripciones de sesión. Cambió ambos veredictos a "no se cumple". Regla 2: la skill /commit se usó una sola vez y el commit no sobrevivió; mis 5 commits no son convencionales. Regla 5: la única vez que se abrió un PR desde Claude, la respuesta fue de 292 caracteres antes de dar la URL. Bonus: encontró que el adversarial-reviewer sí corrió una vez pero sobre un PR del fork, no sobre los del curso. ~95 segundos.
