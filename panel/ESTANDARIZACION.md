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
