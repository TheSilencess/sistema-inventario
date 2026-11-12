import VariantFilters from "../components/VariantFilters";
import { useEffect, useState } from "react";
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
  const [params, setParams] = useSearchParams(),
    [stock, setStock] = useState(params.get("stock") || ""),
    [category, setCategory] = useState(""),
    [search, setSearch] = useState(""),
    [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [page, setPage] = useState(1);
  const q = useDebounce(search);
  const stockParam = params.get("stock") || "";
  useEffect(() => {
    setStock(stockParam);
    setPage(1);
  }, [stockParam]);
  const list = useData<Page<Variant>>("/inventory", {
    page,
    search: q,
    size: size || undefined,
    color: color || undefined,
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
            aria-pressed={stock === value}
            onClick={() => {
              setStock(value);
              setParams((current) => {
                const next = new URLSearchParams(current);
                if (value) next.set("stock", value);
                else next.delete("stock");
                return next;
              });
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
                setSize("");
                setColor("");
                setPage(1);
              }}
            />
          </div>
          <VariantFilters
            search={q}
            size={size}
            color={color}
            categoryId={category}
            status="ACTIVE"
            onSize={(v) => {
              setSize(v);
              setPage(1);
            }}
            onColor={(v) => {
              setColor(v);
              setPage(1);
            }}
          />
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
            <div className="table-wrap" role="region" aria-label="Tabla de inventario" tabIndex={0}>
              <p className="table-hint">Desplaza la tabla para ver todas las columnas →</p>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Producto / SKU</th>
                    <th scope="col">Categoría</th>
                    <th scope="col">Variante</th>
                    <th scope="col">Stock actual</th>
                    <th scope="col">Mínimo</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Valor</th>
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
                        {money(Number(v.product?.salePrice ?? 0) * v.stock)}
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
