// Клиент API бэка: токен из localStorage, ошибки русским текстом.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export function clearToken(): void {
  localStorage.removeItem("token");
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Не авторизован");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail ?? `Ошибка ${res.status}`);
  return body as T;
}
