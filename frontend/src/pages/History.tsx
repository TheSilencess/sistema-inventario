import { useState } from "react";
import { Search } from "lucide-react";
import type { Movement, Category, Page } from "../types";
import {
  Heading,
  Field,
  Loading,
  ErrorBox,
  Empty,
  Pager,
  useData,
  useDebounce,
  date,
  variantName,
  labels,
} from "../components/ui";
import { DateFilters, Dates, apiDates } from "../components/DateFilters";
export default function History() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [category, setCategory] = useState(""),
    [actor, setActor] = useState(""),
    [dates, setDates] = useState<Dates>({ from: "", to: "" });
  const q = useDebounce(search);
  const list = useData<Page<Movement>>("/movements", {
    page,
    search: q,
    type: type || undefined,
    categoryId: category || undefined,
    userId: actor || undefined,
    ...apiDates(dates),
  });
  const cats = useData<Category[]>("/categories"),
    actors = useData<{ id: string; name: string }[]>("/movements/actors");
  return (
    <>
      <Heading
        title="Historial de movimientos"
        sub="El registro completo de lo que entra, sale y se ajusta."
      />
      <section className="panel no-pad">
        <div className="filters advanced">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Buscar movimientos"
              value={search}
              placeholder="Producto o SKU…"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Field label="Tipo">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(labels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Categoría">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {cats.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Responsable">
            <select
              value={actor}
              onChange={(e) => {
                setActor(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {actors.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <DateFilters
            value={dates}
            onChange={(d) => {
              setDates(d);
              setPage(1);
            }}
          />
        </div>
        {list.loading ? (
          <Loading />
        ) : list.error ? (
          <ErrorBox error={list.error} retry={list.reload} />
        ) : list.data?.items.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto / Variante</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Stock antes → después</th>
                    <th>Usuario</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((m) => (
                    <tr key={m.id}>
                      <td className="nowrap">{date(m.createdAt)}</td>
                      <td>
                        <strong>{m.variant.product.name}</strong>
                        <small>
                          {variantName(m.variant)} · {m.variant.sku}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`badge ${m.type === "ENTRY" ? "success" : m.type === "EXIT" ? "warning" : "neutral"}`}
                        >
                          {labels[m.type]}
                        </span>
                      </td>
                      <td>
                        {m.quantity > 0 ? "+" : ""}
                        {m.quantity}
                      </td>
                      <td className="tabular">
                        {m.previousStock} → {m.resultingStock}
                      </td>
                      <td>{m.user.name}</td>
                      <td>
                        {m.reason}
                        <small>{m.notes}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager total={list.data.total} page={page} setPage={setPage} />
          </>
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}
