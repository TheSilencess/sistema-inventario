import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { User } from "../types";
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: true,
  timeout: 20000,
});
let token: string | null = null;
let refreshing: Promise<{ accessToken: string; user: User }> | null = null;
let onUnauthorized: () => void = () => {};
export const setToken = (value: string | null) => {
  token = value;
};
export const registerUnauthorized = (fn: () => void) => {
  onUnauthorized = fn;
};
export async function renew() {
  if (!refreshing)
    refreshing = api
      .post<{ data: { accessToken: string; user: User } }>("/auth/refresh")
      .then((r) => {
        setToken(r.data.data.accessToken);
        return r.data.data;
      })
      .finally(() => {
        refreshing = null;
      });
  return refreshing;
}
api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const config = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (
      error.response?.status === 401 &&
      config &&
      !config._retry &&
      !["/auth/login", "/auth/refresh", "/auth/logout"].includes(
        config.url || "",
      )
    ) {
      config._retry = true;
      try {
        await renew();
        return await api(config);
      } catch {
        setToken(null);
        onUnauthorized();
      }
    }
    return Promise.reject(error);
  },
);
export async function get<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> {
  return (await api.get<{ data: T }>(url, { params })).data.data;
}
export async function save<T>(
  method: "post" | "patch",
  url: string,
  data: unknown,
): Promise<T> {
  return (await api[method]<{ data: T }>(url, data)).data.data;
}
export function message(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          error?: {
            message?: string;
            details?: { fieldErrors?: Record<string, string[]> };
          };
        }
      | undefined;
    const fields = data?.error?.details?.fieldErrors;
    return fields
      ? Object.entries(fields)
          .map(([key, v]) => `${key}: ${v.join(" ")}`)
          .join(" · ")
      : data?.error?.message || "No se pudo conectar con el servidor.";
  }
  return error instanceof Error ? error.message : "Ocurrió un error.";
}
