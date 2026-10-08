import { useState, FormEvent } from "react";
import { Plus, Search, Pencil, ShieldCheck } from "lucide-react";
import type { User, Page } from "../types";
import { save, message } from "../services/api";
import { useUI } from "../contexts/UI";
import {
  Heading,
  Field,
  Submit,
  Modal,
  Loading,
  ErrorBox,
  Empty,
  Pager,
  useData,
  useDebounce,
  date,
} from "../components/ui";
export default function Users() {
  const { toast } = useUI();
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [version, setVersion] = useState(0);
  const q = useDebounce(search);
  const list = useData<Page<User>>("/users", { page, search: q }, version);
  const [edit, setEdit] = useState<User | null>(),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [role, setRole] = useState<User["role"]>("EMPLOYEE"),
    [active, setActive] = useState(true),
    [busy, setBusy] = useState(false);
  const open = (u?: User) => {
    setEdit(u || null);
    setName(u?.name || "");
    setEmail(u?.email || "");
    setRole(u?.role || "EMPLOYEE");
    setActive(u?.active ?? true);
    setPassword("");
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      edit &&
      ((edit.active && !active) || edit.role !== role || password) &&
      !confirm(
        "¿Confirmar el cambio? Se cerrarán las sesiones de este usuario.",
      )
    )
      return;
    setBusy(true);
    try {
      await save(
        edit ? "patch" : "post",
        edit ? `/users/${edit.id}` : "/users",
        { name, email, role, active, ...(password ? { password } : {}) },
      );
      toast("Usuario guardado correctamente.");
      setEdit(undefined);
      setVersion((v) => v + 1);
    } catch (error) {
      toast(message(error), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        title="Usuarios"
        sub="Administra quién puede acceder a tu bodega."
        action={
          <button className="btn" onClick={() => open()}>
            <Plus size={17} />
            Nuevo usuario
          </button>
        }
      />
      <div className="form-note">
        <ShieldCheck size={18} />
        El empleado crea y edita productos y variantes, registra entradas y salidas, ajusta
        stock, busca con filtros y configura su cuenta. El administrador tiene
        acceso completo al sistema.
      </div>
      <section className="panel no-pad">
        <div className="filters">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Buscar usuario"
              placeholder="Nombre o correo…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
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
                    <th>Usuario</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Creación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="product-cell">
                          <span className="avatar">
                            {u.name.slice(0, 2).toUpperCase()}
                          </span>
                          <strong>{u.name}</strong>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className="badge neutral">
                          {u.role === "ADMIN" ? "Administrador" : "Empleado"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${u.active ? "success" : "danger"}`}
                        >
                          {u.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>{date(u.createdAt)}</td>
                      <td>
                        <button
                          className="icon-btn"
                          aria-label={`Editar usuario ${u.name}`}
                          onClick={() => open(u)}
                        >
                          <Pencil size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={list.data.total} setPage={setPage} />
          </>
        ) : (
          <Empty />
        )}
      </section>
      {edit !== undefined && (
        <Modal
          title={edit ? "Editar usuario" : "Crear usuario"}
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
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Correo">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Rol">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as User["role"])}
                >
                  <option value="EMPLOYEE">Empleado</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </Field>
              <Field label="Estado">
                <select
                  value={active ? "true" : "false"}
                  onChange={(e) => setActive(e.target.value === "true")}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </Field>
            </div>
            <Field
              label={
                edit
                  ? "Nueva contraseña (dejar vacío para conservar)"
                  : "Contraseña inicial"
              }
            >
              <input
                type="password"
                autoComplete="new-password"
                required={!edit}
                minLength={12}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <p className="muted tiny">
              Mínimo 12 caracteres con mayúscula, minúscula, número y símbolo.
            </p>
            <div className="form-actions">
              <Submit busy={busy} />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
