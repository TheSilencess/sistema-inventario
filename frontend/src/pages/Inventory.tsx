import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, ArrowDownToLine, Package } from "lucide-react";
import type { Page, Variant, Category } from "../types";
import {
  Heading,
  Loading,
  ErrorBox,
  Empty,
  Pager,
  useData,
  useDebounce,
  Badge,
  variantName,
  money,
} from "../components/ui";
export default function Inventory() {
  const [params] = useSearchParams(),
    [stock, setStock] = useState(params.get("stock") || ""),
    [category, setCategory] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1);
  const q = useDebounce(search);
  const list = useData<Page<Variant>>("/inventory", {
    page,
    search: q,
    stockStatus: stock || undefined,
    categoryId: category || undefined,
  });
  const cats = useData<Category[]>("/categories");
  return (
    <>
      <Heading
        title="Inventario"
        sub="Existencias exactas por producto, talla y color."
        action={
          <Link className="btn" to="/entries">
            <ArrowDownToLine size={17} />
            Registrar entrada
          </Link>
        }
      />
      <div className="stock-tabs">
        {[
          ["", "Todo el inventario"],
          ["AVAILABLE", "Disponible"],
          ["LOW", "Stock bajo"],
          ["OUT", "Agotado"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={stock === value ? "active" : ""}
            onClick={() => {
              setStock(value);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="panel no-pad">
        <div className="filters">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Buscar inventario"
              placeholder="Buscar nombre, SKU o código de barras…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="Categoría"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas las categorías</option>
            {cats.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
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
                    <th>Producto / SKU</th>
                    <th>Categoría</th>
                    <th>Variante</th>
                    <th>Stock actual</th>
                    <th>Mínimo</th>
                    <th>Estado</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <div className="product-cell">
                          <span className="product-icon">
                            <Package size={19} />
                          </span>
                          <div>
                            <strong>{v.product?.name}</strong>
                            <small>{v.sku}</small>
                          </div>
                        </div>
                      </td>
                      <td>{v.product?.category.name}</td>
                      <td>{variantName(v)}</td>
                      <td className="tabular">
                        <strong>{v.stock}</strong> ud.
                      </td>
                      <td>{v.minimumStock}</td>
                      <td>
                        <Badge stock={v.stock} min={v.minimumStock} />
                      </td>
                      <td>
                        {money(Number(v.product?.purchasePrice || 0) * v.stock)}
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
