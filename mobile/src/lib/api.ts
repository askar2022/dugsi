import * as SecureStore from "expo-secure-store";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://ourdugsi.com";

const TOKEN_KEY = "ourdugsi.parent.token";
const SCHOOL_KEY = "ourdugsi.parent.school";

let token: string | null = null;

export function setToken(value: string | null) {
  token = value;
  if (value) SecureStore.setItemAsync(TOKEN_KEY, value).catch(() => undefined);
  else SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
}

export async function loadStoredSession() {
  const [savedToken, school] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(SCHOOL_KEY),
  ]);
  token = savedToken;
  return { token: savedToken, school: school ?? "" };
}

export function rememberSchool(code: string) {
  SecureStore.setItemAsync(SCHOOL_KEY, code.trim().toLowerCase()).catch(() => undefined);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? "Request failed.");
  }
  return data as T;
}
