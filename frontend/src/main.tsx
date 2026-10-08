import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/Auth";
import { UIProvider } from "./contexts/UI";
import { Loading } from "./components/ui";
import Layout from "./components/Layout";
import Login from "./pages/Login";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Categories = lazy(() => import("./pages/Categories"));
const MovementForm = lazy(() => import("./pages/MovementForm"));
const History = lazy(() => import("./pages/History"));
const Reports = lazy(() => import("./pages/Reports"));
const Users = lazy(() => import("./pages/Users"));
const Settings = lazy(() => import("./pages/Settings"));
import "./styles.css";
function Protected({ admin = false }: { admin?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "ADMIN") return <Navigate to="/products" replace />;
  return <Outlet />;
}
function Home() {
  const { user } = useAuth();
  return user?.role === "ADMIN" ? <Dashboard /> : <Navigate to="/products" replace />;
}
createRoot(document.getElementById("root")!).render(
  <UIProvider>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protected />}>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="products" element={<Products />} />
                <Route path="inventory" element={<Inventory />} />
                <Route element={<Protected admin />}>
<Route path="categories" element={<Categories />} />
</Route>
                <Route
                  path="entries"
                  element={<MovementForm key="entry" type="ENTRY" />}
                />
                <Route
                  path="exits"
                  element={<MovementForm key="exit" type="EXIT" />}
                />
                <Route
                  path="adjustments"
                  element={<MovementForm key="adjustment" type="ADJUSTMENT" />}
                />
                <Route element={<Protected admin />}>
<Route path="history" element={<History />} />
</Route>
                <Route element={<Protected admin />}>
<Route path="reports" element={<Reports />} />
</Route>
                <Route element={<Protected admin />}>
                  <Route path="users" element={<Users />} />
                </Route>
                <Route path="settings" element={<Settings />} />
                <Route
                  path="*"
                  element={
                    <div className="empty">
                      <h1>Página no encontrada</h1>
                      <Link className="btn" to="/">
                        Volver al dashboard
                      </Link>
                    </div>
                  }
                />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </UIProvider>,
);
void React;
