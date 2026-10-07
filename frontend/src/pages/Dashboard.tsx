import { Link } from "react-router-dom";
import {
  Package,
  Boxes,
  TriangleAlert,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Wallet,
  PackageX,
  Plus,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import type { Dashboard as Data } from "../types";
import {
  Heading,
  Loading,
  ErrorBox,
  Empty,
  useData,
  money,
  date,
  variantName,
  labels,
  Badge,
} from "../components/ui";
export default function Dashboard() {
  const { data, loading, error, reload } = useData<Data>("/dashboard");
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox error={error} retry={reload} />;
  const s = data.summary;
  const cards = [
    ["Productos activos", s.products, Package, "Catálogo de la bodega"],
    ["Unidades disponibles", s.units, Boxes, "Stock de variantes activas"],
    ["Stock bajo", s.low, TriangleAlert, "Variantes por reponer"],
    ["Agotados", s.out, PackageX, "Variantes sin existencias"],
  ] as const;
  return (
    <>
      <Heading
        title="Vista general"
        sub="Una mirada clara a lo que pasa en tu bodega."
        action={
          <Link className="btn" to="/entries">
            <Plus size={17} />
            Registrar entrada
          </Link>
        }
      />
      <div className="welcome-strip">
        <span className="live-dot" />
        <strong>Tu bodega, al día</strong>
        <span>Datos actuales del inventario</span>
        <Link to="/reports">
          Ver reportes <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="stat-grid">
        {cards.map(([title, value, Icon, sub]) => (
          <Link
            key={title}
            className="stat-card"
            to={
              title === "Productos activos"
                ? "/products"
                : title === "Stock bajo"
                  ? "/inventory?stock=LOW"
                  : title === "Agotados"
                    ? "/inventory?stock=OUT"
                    : "/inventory"
            }
          >
            <div>
              <span>{title}</span>
              <Icon size={19} />
            </div>
            <strong>{value.toLocaleString("es-GT")}</strong>
            <small>{sub}</small>
          </Link>
        ))}
      </div>
      <div className="metric-strip">
        <div>
          <span className="metric-icon">
            <ArrowDownToLine size={20} />
          </span>
          <div>
            <small>Entradas de hoy</small>
            <strong>
              {s.entriesToday} <em>unidades</em>
            </strong>
          </div>
        </div>
        <div>
          <span className="metric-icon peach">
            <ArrowUpFromLine size={20} />
          </span>
          <div>
            <small>Salidas de hoy</small>
            <strong>
              {s.exitsToday} <em>unidades</em>
            </strong>
          </div>
        </div>
        <div>
          <span className="metric-icon">
            <Wallet size={20} />
          </span>
          <div>
            <small>Valor del inventario</small>
            <strong>{money(s.value)}</strong>
            <small>A costo de compra actual</small>
          </div>
        </div>
      </div>
      <div className="chart-grid">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Flujo de inventario</h2>
              <p>Unidades registradas durante los últimos 7 días</p>
            </div>
            <span className="badge neutral">7 días</span>
          </div>
          <div className="chart-legend">
            <span>
              <i />
              Entradas
            </span>
            <span>
              <i className="orange" />
              Salidas
            </span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.chart}>
              <defs>
                <linearGradient id="entry" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#357f6b" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#357f6b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="day"
                tickFormatter={(v) => String(v).slice(5)}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--panel)",
                  borderColor: "var(--border)",
                  borderRadius: 10,
                }}
              />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="entry"
                name="Entradas"
                stroke="#357f6b"
                strokeWidth={2.5}
                fill="url(#entry)"
              />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="exit"
                name="Salidas"
                stroke="#d59464"
                strokeWidth={2}
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Inventario por categoría</h2>
              <p>Distribución de unidades</p>
            </div>
          </div>
          {data.categories.length ? (
            <ResponsiveContainer width="100%" height={270}>
              <BarChart
                data={data.categories}
                layout="vertical"
                margin={{ left: 15, right: 20 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fill: "var(--text)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel)",
                    borderColor: "var(--border)",
                  }}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="units"
                  name="Unidades"
                  fill="#357f6b"
                  radius={[0, 5, 5, 0]}
                  barSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </section>
      </div>
      <div className="bottom-grid">
        <section className="panel no-pad">
          <div className="panel-title padded">
            <div>
              <h2>Movimientos recientes</h2>
              <p>La actividad más reciente de tu equipo</p>
            </div>
            <Link className="text-link" to="/history">
              Ver todos <ArrowUpRight size={15} />
            </Link>
          </div>
          {data.recent.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Movimiento</th>
                    <th>Cantidad</th>
                    <th>Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.variant.product.name}</strong>
                        <small>
                          {variantName(m.variant)} · {date(m.createdAt)}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`badge ${m.type === "ENTRY" ? "success" : m.type === "EXIT" ? "warning" : "neutral"}`}
                        >
                          {labels[m.type]}
                        </span>
                      </td>
                      <td className="tabular">
                        {m.quantity > 0 ? "+" : ""}
                        {m.quantity}
                      </td>
                      <td>{m.user.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="Todavía no hay movimientos." />
          )}
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Necesitan atención</h2>
              <p>Variantes con pocas existencias</p>
            </div>
            <TriangleAlert size={19} />
          </div>
          {data.lowStock.length ? (
            data.lowStock.map((v) => (
              <div className="low-row" key={v.id}>
                <span className="product-icon">
                  <Package size={18} />
                </span>
                <div>
                  <strong>{v.product?.name}</strong>
                  <small>{variantName(v)}</small>
                </div>
                <div>
                  <strong>{v.stock} ud.</strong>
                  <Badge stock={v.stock} min={v.minimumStock} />
                </div>
              </div>
            ))
          ) : (
            <Empty text="Todo bajo control." />
          )}
          <Link to="/inventory?stock=LOW" className="btn secondary full">
            Revisar inventario <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
    </>
  );
}
