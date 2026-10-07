import { useState, FormEvent } from "react";
import { Sun, Moon, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/Auth";
import { useUI } from "../contexts/UI";
import { save, message } from "../services/api";
import { Heading, Field, Submit } from "../components/ui";
export default function Settings() {
  const { user, clear } = useAuth(),
    { dark, toggle, toast } = useUI();
  const [currentPassword, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [repeat, setRepeat] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== repeat) {
      toast("Las contraseñas no coinciden.", "error");
      return;
    }
    setBusy(true);
    try {
      await save("post", "/auth/password", { currentPassword, password });
      toast("Contraseña actualizada. Inicia sesión nuevamente.");
      clear();
    } catch (error) {
      toast(message(error), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        title="Configuración"
        sub="Tu perfil, tu apariencia y la seguridad de tu cuenta."
      />
      <div className="settings-grid">
        <section className="panel">
          <h2>Tu cuenta</h2>
          <dl className="profile-details">
            <dt>Nombre</dt>
            <dd>{user?.name}</dd>
            <dt>Correo</dt>
            <dd>{user?.email}</dd>
            <dt>Rol</dt>
            <dd>{user?.role === "ADMIN" ? "Administrador" : "Empleado"}</dd>
            <dt>Moneda</dt>
            <dd>Quetzales (GTQ)</dd>
            <dt>Zona horaria</dt>
            <dd>America/Guatemala</dd>
          </dl>
          <h2>Apariencia</h2>
          <p className="muted">La preferencia se guarda en este dispositivo.</p>
          <button className="btn secondary" onClick={toggle}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}Usar modo{" "}
            {dark ? "claro" : "oscuro"}
          </button>
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>Cambiar contraseña</h2>
            <ShieldCheck size={21} />
          </div>
          <form onSubmit={submit}>
            <Field label="Contraseña actual">
              <input
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </Field>
            <Field label="Nueva contraseña">
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="Repetir nueva contraseña">
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              />
            </Field>
            <p className="muted tiny">
              Mínimo 12 caracteres con mayúscula, minúscula, número y símbolo.
              Se cerrarán todas tus sesiones.
            </p>
            <Submit busy={busy}>Actualizar contraseña</Submit>
          </form>
        </section>
      </div>
    </>
  );
}
