import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { save, renew, setToken, registerUnauthorized } from "../services/api";
import type { User } from "../types";
type AuthValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
};
const Context = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true);
  const clear = () => {
    setToken(null);
    setUser(null);
  };
  useEffect(() => {
    registerUnauthorized(clear);
    void renew()
      .then((data) => setUser(data.user))
      .catch(clear)
      .finally(() => setLoading(false));
  }, []);
  const login = async (email: string, password: string) => {
    const data = await save<{ accessToken: string; user: User }>(
      "post",
      "/auth/login",
      { email, password },
    );
    setToken(data.accessToken);
    setUser(data.user);
  };
  const logout = async () => {
    await save("post", "/auth/logout", {});
    clear();
  };
  return (
    <Context.Provider value={{ user, loading, login, logout, clear }}>
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const c = useContext(Context);
  if (!c) throw new Error("AuthProvider requerido");
  return c;
}
