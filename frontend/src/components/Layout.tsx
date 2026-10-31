import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();
  const sidebar = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const current = links.find(([path]) => path === location.pathname)?.[1] || "Panel de gestión";
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    content.current?.setAttribute("inert", "");
    const focusFrame = requestAnimationFrame(() => {
      sidebar.current?.querySelector<HTMLButtonElement>(".mobile-close")?.focus();
    });
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const nodes = Array.from(sidebar.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled)',
      ) || []).filter((node) => node.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!sidebar.current?.contains(document.activeElement)) {
        event.preventDefault(); (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 761px)");
    const resize = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", resize);
    document.addEventListener("keydown", keyboard);
    return () => {
      cancelAnimationFrame(focusFrame);
      desktop.removeEventListener("change", resize);
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = before;
      content.current?.removeAttribute("inert");
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
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
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      {open && <div className="drawer-shade" onClick={() => setOpen(false)} />}
      <aside id="navigation" ref={sidebar} className={`sidebar ${open ? "open" : ""}`} aria-label="Navegación principal">
        <div className="brand">
          <span className="brand-icon">
            K
          </span>
          <div>
            KADOSH<span>MODA · INVENTARIO</span>
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
          <span className="workspace-avatar">K</span>
          <div>
            Kadosh<small>Control de inventario</small>
          </div>
          <Check size={16} />
        </div>
        <p className="nav-label">GESTIÓN</p>
        <nav aria-label="Secciones del sistema">
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
      <div className="main-shell" ref={content}>
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-btn"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={open}
              aria-controls="navigation"
            >
              <Menu size={22} />
            </button>
            <span className="muted">Kadosh</span>
            <span className="top-divider">/</span>
            <strong>{current}</strong>
          </div>
          <div>
            <span className="live-dot" />
            <span className="muted top-date">
              {new Date().toLocaleDateString("es-GT", { dateStyle: "long", timeZone: "America/Guatemala" })}
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
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer>
          KADOSH · Cada detalle, en orden.
          <span>Zona horaria: Guatemala · Moneda: GTQ</span>
        </footer>
      </div>
    </div>
  );
}
