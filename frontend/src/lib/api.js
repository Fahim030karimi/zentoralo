// Zentraler API-Helper. Backend und Frontend laufen als zwei getrennte Render-
// Services (kein gemeinsamer Origin), deshalb braucht es hier eine absolute
// Basis-URL statt relativer /api/-Pfade. VITE_API_URL wird beim Build gesetzt
// (siehe Render-Static-Site-Umgebungsvariablen); ohne sie greift der Fallback
// auf die aktuelle Backend-URL.
export const API_BASE = import.meta.env.VITE_API_URL || "https://zentoralo-backend.onrender.com";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `Fehler ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // Antwort war kein JSON - Standardmeldung behalten.
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: "POST", body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: "PUT", body: JSON.stringify(data) }),
  del: (path) => request(path, { method: "DELETE" }),
};
