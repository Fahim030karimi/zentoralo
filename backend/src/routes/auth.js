import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db/pool.js";

const router = Router();

router.post("/register", async (req, res) => {
    if (!pool) {
          return res.status(503).json({
                  error: "Datenbank noch nicht verbunden. Render-Postgres wird in Phase 0 final eingerichtet.",
          });
    }

              const { email, password, companyName } = req.body;
    if (!email || !password) {
          return res.status(400).json({ error: "email und password sind erforderlich." });
    }

              try {
                    const passwordHash = await bcrypt.hash(password, 12);
                    const result = await pool.query(
                            `INSERT INTO users (email, password_hash, role, company_name)
                                   VALUES ($1, $2, 'inhaber', $3)
                                          RETURNING id, email, role, company_name`,
                            [email, passwordHash, companyName || null]
                          );
                    req.session.userId = result.rows[0].id;
                    res.status(201).json({ user: result.rows[0] });
              } catch (err) {
                    if (err.code === "23505") {
                            return res.status(409).json({ error: "E-Mail ist bereits registriert." });
                    }
                    console.error(err);
                    res.status(500).json({ error: "Registrierung fehlgeschlagen." });
              }
});

router.post("/login", async (req, res) => {
    if (!pool) {
          return res.status(503).json({
                  error: "Datenbank noch nicht verbunden. Render-Postgres wird in Phase 0 final eingerichtet.",
          });
    }

              const { email, password } = req.body;
    if (!email || !password) {
          return res.status(400).json({ error: "email und password sind erforderlich." });
    }

              try {
                    const result = await pool.query(
                            `SELECT id, email, password_hash, role, company_name FROM users WHERE email = $1`,
                            [email]
                          );
                    const user = result.rows[0];
                    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
                            return res.status(401).json({ error: "E-Mail oder Passwort ist falsch." });
                    }
                    req.session.userId = user.id;
                    delete user.password_hash;
                    res.json({ user });
              } catch (err) {
                    console.error(err);
                    res.status(500).json({ error: "Login fehlgeschlagen." });
              }
});

router.post("/logout", (req, res) => {
    req.session.destroy(() => {
          res.status(204).end();
    });
});

router.get("/me", async (req, res) => {
    if (!req.session.userId) {
          return res.status(401).json({ error: "Nicht eingeloggt." });
    }
    if (!pool) {
          return res.status(503).json({ error: "Datenbank noch nicht verbunden." });
    }
    const result = await pool.query(
          `SELECT id, email, role, company_name FROM users WHERE id = $1`,
          [req.session.userId]
        );
    if (!result.rows[0]) {
          return res.status(401).json({ error: "Nicht eingeloggt." });
    }
    res.json({ user: result.rows[0] });
});

export default router;
