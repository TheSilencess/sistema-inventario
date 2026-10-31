# Auditoría inicial Kadosh — 30/10/2026

El RAR original permanece intacto. Se trabaja sobre una copia y la rama `mejora/kadosh-ui-auditoria`. Los archivos .env se conservan sin leer sus valores en la salida ni modificar sus conexiones.

## Base confirmada antes de editar

Versiones resueltas de los lockfiles: React 19.3.0, TypeScript 5.9.3, Vite 7.3.7, Tailwind 3.4.19, Axios 1.20.0, Lucide 0.548.0, Recharts 3.10.1, Express 5.2.1 y Prisma/client 6.19.0. Backend Node.js con PostgreSQL, Zod, JWT, bcrypt y PDFKit. No se actualizan dependencias.

Ambas compilaciones y las seis pruebas de stock pasan antes de editar. Se leyeron los componentes, contextos, páginas y módulos solicitados, servicios, validadores, middleware, esquema, dos migraciones, pruebas, README y VERIFICATION.

## Hallazgos confirmados por código

1. Identidad Bodega/verde distinta de Kadosh; colores dispersos en CSS, gráficas y HTML. Texto secundario #85918c sobre blanco y tamaños de 9–12px dificultan lectura.
2. Layout: drawer móvil sin Escape, captura/restauración de foco ni aislamiento del fondo; sus enlaces siguen accesibles al teclado cuando está fuera de pantalla. Falta salto al contenido.
3. Inventory: stock se inicializa desde searchParams una sola vez; navegar a otra URL con ?stock deja el filtro anterior.
4. DateFilters: value siempre custom; no refleja selección. Elegir custom invoca preset y cambia las fechas a hoy.
5. Field: htmlFor apunta al ID generado aunque el control tenga ID propio; el clic en la etiqueta no enfoca ese control.
6. Users: envía role/active aunque no cambien. El backend invalida sesiones al recibirlos; editar nombre/correo revoca sesiones sin la confirmación prevista. Corregir el payload frontend, conservando backend y autenticación.
7. MovementForm: catch borra selección incluso sin respuesta HTTP. Volver a seleccionar genera otro requestId; si el servidor aplicó la operación, el reintento puede duplicarla. Conservar formulario/identificador en errores de red y bloquear filtros/selección durante envío.
8. Products: eliminar variante nueva tiene botón sin nombre accesible. Tablas desplazables sin nombre/foco explícitos ni scope en encabezados.
9. Login: error únicamente en aviso temporal; falta mensaje persistente del formulario y estado accesible de visibilidad de contraseña.

## Límites

No hay evidencia que justifique modificar stock o ganancias. Se conservarán rutas, permisos, estructura, contratos, esquema, migraciones, autenticación, cálculos y generador PDF. Las pruebas usarán PostgreSQL local nuevo con variables exclusivas del proceso.
