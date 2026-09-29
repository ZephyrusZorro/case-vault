const BASE = import.meta.env.VITE_API_BASE ?? "";
const TOKEN_KEY = "casevault_session";

export function getToken(): string | null { return sessionStorage.getItem(TOKEN_KEY); }
export function setToken(token: string | null): void { if (token) sessionStorage.setItem(TOKEN_KEY, token); else sessionStorage.removeItem(TOKEN_KEY); }

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (getToken()) headers.set("Authorization", `Bearer ${getToken()}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try { response = await fetch(`${BASE}/api${path}`, { ...options, headers }); }
  catch { throw new ApiError(0, "Cannot reach the CaseVault API. Start the backend and try again."); }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try { const body = await response.json(); message = typeof body.detail === "string" ? body.detail : Array.isArray(body.detail) ? body.detail.map((item: { msg: string }) => item.msg).join("; ") : message; } catch { /* use status */ }
    if (response.status === 401 && path !== "/auth/login") { setToken(null); window.dispatchEvent(new Event("casevault:unauthorized")); }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export const get = <T,>(path: string) => request<T>(path);
export const post = <T,>(path: string, body?: unknown, headers?: HeadersInit) => request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body), headers });
export const patch = <T,>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const remove = <T,>(path: string) => request<T>(path, { method: "DELETE" });
export const upload = <T,>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form });

export async function evidenceBlob(path: string): Promise<Blob> {
  const response = await fetch(`${BASE}/api${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!response.ok) {
    let detail = "Unable to open evidence file.";
    try { const body = await response.json(); detail = body.detail || detail; } catch { /* keep fallback */ }
    throw new ApiError(response.status, detail);
  }
  return response.blob();
}
