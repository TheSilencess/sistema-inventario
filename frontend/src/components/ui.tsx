import {
  ReactNode,
  useEffect,
  useState,
  useRef,
  useId,
  Children,
  cloneElement,
  isValidElement,
} from "react";
import {
  PackageSearch,
  X,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { get, message } from "../services/api";
export const money = (value: string | number) =>
  new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(
    Number(value),
  );
export const date = (value: string) =>
  new Date(value).toLocaleString("es-GT", {
    timeZone: "America/Guatemala",
    dateStyle: "medium",
    timeStyle: "short",
  });
export const variantName = (v: { size: string; color: string }) =>
  [v.size, v.color].filter(Boolean).join(" / ") || "Variante única";
export const labels = {
  ENTRY: "Entrada",
  EXIT: "Salida",
  ADJUSTMENT: "Ajuste",
};
export function Badge({
  stock,
  min,
  status,
}: {
  stock: number;
  min: number;
  status?: string;
}) {
  return (
    <span
      className={`badge ${status === "INACTIVE" ? "neutral" : stock === 0 ? "danger" : stock <= min ? "warning" : "success"}`}
    >
      {status === "INACTIVE"
        ? "Inactivo"
        : stock === 0
          ? "Agotado"
          : stock <= min
            ? "Stock bajo"
            : "Disponible"}
    </span>
  );
}
export function Heading({
  title,
  sub,
  action,
}: {
  title: string;
  sub: string;
  action?: ReactNode;
}) {
  return (
    <div className="heading">
      <div>
        <div className="eyebrow">OPERACIÓN / BODEGA</div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({
  text = "No hay registros para mostrar.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <PackageSearch size={36} />
      <strong>{text}</strong>
      <p>Agrega un registro o prueba con otros filtros.</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="skeleton-group" aria-label="Cargando">
      {[1, 2, 3].map((n) => (
        <div key={n} className="skeleton" />
      ))}
    </div>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="error-box">
      {message(error)}
      {retry && (
        <button className="btn secondary" onClick={retry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const fieldId = useId();
  const labelId = fieldId + "-label";
  const labelControls = (child: ReactNode): ReactNode => {
    if (
      !isValidElement<{
        id?: string;
        "aria-labelledby"?: string;
        children?: ReactNode;
      }>(child)
    )
      return child;
    if (
      typeof child.type === "string" &&
      ["input", "select", "textarea"].includes(child.type)
    ) {
      return cloneElement(child, {
        id: child.props.id || fieldId,
        "aria-labelledby": labelId,
      });
    }
    if (child.type === "div")
      return cloneElement(child, {
        children: Children.map(child.props.children, labelControls),
      });
    return child;
  };
  return (
    <div className="field">
      <label id={labelId} htmlFor={fieldId}>
        {label}
      </label>
      {Children.map(children, labelControls)}
    </div>
  );
}

export function Submit({
  busy,
  children = "Guardar",
}: {
  busy: boolean;
  children?: ReactNode;
}) {
  return (
    <button className="btn" disabled={busy} type="submit">
      {busy && <LoaderCircle size={16} className="animate-spin" />}
      {busy ? "Guardando…" : children}
    </button>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input,button,select")?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button onClick={close} className="icon-btn" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Pager({
  total,
  page,
  limit = 20,
  setPage,
}: {
  total: number;
  page: number;
  limit?: number;
  setPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pager">
      <span>
        {total} registros · Página {page} de {pages}
      </span>
      <div>
        <button
          aria-label="Página anterior"
          className="icon-btn"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          aria-label="Página siguiente"
          className="icon-btn"
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
export function useData<T>(
  url: string,
  params: Record<string, unknown> = {},
  version = 0,
) {
  const [data, setData] = useState<T>(),
    [error, setError] = useState<unknown>(),
    [loading, setLoading] = useState(true),
    [reloadCount, setReload] = useState(0);
  const key = JSON.stringify(params);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(undefined);
    void get<T>(url, JSON.parse(key) as Record<string, unknown>)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [url, key, version, reloadCount]);
  return { data, error, loading, reload: () => setReload((n) => n + 1) };
}
export function useDebounce(value: string) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setV(value), 300);
    return () => clearTimeout(timer);
  }, [value]);
  return v;
}
