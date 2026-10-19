export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { ...options, cache: "no-store", headers: { "Content-Type": "application/json" } }); }
  catch { throw new ApiError("Cannot reach the application. Check your connection and retry.", 0); }
  const result = await response.json();
  if (!response.ok) throw new ApiError(result.error?.message || "Request failed. Please retry.", response.status);
  return result.data as T;
}
