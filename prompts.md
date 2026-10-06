# Prompts

## Prompt 1

**Modelo:** Opus 5.5 (Claude Code)
**Herramienta:** Claude Code v2.1.292

```
Estoy en el repo FlowSync (~/proyectos/flowsync-ai4devs-202609-seniors-2), rama s4/start.

TAREA: construir una matriz de trazabilidad para UN SOLO requisito de la spec viva.

REQUISITO A ANALIZAR:
El que se llama "Lo que cada tarea muestra de su responsable" en openspec/specs/tasks/spec.md

PASOS:
1. Leé ese requisito completo en la spec (sus scenarios, sus WHEN/THEN).
2. Buscá TODOS los tests existentes en backend/tests/functional/ (auth/ y cualquier otra carpeta que exista). Leé cada archivo de test y entendé qué afirma cada uno.
3. Para cada scenario del requisito, buscá si hay un test que REALMENTE verifique lo que el scenario pide. No te guíes por el nombre del test — abrí el test y leé qué assertions hace.
4. Armá la matriz en el formato exacto de abajo.
5. Guardala en docs/verificacion/PC.md (creá la carpeta si no existe).

FORMATO DE LA MATRIZ (no negociable):

Arriba de la tabla poné:
> Scenarios en el requisito: X — Cubiertos: ___

(X lo sabés al leer la spec. El segundo número lo completás al terminar de analizar.)

La tabla:
| Scenario | Test que lo cubre | Estado | Qué te faltó |
|---|---|---|---|
| (en una línea: qué se espera y en qué situación) | (nombre exacto del test en la suite, o vacío si no hay) | Cubierto / No cubierto / No lo sé | (si "no lo sé": qué te faltó para decidirlo) |

REGLAS:
- El nombre de un test NO es prueba de cobertura. Tenés que abrir el test y leer sus assertions.
- Si un test existe pero no verifica exactamente lo que el scenario pide, es "No cubierto".
- Si dudás, poné "No lo sé" y explicá qué te faltó en la última columna.

SOLO escribí el archivo docs/verificacion/PC.md con la matriz. NO hagas commit. NO abras PR. NO escribas tests. NO modifiques ningún otro archivo. Mostrámelo cuando termines.
```

**Qué salió:** Funcionó a la primera. Identificó correctamente 3 scenarios, todos "No cubierto". Explicó por qué los tests de auth que se parecen no cuentan. 31 segundos.

---

## Prompt 2

**Modelo:** Opus 5.5 (Claude Code)
**Herramienta:** Claude Code v2.1.292

```
Seguimos en el repo FlowSync (~/proyectos/flowsync-ai4devs-202609-seniors-2), rama s4/start.

Acabás de crear la matriz de trazabilidad en docs/verificacion/PC.md. Ahora hay que escribir los tests que faltan.

TAREA: por cada scenario que quedó como "No cubierto" en la matriz, escribí UN test.

PASOS:
1. Releé docs/verificacion/PC.md para ver qué scenarios están "No cubierto".
2. Leé los tests existentes en backend/tests/functional/auth/ para entender el estilo del proyecto (cómo importan, cómo crean usuarios, cómo hacen assertions).
3. Escribí los tests nuevos en backend/tests/functional/tasks/ (creá la carpeta si no existe). Un archivo para este requisito, con un test por scenario faltante.
4. Ejecutá los tests con: cd backend && npm test
5. Si algún test queda en ROJO, dejalo en rojo. NO modifiques código fuera de backend/tests/. NO arregles la app para que pase.

REGLAS:
- Solo tocá archivos dentro de backend/tests/
- Seguí el estilo de los tests de auth (misma estructura, mismos helpers)
- Si un test falla, reportá qué falló y por qué, pero NO lo arregles
- Actualizá la matriz en docs/verificacion/PC.md con los tests que escribiste (columna "Test que lo cubre" y "Estado")

SOLO escribí los tests y actualizá la matriz. NO hagas commit. NO abras PR. Mostrámelo cuando termines.
```

**Qué salió:** Creó `backend/tests/functional/tasks/assignee.spec.ts` con 3 tests (uno por scenario). Resultado: 22 passed, 1 failed. El test "no expone el email" falla porque `TaskTransformer` usa `UserTransformer` que incluye email en la lista. La tarea suelta sí cumple (usa `TaskAssigneeTransformer`). Bug real encontrado, test dejado en rojo. ~2 minutos.

---

## Prompt 3 — Revisión adversarial

**Modelo:** Claude Opus 4.6 (subagente Cursor, read-only)
**Herramienta:** Cursor (subagente generalPurpose)

```
Sos un REVISOR ADVERSARIAL. Tu único objetivo es DEMOSTRAR que el código está mal.

REPO: c:\Users\caste\proyectos\ai4devs\flowsync-ai4devs-202609-seniors-2
RAMA: trazabilidad-PC (basada en s4/start)

TAREA:
Contrastá el código del backend contra los scenarios del requisito "Lo que cada tarea
muestra de su responsable" en openspec/specs/tasks/spec.md.

Los 3 scenarios son:
1. Responsable identificable: el assignee trae nombre e iniciales
2. La tarea no filtra datos de cuenta: el assignee NO incluye email ni datos de acceso
3. Responsable sin nombre: nombre nulo pero iniciales sí llegan

PASOS:
1. Leé el requisito completo en openspec/specs/tasks/spec.md
2. Leé TODOS los archivos relevantes del backend (controllers, transformers, models)
3. Buscá DESVIACIONES de la spec
4. Buscá EDGE CASES no cubiertos
5. Buscá FUGAS de datos sensibles
6. Buscá supuestos FRÁGILES

Para cada hallazgo devolvé: Severidad, Archivo y línea exacta, Qué dice la spec vs
qué hace el código, Evidencia concreta.

SOS READ-ONLY. No modifiques NADA. Solo encontrá los problemas.
```

**Qué salió:** Encontró 6 hallazgos. 2 críticos: (1) fuga de email en 3 endpoints por usar `UserTransformer` — coincide con el test en rojo, (2) `isOverdueOn()` no excluye tareas `done` — bug nuevo fuera de este requisito. 1 alto: fechas de cuenta expuestas en el assignee. 3 medio/bajo: iniciales derivadas del email, test contradice código, iniciales con nombres largos.
