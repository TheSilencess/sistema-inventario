import VariantFilters from "../components/VariantFilters";
import { useState, FormEvent, useEffect } from "react";
import {
  Search,
  ArrowRight,
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
} from "lucide-react";
import type { Product, Variant, Page } from "../types";
import { save, message } from "../services/api";
import { useUI } from "../contexts/UI";
import {
  Heading,
  Field,
  Submit,
  useData,
  useDebounce,
  Loading,
  ErrorBox,
  variantName,
  Badge,
} from "../components/ui";
export default function MovementForm({
  type,
}: {
  type: "ENTRY" | "EXIT" | "ADJUSTMENT";
}) {
  const { toast } = useUI();
  const [search, setSearch] = useState(""),
    [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [isSale, setIsSale] = useState(false),
    [product, setProduct] = useState<Product>(),
    [variantId, setVariantId] = useState(""),
    [quantity, setQuantity] = useState(""),
    [reason, setReason] = useState(""),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0),
    [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const q = useDebounce(search);
  const results = useData<Page<Product>>(
    "/products",
    {
      search: q,
      size: size || undefined,
      color: color || undefined,
      status: "ACTIVE",
      limit: 20,
    },
    version,
  );
  const variant = product?.variants.find((v) => v.id === variantId);
  const n = Number(quantity);
  const next = variant
    ? type === "ADJUSTMENT"
      ? n
      : type === "ENTRY"
        ? variant.stock + n
        : variant.stock - n
    : 0;
  const title =
    type === "ENTRY"
      ? "Registrar entrada"
      : type === "EXIT"
        ? "Registrar salida"
        : "Ajustar inventario";
  const Icon =
    type === "ENTRY"
      ? ArrowDownToLine
      : type === "EXIT"
        ? ArrowUpFromLine
        : SlidersHorizontal;
  useEffect(() => {
    setProduct(undefined);
    setVariantId("");
    setQuantity("");
    setReason("");
    setNotes("");
    setRequestId(crypto.randomUUID());
  }, [type]);
  const select = (p: Product) => {
    setProduct(p);
    setVariantId(p.variants.find((v) => v.status === "ACTIVE")?.id || "");
    setRequestId(crypto.randomUUID());
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!variant) return;
    if (next < 0) {
      toast("Stock insuficiente.", "error");
      return;
    }
    if (
      !confirm(
        `${title}: ${product?.name} · ${variantName(variant)}. Stock ${variant.stock} → ${next}. ¿Confirmar?`,
      )
    )
      return;
    setBusy(true);
    try {
      await save("post", "/inventory/movements", {
        type,
        variantId,
        reason,
        notes,
        requestId,
        ...(type === "EXIT" ? { isSale } : {}),
        ...(type === "ADJUSTMENT"
          ? { newStock: n, expectedStock: variant.stock }
          : { quantity: n }),
      });
      toast(
        type === "ENTRY"
          ? "Entrada registrada correctamente."
          : type === "EXIT"
            ? "Salida registrada correctamente."
            : "Ajuste registrado correctamente.",
      );
      setProduct(undefined);
      setVariantId("");
      setQuantity("");
      setReason("");
      setIsSale(false);
      setSize("");
      setColor("");
      setNotes("");
      setSearch("");
      setVersion((v) => v + 1);
      setRequestId(crypto.randomUUID());
    } catch (error) {
      toast(message(error), "error");
      setVersion((v) => v + 1);
      setProduct(undefined);
      setVariantId("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        title={title}
        sub={
          type === "ADJUSTMENT"
            ? "Actualiza el conteo físico y conserva la trazabilidad."
            : "Registra mercancía con control y trazabilidad."
        }
      />
      <div className="operation-grid">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>1. Selecciona un producto</h2>
              <p>Busca por nombre, SKU o código de barras</p>
            </div>
            <Search size={20} />
          </div>
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Buscar producto para movimiento"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSize("");
                setColor("");
                setProduct(undefined);
                setVariantId("");
              }}
              placeholder="Buscar en el catálogo…"
            />
          </div>
          <div className="filters">
            <VariantFilters
              search={q}
              size={size}
              color={color}
              status="ACTIVE"
              version={version}
              onSize={(v) => {
                setSize(v);
                setProduct(undefined);
                setVariantId("");
              }}
              onColor={(v) => {
                setColor(v);
                setProduct(undefined);
                setVariantId("");
              }}
            />
          </div>
          <div className="product-results">
            {results.loading ? (
              <Loading />
            ) : results.error ? (
              <ErrorBox error={results.error} retry={results.reload} />
            ) : results.data?.items.length ? (
              results.data.items.map((p) => (
                <button
                  key={p.id}
                  className={product?.id === p.id ? "selected" : ""}
                  onClick={() => select(p)}
                >
                  <span className="product-icon">
                    <Icon size={20} />
                  </span>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.sku} · {p.category.name}
                    </small>
                  </div>
                  <ArrowRight size={17} />
                </button>
              ))
            ) : (
              <p className="muted">
                Sin resultados. Crea el producto en Productos.
              </p>
            )}
          </div>
          <p className="muted tiny">
            Se muestran hasta 20 coincidencias. Afina la búsqueda para encontrar
            más productos.
          </p>
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>2. Detalles del movimiento</h2>
              <p>{product?.name || "Selecciona primero un producto"}</p>
            </div>
          </div>
          <form onSubmit={submit}>
            <Field label="Variante">
              <select
                required
                disabled={!product || busy}
                value={variantId}
                onChange={(e) => {
                  setVariantId(e.target.value);
                  setRequestId(crypto.randomUUID());
                }}
              >
                <option value="">Selecciona talla / color</option>
                {product?.variants
                  .filter((v) => v.status === "ACTIVE")
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {variantName(v)} · {v.sku} · {v.stock} ud.
                    </option>
                  ))}
              </select>
            </Field>
            {variant && (
              <div className="stock-preview">
                <div>
                  <small>Stock actual</small>
                  <strong>{variant.stock}</strong>
                  <Badge stock={variant.stock} min={variant.minimumStock} />
                </div>
                <ArrowRight size={22} />
                <div>
                  <small>Stock resultante</small>
                  <strong className={next < 0 ? "text-danger" : ""}>
                    {next}
                  </strong>
                  <small>
                    {type === "ADJUSTMENT"
                      ? `Diferencia: ${next - variant.stock}`
                      : "unidades"}
                  </small>
                </div>
              </div>
            )}
            <div className="form-grid">
              <Field
                label={
                  type === "ADJUSTMENT"
                    ? "Nuevo stock físico"
                    : "Cantidad de unidades"
                }
              >
                <input
                  type="number"
                  required
                  disabled={busy}
                  min={type === "ADJUSTMENT" ? 0 : 1}
                  max="1000000"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setRequestId(crypto.randomUUID());
                  }}
                />
              </Field>
              <Field label="Motivo / referencia">
                <input
                  required
                  minLength={2}
                  maxLength={200}
                  disabled={busy}
                  list={`reasons-${type}`}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (type === "EXIT")
                      setIsSale(
                        e.target.value.trim().toLowerCase() === "venta",
                      );
                    setRequestId(crypto.randomUUID());
                  }}
                  placeholder={
                    type === "ENTRY"
                      ? "Compra, devolución…"
                      : "Venta, conteo físico…"
                  }
                />
                <datalist id={`reasons-${type}`}>
                  {(type === "ENTRY"
                    ? ["Compra", "Devolución", "Traslado recibido"]
                    : type === "EXIT"
                      ? [
                          "Venta",
                          "Traslado",
                          "Producto dañado",
                          "Uso interno",
                          "Pérdida",
                          "Otro",
                        ]
                      : ["Conteo físico", "Corrección de registro"]
                  ).map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </Field>
            </div>
            <Field label="Observaciones (opcional)">
              <textarea
                rows={3}
                maxLength={2000}
                disabled={busy}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setRequestId(crypto.randomUUID());
                }}
              />
            </Field>
            {type === "EXIT" && (
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={isSale}
                  disabled={busy}
                  onChange={(e) => {
                    setIsSale(e.target.checked);
                    setRequestId(crypto.randomUUID());
                  }}
                />
                Registrar como venta (incluir en ganancias)
              </label>
            )}
            <div className="form-note">
              <ShieldCheck size={16} />
              Se registrará el usuario responsable, la fecha y el stock antes y
              después.
            </div>
            <Submit busy={busy}>{title}</Submit>
          </form>
        </section>
      </div>
    </>
  );
}
