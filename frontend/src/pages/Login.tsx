import { useState, FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Warehouse,
  ArrowRight,
  ShieldCheck,
  Boxes,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../contexts/Auth";
import { useUI } from "../contexts/UI";
import { message } from "../services/api";
import { Field, Submit } from "../components/ui";
export default function Login() {
  const { user, login } = useAuth(),
    { toast } = useUI(),
    nav = useNavigate();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [visible, setVisible] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      nav("/");
    } catch (error) {
      toast(message(error), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-page">
      <section className="login-art">
        <div className="brand">
          <Warehouse size={32} />
          <div>
            Bodega<span>INVENTARIO & CONTROL</span>
          </div>
        </div>
        <div>
          <span className="pill">CADA UNIDAD CUENTA</span>
          <h1>
            Todo en orden.
            <br />
            <em>Siempre.</em>
          </h1>
          <p>
            Un espacio para organizar tus productos, seguir cada movimiento y
            tener el control de tu bodega.
          </p>
          <div className="art-cards">
            <div>
              <Boxes />
              <strong>Inventario centralizado</strong>
              <span>Productos, tallas y colores.</span>
            </div>
            <div>
              <ShieldCheck />
              <strong>Cada movimiento, registrado</strong>
              <span>Control y trazabilidad en tiempo real.</span>
            </div>
          </div>
        </div>
        <small>Zapatos · Ropa · Accesorios</small>
      </section>
      <section className="login-form">
        <div className="login-box">
          <div className="eyebrow">BIENVENIDO A TU ESPACIO</div>
          <h2>Iniciar sesión</h2>
          <p className="muted">Ingresa tus credenciales para continuar.</p>
          <form onSubmit={submit}>
            <Field label="Correo electrónico">
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </Field>
            <Field label="Contraseña">
              <div className="password-field">
                <input
                  type={visible ? "text" : "password"}
                  required
                  maxLength={72}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                />
                <button
                  type="button"
                  aria-label="Mostrar u ocultar contraseña"
                  onClick={() => setVisible((v) => !v)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            <Submit busy={busy}>
              Entrar a la bodega <ArrowRight size={18} />
            </Submit>
          </form>
          <div className="login-help">
            <ShieldCheck size={16} />
            Acceso exclusivo para usuarios autorizados.
          </div>
        </div>
      </section>
    </div>
  );
}
