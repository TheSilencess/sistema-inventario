# Bodega — Sistema de inventario

Aplicación real con Express/TypeScript, Prisma/PostgreSQL y React/Vite/Tailwind. Sin Docker y sin datos de inventario ficticios.

## Estructura

- `backend/src/modules`: rutas/controladores y consultas de auth, usuarios, productos, categorías, inventario, movimientos, dashboard y reportes.
- `backend/src/services`: reglas de stock y servicio transaccional de inventario.
- `backend/src/validators`: validaciones tipadas de movimientos.
- `backend/src/config`: configuración validada y transacciones con reintento.
- `backend/src/middleware`: autenticación y autorización.
- `backend/prisma`: schema, migración SQL inicial, seed idempotente.
- `backend/tests`: pruebas unitarias y de integración sobre PostgreSQL real.
- `frontend/src/pages`: pantallas conectadas a la API.
- `frontend/src/components`: controles reutilizables y layout responsive.
- `frontend/src/contexts`: autenticación, tema y notificaciones.
- `frontend/src/services`: cliente HTTP con renovación de sesión.

## Requisitos

Node.js 22.12 o superior (recomendado Node 24 LTS), npm y PostgreSQL 15 o superior. Se ejecuta en Windows, macOS o Linux. No requiere Docker.

## 1. Crear PostgreSQL

En pgAdmin o psql, conectado como administrador:

```sql
CREATE USER bodega_app WITH PASSWORD 'una_clave_segura';
CREATE DATABASE bodega OWNER bodega_app;
```

Para `prisma migrate dev`, el usuario necesita permiso de crear la base temporal de migraciones (`ALTER USER bodega_app CREATEDB;`) o una `shadowDatabaseUrl` configurada. Para instalar las migraciones ya incluidas sin ese permiso, usa `npm run prisma:deploy`.

## 2. Backend

Abre una terminal dentro de `backend`:

```bash
npm install
```

Copia `.env.example` a `.env`. En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

En macOS/Linux:

```bash
cp .env.example .env
```

Configura los valores:

```dotenv
DATABASE_URL="postgresql://bodega_app:una_clave_segura@localhost:5432/bodega?schema=public"
JWT_SECRET="un_secreto_aleatorio_de_al_menos_32_caracteres"
JWT_REFRESH_SECRET="otro_secreto_aleatorio_distinto_de_al_menos_32_caracteres"
PORT=3000
FRONTEND_URL="http://localhost:5173"
NODE_ENV=development
COOKIE_SAME_SITE=lax
TRUST_PROXY=0
BUSINESS_TIMEZONE=America/Guatemala
SEED_ADMIN_EMAIL=jeremojuarez@gmail.com
SEED_ADMIN_PASSWORD="OJUAREZ2008!!!"
```

Los secretos deben ser aleatorios y distintos. Puedes generar cada uno con:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Si la contraseña de PostgreSQL contiene caracteres como `@`, `#` o `:`, codifícalos como componentes de URL en `DATABASE_URL`.

```bash
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

Alternativa durante cambios de schema locales: `npm run prisma:migrate -- --name nombre_del_cambio`. Para producción utiliza exclusivamente `npm run prisma:deploy`.

API: `http://localhost:3000/api`. Health: `GET /api/health`.

El seed crea las categorías Zapatos, Ropa y Accesorios en tablas, y crea el administrador solo si no existe. No cambia contraseñas de usuarios existentes y no agrega productos ni movimientos demo. El secreto inicial se recibe del entorno, se guarda con bcrypt (12 rondas) y no se registra en logs. Puedes retirar `SEED_ADMIN_PASSWORD` de `.env` después de crear el administrador.

## 3. Frontend

En una segunda terminal, dentro de `frontend`:

```bash
npm install
```

Copia `.env.example` a `.env` (con `Copy-Item` o `cp`) y configura:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

```bash
npm run dev
```

Abre `http://localhost:5173`. No uses `127.0.0.1` en una parte y `localhost` en otra: la cookie y CORS necesitan una estrategia de origen consistente.

## Acceso inicial solicitado

Correo: `jeremojuarez@gmail.com`.

Contraseña: `OJUAREZ2008!!!`, si configuraste ese valor antes del primer seed.

Nombre: Administrador Principal. Rol: ADMIN.

Los campos del login comienzan vacíos. Después de ingresar puedes cambiar la contraseña en Configuración. Las nuevas contraseñas de usuarios requieren al menos 12 caracteres con mayúsculas, minúsculas, números y símbolos.

## Operación

1. Crea o edita categorías.
2. Crea un producto simple, o un producto con tallas/colores. El tipo simple/con variantes queda definido al crearlo para preservar su historial.
3. En productos simples existe una variante interna única; todos los stocks se controlan desde `ProductVariant`. El producto agrega el stock de sus variantes activas.
4. Registra una **entrada** para cargar stock inicial. No se permite editar existencias desde el formulario de productos.
5. Registra salidas o ajustes. Un ajuste requiere el stock que se mostró al abrir el formulario: si otra persona movió mercancía, se solicita actualizar antes de confirmar.
6. Consulta inventario, historial y reportes. Las exportaciones CSV/PDF usan las mismas consultas y filtros del backend.
7. Un ADMIN puede crear, editar, activar, desactivar, cambiar roles y restablecer contraseñas. Un EMPLOYEE puede crear productos y variantes, buscar productos con filtros, consultar inventario, registrar entradas/salidas y ajustar stock. También edita la información de productos y variantes existentes. Solo configura su propia cuenta. Dashboard, historial, reportes, gestión de categorías/usuarios y eliminación o desactivación de productos/variantes requieren ADMIN. Puede consultar categorías para seleccionar una al crear productos.

Una categoría inactiva deja de aceptar nuevas asignaciones; sus productos existentes conservan su estado y operación. Los productos/variantes se desactivan sin borrar registros ni stock. Los movimientos conservan las FK del producto por medio de la variante; nombres y costos mostrados corresponden al catálogo actual. El valor del inventario es el stock activo multiplicado por el costo de compra actual, no una contabilidad FIFO ni una valoración histórica.

## Integridad y seguridad

- Cada cambio de stock actualiza la variante, crea un movimiento y crea auditoría dentro de la misma transacción SERIALIZABLE, con reintentos de conflictos PostgreSQL.
- La migración agrega CHECK para stock no negativo y coherencia de los movimientos.
- Las cantidades guardadas son diferencias firmadas: ENTRY positivo; EXIT negativo; ADJUSTMENT puede ser positivo o negativo. La UI muestra antes/después.
- `requestId` UUID evita procesar dos veces el mismo movimiento y rechaza reutilizaciones con datos distintos.
- Access JWT de 15 minutos solo en memoria. Refresh JWT de 7 días en cookie HttpOnly, almacenado como SHA-256 en BD, con rotación y revocación por familia.
- Logout revoca la familia de sesión. Cambiar contraseña/rol/estado invalida sesiones. Cada petición valida usuario activo, tokenVersion y sesión vigente en PostgreSQL.
- CORS restringido; validación Origin en acciones con cookie; rate limit de login y API; Helmet; validación Zod; hashes y secretos no salen en respuestas.
- Decimales PostgreSQL para precios; fechas timestamptz/UTC en BD, presentación Guatemala. Los rangos de UI usan UTC-6, correcto para Guatemala.
- No se puede quitar el último administrador activo ni desactivar/degradar la propia cuenta de administrador.
- CSV neutraliza fórmulas de hojas de cálculo. Exportaciones limitadas a 10,000 filas; la API exige reducir filtros si el reporte supera el límite.

## API

La respuesta normal es `{ "data": ... }`; los errores usan `{ "error": { "message": ... } }`. Listados paginados contienen `{ items, total, page, limit }`. Validación retorna 422; no autenticado 401; permisos 403; conflicto 409.

| Método     | Ruta                                  | Función                                                 |
| ---------- | ------------------------------------- | ------------------------------------------------------- |
| POST       | /api/auth/login                       | email/password; access y usuario seguro; cookie refresh |
| POST       | /api/auth/refresh                     | Renueva tokens desde cookie                             |
| POST       | /api/auth/logout                      | Revoca sesión                                           |
| GET        | /api/auth/me                          | Perfil                                                  |
| POST       | /api/auth/password                    | currentPassword/password                                |
| GET, POST  | /api/users                            | Listar/crear, ADMIN                                     |
| PATCH      | /api/users/:id                        | Editar/restablecer, ADMIN                               |
| GET, POST  | /api/categories                       | Listar/crear                                            |
| PATCH      | /api/categories/:id                   | Editar estado/nombre                                    |
| GET, POST  | /api/products                         | Listar/crear                                            |
| GET, PATCH | /api/products/:id                     | Consultar/editar                                        |
| POST       | /api/products/:id/variants            | Agregar variante                                        |
| PATCH      | /api/products/:id/variants/:variantId | Editar variante                                         |
| GET        | /api/inventory                        | Stock paginado                                          |
| POST       | /api/inventory/movements              | Entrada/salida/ajuste                                   |
| GET        | /api/movements                        | Historial paginado                                      |
| GET        | /api/movements/actors                 | Nombres para filtros; sin gestión de cuentas            |
| GET        | /api/dashboard                        | Resumen, gráficas, recientes y alertas                  |
| GET        | /api/reports                          | JSON paginado, CSV o PDF                                |

Paginación: `page=1&limit=20&search=texto&sortOrder=desc`. En productos: `sortBy=createdAt|name|sku`, `categoryId`, `status=ACTIVE|INACTIVE`. Inventario: `stockStatus=LOW|OUT|AVAILABLE`. Movimientos: `from/to` ISO con zona horaria, `productId/categoryId/userId/type`. Reportes: `report=inventory|low|out|entry|exit|adjustment|user|product|value`, `format=json|csv|pdf`. "Por usuario/producto" son listados detallados filtrables, no tablas de agregados.

Ejemplo de entrada autenticada:

```json
{
  "variantId": "UUID_DE_LA_VARIANTE",
  "type": "ENTRY",
  "quantity": 20,
  "reason": "Compra proveedor",
  "notes": "Factura 123",
  "requestId": "UUID_NUEVO_PARA_ESTA_OPERACION"
}
```

Un ajuste sustituye `quantity` por `newStock` y `expectedStock`.

En Postman, usa Bearer Token con el access devuelto por login. Para refresh/logout conserva la cookie e incluye `Origin: http://localhost:5173`. El backend no acepta gestionar cuentas de terceros con rol EMPLOYEE.

## Build y producción

Backend:

```bash
npm run build
npm start
```

Frontend:

```bash
npm run build
npm run preview
```

`preview` sirve para verificar el bundle localmente. Publica `frontend/dist` en un hosting estático con fallback de rutas a `index.html` (se incluye `vercel.json`). Ejecuta backend con Node, HTTPS y variables privadas. Configura `FRONTEND_URL` exacto y `VITE_API_URL` antes de compilar frontend. Ejecuta migraciones de producción antes de arrancar API.

Recomendación para sesiones: `app.tudominio.com` y `api.tudominio.com` bajo el mismo dominio registrable con HTTPS y `COOKIE_SAME_SITE=lax`. Si frontend/backend están en sitios distintos, usa `NODE_ENV=production`, `COOKIE_SAME_SITE=none` y HTTPS; navegadores que bloquean cookies de terceros pueden impedir esas sesiones, por lo que conviene dominio propio o proxy del mismo sitio. Detrás de un único proxy de confianza usa `TRUST_PROXY=1`; ajusta según la infraestructura real.

Haz backups de PostgreSQL y cambia las credenciales iniciales antes de operación real. El límite de peticiones es por proceso; para varios procesos distribuye el rate limit en tu infraestructura. Todas las variables `VITE_*` son públicas: jamás coloques secretos allí.

## Pruebas

```bash
# backend
npm test
npm run build

# frontend
npm run build
```

Pruebas de API con una **base separada de prueba**: configura su `DATABASE_URL` en `backend/.env`, aplica migraciones y seed, y establece `RUN_INTEGRATION_TESTS=true` y `TEST_ADMIN_PASSWORD` en el entorno. Luego:

```bash
npm run test:integration
```

El script arranca el servidor temporalmente, prueba login, permisos, variantes, entradas, salidas, ajuste, historial, dashboard, usuarios, exportaciones y concurrencia. Crea registros con un sufijo aleatorio y los limpia al terminar; no debe ejecutarse contra producción. Consulta `VERIFICATION.md` para ver cuáles verificaciones se ejecutaron durante esta entrega.

## Actualización: tallas, colores y ganancias

La búsqueda por SKU incluye desplegables de talla y color en Productos, Inventario y selección de productos de Entradas/Salidas/Ajustes. Ambos filtros deben coincidir con la misma variante.

Reportes incluye **Ganancias por ventas**: (precio de venta - costo) × unidades vendidas. Solo incluye salidas registradas como venta. Se guardan los precios de cada movimiento nuevo, por lo que editar precios del producto no cambia esas ganancias históricas. Las salidas antiguas cuyo motivo era «Venta» se identifican como ventas; sus precios anteriores no estaban guardados, por lo que se muestran como estimados usando los precios actuales. Otras salidas antiguas no se reclasifican automáticamente. La ganancia es bruta y no descuenta gastos, impuestos ni comisiones. Los totales abarcan todos los registros filtrados, no solo la página visible.

Los PDF tienen diseño horizontal, encabezados y filtros, tablas por tipo de reporte, filas con texto ajustado, totales y numeración. Incluye una muestra con datos ficticios en `docs/reporte-ganancias-ejemplo.pdf`.

Para actualizar una instalación existente: conserva tus archivos `.env`, copia el código actualizado y ejecuta en `backend`:

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run build
```

En `frontend`, ejecuta `npm ci` y `npm run build` (o reinicia `npm run dev` en desarrollo). Reinicia también el backend. La migración conserva productos, stock, usuarios e historial; no uses `prisma migrate reset`.
