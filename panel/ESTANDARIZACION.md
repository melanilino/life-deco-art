# Controles y formularios del Hub — 8 noviembre 2026

Cambios aprobados por la propietaria:

- En Inicio, «Ver todos» se alinea con el título, independientemente del subtítulo.
- Los indicadores comparten una altura de 122 px, incluidos los dos grupos de Finanzas.
- Los alternadores usan un segmentado compacto, con selección negra y texto blanco.
- Los desplegables conservan los selects originales para valores, validación y envío; una presentación común sustituye el menú azul del sistema. Admiten flechas, Inicio/Fin, escritura inicial, Enter, Escape y Tab.
- Cliente, cotización, factura, pedido, producto/servicio, material, proveedor, compra, movimiento independiente, contenido, actividad, tarea y suscripción comparten un lateral de 280 px. Las tarjetas se apilan bajo el formulario hasta 1100 px.
- Los encabezados de tablas comparten el fondo `brown-soft`, como Registrar.

Implementación: `ui-standards.mjs`, integrado al renderizado del Hub, y reglas comunes al final de `shared.css`. El observador contempla opciones y formularios añadidos dinámicamente. No cambia la persistencia ni las integraciones externas.

Verificación: 147 pruebas automáticas aprobadas; navegación de los 13 formularios; medidas en escritorio y móvil de 390 px sin desbordamiento horizontal en las pantallas comprobadas; laterales de 280 px en escritorio; alturas de indicadores de 122 px; cambio Persona/Empresa e Ingreso/Gasto; selección con teclado; bloqueo de envío con cliente obligatorio vacío; campos de pago ocultos y desactivados en gasto pendiente; consola sin errores en la comprobación final. Datos sintéticos aislados, sin guardar registros reales.

Los archivos temporales de prueba se retiran antes de integrar a producción.

## Corrección de barras de filtros

La envoltura `.hub-select` debe recibir las mismas reglas de distribución que recibía el `select` directo. Sin ellas, su ancho de 100 % apilaba cada filtro también en escritorio. Las reglas compartidas y las de Agenda/Contenido ahora incluyen ambos elementos; en móvil conservan ancho completo y altura de 44 px, sin heredar una base flexible de escritorio. Agenda aplica el relleno al botón interior una sola vez.

Revisión en navegador a 1920, 1366, 1024 y 390 px: barras de Clientes, Cotizaciones, Facturas, Pedidos, Portafolio, Inventario, Proveedores, Finanzas, Contenido, Agenda, Tareas, Suscripciones y Estadísticas. En escritorio amplio se confirmó una sola fila en las barras de filtros principales, sin desbordamiento horizontal. Se comprobó apertura y cierre con Escape, retorno del foco, controles móviles de ancho completo y consola sin errores. Las 147 pruebas automáticas siguen aprobadas.

## Tipografía e indicadores unificados

`typography.css`, cargado al final, es la referencia compartida para la escala de texto y los indicadores. Mantiene Montserrat y las funciones de títulos de página (28 px), panel (22 px), sección (18 px), registro (15 px), cuerpo (13 px), ayuda (12 px) y metadatos (11 px).

Indicadores de Inicio, Clientes, Ventas, Pedidos, Portafolio, Inventario, Estadísticas y Suscripciones: 122 px de alto, cifras de 22 px, etiquetas y ayudas de 12 px, círculo de 48 px e icono de 22 px. Comparten relleno, radio, separación de 16 px, alineación izquierda y centrado vertical. Suscripciones usa el mismo marcado que las demás métricas; «Sin importes registrados» es un estado informativo de 13 px, no una cifra. Las comparaciones de Inicio también usan 12 px.

Finanzas conserva sus dos agrupaciones, separadores y etiquetas debajo de cada importe. Sus cifras y etiquetas usan 22/12 px y alineación izquierda. Los importes excepcionalmente largos permanecen consultables mediante desplazamiento dentro de la cifra, sin ampliar la página ni reducir arbitrariamente el tamaño de letra.

Verificado en navegador a 1920, 1366 y 390 px en las secciones indicadas, y a 320 px con importes sintéticos extremos. Se confirmaron tamaños calculados, alturas de 122 px, iconos de 48/22 px, ausencia de desbordamiento exterior, panel de Notas con título de 22 px y conservación de la barra horizontal de filtros en escritorio. Los importes habituales de Finanzas caben también a 320 px. Las 147 pruebas automáticas pasan. No se modificaron registros reales ni integraciones.

## Escala final aprobada: seis tamaños

La propietaria aprobó expresamente la muestra visual de seis tamaños: 28 px para títulos de página (peso 300), 22 px para cifras y títulos de paneles (500), 18 px para secciones (500), 15 px para títulos de notas, tarjetas y registros (500), 13 px para texto, campos y botones (400), y 12 px para etiquetas, ayudas, fechas y metadatos (400). Esta decisión sustituye los metadatos de 11 px y las excepciones tipográficas anteriores. Los títulos de página conservan los 28 px también en móvil y admiten salto de línea.

Los estilos de cada sección ahora referencian esas funciones, sin tamaños variables ni excepciones por página para texto de interfaz. Los alias anteriores resuelven a la misma escala. Las cifras desglosadas por moneda, los resúmenes de etapas/inventario y las comparaciones estadísticas usan 22 px. Los símbolos de cierre/flecha y el logotipo tipográfico preparado se conservan como elementos gráficos, independientes de la escala de texto.

Corrección solicitada: «Saldos pendientes» y «Actividad del mes» de Finanzas usan peso regular (400), conservando tamaño, posición y demás estilos.

## Etiquetas de creación

Portafolio muestra «Nuevo producto o servicio»; Proveedores muestra «Nuevo proveedor» o «Nueva compra» según la vista seleccionada; Finanzas muestra «Registrar movimiento». El botón de compras abre directamente `purchases/new`, conservando el alternador Proveedor/Compra. Se verificaron los cuatro recorridos con datos sintéticos, las etiquetas sin recortes a 1920, 1024 y 390 px y consola sin errores. Las 149 pruebas pasan. Los archivos de prueba se retiran antes de publicar.

Suscripciones: «Costo mensual estimado» y «Próximos pagos» muestran cero con la moneda principal configurada cuando no hay importes registrados. Si hay importes, se mantienen separados por moneda; se conservan los avisos de costos sin configurar.

Estadísticas: se oculta el marcador triangular nativo delante de los cuatro «Ver registros» de los indicadores. Se conserva el elemento desplegable y su funcionamiento con teclado; los demás desplegables no cambian.

Agenda: «Hoy», las flechas y el mes con el año se leen juntos a la izquierda. En escritorio, «Hoy» ocupa el ancho de la columna de horas y «Nueva actividad» se alinea con el extremo de la cuadrícula, a 12 px del selector de vista. En pantallas estrechas los controles se redistribuyen y el texto de «Nueva actividad» queda en una sola línea.

Verificación: 149 pruebas aprobadas, incluidas dos que protegen la escala y el orden de carga de su hoja canónica. Auditoría de textos visibles en 29 pantallas a 1920, 390 y 320 px (87 comprobaciones): ningún tamaño de texto fuera de la escala, títulos de página de 28 px, indicadores de 122 px y sin desbordamiento horizontal exterior. Notas y Mis frases también se comprobaron abiertas, con títulos de 22 px, descripción de 13 px y metadatos de 12 px. Consola sin errores. No se cambiaron los registros ni las integraciones.

## Categorías de suscripciones · 8 noviembre 2026

Cada suscripción conserva Uso y añade una categoría principal elegida por la propietaria: Diseño y contenido, Organización y almacenamiento, Marketing y comunicación, Administración y finanzas o Web y tecnología. Los registros anteriores permanecen Sin categorizar; el campo histórico category continúa siendo un respaldo de Uso. La categoría se conserva en el detalle, las exportaciones y la recuperación sin alterar el historial de precios.

Los cuatro indicadores son Activas, Costo mensual equivalente, Mayor gasto por categoría y Renovaciones este mes. El costo mensual equivalente normaliza cada frecuencia; las monedas se mantienen separadas. Mayor gasto agrega los equivalentes por categoría y moneda, reconoce empates e indica cuando faltan importes. Sin gasto positivo se muestra Sin datos. Renovaciones este mes cuenta las renovaciones pendientes desde hoy hasta el último día del mes, excluyendo períodos ya cobrados. No registra pagos ni modifica Finanzas.

Verificación: 152 pruebas aprobadas, edición y persistencia de categoría en navegador con datos sintéticos, adaptación móvil sin desbordamiento horizontal e indicadores de 122 px.

Contenido y Suscripciones: se retiran los contornos de las cuatro columnas del tablero, del botón Nueva suscripción y la línea bajo los encabezados de su tabla. Se conservan fondos, dimensiones, separadores de registros y foco de teclado.

Los encabezados de las tablas del Hub y de la lista de Tareas usan la tipografía aprobada en Suscripciones: 13 px y peso regular, igual que los botones de creación.

Las tablas, tarjetas y acciones rectangulares usan el radio de superficie de 6 px. Los campos de búsqueda y desplegables usan el radio de control de 4 px. El ajuste de esquinas conserva el grosor, el color y los separadores existentes.

Los encabezados de tablas y de la lista de Tareas usan Montserrat de 13 px en peso medio (500). Mis frases y Configuración comparten el mismo icono de lápiz. Los botones de cierre de Mis frases y Notas comparten el tono al pasar el cursor, y el foco de teclado usa un tono marrón visible. Los botones con fondo de color mantienen su texto sin subrayado al pasar el cursor.

Las acciones que abren un formulario desde las listas y fichas usan fondo beige, con texto e ícono negros, tanto en enlaces como en botones. Guardar y Confirmar usan fondo negro.

Los formularios de creación llevan una sola línea divisoria sobre las acciones finales, alineada con los campos. Las acciones se agrupan a la derecha y pueden pasar a otra fila en pantallas estrechas. Cancelar y Vista previa se muestran como texto y se subrayan al interactuar. Las acciones secundarias llevan borde fino y la principal tiene fondo negro. En Ventas, el orden es Vista previa, Guardar borrador y la acción principal. Agregar línea se alinea a la derecha de la tabla. Las filas de productos conservan el borde de sus campos.

Agenda usa un único desplazamiento vertical al borde derecho del calendario, con la barra fina marrón sobre el mismo fondo blanco del calendario. La selección de horas usa el fondo suave y las esquinas redondeadas de «Nueva actividad». Las fechas y los controles permanecen visibles cuando la ventana tiene espacio suficiente. En ventanas bajas se usa el desplazamiento de página para dejar accesibles los controles.

Las tablas comparables del Hub siguen el acabado de Suscripciones. Tienen encabezado beige de esquinas redondeadas y peso 500, sin marco exterior ni línea bajo los títulos. Las filas conservan separadores horizontales entre registros.
