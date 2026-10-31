# Kadosh · Auditoría técnica y rediseño UI/UX

**Entrega: 30 de octubre de 2026.** Se mejoró el proyecto existente del archivo `sistema-inventario.rar`, sobre una copia y la rama `mejora/kadosh-ui-auditoria`. El RAR original permanece intacto. No se reconstruyó la aplicación.

## Resultado

Interfaz Kadosh en todas las pantallas existentes: login, dashboard, productos, inventario, categorías, entradas, salidas, ajustes, historial, reportes, usuarios y configuración. Se conservan ambos temas, las funciones existentes y la separación frontend/backend.

Se corrigieron errores comprobados de filtros, accesibilidad, envío de cambios de usuario y reintentos de movimientos. El backend, su esquema, migraciones, permisos, autenticación, cálculos de stock/ganancias y generador PDF mantienen su código original.

## Tecnologías confirmadas

Versiones resueltas de los archivos de bloqueo, comprobadas antes de editar:

| Componente | Versión |
| --- | --- |
| React / React DOM | 19.3.0 |
| TypeScript | 5.9.3 |
| Vite | 7.3.7 |
| Tailwind CSS | 3.4.19 |
| Axios | 1.20.0 |
| Lucide React | 0.548.0 |
| Recharts | 3.10.1 |
| Express | 5.2.1 |
| Prisma / Prisma Client | 6.19.0 |

El proyecto utiliza React Router, Node.js, PostgreSQL, Zod, JWT, bcrypt y PDFKit. El entorno de verificación utilizó Node.js 24.17.0, npm 11.13.0 y PostgreSQL nativo 17.10. No se cambiaron manifests ni lockfiles y no se agregaron dependencias de aplicación.

Los rangos de `package.json` y las versiones resueltas de los lockfiles son distintos en algunos casos; esta tabla informa las versiones efectivamente bloqueadas, no una actualización realizada durante este trabajo.

## Alcance de auditoría

Se revisaron Layout, UI, DateFilters, VariantFilters, ambos contextos, el cliente HTTP, estilos, configuración Tailwind y las diez páginas solicitadas. También los módulos backend de autenticación, usuarios, categorías, productos, inventario, movimientos, dashboard y reportes; servicios de stock, inventario, ganancias y PDF; middleware, validadores, esquema Prisma, las dos migraciones, seed y pruebas existentes.

Se contrastaron README, VERIFICATION y las capturas de referencia de `docs/`. La documentación previa se usó como contexto; los resultados de esta entrega se obtuvieron ejecutando nuevamente las verificaciones indicadas abajo.

## Diseño aplicado

- Paleta oficial: negro `#151515`, blanco `#FFFFFF`, gris cálido `#E8E6E3` y taupe `#A89B8C`. Variables de marca y variables semánticas reutilizables, integradas con Tailwind.
- Navegación oscura con marca tipográfica Kadosh, sección activa clara, encabezado según la ruta y pie consistente. La letra K es un tratamiento tipográfico de interfaz; no sustituye un archivo de logotipo oficial.
- Login de composición editorial, jerarquía tipográfica, campos legibles, estado de visibilidad de contraseña y error persistente junto al formulario.
- Tarjetas, métricas, tablas, filtros, formularios, modales, botones, alertas y avisos con espaciados, bordes y tamaños consistentes.
- Gráficos con tonos neutros y taupe, conservando exactamente sus series y valores.
- Tablas con desplazamiento dentro de su contenedor, foco de teclado, nombre accesible, encabezados definidos e indicación de desplazamiento en móvil. Se mantienen todas sus columnas.
- Campos y acciones de mayor tamaño, foco visible, contraste mejorado y respeto a la preferencia de movimiento reducido existente.
- Diseño de escritorio, tablet y móvil. Se conserva la preferencia previa de tema del dispositivo mediante la misma clave existente.

Contrastes medidos como comprobación parcial: texto secundario sobre blanco **5.36:1**, borde de campos sobre blanco **3.83:1**, serie taupe del gráfico sobre blanco **4.11:1** y borde de campos oscuro sobre su fondo **3.53:1**. Esto no equivale a una certificación integral de accesibilidad.

## Fallos comprobados y correcciones

| Hallazgo y evidencia | Corrección localizada |
| --- | --- |
| Inventario leía `?stock` solo al inicializar estado. Una navegación a otro filtro dentro de la pantalla podía conservar el filtro anterior. | Sincronización con la URL; los botones también actualizan ese parámetro. Las peticiones conservan el contrato existente. |
| DateFilters fijaba siempre `value="custom"`; seleccionar esa opción pasaba por `preset` y podía cambiar las fechas a hoy. | El selector refleja el intervalo actual. La opción personalizada es informativa y no modifica fechas. |
| Users enviaba `role` y `active` aunque no cambiaran. El backend revoca sesiones al recibir esos campos, incluso al editar únicamente el nombre. | El formulario omite esos campos sin cambios. Se conserva la revocación existente cuando corresponde y todo el mecanismo de autenticación. |
| MovementForm borraba selección tras cualquier error. Una respuesta perdida después de guardar obligaba a seleccionar de nuevo y generaba otro identificador. | En errores sin respuesta se conservan los datos y el identificador para reintentar. La selección y los controles se bloquean durante el envío; una referencia evita envíos simultáneos del formulario. |
| El menú móvil permanecía en el recorrido de teclado cuando estaba fuera de pantalla y no gestionaba Escape o foco. | Ocultación accesible, foco capturado y restaurado, cierre con Escape, fondo inerte, bloqueo de desplazamiento y recuperación al cambiar a escritorio. Se añadió salto al contenido. |
| Field vinculaba `htmlFor` al identificador generado aunque el control tuviera uno propio. | Etiqueta y control comparten el identificador efectivo. |
| El botón para quitar una variante nueva no tenía nombre accesible. Tablas desplazables sin foco/nombre explícitos. | Etiqueta específica por variante, regiones de tabla accesibles y encabezados `scope="col"`. |
| Error de login solo en aviso temporal. | Mensaje persistente del formulario; misma llamada y mismo flujo de autenticación. |
| Identidad verde/Bodega y textos pequeños o poco contrastados. | Identidad Kadosh y ajustes visuales compartidos. |

No se cambiaron reglas de negocio por preferencia de diseño. No se encontraron motivos comprobados para modificar fórmulas de stock o ganancias.

## Archivos de aplicación modificados

1. `frontend/index.html`
2. `frontend/tailwind.config.js`
3. `frontend/src/styles.css`
4. `frontend/src/components/Layout.tsx`
5. `frontend/src/components/ui.tsx`
6. `frontend/src/components/DateFilters.tsx`
7. `frontend/src/pages/Login.tsx`
8. `frontend/src/pages/Dashboard.tsx`
9. `frontend/src/pages/Products.tsx`
10. `frontend/src/pages/Inventory.tsx`
11. `frontend/src/pages/MovementForm.tsx`
12. `frontend/src/pages/History.tsx`
13. `frontend/src/pages/Reports.tsx`
14. `frontend/src/pages/Users.tsx`

Categorías y configuración reciben el rediseño mediante los estilos/componentes compartidos. VariantFilters y los contextos existentes también se benefician sin modificar su código. La documentación y las capturas nuevas se agregan a `docs/`; las referencias originales se conservan.

## Pruebas ejecutadas y resultados

### Compilación y base inicial

- Antes de modificar: backend y frontend compilaban; seis pruebas de stock aprobadas.
- Después: `npm run build` aprobado en backend y frontend. Build final frontend en modo producción, conservando la carga diferida existente. Sin errores TypeScript ni avisos de tamaño de fragmento en el build final.
- `npm test`: **6/6 aprobadas**. Entradas, agotamiento, rechazo de salida insuficiente, ajustes y desbordamiento numérico.
- `git diff --check`: aprobado.

### Integración con PostgreSQL nativo

`npm run test:integration`: **aprobado** sobre una base local nueva, exclusivamente de QA. Se generó el cliente Prisma y se aplicaron las dos migraciones originales solamente en esa base vacía; también se ejecutó el seed allí. Las variables se establecieron en el proceso de prueba y no se modificaron los archivos `.env`.

La suite existente comprobó:

- Login, 401 sin sesión, renovación/rotación, rechazo de reutilización y revocación al cerrar sesión.
- Permisos ADMIN/EMPLOYEE: edición permitida del catálogo; bloqueo de desactivaciones, eliminación y rutas administrativas para el empleado.
- Productos y variantes; rechazo de modificación directa del stock.
- Entrada, reintento idempotente, rechazo de una salida insuficiente, salida válida y ajuste con control de conteo obsoleto.
- Dos salidas simultáneas: solo una obtiene las unidades disponibles.
- Historial, trazabilidad, dashboard y filtros de existencias.
- Coincidencia de talla/color en una misma variante y búsqueda por SKU.
- Ganancias por venta, exclusión de otras salidas, conservación de precios históricos tras editar el producto y resumen completo con paginación.
- Exportaciones CSV/PDF y restricciones de cuenta.

### Navegador con API y base reales de QA

Pruebas automatizadas con Chrome, sobre el frontend compilado para producción:

- Credenciales incorrectas con error persistente; login válido; sesión y tema oscuro conservados al recargar.
- Carga y navegación de todas las secciones administrativas, sin errores JavaScript de renderizado.
- Modales: captura de foco, Escape y restauración de foco.
- Navegación entre filtros de stock y selección/edición de periodos.
- Edición de nombre del usuario: la petición omite `role/active` sin cambios y la sesión continúa.
- Respuesta perdida deliberadamente después de que el servidor registra una entrada: el reintento mantiene el mismo `requestId` y existe **un solo movimiento**. Controles deshabilitados durante envío.
- Creación y edición de producto desde formularios, dos variantes, agregar/quitar variantes y búsqueda por SKU.
- Entrada, venta y ajuste desde formularios: **stock 0 → 10 → 7 → 6**. Para la variante seleccionada, tres unidades vendidas a Q179 con costo Q80 produjeron **Q297 de ganancia**, tanto en API como en reporte.
- Creación de categoría y empleado desde los formularios existentes.
- Empleado: inicio en Productos, menú limitado y redirección de URLs administrativas.
- Cambio de contraseña en una cuenta temporal de QA, cierre de sesión y nuevo login.
- Respuesta PDF válida recibida por el navegador, con firma `%PDF`, y evento de descarga iniciado.
- Diez secciones revisadas a **768, 390 y 320px**, sin desbordamiento horizontal de la página. Las tablas conservan desplazamiento interno.
- Menú móvil con fondo inerte, foco capturado, Escape y restauración.
- Capturas finales de escritorio, tema oscuro, modales y móvil revisadas visualmente.

Los productos, movimientos y cuentas con marca QA son datos temporales de la base separada de pruebas. No reemplazaron datos originales, no se insertaron en el código y no se incluyen como base de datos en la entrega.

## Pendientes y límites de validación

1. **Guardado de la descarga en un navegador normal.** Chrome automático recibió el PDF válido e inició la descarga, pero canceló el guardado local (`canceled`). Una prueba mínima de descarga Blob fuera de la aplicación tampoco completó el guardado. No se atribuye esto a un fallo confirmado del sistema. Queda pendiente comprobar el archivo guardado en una sesión de navegador normal. No se modificó el generador PDF ni su contenido funcional.
2. No se conectó a producción ni se hizo despliegue. No se validaron los datos de una instalación real, sus copias de seguridad ni su infraestructura.
3. No se ejecutó una matriz de Safari/Firefox/dispositivos físicos ni pruebas con lector de pantalla. Las comprobaciones de accesibilidad y tamaños citadas delimitan lo efectivamente revisado.
4. Prisma 6 emite su aviso de configuración heredada `package.json#prisma`. No impide las verificaciones y se conserva para respetar las tecnologías/configuración solicitadas.

## Cómo utilizar la entrega

El ZIP contiene el código fuente completo y la estructura original, con documentación y capturas. Excluye `.env`, historial `.git`, dependencias instaladas y archivos de compilación. Los `.env.example` originales permanecen como referencia. **Conserva los `.env` de tu instalación** al aplicar el código; no se requiere ningún cambio de esquema ni migración nueva por este rediseño.

En una copia de tu instalación, instala las versiones bloqueadas con `npm ci` en backend y frontend y compila ambos. Si reinstalas las dependencias del backend, genera su cliente con `npm run prisma:generate`. El frontend usa su `VITE_API_URL` habitual al compilar. El README original conserva las instrucciones de operación. No ejecutes el seed de QA ni copies sus datos sobre producción.

El parche `KADOSH-cambios.patch` contiene únicamente los cambios de aplicación y permite revisarlos frente al código original. Las capturas nuevas se identifican con el prefijo `kadosh-` dentro de `docs/`. Los resultados de navegador se entregan como evidencia JSON; las pruebas API originales siguen en `backend/tests/`.

## Conservación comprobada

Se verificó que backend, manifests, lockfiles, esquema, migraciones y archivos `.env` mantienen su contenido original. No se renombraron endpoints, módulos o carpetas, no se otorgaron capacidades nuevas a los roles y no se alteraron cálculos, operaciones de inventario ni contenido funcional de reportes PDF.

Las pruebas ejecutadas respaldan los flujos descritos; los límites anteriores permanecen expresamente abiertos.
