## Purpose
Permitir que una persona cree una cuenta en FlowSync, inicie y cierre sesión, y consulte sus datos de perfil, tanto a través de la API como desde las pantallas de la aplicación web. Es la puerta de entrada que identifica a quien usa el sistema.

## Requirements

### Requirement: Registro de cuenta por API
El sistema SHALL aceptar `POST /api/v1/auth/signup` con `fullName`, `email`, `password` y `passwordConfirmation`, crear la cuenta y responder `200` con `{ "data": { "user": {...}, "token": "..." } }`, dejando a la persona con sesión iniciada desde ese momento.

#### Scenario: Registro correcto con nombre
- **WHEN** se envía un `email` válido y no registrado, un `fullName` de texto, y una `password` de entre 8 y 32 caracteres repetida idéntica en `passwordConfirmation`
- **THEN** el sistema responde `200` con los datos públicos del usuario creado y un token de acceso utilizable de inmediato en rutas protegidas

#### Scenario: Registro correcto sin nombre
- **WHEN** se envía `fullName` con valor `null` o como cadena vacía, y el resto de campos es válido
- **THEN** el sistema crea la cuenta con `fullName: null` y responde `200` igual que en el caso con nombre

#### Scenario: Falta la clave del nombre
- **WHEN** la petición no incluye la clave `fullName` en absoluto
- **THEN** el sistema responde `422` con un error de regla `required` sobre el campo `fullName`, aunque el nombre sea opcional en valor

#### Scenario: Email ya registrado
- **WHEN** se envía un `email` que ya pertenece a otra cuenta
- **THEN** el sistema responde `422` con un error de regla `database.unique` sobre el campo `email` y no crea ninguna cuenta

#### Scenario: Email con formato inválido o demasiado largo
- **WHEN** el `email` no tiene formato de dirección de correo o supera los 254 caracteres
- **THEN** el sistema responde `422` con un error sobre el campo `email` (regla `email` o `maxLength`)

#### Scenario: Contraseña fuera de rango
- **WHEN** `password` o `passwordConfirmation` tienen menos de 8 o más de 32 caracteres
- **THEN** el sistema responde `422` con un error de regla `minLength` o `maxLength` sobre el campo correspondiente, incluyendo el límite en `meta`

#### Scenario: Contraseñas que no coinciden
- **WHEN** `passwordConfirmation` es distinta de `password`
- **THEN** el sistema responde `422` con un error de regla `sameAs` sobre el campo `passwordConfirmation`

#### Scenario: Campos obligatorios vacíos
- **WHEN** `email`, `password` o `passwordConfirmation` faltan o llegan como cadena vacía
- **THEN** el sistema responde `422` con un error de regla `required` por cada campo afectado

### Requirement: Formato de los errores de validación
El sistema SHALL responder a toda petición inválida del vertical con un cuerpo JSON `{ "errors": [ { "message", "rule", "field", "meta"? } ] }`, un elemento por cada problema detectado, con independencia de la cabecera `Accept` que envíe el cliente.

#### Scenario: Varios campos inválidos a la vez
- **WHEN** una petición de registro tiene el email mal formado y la contraseña demasiado corta
- **THEN** el sistema responde `422` con un elemento en `errors` para cada campo, cada uno con su `field` y su `rule`

### Requirement: Inicio de sesión por API
El sistema SHALL aceptar `POST /api/v1/auth/login` con `email` y `password` y, si las credenciales son correctas, responder `200` con `{ "data": { "user": {...}, "token": "..." } }`.

#### Scenario: Credenciales correctas
- **WHEN** se envía el email y la contraseña de una cuenta existente
- **THEN** el sistema responde `200` con los datos públicos del usuario y un token de acceso nuevo

#### Scenario: Cada login emite un token distinto
- **WHEN** la misma persona inicia sesión varias veces
- **THEN** cada respuesta trae un token diferente y todos siguen siendo válidos a la vez hasta que se revoquen individualmente

#### Scenario: Credenciales incorrectas
- **WHEN** el email no corresponde a ninguna cuenta, o la contraseña no es la de esa cuenta
- **THEN** el sistema responde `400` con un único error sin `field` (`Invalid user credentials`), idéntico en ambos casos, sin revelar si el email existe

#### Scenario: Email mal formado en el login
- **WHEN** el `email` enviado no tiene formato de correo o supera los 254 caracteres
- **THEN** el sistema responde `422` con un error sobre el campo `email`, sin llegar a comprobar credenciales

#### Scenario: Campos vacíos en el login
- **WHEN** falta `email` o `password`, o llegan como cadena vacía
- **THEN** el sistema responde `422` con un error de regla `required` sobre cada campo ausente

#### Scenario: Sin reglas de longitud en la contraseña del login
- **WHEN** se envía una contraseña de cualquier longitud no vacía
- **THEN** el sistema no la rechaza por longitud y se limita a comprobar si coincide con la de la cuenta

### Requirement: Autenticación por token
El sistema SHALL identificar a quien llama a las rutas bajo `/api/v1/account/` únicamente mediante la cabecera `Authorization: Bearer <token>` con un token emitido por registro o login y no revocado. Los tokens no caducan por tiempo.

#### Scenario: Sin token
- **WHEN** se llama a una ruta protegida sin cabecera `Authorization`
- **THEN** el sistema responde `401` con `{ "errors": [ { "message": "Unauthorized access" } ] }`

#### Scenario: Token inválido o revocado
- **WHEN** se llama a una ruta protegida con un token inventado, mal formado o ya revocado por logout
- **THEN** el sistema responde `401` con el mismo cuerpo de error

#### Scenario: Token antiguo sin usar
- **WHEN** se usa un token emitido hace mucho tiempo y nunca revocado
- **THEN** el sistema lo sigue aceptando

### Requirement: Consulta del perfil por API
El sistema SHALL responder a `GET /api/v1/account/profile` con token válido devolviendo `200` y `{ "data": { "id", "fullName", "email", "createdAt", "updatedAt", "initials" } }` de la persona dueña del token, sin incluir nunca la contraseña.

#### Scenario: Perfil de la persona autenticada
- **WHEN** se pide el perfil con un token válido
- **THEN** el sistema devuelve los datos de la cuenta a la que pertenece ese token

#### Scenario: Iniciales a partir del nombre
- **WHEN** la cuenta tiene un `fullName` con al menos dos palabras separadas por un espacio (p. ej. "Ada Lovelace")
- **THEN** `initials` es la primera letra de las dos primeras palabras, en mayúsculas ("AL")

#### Scenario: Iniciales con nombre de una sola palabra
- **WHEN** el `fullName` tiene una sola palabra (p. ej. "Ada")
- **THEN** `initials` son sus dos primeras letras en mayúsculas ("AD")

#### Scenario: Iniciales sin nombre
- **WHEN** la cuenta no tiene `fullName`
- **THEN** `initials` se calcula a partir del email como la primera letra de la parte anterior a la `@` y la primera de la parte posterior, en mayúsculas (p. ej. "ada@example.com" → "AE")

### Requirement: Cierre de sesión por API
El sistema SHALL aceptar `POST /api/v1/account/logout` con token válido, revocar solo ese token y responder `200` con `{ "message": "Logged out successfully" }`, sin el envoltorio `data`.

#### Scenario: Logout con token válido
- **WHEN** se cierra sesión con un token válido
- **THEN** el sistema responde `200` y, a partir de ese momento, ese token recibe `401` en cualquier ruta protegida

#### Scenario: Otras sesiones siguen activas
- **WHEN** la misma persona tiene varios tokens activos y cierra sesión con uno de ellos
- **THEN** los demás tokens siguen siendo válidos

#### Scenario: Logout sin sesión
- **WHEN** se llama al logout sin token o con un token no válido
- **THEN** el sistema responde `401`

### Requirement: Pantalla de registro
El sistema SHALL ofrecer en `/register` un formulario "Crea tu cuenta" con los campos "Nombre completo (opcional)", "Email", "Contraseña" (con la ayuda "Entre 8 y 32 caracteres.") y "Repite la contraseña", un botón "Crear cuenta" y un enlace "Inicia sesión" que lleva a `/login`.

#### Scenario: Registro correcto desde la web
- **WHEN** la persona rellena el formulario con datos válidos y pulsa "Crear cuenta"
- **THEN** queda con la sesión iniciada y es llevada a su perfil en `/profile`

#### Scenario: Nombre en blanco
- **WHEN** la persona deja el nombre vacío o solo con espacios
- **THEN** la cuenta se crea sin nombre

#### Scenario: Contraseñas distintas detectadas en el navegador
- **WHEN** la contraseña y su repetición no coinciden al pulsar "Crear cuenta"
- **THEN** aparece "Las contraseñas no coinciden." bajo "Repite la contraseña" sin que se envíe nada al servidor

#### Scenario: Email ya registrado desde la web
- **WHEN** la persona intenta registrarse con un email que ya tiene cuenta
- **THEN** aparece "Ese email ya está registrado. Inicia sesión en su lugar." bajo el campo "Email"

#### Scenario: Errores de validación del servidor
- **WHEN** el servidor rechaza uno o varios campos del formulario
- **THEN** cada campo muestra debajo su mensaje en castellano ("Introduce una dirección de email válida.", "Falta rellenar el email.", "la contraseña debe tener al menos 8 caracteres.", "la contraseña no puede superar los 32 caracteres.", etc.) y, mientras la contraseña tenga error, este sustituye a la ayuda de longitud

#### Scenario: Envío en curso
- **WHEN** la persona ha pulsado "Crear cuenta" y aún no hay respuesta
- **THEN** el botón queda deshabilitado con el texto "Creando cuenta…"

### Requirement: Pantalla de inicio de sesión
El sistema SHALL ofrecer en `/login` un formulario "Inicia sesión" con los campos "Email" y "Contraseña", un botón "Entrar" y un enlace "Crea una" que lleva a `/register`.

#### Scenario: Login correcto desde la web
- **WHEN** la persona introduce credenciales válidas y pulsa "Entrar"
- **THEN** queda con la sesión iniciada y es llevada a `/profile`

#### Scenario: Credenciales incorrectas desde la web
- **WHEN** el email o la contraseña no son correctos
- **THEN** aparece un aviso destacado sobre el formulario: "El email o la contraseña no son correctos."

#### Scenario: Campos vacíos o email mal formado
- **WHEN** la persona pulsa "Entrar" con un campo vacío o un email sin formato válido
- **THEN** el mensaje correspondiente aparece bajo el campo afectado ("Falta rellenar el email.", "Falta rellenar la contraseña.", "Introduce una dirección de email válida.")

#### Scenario: Envío en curso
- **WHEN** la persona ha pulsado "Entrar" y aún no hay respuesta
- **THEN** el botón queda deshabilitado con el texto "Entrando…"

### Requirement: Mensajes de error generales en los formularios de acceso
El sistema SHALL mostrar en un aviso destacado sobre el formulario de login o registro cualquier error que no pueda asociarse a un campo visible, y no mostrar ese aviso cuando todos los errores ya aparecen bajo sus campos.

#### Scenario: Servidor inaccesible
- **WHEN** la persona envía el formulario y el servidor no responde
- **THEN** aparece el aviso "No se pudo conectar con el servidor. Comprueba que el backend está arrancado."

#### Scenario: Fallo interno del servidor
- **WHEN** el servidor responde con un error inesperado
- **THEN** aparece el aviso "Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento."

#### Scenario: Error sobre un campo que no está en pantalla
- **WHEN** el servidor devuelve un error de validación sobre un campo que el formulario no muestra
- **THEN** el mensaje del primer error aparece en el aviso general en vez de perderse

### Requirement: Sesión persistente en el navegador
El sistema SHALL recordar la sesión en el navegador entre recargas y visitas, y al abrir la aplicación con una sesión recordada SHALL comprobarla contra el servidor antes de dar acceso, mostrando un indicador de carga mientras tanto.

#### Scenario: Sesión recordada y válida
- **WHEN** la persona vuelve a abrir o recarga la aplicación con una sesión todavía válida
- **THEN** ve brevemente un indicador de carga y a continuación entra sin volver a introducir credenciales

#### Scenario: Sesión recordada que el servidor ya no reconoce
- **WHEN** la sesión recordada ha sido revocada o no es válida
- **THEN** la aplicación la olvida, lleva a la persona a `/login` y muestra el aviso "Tu sesión ha caducado. Vuelve a iniciar sesión."

#### Scenario: Servidor caído al restaurar la sesión
- **WHEN** al abrir la aplicación no se puede contactar con el servidor o este falla
- **THEN** la persona es llevada a `/login` con el aviso del problema ("No se pudo conectar con el servidor…" o "Algo ha ido mal en el servidor…"), pero la sesión recordada no se olvida y basta con recargar cuando el servidor vuelva para entrar de nuevo

#### Scenario: El aviso de sesión perdida cede ante un intento nuevo
- **WHEN** en `/login` se muestra el aviso de sesión perdida y la persona hace un intento de login que falla
- **THEN** el aviso pasa a mostrar el error del nuevo intento; si el login tiene éxito, el aviso desaparece

### Requirement: Pantalla de perfil
El sistema SHALL mostrar en `/profile`, solo con sesión iniciada, una tarjeta con un círculo con las iniciales de la persona, su nombre completo (o "Sin nombre" si no tiene), su email, la fecha de alta como "Miembro desde" en formato largo en castellano (p. ej. "29 de septiembre de 2026") y un botón "Cerrar sesión".

#### Scenario: Persona con nombre
- **WHEN** una persona registrada como "Ada Lovelace" abre su perfil
- **THEN** ve "AL" en el círculo, "Ada Lovelace" como título y su email debajo

#### Scenario: Persona sin nombre
- **WHEN** una persona registrada sin nombre abre su perfil
- **THEN** ve "Sin nombre" como título y en el círculo las iniciales derivadas de su email

### Requirement: Cierre de sesión desde la web
El sistema SHALL cerrar la sesión en el navegador al pulsar "Cerrar sesión" y llevar a la persona a `/login`, intentando además revocar la sesión en el servidor.

#### Scenario: Cerrar sesión
- **WHEN** la persona pulsa "Cerrar sesión"
- **THEN** el botón muestra "Cerrando sesión…", la persona acaba en `/login` sin ningún aviso, y al recargar ya no tiene sesión

#### Scenario: El servidor no confirma el cierre
- **WHEN** la persona pulsa "Cerrar sesión" y el servidor no responde o rechaza la petición
- **THEN** la sesión se cierra igualmente en el navegador, sin mostrar error

### Requirement: Protección de pantallas según la sesión
El sistema SHALL permitir el acceso a `/profile` solo con sesión iniciada, permitir `/login` y `/register` solo sin sesión, y redirigir cualquier otra dirección a `/profile`.

#### Scenario: Acceso a perfil sin sesión
- **WHEN** una persona sin sesión abre `/profile`
- **THEN** es redirigida a `/login`

#### Scenario: Acceso a login o registro con sesión
- **WHEN** una persona con sesión iniciada abre `/login` o `/register`
- **THEN** es redirigida a `/profile`

#### Scenario: Dirección desconocida o raíz
- **WHEN** se abre `/` o cualquier dirección no reconocida
- **THEN** la aplicación redirige a `/profile`, y de ahí a `/login` si no hay sesión

#### Scenario: Comprobación de sesión en curso
- **WHEN** se abre cualquiera de estas pantallas mientras se está comprobando una sesión recordada
- **THEN** se muestra un indicador de carga a pantalla completa en lugar de redirigir

---

## Parte B — Tres listas

### 1. Números

El agente escribió **13 requirements**. Comprobé **6** abriendo el código.

### 2. Incoherencias

- **Mensajes de error con mayúscula/minúscula inconsistente.** Algunos mensajes empiezan con mayúscula ("Introduce una dirección de email válida.", "Falta rellenar el email.") y otros con minúscula ("la contraseña debe tener al menos 8 caracteres.", "la confirmación de la contraseña debe tener al menos 8 caracteres."). Se ve en la función de traducción de errores del frontend, que concatena un label en minúscula con el verbo.
- **`fullName` es required como clave pero nullable como valor.** El validador de registro exige que la clave esté presente en la petición (`vine.string().nullable()` sin `.optional()`), pero acepta `null` como valor. Si omitís la clave → 422. El frontend lo oculta mandando siempre `fullName: fullName.trim() || null`, así que desde la pantalla nunca se ve este error.
- **La respuesta de logout no sigue el formato del resto de la API.** Todas las demás respuestas de cuentas y acceso llegan envueltas en `{ data: ... }` porque pasan por `serialize()`. Logout devuelve `{ message: "Logged out successfully" }` directo, sin envoltorio. Esto choca con la convención del proyecto de que toda respuesta pasa por `serialize()`.

### 3. Bug o contrato

**`passwordConfirmation` valida longitud por separado.** El validador de registro aplica `minLength(8).maxLength(32)` a la confirmación antes de compararla con la contraseña. Si mandás una confirmación de 5 caracteres, recibís error de `minLength` en `passwordConfirmation`, no error de `sameAs`. Dos lecturas: (a) es redundante — debería ser solo `vine.string().sameAs('password')` y dejar que la comparación falle naturalmente; (b) es intencional — se valida longitud primero para dar un mensaje más específico antes de comparar.

**`fullName` required como clave pero nullable como valor.** El validador usa `nullable()` sin `optional()`, lo que fuerza al cliente a enviar siempre la clave aunque el valor sea `null`. Dos lecturas posibles: (a) es un bug — se olvidaron de poner `.optional()` y el frontend lo tapa mandando siempre la clave; (b) es el contrato — se fuerza al cliente a ser explícito sobre si el nombre es `null` a propósito, para evitar ambigüedad entre "no mandó nombre" y "no tiene nombre". El frontend funciona porque siempre manda la clave, así que el bug (si lo es) nunca se manifiesta desde la pantalla.
