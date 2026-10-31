import { Field } from "./ui";
export type Dates = { from: string; to: string };
export function apiDates(d: Dates) {
  return {
    from: d.from ? `${d.from}T00:00:00-06:00` : undefined,
    to: d.to ? `${d.to}T23:59:59.999-06:00` : undefined,
  };
}
export function preset(range: string): Dates {
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const parts = local.split("-").map(Number);
  const now = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const end = now.toISOString().slice(0, 10);
  if (range === "week")
    now.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  if (range === "month") now.setUTCDate(1);
  return { from: now.toISOString().slice(0, 10), to: end };
}
export function DateFilters({
  value,
  onChange,
}: {
  value: Dates;
  onChange: (d: Dates) => void;
}) {
  const selected = !value.from && !value.to ? "all" :
    ["today", "week", "month"].find((range) => {
      const dates = preset(range);
      return dates.from === value.from && dates.to === value.to;
    }) || "custom";
  return (
    <>
      <Field label="Periodo">
        <select
          aria-label="Periodo"
          value={selected}
          onChange={(e) =>
            onChange(
              e.target.value === "all"
                ? { from: "", to: "" }
                : preset(e.target.value),
            )
          }
        >
          <option value="custom" disabled>Periodo personalizado</option>
          <option value="all">Todo el historial</option>
          <option value="today">Hoy</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
        </select>
      </Field>
      <Field label="Desde">
        <input
          type="date"
          value={value.from}
          max={value.to || undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </Field>
      <Field label="Hasta">
        <input
          type="date"
          value={value.to}
          min={value.from || undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </Field>
    </>
  );
}
