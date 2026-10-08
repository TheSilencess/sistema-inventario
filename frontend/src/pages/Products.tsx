import { useAuth } from "../contexts/Auth";
import VariantFilters from "../components/VariantFilters";
import { useState, FormEvent } from "react";
import { Plus, Search, Pencil, Package, Layers, Trash2 } from "lucide-react";
import type { Product, Variant, Category, Page } from "../types";
import { save, message } from "../services/api";
import { useUI } from "../contexts/UI";
import {
  Heading,
  Field,
  Submit,
  Modal,
  Pager,
  Empty,
  Loading,
  ErrorBox,
  useData,
  useDebounce,
  money,
  Badge,
  variantName,
} from "../components/ui";
type Draft = {
  sku: string;
  barcode: string;
  name: string;
  description: string;
  brand: string;
  categoryId: string;
  purchasePrice: string;
  salePrice: string;
  status: "ACTIVE" | "INACTIVE";
  hasVariants: boolean;
};
type VDraft = {
  sku: string;
  barcode: string;
  size: string;
  color: string;
  minimumStock: number;
  status: "ACTIVE" | "INACTIVE";
};
const blank: Draft = {
  sku: "",
  barcode: "",
  name: "",
  description: "",
  brand: "",
  categoryId: "",
  purchasePrice: "0",
  salePrice: "0",
  status: "ACTIVE",
  hasVariants: false,
};
const blankV: VDraft = {
  sku: "",
  barcode: "",
  size: "",
  color: "",
  minimumStock: 5,
  status: "ACTIVE",
};
export default function Products() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { toast } = useUI();
  const [search, setSearch] = useState(""),
    [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [version, setVersion] = useState(0);
  const query = useDebounce(search);
  const list = useData<Page<Product>>(
    "/products",
    {
      page,
      search: query,
      size: size || undefined,
      color: color || undefined,
      categoryId: category || undefined,
      status: status || undefined,
    },
    version,
  );
  const cats = useData<Category[]>("/categories", {}, version);
  const [edit, setEdit] = useState<Product | null>(),
    [draft, setDraft] = useState<Draft>(blank),
    [variants, setVariants] = useState<VDraft[]>([{ ...blankV }]),
    [busy, setBusy] = useState(false),
    [detail, setDetail] = useState<Product>(),
    [vEdit, setVEdit] = useState<Variant | null>(),
    [vDraft, setVDraft] = useState<VDraft>(blankV);
  const changed = () => {
    setVersion((n) => n + 1);
    setDetail(undefined);
  };
  const open = (p?: Product) => {
    setEdit(p || null);
    setDraft(
      p
        ? {
            sku: p.sku,
            barcode: p.barcode || "",
            name: p.name,
            description: p.description,
            brand: p.brand,
            categoryId: p.categoryId,
            purchasePrice: p.purchasePrice,
            salePrice: p.salePrice,
            status: p.status,
            hasVariants: p.hasVariants,
          }
        : { ...blank },
    );
    setVariants([{ ...blankV }]);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      edit &&
      draft.status === "INACTIVE" &&
      edit.status === "ACTIVE" &&
      !confirm("¿Desactivar este producto? Su historial se conservará.")
    )
      return;
    setBusy(true);
    try {
      const { hasVariants, status, ...fields } = draft;
      const base = { ...fields, ...(isAdmin ? { status } : {}) };
      const data = {
        ...base,
        barcode: base.barcode || null,
        ...(edit
          ? {}
          : {
              hasVariants,
              variants: variants.map((v) => ({
                ...v,
                sku: !hasVariants ? `${draft.sku}-BASE` : v.sku,
                barcode: v.barcode || null,
              })),
            }),
      };
      await save(
        edit ? "patch" : "post",
        edit ? `/products/${edit.id}` : "/products",
        data,
      );
      toast(
        edit
          ? "Producto actualizado correctamente."
          : "Producto creado. Registre una entrada para agregar existencias.",
      );
      setEdit(undefined);
      changed();
    } catch (error) {
      toast(message(error), "error");
    } finally {
      setBusy(false);
    }
  };
  const submitVariant = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    if (
      vEdit &&
      vDraft.status === "INACTIVE" &&
      vEdit.status === "ACTIVE" &&
      !confirm("¿Desactivar esta variante?")
    )
      return;
    setBusy(true);
    try {
      await save(
        vEdit ? "patch" : "post",
        `/products/${detail.id}/variants${vEdit ? `/${vEdit.id}` : ""}`,
        { ...vDraft, status: isAdmin ? vDraft.status : undefined, barcode: vDraft.barcode || null },
      );
      toast("Variante guardada correctamente.");
      setVEdit(undefined);
      changed();
    } catch (error) {
      toast(message(error), "error");
    } finally {
      setBusy(false);
    }
  };
  const vdFields = (
    value: VDraft,
    update: (v: VDraft) => void,
    simple = false,
  ) => (
    <>
      <Field label="SKU de variante">
        <input
          required={!simple}
          disabled={simple}
          value={simple && edit === null ? `${draft.sku}-BASE` : value.sku}
          onChange={(e) => update({ ...value, sku: e.target.value })}
        />
      </Field>
      <Field label="Código de barras (opcional)">
        <input
          value={value.barcode}
          onChange={(e) => update({ ...value, barcode: e.target.value })}
        />
      </Field>
      {!simple && (
        <>
          <Field label="Talla">
            <input
              value={value.size}
              placeholder="40, M, Única…"
              onChange={(e) => update({ ...value, size: e.target.value })}
            />
          </Field>
          <Field label="Color">
            <input
              value={value.color}
              placeholder="Negro, Blanco…"
              onChange={(e) => update({ ...value, color: e.target.value })}
            />
          </Field>
        </>
      )}
      <Field label="Stock mínimo">
        <input
          type="number"
          required
          min="0"
          max="1000000"
          value={value.minimumStock}
          onChange={(e) =>
            update({ ...value, minimumStock: Number(e.target.value) })
          }
        />
      </Field>
    </>
  );
  return (
    <>
      <Heading
        title="Productos"
        sub="Organiza tu catálogo, sus tallas y sus colores."
        action={
          <button className="btn" onClick={() => open()}>
            <Plus size={17} />
            Nuevo producto
          </button>
        }
      />
      <section className="panel no-pad">
        <div className="filters">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Buscar producto"
              placeholder="Nombre, SKU, marca o código de barras…"
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
            search={query}
            size={size}
            color={color}
            categoryId={category}
            status={status}
            version={version}
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
          <select
            aria-label="Estado"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
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
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>{size || color ? "Stock filtrado" : "Stock total"}</th>
                    <th>Compra / Venta</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="product-cell">
                          <span className="product-icon">
                            <Package size={20} />
                          </span>
                          <div>
                            <strong>{p.name}</strong>
                            <small>
                              {p.sku} · {p.brand || "Sin marca"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {p.category.name}
                        <small>{p.variants.length} variante(s)</small>
                      </td>
                      <td className="tabular">
                        {p.variants
                          .filter((v) => v.status === "ACTIVE")
                          .reduce((s, v) => s + v.stock, 0)}{" "}
                        <small>unidades activas</small>
                      </td>
                      <td>
                        {money(p.purchasePrice)}
                        <small>{money(p.salePrice)}</small>
                      </td>
                      <td>
                        <span
                          className={`badge ${p.status === "ACTIVE" ? "success" : "neutral"}`}
                        >
                          {p.status === "ACTIVE" ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          {<button
                            className="icon-btn"
                            aria-label={`Editar ${p.name}`}
                            title="Editar producto"
                            onClick={() => open(p)}
                          >
                            <Pencil size={16} />
                          </button>}
                          <button
                            className="icon-btn"
                            aria-label={`Variantes de ${p.name}`}
                            title="Ver y editar variantes"
                            onClick={() => setDetail(p)}
                          >
                            <Layers size={17} />
                          </button>
                        </div>
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
      {edit !== undefined && (
        <Modal
          title={edit ? "Editar producto" : "Nuevo producto"}
          close={() => {
            if (!busy) setEdit(undefined);
          }}
        >
          <form onSubmit={submit}>
            <div className="form-grid">
              <Field label="Nombre">
                <input
                  required
                  minLength={2}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label="SKU del producto">
                <input
                  required
                  value={draft.sku}
                  onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                />
              </Field>
              <Field label="Categoría">
                <select
                  required
                  value={draft.categoryId}
                  onChange={(e) =>
                    setDraft({ ...draft, categoryId: e.target.value })
                  }
                >
                  <option value="">Selecciona una categoría</option>
                  {cats.data
                    ?.filter(
                      (c) => c.status === "ACTIVE" || c.id === draft.categoryId,
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Marca">
                <input
                  value={draft.brand}
                  onChange={(e) =>
                    setDraft({ ...draft, brand: e.target.value })
                  }
                />
              </Field>
              <Field label="Precio de compra (Q)">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.purchasePrice}
                  onChange={(e) =>
                    setDraft({ ...draft, purchasePrice: e.target.value })
                  }
                />
              </Field>
              <Field label="Precio de venta (Q)">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.salePrice}
                  onChange={(e) =>
                    setDraft({ ...draft, salePrice: e.target.value })
                  }
                />
              </Field>
              <Field label="Código de barras del producto">
                <input
                  value={draft.barcode}
                  onChange={(e) =>
                    setDraft({ ...draft, barcode: e.target.value })
                  }
                />
              </Field>
              <Field label="Estado">
                <select
                  disabled={!isAdmin}
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      status: e.target.value as Draft["status"],
                    })
                  }
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </Field>
            </div>
            <Field label="Descripción">
              <textarea
                rows={2}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </Field>
            {!edit && (
              <>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={draft.hasVariants}
                    onChange={(e) => {
                      setDraft({ ...draft, hasVariants: e.target.checked });
                      setVariants([{ ...blankV }]);
                    }}
                  />
                  Este producto tiene tallas o colores
                </label>
                <div className="form-note">
                  El stock comienza en cero. Registra una entrada para agregar
                  existencias con trazabilidad.
                </div>
                {variants.map((v, i) => (
                  <div className="variant-form" key={i}>
                    <div className="section-title">
                      <strong>
                        {draft.hasVariants
                          ? `Variante ${i + 1}`
                          : "Inventario del producto"}
                      </strong>
                      {i > 0 && (
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() =>
                            setVariants((vs) => vs.filter((_, n) => n !== i))
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <div className="form-grid">
                      {vdFields(
                        v,
                        (newV) =>
                          setVariants((vs) =>
                            vs.map((old, n) => (n === i ? newV : old)),
                          ),
                        !draft.hasVariants,
                      )}
                    </div>
                  </div>
                ))}
                {draft.hasVariants && (
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => setVariants((vs) => [...vs, { ...blankV }])}
                  >
                    <Plus size={16} />
                    Agregar variante
                  </button>
                )}
              </>
            )}
            <div className="form-actions">
              <button
                className="btn secondary"
                type="button"
                disabled={busy}
                onClick={() => setEdit(undefined)}
              >
                Cancelar
              </button>
              <Submit busy={busy} />
            </div>
          </form>
        </Modal>
      )}
      {detail && vEdit === undefined && (
        <Modal
          title={detail.name + " · Variantes"}
          close={() => setDetail(undefined)}
        >
          <p className="muted">
            {detail.description || "Sin descripción"} · {detail.sku}
          </p>
          {detail.variants.map((v) => (
            <div className="variant-row" key={v.id}>
              <div>
                <strong>{variantName(v)}</strong>
                <small>
                  {v.sku} · Mínimo: {v.minimumStock}
                </small>
              </div>
              <Badge stock={v.stock} min={v.minimumStock} status={v.status} />
              <strong>{v.stock} ud.</strong>
              {<button
                className="icon-btn"
                aria-label="Editar variante"
                onClick={() => {
                  setVEdit(v);
                  setVDraft({
                    sku: v.sku,
                    barcode: v.barcode || "",
                    size: v.size,
                    color: v.color,
                    minimumStock: v.minimumStock,
                    status: v.status,
                  });
                }}
              >
                <Pencil size={16} />
              </button>}
            </div>
          ))}
          {detail.hasVariants && (
            <button
              className="btn"
              onClick={() => {
                setVEdit(null);
                setVDraft({ ...blankV });
              }}
            >
              <Plus size={16} />
              Agregar variante
            </button>
          )}
        </Modal>
      )}
      {detail && vEdit !== undefined && (
        <Modal
          title={vEdit ? "Editar variante" : "Nueva variante"}
          close={() => {
            if (!busy) setVEdit(undefined);
          }}
        >
          <form onSubmit={submitVariant}>
            <div className="form-grid">
              {vdFields(vDraft, setVDraft, !detail.hasVariants)}
              <Field label="Estado">
                <select
                  disabled={!isAdmin}
                  value={vDraft.status}
                  onChange={(e) =>
                    setVDraft({
                      ...vDraft,
                      status: e.target.value as VDraft["status"],
                    })
                  }
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </Field>
            </div>
            <div className="form-actions">
              <Submit busy={busy} />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
