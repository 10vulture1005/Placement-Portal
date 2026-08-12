import { auth } from "@/lib/auth";

export async function backendFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await auth();
  const token = (session as any)?.accessToken;
  
  // Base URL from env or fallback for local Docker networking vs direct execution
  const baseUrl = process.env.BACKEND_URL || "http://localhost:8000";
  
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `API error: ${res.status}`);
  }
  
  // Handle empty responses
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return {} as T;
  }
  
  return res.json();
}
