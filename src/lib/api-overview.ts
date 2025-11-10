export async function getJSON<T=any>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { credentials: "include" as RequestCredentials });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}