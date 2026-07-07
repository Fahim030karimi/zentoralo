// Serverseitige Rollenpruefung - Prinzip aus dem Altprojekt: nie nur im Frontend
// verstecken, immer zusaetzlich hier absichern (z.B. fuer HR-Dokumente in Phase 4).

export function requireAuth(req, res, next) {
    if (!req.session?.userId) {
          return res.status(401).json({ error: "Nicht eingeloggt." });
    }
    next();
}

export function requireRole(role) {
    return (req, res, next) => {
          if (!req.session?.userId) {
                  return res.status(401).json({ error: "Nicht eingeloggt." });
          }
          if (req.session.role !== role) {
                  return res.status(403).json({ error: "Keine Berechtigung." });
          }
          next();
    };
}
