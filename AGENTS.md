# Reglas permanentes del proyecto Life Deco Art

- Trabajar únicamente dentro de `C:\Proyectos\Life Deco Art`.
- Explicar en lenguaje sencillo los cambios realizados.
- No eliminar ni reemplazar archivos importantes sin consultar a la propietaria.
- No publicar, desplegar, comprar ni conectar servicios sin autorización de la propietaria.
- Mantener el sitio adaptable a computadoras, tabletas y móviles.
- Verificar los cambios y corregir errores antes de dar una tarea por terminada.
- No inventar textos, precios, políticas, productos ni información comercial.
- Conservar las decisiones aprobadas y documentar los cambios relevantes.
- Considerar que la propietaria no es programadora y evitar instrucciones innecesariamente técnicas.
- No instalar dependencias ni elegir todavía una tecnología para la web.
- Considerar que `main` representa la versión de producción y no debe modificarse directamente.
- Realizar todos los cambios primero en una rama de trabajo.
- No ejecutar `push`, crear pull requests ni desplegar sin autorización de la propietaria.
- Preservar las integraciones actuales con Firebase y Vercel.
- Nunca exponer contraseñas, claves privadas ni datos de clientes.

## Flujo obligatorio después de cada cambio

1. Realizar y verificar primero los cambios en la rama de trabajo, nunca directamente en `main`.
2. Antes de enviar la rama a GitHub, indicar a la propietaria qué cambió, qué pruebas se realizaron y solicitar su autorización para generar una vista previa.
3. Cuando la propietaria lo autorice, enviar únicamente la rama de trabajo a GitHub y generar una vista previa de Vercel. No publicar todavía en producción.
4. Compartir siempre con la propietaria el enlace exacto y directo de la vista previa de Vercel.
5. Esperar a que la propietaria revise la vista previa. No continuar automáticamente.
6. Después de su revisión, preguntarle explícitamente: “¿Apruebas esta vista previa y autorizas integrar los cambios en `main` para publicarlos en producción?”
7. Solo si responde expresamente que aprueba la vista previa y autoriza la publicación, integrar los cambios aprobados en `main` y permitir el despliegue en producción.
8. Un “ok”, “continúa”, “adelante” o una aprobación dada antes de recibir el enlace de la vista previa no constituye autorización para publicar en producción.
9. Después de publicar, confirmar a la propietaria el enlace de la web oficial, el commit publicado y el estado final del despliegue.
10. Si la vista previa presenta errores, conservar la web pública intacta, corregir los problemas en la rama de trabajo y generar otra vista previa para su aprobación.
