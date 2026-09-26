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
- La cabecera usa «Vista actual» para indicar la sección o cambiar entre sus subcategorías. Las altas se inician con botones «Nuevo…» dentro de la barra operativa de cada lista; Notas conserva su acción suave en la cabecera.
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

## Pedidos y proyectos
- Pedidos cuenta con vistas Lista y Tablero sobre los mismos registros. La búsqueda y los filtros de estado y fecha se conservan al alternar entre ambas vistas.
- Las etapas del trabajo son Pendiente, Diseño, Aprobación, Producción, Listo y Entregado. «Esperando cliente» se guarda como una condición independiente de la etapa; los atrasos se calculan desde la fecha de entrega.
- El tablero permite mover pedidos entre etapas. La ficha del pedido ofrece el mismo control como alternativa y pide confirmación antes de marcar una entrega, guardando su fecha real.
- El pie muestra el conteo, la exportación CSV del resultado filtrado y la paginación incluso cuando no hay pedidos.
- Nuevo pedido usa una página completa dentro del HUB. Cliente, nombre del proyecto y fecha prevista organizan el alta; cotización, responsable, descripción, referencias, artículos y materiales pueden completarse según corresponda. Al seleccionar una cotización aprobada se reutilizan el cliente, el proyecto, las partidas, las cantidades y los importes acordados. Si se crea un cliente desde el formulario, el pedido en curso se recupera al volver.
- Una cotización enviada puede marcarse como aprobada y crear inmediatamente solo el pedido o el pedido y la factura. Una cotización ya aprobada mantiene también las acciones «Crear pedido» y «Crear factura» en su ficha.
- El detalle reúne cliente, entrega, etapa, condición, responsable, descripción, artículos, archivos e historial básico. Cuando procede de una cotización, muestra además un resumen enlazado con su número, total, vigencia, notas y condiciones. Cancelar conserva el pedido y exige un motivo.

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
- Notas y los botones «Nuevo…» son acciones suaves: fondo marrón suave y sin borde fuerte. Al pasar el cursor o enfocarlos, el sombreado aumenta levemente sin cambiar el grosor del texto. Guardar nota no tiene sombreado en reposo; al interactuar recibe fondo marrón suave y texto negro sin cambiar de grosor.
- Una acción primaria explícita conserva cian con texto blanco y peso 500; debe existir como máximo una por contexto. Botones secundarios son blancos con borde normal. Acciones de texto son marrones sin recuadro. Acciones destructivas usan rojo.
- Filtros usan cápsula y mantienen el mismo borde y peso regular; el estado seleccionado combina fondo marrón suave con texto negro, sin negrita.
- El buscador de Notas es una superficie blanca sin contorno exterior; el icono y el texto comunican su función. Una nota fijada muestra una chincheta vertical lineal marrón junto al título; una nota sin fijar no muestra indicador. El filtro y la acción Fijar/Desfijar conservan la gestión del estado.
- La escala de espacio es 4, 8, 12, 16, 24, 32 y 56 px. No se añaden medidas nuevas sin una necesidad funcional.
- Los iconos son lineales, marrones en contenido y blancos en navegación oscura; usan 18, 20 o 24 px. Los contenedores circulares de métricas usan 48 px.
- La selección de texto es marrón suave. El foco modifica el borde existente sin crear un segundo aro.
- Inicio es la primera implementación de estas reglas y será la referencia para revisar las demás secciones antes de replicar el sistema en el CMS.

### Estados de interacción obligatorios
- Ningún botón aumenta de peso al pasar el cursor, recibir foco, abrirse o quedar seleccionado. Los cambios de estado se expresan con color y fondo.
- Acciones suaves en reposo: texto e iconos marrones, peso 400. En hover o foco: texto e iconos negros, peso 400 y sombreado `brown-soft` o su variante ligeramente más intensa.
- Notas y los botones «Nuevo…» conservan fondo marrón suave en reposo; al interactuar el fondo aumenta ligeramente de intensidad.
- Guardar nota permanece transparente en reposo; al interactuar recibe exactamente el mismo sombreado `rgba(139,121,94,.16)` y texto negro de las acciones suaves.
- Los filtros permanecen transparentes en reposo. El seleccionado usa fondo marrón suave y texto negro, siempre con peso 400.
- Estas reglas se aplican a componentes equivalentes en cualquier página futura del HUB; no se crean variaciones por nombre o sección.
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
- La página Clientes reutiliza esas reglas: métricas en superficies blancas, filtros con un único borde estándar y tabla sin estilos ajenos al HUB. «Nuevo cliente» abre una página completa dentro del HUB, con el mismo patrón amplio de cotizaciones y facturas: los datos principales y toda la información adicional comparten una única tarjeta blanca, siempre visible y sin desplegable; un resumen lateral explica qué ocurrirá al guardar. «Información adicional» se separa solo mediante espacio, sin línea superior. Nombre y teléfono o WhatsApp son obligatorios tanto para Persona como para Empresa. El aviso de campos obligatorios y las acciones permanecen en el pie de la misma tarjeta. Guardar actualiza la lista y sus métricas; Guardar y crear pedido abre el pedido con el cliente ya seleccionado.
- La navegación lateral y la línea de cierre de la cabecera comparten una altura constante en todas las secciones. Notas y cada formulario lateral usan el mismo ancho y una cabecera alineada; sus contenidos se organizan en superficies blancas sobre crema. «Vista actual» muestra solo las subcategorías de la sección activa. Los selectores de Clientes reservan espacio interior para la flecha.
- Las subcategorías se muestran únicamente en «Vista actual». No se repiten como pestañas sobre las listas.
- Ventas alterna Cotizaciones y Facturas mediante el selector compacto «Vista actual», alineado con el botón neutro de Notas. Cada vista muestra indicadores, estados, fechas y columnas propios. Los formularios de cotización y factura ocupan la pantalla de trabajo, separan la información general, las partidas y las condiciones, y mantienen un resumen de importes independiente a la derecha. Las acciones finales pertenecen a la tarjeta principal: las secundarias usan fondo blanco, borde marrón suave y texto marrón; el guardado principal usa fondo negro y texto blanco, sin borde cian. Las cotizaciones aceptadas pueden generar pedido y factura reutilizando sus datos; los pagos siguen alimentando los mismos registros usados por Finanzas e Inicio.
- Las líneas de navegación, cabecera principal y paneles laterales coinciden a 100 px del borde superior, sin dejar espacio excesivo bajo los títulos. Los paneles de Notas y los formularios laterales comparten un ancho de 500 px en escritorio y ocupan la pantalla disponible en móvil. Los botones de alta nombran claramente el registro (Nuevo cliente, Nueva cotización, etc.); el formulario puede conservar un título descriptivo como «Nuevo cliente». La flecha de «Vincular con» en Notas mantiene la misma separación interior que los filtros de Clientes.
- El primer botón de navegación lateral se alinea por su borde superior con la primera tarjeta del contenido, conservando la línea de separación de la marca en su posición.
- El primer bloque o control visible de cada sección comienza a 28 px bajo el encabezado en escritorio (24 px en móvil). Inicio, Clientes y las demás secciones usan ese mismo nivel de comienzo; los indicadores de Servicios no añaden un margen superior adicional.
- Las cuatro métricas de Clientes mantienen título, cifra y explicación en una sola línea cada uno, con textos breves y el mismo orden visual. La cuadrícula usa cuatro columnas solo cuando hay ancho suficiente; pasa a dos y luego a una columna antes de que los textos se compriman o se corten.
- Los colores tienen una función única en todo el HUB: crema para el fondo, blanco para tarjetas y campos, negro para información principal y estados interactivos, marrón para texto auxiliar, iconos, divisiones y acciones suaves, rosa para la selección de la navegación principal, cian para identidad, foco y una acción primaria explícita, verde para éxito y rojo para errores o eliminación. El texto y los iconos sobre rosa y cian son blancos.
- Cada encabezado cierra con una línea justo debajo de su descripción y antes de las pestañas relacionadas. Las acciones suaves del encabezado usan marrón suave; solo una acción expresamente primaria puede usar cian.
- La cabecera muestra «Vista actual» en lugar de «Crear». La etiqueta y el nombre de la vista comparten exactamente el mismo borde izquierdo y una separación vertical compacta y constante; ningún nombre se recorta y la flecha aparece inmediatamente después del texto real. Cuando una sección tiene subcategorías, el selector permite cambiar entre ellas sin repetir pestañas; cuando tiene una sola vista, se muestra su nombre sin flecha. Las acciones para registrar elementos nuevos viven en la barra operativa de cada lista.
- En Clientes, «Nuevo cliente» permanece en la barra de filtros y abre la página completa de alta dentro del HUB.
- El buscador, el filtro, la exportación y el área de resultados de cada lista forman una sola superficie blanca, sin borde exterior.
- El pie de todas las tablas muestra el conteo a la izquierda y, a la derecha, «Exportar CSV» con su icono seguido por la paginación. Permanece visible aunque todavía no existan registros. Al enfocar campos y botones se utiliza su propio borde, sin añadir un segundo aro exterior.

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
