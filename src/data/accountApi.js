const TOKEN_KEY = 'viskora.session.v1';

export function getSession() {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; }
}

export function setSession(session) { localStorage.setItem(TOKEN_KEY, JSON.stringify(session)); }
export function clearSession() { localStorage.removeItem(TOKEN_KEY); }

export async function accountRequest(path, { method = 'GET', body } = {}) {
  const session = getSession();
  const response = await fetch(path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error || `Request failed (${response.status}).`), { status: response.status });
  return result;
}
