## Purpose

Permitir que una persona cree una cuenta en FlowSync, entre con ella, mantenga su sesión abierta entre visitas, consulte su perfil y cierre la sesión. Es la puerta de entrada al resto de la aplicación: sin sesión válida no se accede a nada protegido.

## Requirements

### Requirement: Registro de cuenta por API

El sistema SHALL crear una cuenta nueva a partir de nombre completo, email, contraseña y confirmación de contraseña, y SHALL devolver en la misma respuesta los datos públicos de la cuenta y un token de acceso ya utilizable, sin necesidad de hacer login después. El nombre completo puede valer `null`, pero la clave debe estar presente en la petición.

#### Scenario: Registro correcto

- **WHEN** se envía una petición de registro con un email válido no registrado, una contraseña de entre 8 y 32 caracteres, una confirmación idéntica y un nombre completo o `null`
- **THEN** el sistema responde 200 con `{ data: { user, token } }`, donde `user` contiene `id`, `fullName`, `email`, `initials`, `createdAt` y `updatedAt`, y `token` es una cadena opaca que sirve como credencial Bearer

#### Scenario: La contraseña nunca se devuelve

- **WHEN** se registra una cuenta o se consulta después
- **THEN** ninguna respuesta incluye la contraseña, ni en claro ni cifrada

#### Scenario: Nombre completo vacío u omitido como null

- **WHEN** el campo de nombre completo llega como `null` o como cadena vacía
- **THEN** la cuenta se crea igualmente y `fullName` queda a `null`

#### Scenario: Nombre completo ausente

- **WHEN** la petición no incluye la clave del nombre completo
- **THEN** el sistema responde 422 con un error de campo obligatorio sobre `fullName`

#### Scenario: Email ya registrado

- **WHEN** se intenta registrar un email que ya pertenece a otra cuenta
- **THEN** el sistema responde 422 con un error de unicidad sobre `email` y no crea ninguna cuenta

#### Scenario: Email con formato inválido o demasiado largo

- **WHEN** el email no tiene formato de dirección de correo o supera 254 caracteres
- **THEN** el sistema responde 422 con el error correspondiente sobre `email`

#### Scenario: Contraseña fuera de rango

- **WHEN** la contraseña tiene menos de 8 o más de 32 caracteres
- **THEN** el sistema responde 422 con un error de longitud mínima o máxima sobre `password`

#### Scenario: Confirmación que no coincide

- **WHEN** la confirmación de contraseña no es idéntica a la contraseña
- **THEN** el sistema responde 422 con un error de coincidencia sobre `passwordConfirmation`

#### Scenario: Formato de los errores de validación

- **WHEN** cualquier petición de registro o login falla por validación
- **THEN** el cuerpo de la respuesta es `{ errors: [...] }`, donde cada error indica `message`, `rule` y `field` (y `meta` con los límites cuando aplica, p. ej. el mínimo o máximo de caracteres)

### Requirement: Iniciales derivadas de la cuenta

El sistema SHALL calcular y devolver unas iniciales en mayúsculas para cada cuenta, que la cuenta no puede fijar directamente.

#### Scenario: Nombre de dos o más palabras

- **WHEN** la cuenta tiene un nombre completo con al menos dos palabras separadas por un único espacio (p. ej. "Ada Lovelace")
- **THEN** las iniciales son la primera letra de la primera y de la segunda palabra ("AL")

#### Scenario: Palabras separadas por varios espacios

- **WHEN** el nombre completo tiene dos palabras separadas por más de un espacio seguido (p. ej. "Ada  Lovelace")
- **THEN** las iniciales son los dos primeros caracteres de la primera palabra ("AD")

#### Scenario: Nombre de una sola palabra

- **WHEN** la cuenta tiene un nombre completo de una sola palabra (p. ej. "Ada")
- **THEN** las iniciales son sus dos primeros caracteres ("AD"), o uno solo si el nombre tiene un único carácter

#### Scenario: Sin nombre

- **WHEN** la cuenta no tiene nombre completo
- **THEN** las iniciales son la primera letra de la parte del email anterior a la arroba y la primera letra del dominio (p. ej. "ada@example.com" → "AE")

### Requirement: Login por API

El sistema SHALL autenticar a una cuenta existente por email y contraseña y SHALL emitir un token de acceso nuevo en cada login correcto.

#### Scenario: Credenciales correctas

- **WHEN** se envía una petición de login con el email y la contraseña de una cuenta existente
- **THEN** el sistema responde 200 con `{ data: { user, token } }`, con la misma forma que el registro

#### Scenario: Cada login genera un token distinto

- **WHEN** la misma cuenta hace login varias veces
- **THEN** cada respuesta trae un token diferente y todos siguen siendo válidos a la vez

#### Scenario: Credenciales incorrectas

- **WHEN** el email no corresponde a ninguna cuenta o la contraseña no es la correcta
- **THEN** el sistema responde 400 con un error genérico de credenciales inválidas, sin indicar cuál de los dos datos falla

#### Scenario: Datos de login ausentes o mal formados

- **WHEN** falta el email, falta la contraseña (o llega vacía), o el email no tiene formato válido
- **THEN** el sistema responde 422 con errores de validación por campo

#### Scenario: Sin reglas de longitud de contraseña en el login

- **WHEN** se hace login con una contraseña de cualquier longitud no vacía
- **THEN** el sistema no la rechaza por longitud y se limita a comprobar si es la correcta

### Requirement: Acceso autenticado por token

El sistema SHALL proteger los endpoints de cuenta exigiendo un token de acceso válido en la cabecera `Authorization: Bearer <token>`.

#### Scenario: Petición sin token o con token inválido

- **WHEN** se llama a un endpoint de cuenta sin cabecera de autorización, con un token inexistente o con un token revocado
- **THEN** el sistema responde 401 con un cuerpo JSON `{ errors: [...] }` de acceso no autorizado

#### Scenario: Los tokens no caducan

- **WHEN** se usa un token emitido hace cualquier cantidad de tiempo y que no ha sido revocado
- **THEN** el sistema lo sigue aceptando

#### Scenario: Respuestas de cuenta en JSON

- **WHEN** un endpoint de registro, login, perfil o logout responde con éxito o con un error de validación, credenciales o autorización
- **THEN** el cuerpo se devuelve en JSON aunque el cliente no lo pida

### Requirement: Consulta del perfil por API

El sistema SHALL devolver los datos públicos de la cuenta dueña del token presentado.

#### Scenario: Perfil con sesión válida

- **WHEN** se consulta el perfil con un token válido
- **THEN** el sistema responde 200 con `{ data: user }`, con los mismos campos que en el registro y el login

### Requirement: Cierre de sesión por API

El sistema SHALL revocar el token con el que se hace la petición de cierre de sesión, y solo ese.

#### Scenario: Logout correcto

- **WHEN** se solicita el cierre de sesión con un token válido
- **THEN** el sistema responde 200 con `{ message: "Logged out successfully" }` (sin envoltorio `data`) y a partir de ese momento ese token recibe 401

#### Scenario: Otros tokens de la misma cuenta siguen vivos

- **WHEN** una cuenta tiene varios tokens y cierra sesión con uno de ellos
- **THEN** los demás tokens siguen siendo válidos

### Requirement: Pantalla de registro

El sistema SHALL ofrecer una pantalla de registro accesible solo sin sesión, con los campos "Nombre completo (opcional)", "Email", "Contraseña" y "Repite la contraseña", un botón "Crear cuenta" y un enlace "Inicia sesión" para quien ya tiene cuenta.

#### Scenario: Registro correcto desde la pantalla

- **WHEN** la persona rellena el formulario con datos válidos y pulsa "Crear cuenta"
- **THEN** queda con la sesión iniciada y es llevada a la pantalla de perfil

#### Scenario: Envío en curso

- **WHEN** el formulario se está enviando
- **THEN** el botón muestra "Creando cuenta…" y queda deshabilitado

#### Scenario: Pista de contraseña

- **WHEN** el campo de contraseña no tiene ningún error
- **THEN** debajo se muestra la pista "Entre 8 y 32 caracteres."

#### Scenario: Contraseñas distintas detectadas en el navegador

- **WHEN** la contraseña y su repetición no coinciden al pulsar "Crear cuenta"
- **THEN** se muestra "Las contraseñas no coinciden." bajo "Repite la contraseña" sin llegar a contactar con el servidor

#### Scenario: Errores de validación por campo

- **WHEN** el servidor rechaza el registro por validación
- **THEN** cada campo afectado muestra su mensaje en castellano debajo del input (p. ej. "Ese email ya está registrado. Inicia sesión en su lugar.", "Introduce una dirección de email válida.", "la contraseña debe tener al menos 8 caracteres.", "la contraseña no puede superar los 32 caracteres.", "Falta rellenar el email.", "la confirmación de la contraseña debe tener al menos 8 caracteres."), y los datos introducidos se conservan; un error de una regla sin mensaje específico se muestra como "Revisa <campo>." (p. ej. "Revisa el email.")

#### Scenario: Error no asociable a un campo

- **WHEN** el registro falla por un motivo que no corresponde a ningún campo visible (error de servidor, fallo de red o un campo que no está en pantalla)
- **THEN** se muestra un aviso destacado en la parte superior del formulario con el mensaje correspondiente

### Requirement: Pantalla de login

El sistema SHALL ofrecer una pantalla de login accesible solo sin sesión, con los campos "Email" y "Contraseña", un botón "Entrar" y un enlace "Crea una" para quien aún no tiene cuenta.

#### Scenario: Login correcto desde la pantalla

- **WHEN** la persona introduce credenciales correctas y pulsa "Entrar"
- **THEN** queda con la sesión iniciada y es llevada a la pantalla de perfil

#### Scenario: Envío en curso

- **WHEN** el formulario se está enviando
- **THEN** el botón muestra "Entrando…" y queda deshabilitado

#### Scenario: Credenciales incorrectas

- **WHEN** el email o la contraseña no son correctos
- **THEN** se muestra un aviso destacado "El email o la contraseña no son correctos."

#### Scenario: Campos vacíos o email mal formado

- **WHEN** la persona envía el formulario con algún campo vacío o con un email sin formato válido
- **THEN** el navegador no bloquea el envío y es el servidor quien lo rechaza; el mensaje aparece bajo el campo afectado (p. ej. "Falta rellenar la contraseña.")

#### Scenario: Servidor inaccesible

- **WHEN** no se puede contactar con el servidor
- **THEN** se muestra el aviso "No se pudo conectar con el servidor. Comprueba que el backend está arrancado."

#### Scenario: Motivo de una sesión perdida

- **WHEN** la persona llega al login porque no se pudo restaurar una sesión anterior
- **THEN** el login muestra en el aviso superior el motivo (p. ej. "Tu sesión ha caducado. Vuelve a iniciar sesión.")

#### Scenario: El motivo de la sesión perdida persiste ante errores de campo

- **WHEN** se muestra el motivo de una sesión perdida y la persona intenta entrar
- **THEN** el aviso sigue visible mientras se envía y también si el servidor solo devuelve errores de campo; lo sustituye un error general (credenciales incorrectas, servidor inaccesible) y desaparece con un login correcto

### Requirement: Sesión persistente en el navegador

El sistema SHALL recordar la sesión en el navegador entre recargas y visitas, y SHALL validarla contra el servidor antes de darla por buena.

#### Scenario: Recarga con sesión guardada válida

- **WHEN** la persona recarga o vuelve a abrir la aplicación teniendo una sesión guardada que el servidor sigue aceptando
- **THEN** ve un indicador de carga a pantalla completa mientras se comprueba y después entra directamente, sin volver a introducir credenciales

#### Scenario: Sesión guardada rechazada por el servidor

- **WHEN** la sesión guardada ya no es aceptada por el servidor
- **THEN** se descarta del navegador y la persona acaba en el login con el aviso "Tu sesión ha caducado. Vuelve a iniciar sesión."

#### Scenario: Servidor caído al restaurar la sesión

- **WHEN** al abrir la aplicación no se puede contactar con el servidor o este falla
- **THEN** la persona acaba en el login con el aviso del error, pero la sesión guardada se conserva, de modo que al recargar con el servidor disponible vuelve a entrar sin credenciales

### Requirement: Protección de pantallas según la sesión

El sistema SHALL mostrar el perfil solo a quien tiene sesión, y el login y el registro solo a quien no la tiene.

#### Scenario: Acceso al perfil sin sesión

- **WHEN** alguien sin sesión intenta abrir el perfil
- **THEN** es redirigido al login

#### Scenario: Acceso a login o registro con sesión

- **WHEN** alguien con sesión abre el login o el registro
- **THEN** es redirigido al perfil

#### Scenario: Dirección desconocida

- **WHEN** alguien abre cualquier dirección de la aplicación que no sea login, registro ni perfil
- **THEN** es redirigido al perfil (y de ahí al login si no tiene sesión)

#### Scenario: Comprobación de sesión en curso

- **WHEN** la sesión guardada todavía se está validando
- **THEN** ninguna pantalla protegida ni pública redirige; se muestra el indicador de carga

### Requirement: Pantalla de perfil

El sistema SHALL mostrar a la persona con sesión sus datos de cuenta y la opción de cerrar sesión.

#### Scenario: Datos visibles

- **WHEN** la persona abre su perfil
- **THEN** ve un avatar circular con sus iniciales, su nombre completo (o "Sin nombre" si no lo tiene), su email y "Miembro desde" con la fecha de alta en formato largo en castellano (p. ej. "29 de septiembre de 2026")

#### Scenario: Cerrar sesión

- **WHEN** la persona pulsa "Cerrar sesión"
- **THEN** la sesión se borra del navegador de inmediato, la persona es llevada al login sin ningún aviso de error y, sin esperar respuesta, se pide al servidor que revoque el token

#### Scenario: Cerrar sesión con el servidor caído

- **WHEN** la persona cierra sesión y el servidor no responde o rechaza la petición
- **THEN** la sesión se cierra igualmente en el navegador y no se muestra ningún error
