import { useState, FormEvent } from "react";
import { Plus, Pencil, Tags } from "lucide-react";
import type { Category } from "../types";
import { useUI } from "../contexts/UI";
import { save, message } from "../services/api";
import {
  Heading,
  Field,
  Submit,
  Modal,
  Loading,
  ErrorBox,
  Empty,
  useData,
} from "../components/ui";
export default function Categories() {
  const { toast } = useUI(),
    list = useData<Category[]>("/categories");
  const [edit, setEdit] = useState<Category | null>(),
    [name, setName] = useState(""),
    [status, setStatus] = useState<Category["status"]>("ACTIVE"),
    [busy, setBusy] = useState(false);
  const open = (c?: Category) => {
    setEdit(c || null);
    setName(c?.name || "");
    setStatus(c?.status || "ACTIVE");
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      edit &&
      edit.status === "ACTIVE" &&
      status === "INACTIVE" &&
      !confirm(
        "¿Desactivar esta categoría? No se podrán asignar nuevos productos a ella.",
      )
    )
      return;
    setBusy(true);
    try {
      await save(
        edit ? "patch" : "post",
        edit ? `/categories/${edit.id}` : "/categories",
        { name, status },
      );
      toast("Categoría guardada correctamente.");
      setEdit(undefined);
      list.reload();
    } catch (error) {
      toast(message(error), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        title="Categorías"
        sub="Una estructura clara para organizar tu catálogo."
        action={
          <button className="btn" onClick={() => open()}>
            <Plus size={17} />
            Nueva categoría
          </button>
        }
      />
      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <ErrorBox error={list.error} retry={list.reload} />
      ) : list.data?.length ? (
        <div className="category-grid">
          {list.data.map((c) => (
            <div className="panel category-card" key={c.id}>
              <span className="category-icon">
                <Tags size={26} />
              </span>
              <h2>{c.name}</h2>
              <span
                className={`badge ${c.status === "ACTIVE" ? "success" : "neutral"}`}
              >
                {c.status === "ACTIVE" ? "Activa" : "Inactiva"}
              </span>
              <button className="btn secondary" onClick={() => open(c)}>
                <Pencil size={15} />
                Editar categoría
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Empty />
      )}
      {edit !== undefined && (
        <Modal
          title={edit ? "Editar categoría" : "Nueva categoría"}
          close={() => {
            if (!busy) setEdit(undefined);
          }}
        >
          <form onSubmit={submit}>
            <Field label="Nombre">
              <input
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Estado">
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Category["status"])
                }
              >
                <option value="ACTIVE">Activa</option>
                <option value="INACTIVE">Inactiva</option>
              </select>
            </Field>
            <div className="form-actions">
              <Submit busy={busy} />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
