import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
type Toast = { id: number; text: string; kind: "success" | "error" };
const Context = createContext<{
  toast: (text: string, kind?: "success" | "error") => void;
  dark: boolean;
  toggle: () => void;
} | null>(null);
export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]),
    [dark, setDark] = useState(
      () => localStorage.getItem("bodega-theme") === "dark",
    );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("bodega-theme", dark ? "dark" : "light");
  }, [dark]);
  const toast = (text: string, kind: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, kind }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      5000,
    );
  };
  return (
    <Context.Provider value={{ toast, dark, toggle: () => setDark((v) => !v) }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.text}
            <button
              aria-label="Cerrar notificación"
              onClick={() =>
                setToasts((prev) => prev.filter((x) => x.id !== t.id))
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Context.Provider>
  );
}
export function useUI() {
  const c = useContext(Context);
  if (!c) throw new Error("UIProvider requerido");
  return c;
}
