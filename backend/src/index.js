import express from "express";
import cors from "cors";
import session from "express-session";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
    cors({
          origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
          credentials: true,
    })
  );
app.use(express.json());
app.use(
    session({
          secret: process.env.SESSION_SECRET || "dev-secret-change-me",
          resave: false,
          saveUninitialized: false,
          cookie: {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === "production",
                  maxAge: 1000 * 60 * 60 * 24 * 7,
          },
    })
  );

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "zentoralo-backend" });
});

app.use("/api/auth", authRouter);

app.listen(PORT, () => {
    console.log(`Zentoralo backend listening on port ${PORT}`);
});
