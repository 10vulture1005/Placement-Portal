import { auth } from "@/lib/auth";

export function backendBaseUrl() {
  return process.env.BACKEND_URL || "http://localhost:8000";
}

/** Bearer token that the FastAPI service verifies with the shared AUTH_SECRET. */
export async function backendAuthHeader(): Promise<Record<string, string>> {
  const session = await auth();
  return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

export async function backendFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${backendBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(await backendAuthHeader()),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `API error: ${res.status}`);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return {} as T;
  }

  return res.json() as Promise<T>;
}
