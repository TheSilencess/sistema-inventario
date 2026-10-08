import { Field, useData } from "./ui";
type Props = {
  search: string;
  size: string;
  color: string;
  onSize: (v: string) => void;
  onColor: (v: string) => void;
  categoryId?: string;
  status?: string;
  version?: number;
};
export default function VariantFilters({
  search,
  size,
  color,
  onSize,
  onColor,
  categoryId,
  status,
  version = 0,
}: Props) {
  const { data, loading, error, reload } = useData<{
    sizes: string[];
    colors: string[];
  }>(
    "/products/variant-options",
    {
      search,
      categoryId: categoryId || undefined,
      status: status || undefined,
    },
    version,
  );
  return (
    <>
      <Field label="Talla">
        <select
          value={size}
          onChange={(e) => onSize(e.target.value)}
          disabled={loading}
        >
          <option value="">Todas las tallas</option>
          {[...new Set([...(data?.sizes || []), ...(size ? [size] : [])])].map(
            (v) => (
              <option value={v} key={v}>
                {v}
              </option>
            ),
          )}
        </select>
      </Field>
      <Field label="Color">
        <select
          value={color}
          onChange={(e) => onColor(e.target.value)}
          disabled={loading}
        >
          <option value="">Todos los colores</option>
          {[
            ...new Set([...(data?.colors || []), ...(color ? [color] : [])]),
          ].map((v) => (
            <option value={v} key={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      {error && (
        <button className="btn secondary" onClick={reload} type="button">
          Reintentar variantes
        </button>
      )}
    </>
  );
}
