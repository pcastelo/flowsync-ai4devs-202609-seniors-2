# Prompts

---

## Prompt 1 — Exploración

**Modelo:** Opus 5.5 · Claude Pro
**Herramienta:** Claude Code v2.1.280

```
Necesito entender qué tiene FlowSync hoy en el vertical de cuentas y acceso. Explorá el código de ambas capas sin tocar nada:
- Backend: rutas, controladores, validadores, middlewares, modelo de usuario
- Frontend: pantallas de acceso, estado de sesión, protección de rutas

Contame qué encontrás. No escribas archivos, no propongas cambios, solo leé y resumí.
```

**Qué salió:** Exploró rutas, controladores, validadores, modelo, transformer, frontend (páginas, auth-provider, routes). Devolvió un resumen de las capabilities existentes: signup, login, logout, perfil, sesión persistente, protección de rutas. Identificó el modelo de datos (users + access_tokens) y las reglas de validación.

---

## Prompt 2 (no funcionó)

**Modelo:** Opus 5.5 · Claude Pro
**Herramienta:** Claude Code v2.1.280

```
Con lo que exploraste, escribí la spec viva del vertical de cuentas y acceso en docs/spec-viva/PC.md con este formato exacto:

## Purpose
Una o dos frases de para qué existe esta capability.

## Requirements

### Requirement: [nombre descriptivo]
El sistema SHALL [comportamiento observable].

#### Scenario: [nombre del caso]
- **WHEN** [qué pasa]
- **THEN** [qué hace el sistema]

Reglas:
1. NO uses ADDED, MODIFIED ni REMOVED — esto NO es un delta, es la verdad actual
2. SOLO comportamiento observable desde fuera — ni nombres de clase, ni nombres de archivo, ni rutas de código. API = petición y respuesta. Pantalla = lo que una persona ve y puede hacer.
3. NO toques el código, solo leelo
4. En castellano, salvo las mayúsculas RFC (SHALL, WHEN, THEN)
5. Solo el vertical de cuentas y acceso (registro, login, sesión, perfil) — nada de tareas ni otra cosa
```

**Qué salió:** Escribió la spec (274 líneas, bien hecha), pero no paró ahí: corrió la skill de commit, commiteó, abrió un PR contra mi fork, y lanzó el adversarial-reviewer. Todo en un solo turno sin dejarme revisar nada. Tuve que cerrar el PR, resetear la rama y volver a empezar. Lección: faltaba acotar explícitamente que NO hiciera nada más que escribir el archivo.

---

## Prompt 3

**Modelo:** Opus 5.5 · Claude Pro
**Herramienta:** Claude Code v2.1.285

```
Con lo que exploraste, escribí la spec viva del vertical de cuentas y acceso en docs/spec-viva/PC.md con este formato exacto:

## Purpose
Una o dos frases de para qué existe esta capability.

## Requirements

### Requirement: [nombre descriptivo]
El sistema SHALL [comportamiento observable].

#### Scenario: [nombre del caso]
- **WHEN** [qué pasa]
- **THEN** [qué hace el sistema]

Reglas:
1. NO uses ADDED, MODIFIED ni REMOVED — esto NO es un delta, es la verdad actual
2. SOLO comportamiento observable desde fuera — ni nombres de clase, ni nombres de archivo, ni rutas de código. API = petición y respuesta. Pantalla = lo que una persona ve y puede hacer.
3. NO toques el código, solo leelo
4. En castellano, salvo las mayúsculas RFC (SHALL, WHEN, THEN)
5. Solo el vertical de cuentas y acceso (registro, login, sesión, perfil) — nada de tareas ni otra cosa

IMPORTANTE: TU ÚNICO TRABAJO ES ESCRIBIR EL ARCHIVO docs/spec-viva/PC.md Y PARAR. NO hagas commit. NO abras PR. NO corras skills. NO corras el adversarial reviewer. SOLO escribí el archivo y mostrámelo.
```

**Qué salió:** Escribió la spec con 13 requirements y ~35 scenarios cubriendo API y frontend. Esta vez sí paró sin commitear ni abrir PR. Señaló 4 detalles que encontró en el código (fullName required como clave, mensajes en minúscula, logout parcial, iniciales sin nombre).
