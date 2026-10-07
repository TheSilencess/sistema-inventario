import { useState } from "react";
import { Download, FileText, FileSpreadsheet, Search } from "lucide-react";
import type { Category, Page } from "../types";
import { api, message } from "../services/api";
import { useUI } from "../contexts/UI";
import {
  Heading,
  Field,
  Loading,
  ErrorBox,
  Empty,
  Pager,
  useData,
  useDebounce,
} from "../components/ui";
import { DateFilters, Dates, apiDates } from "../components/DateFilters";
const options = [
  ["inventory", "Inventario actual"],
  ["low", "Stock bajo"],
  ["out", "Productos agotados"],
  ["entry", "Entradas"],
  ["exit", "Salidas"],
  ["adjustment", "Ajustes"],
  ["user", "Movimientos por usuario"],
  ["product", "Movimientos por producto"],
  ["value", "Valor del inventario"],
];
export default function Reports() {
  const { toast } = useUI();
  const [report, setReport] = useState("inventory"),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [actor, setActor] = useState(""),
    [page, setPage] = useState(1),
    [dates, setDates] = useState<Dates>({ from: "", to: "" }),
    [busy, setBusy] = useState(false);
  const q = useDebounce(search);
  const params = {
    report,
    search: q,
    categoryId: category || undefined,
    userId: actor || undefined,
    ...apiDates(dates),
  };
  const list = useData<Page<Record<string, string | number>>>("/reports", {
    ...params,
    page,
  });
  const cats = useData<Category[]>("/categories"),
    actors = useData<{ id: string; name: string }[]>("/movements/actors");
  const isMovement = [
    "entry",
    "exit",
    "adjustment",
    "user",
    "product",
  ].includes(report);
  const exportFile = async (format: "csv" | "pdf") => {
    setBusy(true);
    try {
      const res = await api.get("/reports", {
        params: { ...params, format },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data as Blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `bodega-${report}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Reporte descargado.");
    } catch (error) {
      if (error && typeof error === "object" && "response" in error) {
        const response = (error as { response?: { data?: Blob } }).response;
        if (response?.data instanceof Blob) {
          try {
            const body = JSON.parse(await response.data.text()) as {
              error: { message: string };
            };
            toast(body.error.message, "error");
            return;
          } catch {
            /* Fall back to standard API error. */
          }
        }
      }
      toast(message(error), "error");
    } finally {
      setBusy(false);
    }
  };
  const columns = list.data?.items.length
    ? Object.keys(list.data.items[0])
    : [];
  return (
    <>
      <Heading
        title="Reportes"
        sub="Convierte tus movimientos y existencias en información útil."
        action={
          <div className="row-actions">
            <button
              className="btn secondary"
              disabled={busy}
              onClick={() => exportFile("csv")}
            >
              <FileSpreadsheet size={17} />
              {busy ? "Exportando…" : "CSV"}
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => exportFile("pdf")}
            >
              <Download size={17} />
              PDF
            </button>
          </div>
        }
      />
      <section className="panel no-pad">
        <div className="filters advanced">
          <Field label="Reporte">
            <select
              value={report}
              onChange={(e) => {
                setReport(e.target.value);
                setPage(1);
              }}
            >
              {options.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Buscar en reporte"
              placeholder="Nombre o SKU…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
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
          {isMovement && (
            <>
              <Field label="Usuario">
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
            </>
          )}
        </div>
        <div className="report-note">
          <FileText size={16} />
          {isMovement
            ? "Movimientos según el rango seleccionado."
            : "Existencias actuales y valor al costo de compra actual; no es una valoración histórica."}
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
                    {columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((r, i) => (
                    <tr key={i}>
                      {columns.map((c) => (
                        <td key={c}>
                          {c === "Fecha"
                            ? new Date(r[c]).toLocaleString("es-GT", {
                                timeZone: "America/Guatemala",
                              })
                            : String(r[c])}
                        </td>
                      ))}
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
