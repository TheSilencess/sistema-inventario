# Verificación de entrega — 7 de octubre de 2026

## Resultados ejecutados

- Backend: `npm run prisma:generate`, compilación TypeScript estricta y `npm test`: 6/6 pruebas de reglas de stock aprobadas.
- Frontend: `npm run build` aprobado; páginas separadas por importación dinámica para reducir la carga inicial.
- Migración SQL inicial aplicada con Prisma, incluyendo CHECK de stock, precios y coherencia de movimientos.
- Seed ejecutado repetidamente: categorías y administrador sin duplicados.
- Suite API aprobada: login, rechazo 401 sin sesión, protección ADMIN/EMPLOYEE, creación y edición de producto y variantes, rechazo de edición directa de stock, entrada, reintento idempotente, salida insuficiente, salida válida, ajuste, conteo obsoleto, dos salidas simultáneas, filtros de alertas, trazabilidad del usuario, historial, dashboard, CSV/PDF, desactivación, protección de la propia cuenta, rotación/reutilización de refresh y revocación al cerrar sesión.
- Chromium real, conectado a la API: login, creación de producto desde formulario, entrada, salida, ajuste, navegación por las secciones, tema oscuro persistido, restauración de sesión tras recarga y menú móvil a 390 px sin desbordamiento de la página.
- Capturas de la aplicación en `docs/`: claro, oscuro e inventario móvil. Los registros de las capturas fueron creados durante las pruebas y no forman parte del seed ni del proyecto entregado.

## Entorno y límites de las comprobaciones

Las pruebas de integración y navegador utilizaron **PGlite**, un motor PostgreSQL embebido/WASM expuesto por TCP a Prisma, con una conexión del cliente. No se ejecutaron sobre una instalación nativa de PostgreSQL ni sobre tu servidor de producción. La prueba de peticiones simultáneas comprobó que solo una salida obtiene las unidades disponibles, pero no certifica comportamiento de múltiples conexiones nativas PostgreSQL; ejecuta la suite incluida en una base PostgreSQL de prueba antes del despliegue real.

No se realizó despliegue en Hostinger/Vercel ni conexión a una base tuya. El proyecto está configurado para PostgreSQL estándar y conserva las migraciones y pruebas para repetir esa validación en tu entorno. Las capturas verifican vistas de escritorio y móvil, no una matriz completa de dispositivos/navegadores.
