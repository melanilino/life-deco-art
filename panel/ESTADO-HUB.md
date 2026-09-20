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
- Inicio funciona como tablero operativo: muestra asuntos que requieren atención, ventas, cobros, saldos por cobrar, gastos, trabajo del día, etapas de pedidos e inventario.
- Todos los importes, cantidades y avisos proceden de los registros del HUB. Si no existe actividad, la pantalla lo indica sin inventar datos.
- “Trabajo de hoy” reúne las actividades, entregas, contenido y renovaciones programadas para la fecha actual.
- El menú “Crear” permite iniciar rápidamente un cliente, una cotización, un cálculo o una actividad. “Crear” y “Notas” usan marrón suave, texto marrón y conservan ese lenguaje visual al pasar el cursor.
- “Notas” abre un panel lateral derecho que mantiene visible el dashboard. Permite título opcional, vínculo con clientes, pedidos, cotizaciones o contenido, recordatorio, fijado, edición, eliminación, búsqueda y filtros. Las notas se conservan como datos privados y no aparecen mezcladas con los recursos de marca.
- Una nota puede convertirse en tarea sin perder su vínculo original. Sus recordatorios aparecen en Próximas entregas y abren directamente la nota en el panel.
- El nuevo Inicio aplica el sistema visual canónico del HUB: navegación negra con selección rosa, fondo crema, superficies blancas sin borde exterior ni sombra, texto auxiliar marrón y acciones suaves marrones. El cian queda para identidad, foco y una acción primaria explícita. En móvil, todos los módulos se reorganizan en una sola columna.
- En Inicio, el saludo identifica a Melani sin avatar y las métricas usan iconos marrones sobre el mismo fondo neutro. Los títulos de Atención, Próximas entregas, Pedidos e Inventario no llevan iconos decorativos. Los enlaces de cabecera no llevan flechas y los resúmenes de pedidos e inventario muestran cantidades y nombres sin barras decorativas. En escritorio, estos dos resúmenes tienen un poco más de ancho que antes frente a Próximas entregas.
- «Todo está al día» aparece sin check. El bloque antes llamado Trabajo de hoy ahora es «Próximas entregas» y muestra hasta cuatro compromisos de agenda desde la fecha actual, usando Hoy, Mañana o la fecha correspondiente. No usa puntos ni línea temporal. Este bloque sirve para anticiparse; «Requiere atención» queda reservado para alertas y asuntos que necesitan acción.

## Estadísticas
- El menú incluye una sección independiente de Estadísticas.
- La pantalla deja preparados tres grupos de análisis: ventas y productos, perfil de clientes y origen de clientes.
- No muestra resultados ni conclusiones hasta que existan datos suficientes.
- Antes de activar cada indicador se debe acordar qué información necesita y de dónde se obtendrá; los datos demográficos y de intereses todavía no se recopilan.

## Sistema visual canónico del HUB
- Estas reglas se aplican por función en todas las páginas; no se crean estilos particulares para una pantalla o para un texto concreto.
- Montserrat es la única fuente operativa. La escala es: página 28 px/300, panel 22 px/500, sección 18 px/500, registro 15 px/500, interfaz y campos 13 px, ayuda 12 px y metadatos 11 px.
- Los títulos se escriben normalmente y no se convierten automáticamente a mayúsculas ni reciben espaciado entre letras. Las mayúsculas espaciadas se reservan para identidad de marca.
- Crema es fondo; blanco es superficie y campo; negro es información principal; marrón es información auxiliar, iconos y acciones suaves; rosa queda para la navegación principal seleccionada; cian queda para identidad, foco y una acción primaria explícita; verde y rojo son estados funcionales.
- Todos los bordes funcionales miden 1 px y usan `rgba(139,121,94,.28)`; foco o selección usa `rgba(139,121,94,.46)`.
- Campos y casillas usan radio de 4 px. Tarjetas, botones, listas interiores y menús usan radio de 6 px. Los círculos se reservan para iconos.
- Tarjetas y registros usan fondo blanco sin borde exterior ni sombra. Las sombras quedan limitadas a paneles laterales, menús flotantes, diálogos y avisos temporales.
- Campos tienen altura mínima de 52 px, texto de 13 px, fondo blanco, borde normal y placeholder marrón. Las áreas de texto comparten el mismo estilo y solo cambian de altura.
- Las casillas son propias del HUB: 20 px, borde normal, radio de 4 px y marca marrón; no dependen del estilo rosa del navegador.
- Crear, Notas y Guardar nota son acciones suaves: fondo marrón suave, texto e iconos marrones, sin borde visible y sin cambio de grosor o color al pasar el cursor.
- Una acción primaria explícita conserva cian con texto blanco y peso 500; debe existir como máximo una por contexto. Botones secundarios son blancos con borde normal. Acciones de texto son marrones sin recuadro. Acciones destructivas usan rojo.
- Filtros usan cápsula: transparente con borde normal cuando están inactivos y marrón suave con borde fuerte cuando están seleccionados.
- La escala de espacio es 4, 8, 12, 16, 24, 32 y 56 px. No se añaden medidas nuevas sin una necesidad funcional.
- Los iconos son lineales, marrones en contenido y blancos en navegación oscura; usan 18, 20 o 24 px. Los contenedores circulares de métricas usan 48 px.
- La selección de texto es marrón suave. El foco modifica el borde existente sin crear un segundo aro.
- Inicio es la primera implementación de estas reglas y será la referencia para revisar las demás secciones antes de replicar el sistema en el CMS.
## Regla visual de superficies
- Las tarjetas y bloques del HUB se distinguen por su color y espaciado, sin un borde exterior.
- Los campos, botones, tablas y calendarios conservan los bordes y divisiones necesarios para entenderlos y utilizarlos.
- Al seleccionar un control no aparece un segundo aro rosado; el enfoque se indica dentro del propio elemento.

## Administración
- Administración se divide en Servicios, Configuración y Seguridad.
- Servicios registra plataformas, planes, estado, frecuencia y costo de pago, renovación automática, próxima renovación, aviso anticipado, responsable y enlaces de gestión. Resume servicios activos, pagos mensuales y anuales registrados y renovaciones de los próximos 30 días.
- Configuración conserva los datos comerciales y valores habituales usados en documentos y cálculos. Usa el fondo crema del HUB y organiza sus campos en bloques blancos: Información del negocio, Tu trabajo, Cotizaciones y Pagos.
- Seguridad reúne la cuenta autorizada, las descargas de copias, el historial y la recuperación de registros. Los respaldos automáticos continúan pendientes de revisar costos y configurar.
- El HUB no almacena contraseñas; esa decisión se revisará más adelante.
- Los formularios usan una sola hoja blanca. Sus subtítulos internos organizan datos principales, contacto, fechas, importes, relaciones, renovaciones y notas sin dividirlos en tarjetas separadas.
- Los enlaces “Volver a…” no aparecen en formularios ni fichas; la navegación se realiza desde el menú lateral. Las acciones finales muestran “Cancelar” y “Guardar”, alineadas y sin subrayado.
- Las categorías relacionadas se separan 16 px de la línea del encabezado. Todas se muestran como texto marrón, sin recuadros ni fondos, y la opción activa se identifica con una línea marrón fina bajo el texto.
- La línea del encabezado y la de la categoría activa comparten el mismo tono y grosor. La primera categoría se alinea con el título, la descripción y el contenido de la página.
- El sistema visual del HUB usa Montserrat y una escala estable: títulos principales de 28 px y peso 300; títulos secundarios de 18 px y peso 500; interfaz de 13 px; información técnica de 11 px. La paleta se limita a crema, blanco, negro, marrón, rosa y cyan, con verde y rojo reservados para estados funcionales.
- Los colores tienen una función única en todo el HUB: crema para el fondo, blanco para tarjetas y campos, negro para texto y menú, marrón para texto auxiliar y divisiones, rosa para selecciones, cyan para acciones y enfoque, verde para éxito y rojo para errores o eliminación. El texto y los iconos sobre rosa y cyan son blancos para mantener el contraste visual aprobado.
- Cada encabezado cierra con una línea justo debajo de su descripción y antes de las pestañas relacionadas. Las acciones suaves del encabezado usan marrón suave; solo una acción expresamente primaria puede usar cian.
- Cuando una lista está vacía, la acción para crear un registro aparece solo en el encabezado; el estado vacío informa sin repetir el botón.
- El buscador, el filtro, la exportación y el área de resultados de cada lista forman una sola superficie blanca, sin borde exterior.
- Exportar CSV se alinea al extremo derecho de esta superficie. Al enfocar campos y botones se utiliza su propio borde, sin añadir un segundo aro exterior.

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
