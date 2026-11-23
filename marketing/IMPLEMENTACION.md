# Marketing de Life Deco Art

Los formularios de Footer y Comunidad comparten el registro del Hub. La suscripción es directa y la bienvenida se registra una sola vez por dirección. Un registro posterior completa los campos de nombre y apellido vacíos y deja constancia del origen. La baja requiere acción explícita en la página o una solicitud POST del cliente de correo.

El historial registra la acción de suscribirse, el formulario y la fecha. La versión `community-email-v1` corresponde a la casilla original y `community-email-v2` al envío mediante el botón de suscripción.

La edición vive en el Hub. El editor de bloques usa el código del proyecto y guarda copias reutilizables junto a la configuración. El servidor genera HTML y texto plano. Las pruebas del editor usan el propio buzón corporativo. Los contactos se consultan por páginas y los filtros se aplican a los registros cargados.

Automatizaciones tiene cinco pasos: Inicio, Disparador, Secuencia, Correo y Revisar y activar. Los borradores se guardan al editar y antes de cambiar de paso; se conserva el paso actual. Las secuencias se almacenan en `marketingAutomations` y las entradas de cada persona en `marketingSequences`. Activar publica una copia validada; editar el borrador no cambia los correos que ya están en curso. Pausar detiene su procesamiento y una baja cancela los pasos pendientes.

La lista de `#marketing-automation` comienza con búsqueda, filtro de estado y «Nueva automatización» en una misma barra, siguiendo la disposición de Finanzas. No contiene pasos ni plantillas. «Nueva automatización» abre `#marketing-automation/new`: Inicio permite elegir una plantilla o comenzar desde cero antes de pasar a Disparador. Solo entonces se crea el borrador. Cada automatización se abre en su propia ruta y recupera su paso guardado; entrar en la lista siempre muestra la lista. El paso activo usa el marrón del ícono de Notas. La consulta inicial mantiene la estructura visible sin mensajes de precarga; los errores conservan su aviso y opción de reintentar.

«Borrar» pide confirmación en cada fila, retira la automatización de la lista, cancela sus envíos pendientes y deshabilita la bienvenida heredada si corresponde. El servidor conserva el registro marcado como eliminado y el historial; una pestaña antigua no puede guardar ni reactivar ese registro.

Las suscripciones de Footer y Comunidad entran en las secuencias activas cuyos orígenes coincidan. La identidad de cada entrada evita repetir envíos al registrarse en el otro formulario. Al activar un flujo de suscripción se retira el envío heredado; la bienvenida migrada conserva los envíos previos. Los resultados inciertos quedan en revisión y no se reenvían automáticamente.

Compras usa facturas emitidas del Hub que no estén en borrador ni anuladas. Entregas usa pedidos en etapa entregado con fecha de entrega. Inactividad usa la última factura y el plazo configurado. Estos eventos requieren un cliente vinculado a un suscriptor activo. Cumpleaños admite `birthday` o `dateOfBirth` en el registro del cliente, pero aún no hay un campo para capturarlo en el formulario de Clientes; no se modificó esa sección.

La primera suscripción se procesa al registrarse. Cada espera guarda su vencimiento y programa una tarea HTTP en Cloud Tasks para ese momento. Los reintentos confirmados como seguros también se programan. La cola `hub-marketing-waits`, en `us-east4`, usa la identidad federada de producción existente, con el rol de encolado limitado a esa cola. No se crean claves privadas. Vercel guarda la ruta de la cola en `MARKETING_TASKS_QUEUE`, solo para producción. Las llamadas de regreso llevan una firma HMAC vinculada al trabajo, sin nombres ni correos en la carga de la tarea. El servidor verifica la firma, el vencimiento, la pausa y la baja antes de enviar. Una entrega repetida no repite el correo.

Cloud Tasks no garantiza el segundo exacto; el envío puede tener un pequeño retraso de procesamiento. Las esperas superiores a 28 días usan puntos de control para respetar el máximo de programación de Google. Pausar detiene los envíos, y reactivar vuelve a programar los pendientes conservando su vencimiento. La tarea diaria de las 09:00 UTC (05:00 en Santo Domingo) queda como recuperación y para descubrir eventos comerciales; ya no determina el plazo de las esperas. Cada ejecución procesa hasta doce pasos y programa la continuación si alcanza ese límite.

«Probar espera de 1 minuto» pausa el flujo seleccionado y crea una entrada de prueba identificada, enviada exclusivamente al correo de la sesión administradora. Usa el mismo motor que las secuencias reales, sin crear contactos ni aumentar las métricas de suscriptores. La pantalla permite consultar el vencimiento y la hora del envío confirmado por Gmail.

Enviar prueba usa Gmail y el correo de la sesión administradora. La vista final genera el mismo HTML del envío. Las métricas cuentan aceptaciones reales de Gmail y aperturas de un píxel firmado; las aperturas dependen de la carga de imágenes. LDA10 puede insertarse en el contenido, pero no hay conexión a canjes ni validación de descuentos: se muestra «Sin conexión», sin cifras inventadas.

Marca guarda la paleta, las tipografías y el enlace del documento en el Hub. La paleta admite agregar, editar y eliminar colores. Los logotipos y documentos adjuntos se guardan como recursos privados. «Usar estilos de Marca» aplica las tipografías y el primer color de la paleta a los botones del borrador de correo.

En Tipografías se puede adjuntar cualquier fuente en formato WOFF2, WOFF, OTF o TTF. La lista muestra el nombre junto al archivo. Los archivos adjuntos permanecen en el almacenamiento privado del Hub.

## Preparación para publicar

1. Configurar la federación de Google Cloud para que acepte únicamente la identidad del proyecto de producción de Life Deco Art en Vercel. Autorizar a esa identidad a consultar, crear y actualizar documentos de Firestore en `lifedecoart-hub`. Guardar en producción `MARKETING_FIREBASE_PROVIDER` con el nombre completo del proveedor, desde `//iam.googleapis.com/projects/` hasta `/providers/<id>`. Las colecciones de Marketing permanecen privadas bajo las reglas existentes. El servidor comprueba la sesión del Hub y `panelAccess` antes de exponer datos administrativos.
2. Habilitar Gmail API en el proyecto de Google autorizado para la integración. Autorizar el buzón corporativo con OAuth y el alcance `gmail.send`, y guardar `MARKETING_GMAIL_CLIENT_ID`, `MARKETING_GMAIL_CLIENT_SECRET`, `MARKETING_GMAIL_REFRESH_TOKEN` y `MARKETING_GMAIL_FROM` en Vercel. El remitente debe pertenecer a `lifedecoart.com` y estar habilitado en el buzón.
3. Generar y guardar en Vercel `MARKETING_SECRET` y `CRON_SECRET` como valores aleatorios independientes. Conservar `MARKETING_SECRET` entre despliegues porque identifica suscriptores, controles de frecuencia y enlaces de baja. La tarea diaria de recuperación requiere `CRON_SECRET`.
4. Verificar que ambos formularios registran suscriptores en el Hub y que el mismo correo conserva ambos orígenes en un solo contacto. La bienvenida puede quedar pausada mientras se reciben registros. Cuando se decida activarla, publicar la plantilla y comprobar el enlace de baja. Si se decide importar contactos, conservar consentimiento, bajas y envíos históricos.

El registro admite hasta 10 solicitudes por hora por IP y 100 solicitudes diarias en conjunto. Gmail se ejecuta desde el servidor. Si un envío queda sin confirmación, queda en revisión y conserva el historial para evitar repetirlo.
