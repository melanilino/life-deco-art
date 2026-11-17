# Marketing de Life Deco Art

Los formularios de Footer y Comunidad comparten el registro del Hub. La suscripción es directa y la bienvenida se registra una sola vez por dirección. Un registro posterior completa los campos de nombre y apellido vacíos y deja constancia del origen. La baja requiere acción explícita en la página o una solicitud POST del cliente de correo.

El historial registra la acción de suscribirse, el formulario y la fecha. La versión `community-email-v1` corresponde a la casilla original y `community-email-v2` al envío mediante el botón de suscripción.

La edición vive en el Hub. El editor de bloques usa el código del proyecto y guarda copias reutilizables junto a la configuración. El servidor genera HTML y texto plano. Las pruebas del editor usan el propio buzón corporativo. Los contactos se consultan por páginas y los filtros se aplican a los registros cargados.

Automatizaciones muestra el flujo de bienvenida y sus envíos aceptados por Gmail. «Nueva automatización» abre la configuración del borrador de ese flujo. La activación publica el borrador y habilita el flujo en una sola operación, después de confirmar.

Marca guarda la paleta, las tipografías y el enlace del manual en el Hub. Los logotipos y manuales adjuntos se guardan como recursos privados. «Usar estilos de Marca» aplica las tipografías y el primer color de la paleta a los botones del borrador de correo.

## Preparación para publicar

1. Configurar la federación de Google Cloud para que acepte únicamente la identidad del proyecto de producción de Life Deco Art en Vercel. Autorizar a esa identidad a consultar, crear y actualizar documentos de Firestore en `lifedecoart-hub`. Guardar en producción `MARKETING_FIREBASE_PROVIDER` con el nombre completo del proveedor, desde `//iam.googleapis.com/projects/` hasta `/providers/<id>`. Las colecciones de Marketing permanecen privadas bajo las reglas existentes. El servidor comprueba la sesión del Hub y `panelAccess` antes de exponer datos administrativos.
2. Habilitar Gmail API en el proyecto de Google autorizado para la integración. Autorizar el buzón corporativo con OAuth y el alcance `gmail.send`, y guardar `MARKETING_GMAIL_CLIENT_ID`, `MARKETING_GMAIL_CLIENT_SECRET`, `MARKETING_GMAIL_REFRESH_TOKEN` y `MARKETING_GMAIL_FROM` en Vercel. El remitente debe pertenecer a `lifedecoart.com` y estar habilitado en el buzón.
3. Generar y guardar en Vercel `MARKETING_SECRET` y `CRON_SECRET` como valores aleatorios independientes. Conservar `MARKETING_SECRET` entre despliegues porque identifica suscriptores, controles de frecuencia y enlaces de baja. La tarea diaria de recuperación requiere `CRON_SECRET`.
4. Verificar que ambos formularios registran suscriptores en el Hub y que el mismo correo conserva ambos orígenes en un solo contacto. La bienvenida puede quedar pausada mientras se reciben registros. Cuando se decida activarla, publicar la plantilla y comprobar el enlace de baja. Si se decide importar contactos, conservar consentimiento, bajas y envíos históricos.

El registro admite hasta 10 solicitudes por hora por IP y 100 solicitudes diarias en conjunto. Gmail se ejecuta desde el servidor. Si un envío queda sin confirmación, queda en revisión y conserva el historial para evitar repetirlo.
