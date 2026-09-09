# Implementación del panel — 7 de septiembre de 2026

Rama: codex/panel-empresa. Base anterior a los cambios: c20ffe1.

## Decisiones aprobadas
Propietaria única; cuenta del hub con el mismo correo del CMS; dirección y menú independientes; proyecto Firebase independiente; RD$; catálogo físico/digital/servicios; calculadora sin depender de Excel; cotizaciones versionadas; facturas comerciales sin comprobante fiscal; numeración COT/PED/FAC; pedidos; pagos, reembolsos y compras sin duplicación; inventario opcional; calendario interno con recurrencias; contenido manual; biblioteca; directorio de cuentas sin contraseñas; exportación y recuperación.

## Configuración administrativa
El hub usa el proyecto independiente `lifedecoart-hub`. Blaze fue activado con autorización expresa y la prueba gratuita de Google Cloud existente; no se actualizaron los datos de pago. Firestore Standard usa `nam5`. Storage Standard usa `US-EAST1`, elegida como ubicación con cuota gratuita. Authentication contiene solo `hola@lifedecoart.com`, y `panelAccess/{UID}` la habilita como propietaria.

Las reglas privadas de Firestore y Storage están publicadas. Las simulaciones permiten al UID de la propietaria y rechazan sesiones anónimas u otro UID. Storage limita todas las rutas salvo la carpeta privada de la propietaria, conserva un máximo de 15 MB y acepta únicamente los tipos de archivo previstos. El proyecto del CMS no recibió estas reglas.

Pendientes antes de cerrar: prueba autenticada real, alertas de consumo al 80% para ambos proyectos y publicación del panel.

## Respaldos
La política acordada es copia diaria, retención de 30 días y registros con archivos adjuntos. No activada: la documentación oficial confirma que almacenamiento y restauración generan cargos. La propietaria pidió ser avisada antes de activar cualquier función que pueda cobrar. https://firebase.google.com/docs/firestore/backups
Las copias de Firestore no incluyen los adjuntos de Cloud Storage: requieren una política separada. No afirmar cobertura de archivos con solo habilitar backups de la base.
El panel ofrece exportación manual JSON con adjuntos y recuperación aditiva de registros faltantes; no sustituye el respaldo automático ni una restauración administrativa completa. La pantalla muestra explícitamente la configuración pendiente.

## Arquitectura
HTML/CSS y módulos JavaScript sobre el sitio existente; sin instalación de dependencias. Firebase SDK con la versión que ya usa el CMS. Registros por documento en panelData/{UID}/records, metadatos y secuencias en meta/state, historial append-only. Transacciones con versión global rechazan una pestaña desactualizada y evitan colisiones de numeración, pagos duplicados y movimientos parciales. La carga confirma una versión consistente antes/después de leer registros. No se almacenan registros privados en localStorage.

## Límites que deben permanecer visibles
Se carga el conjunto de registros del panel al abrir; paginación necesaria si el volumen crece. Recuperación aditiva limitada a 400 registros por operación. Adjuntos hasta 15 MB. Los cálculos estimados no son contabilidad fiscal. No hay notificaciones fuera del panel ni publicación automática en redes.

## Validación
Resultados locales comunicados por los agentes de implementación y revisión:

- 12 pruebas de lógica de negocio y recuperación (`domain` y `recovery`) superadas.
- 4 pruebas de persistencia (`store`) superadas con Firebase simulado. No se utilizó el emulador y estas pruebas no verifican las reglas ni la seguridad real de Firebase.
- Recorrido cotización → factura → anticipo verificado en navegador con datos ficticios.
- PDF A4 generado y renderizado para comprobar su presentación.
- Inicio revisado a 1280 px en computadora, 390 px en móvil y 820 px en tableta, sin desbordamiento horizontal.
- La revisión de interfaz detectó y resolvió tres ajustes.

Las comprobaciones adicionales de calendario y configuración están en curso y deben incorporarse cuando concluyan. La guía de uso está en `panel/GUIA.md`.

Estos resultados corresponden a la rama `codex/panel-empresa`, cuya base es `c20ffe1`; todavía falta la prueba autenticada real y la publicación. Los respaldos automáticos siguen sin activar por su costo; solo se ha implementado exportación manual y recuperación aditiva.
