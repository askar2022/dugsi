export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

let token: string | null = null;

export function setToken(value: string | null) {
  token = value;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data as T;
}
