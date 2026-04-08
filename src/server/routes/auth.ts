import { Express } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../../services/database.ts";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

export function setupAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing fields" });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, hashedPassword]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "User already exists or database error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await db.get<{ id: number; username: string; password_hash: string; role: string }>(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (user && (await bcrypt.compare(password, user.password_hash))) {
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });
}
