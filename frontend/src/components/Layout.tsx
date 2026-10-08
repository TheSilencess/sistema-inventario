import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Package,
  Tags,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  ChartNoAxesCombined,
  Users,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Warehouse,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../contexts/Auth";
import { useUI } from "../contexts/UI";
import { message } from "../services/api";
const links = [
  ["/", "Dashboard", LayoutDashboard],
  ["/inventory", "Inventario", Boxes],
  ["/products", "Productos", Package],
  ["/categories", "Categorías", Tags],
  ["/entries", "Entradas", ArrowDownToLine],
  ["/exits", "Salidas", ArrowUpFromLine],
  ["/adjustments", "Ajustes", SlidersHorizontal],
  ["/history", "Historial", History],
  ["/reports", "Reportes", ChartNoAxesCombined],
  ["/users", "Usuarios", Users],
  ["/settings", "Configuración", Settings],
] as const;
export default function Layout() {
  const { user, logout } = useAuth(),
    { dark, toggle, toast } = useUI();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const exit = async () => {
    setBusy(true);
    try {
      await logout();
      nav("/login");
    } catch (e) {
      toast(message(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="app-shell">
      {open && <div className="drawer-shade" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-icon">
            <Warehouse size={24} />
          </span>
          <div>
            Bodega<span>INVENTARIO & CONTROL</span>
          </div>
          <button
            className="mobile-close icon-btn"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace">
          <span className="workspace-avatar">B</span>
          <div>
            Bodega principal<small>Espacio de trabajo</small>
          </div>
          <Check size={16} />
        </div>
        <p className="nav-label">GESTIÓN</p>
        <nav>
          {links
            .filter(([path]) => user?.role === "ADMIN" || !["/", "/users", "/categories", "/history", "/reports"].includes(path))
            .map(([path, label, Icon]) => (
              <NavLink
                end={path === "/"}
                key={path}
                to={path}
                onClick={() => setOpen(false)}
              >
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span className="avatar">
              {user?.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{user?.name}</strong>
              <small>
                {user?.role === "ADMIN" ? "Administrador" : "Empleado"}
              </small>
            </div>
          </div>
          <button onClick={exit} disabled={busy}>
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-btn"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <span className="muted">Bodega principal</span>
            <span className="top-divider">/</span>
            <strong>Panel de gestión</strong>
          </div>
          <div>
            <span className="live-dot" />
            <span className="muted top-date">
              {new Date().toLocaleDateString("es-GT", { dateStyle: "long" })}
            </span>
            <button
              className="icon-btn"
              onClick={toggle}
              title={dark ? "Modo claro" : "Modo oscuro"}
              aria-label="Cambiar tema"
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <span className="avatar small">{user?.name[0]}</span>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
        <footer>
          Bodega · Tu inventario, bajo control.
          <span>Zona horaria: Guatemala · Moneda: GTQ</span>
        </footer>
      </div>
    </div>
  );
}
