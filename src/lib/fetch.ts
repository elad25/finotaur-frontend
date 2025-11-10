export async function fetchJSON<T=any>(url: string, init?: RequestInit): Promise<T>{
  const res = await fetch(url, { ...(init||{}), headers: { 'Accept': 'application/json', ...(init?.headers||{}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}