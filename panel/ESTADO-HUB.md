# Estado de conexión independiente

- Decisión vigente: Firebase `lifedecoart-hub` separado de `lifedecoart-cms`.
- Proyecto creado con Google Analytics desactivado y Blaze activado por autorización expresa de la propietaria.
- Aplicación web registrada: Life Deco Art Hub.
- El adaptador del panel usa configuración propia y aplicación Firebase con nombre `life-deco-art-hub`; ya no reutiliza la configuración ni la sesión del CMS.
- Cuatro pruebas de persistencia simulada superadas después del cambio de conexión.
- La consola de Google Cloud sigue pidiendo contraseña para verificar identidad; las alertas al 80% de las cuotas gratuitas del CMS y hub NO están configuradas.
- Firestore del hub usa edición Standard, base `(default)`, ubicación `nam5` y reglas privadas publicadas.
- Storage usa el bucket `lifedecoart-hub.firebasestorage.app`, clase Standard y región gratuita `US-EAST1`; sus reglas privadas están publicadas.
- `lifedecoart.com` está autorizado como dominio de Authentication. `localhost` se conserva para pruebas locales.
- Pendientes: alertas, prueba real con sesión de la propietaria, guardado/adjuntos/recuperación y despliegue web.
- Las reglas preparadas anteriormente para el CMS no se publicaron. Los archivos locales de reglas y documentos históricos requieren adaptación antes de cualquier despliegue.
- No se han activado respaldos automáticos ni actualizado la cuenta de prueba a una cuenta pagada permanente.

## Inicio del hub
- “Agenda y próximas entregas” reúne las fechas programadas del negocio.
- El encabezado de Inicio ofrece “Notas rápidas” para guardar ideas, apuntes de reuniones y recordatorios breves.
- Las notas se conservan como datos privados del hub, con fecha y hora, y no aparecen mezcladas con los recursos de marca.

## Acceso verificado
- Usuario hola@lifedecoart.com creado por la propietaria en Authentication.
- panelAccess del UID de la propietaria creado con enabled true.
- Reglas de panel/firestore.rules publicadas en lifedecoart-hub (equivalentes salvo formato).
- Rules Playground: lectura de meta/state autorizada al UID de la propietaria; rechazada sin autenticación y con otro UID.
- Estas simulaciones no sustituyen las pruebas de sesión real, guardado, adjuntos ni recuperación.

## Archivos verificados
- El primer intento de crear Storage devolvió un error genérico y no creó el bucket; el segundo intento terminó correctamente.
- Las reglas limitan `panel-private/{uid}/{fileId}` al UID de la propietaria y bloquean el resto del bucket.
- Rules Playground: lectura de un archivo privado autorizada al UID de la propietaria y rechazada sin autenticación.
- Se evitó otorgar a Storage un rol adicional para consultar Firestore, porque el hub tiene una sola propietaria y la regla puede limitarse directamente a su UID.
