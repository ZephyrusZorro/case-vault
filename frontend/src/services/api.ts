export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "";

class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Turn a FastAPI error body into a short human-readable message. */
async function extractDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      return body.detail
        .map((d: { msg?: string }) => d?.msg ?? "invalid value")
        .join("; ");
    }
    if (body?.message) return String(body.message);
  } catch {
    // fall through to generic text
  }
  const text = await response.text().catch(() => "");
  return text.slice(0, 200);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("ncrb_auth_token");
  const headers = new Headers(init?.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(0, "Backend is unreachable. Is the API server running?");
  }
  if (!response.ok) {
    const detail = await extractDetail(response);
    if (response.status === 401 && !path.includes("/auth/login")) {
      // Discard invalid/expired token
      localStorage.removeItem("ncrb_auth_token");
      window.dispatchEvent(new CustomEvent("ncrb:unauthorized"));
    }
    throw new ApiError(
      response.status,
      detail || `Request failed (${response.status})`,
    );
  }
  return (await response.json()) as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPostForm<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: "POST", body: form });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}
