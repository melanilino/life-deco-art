# Life Deco Art — prueba de producción (Fase 7)
Fecha: 2026-08-09

## Validaciones completadas
- JavaScript embebido en todos los `.dc.html`: sin errores de sintaxis.
- `vercel.json`: JSON válido.
- WhatsApp: número unificado a +1 849-539-0410.
- Tienda desktop y móvil: productos con estado `Borrador` se excluyen del catálogo público.
- CMS: el botón Publicar ahora maneja fallos de Firebase y no queda bloqueado en “Guardando…”.
- CMS: se retiraron del menú de edición páginas que aún no tenían flujo real de carga/guardado (Contacto, Privacidad y Términos), evitando una publicación falsa.
- Contacto: validación de nombre/email/mensaje, estado de envío y error de red.
- Comunidad móvil: la suscripción ya intenta usar el endpoint de Brevo en vez de marcar éxito solo localmente.
- Talleres de respaldo: fechas vencidas sustituidas por “Próximamente”.
- Seguridad de pestañas nuevas: `noopener noreferrer`.
- Vercel: headers básicos de seguridad añadidos.
- Referencias locales de archivos: comprobadas automáticamente.

## Arquitectura Firebase
- Firestore permite lectura pública de `/content/{pageId}` y escritura solo a usuarios autenticados.
- Storage permite lectura pública y escritura solo a usuarios autenticados.
- El CMS usa Firebase Auth con email/contraseña antes de cargar y guardar contenido.

## Punto que requiere verificación después del despliegue
La prueba web externa del dominio devolvió un 404 al intentar abrir la página actual, aunque el índice de búsqueda aún conserva un crawl reciente del contenido anterior. Conviene desplegar esta candidata en Preview de Vercel primero y validar las rutas allí antes de promoverla a producción.

## Checklist de Preview
1. `/` carga y Hero visible.
2. `/tienda` carga catálogo; un producto marcado Borrador en CMS no aparece públicamente.
3. `/aprende` carga contenido y CTAs de WhatsApp.
4. `/contacto` rechaza campos vacíos y muestra “Enviando…” al enviar.
5. Inicio de sesión en CMS funciona.
6. Cambiar un texto pequeño en Inicio, Publicar y confirmar que aparece al refrescar la web.
7. Subir una imagen desde CMS y confirmar que la URL de Storage se visualiza.
8. Verificar navegación móvil y WhatsApp.
9. Verificar `robots.txt` y `sitemap.xml`.
