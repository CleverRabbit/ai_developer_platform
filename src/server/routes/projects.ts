import { Express } from "express";
import { db } from "../../services/database.ts";
import { dockerService } from "../../services/docker.ts";

export function setupProjectRoutes(app: Express) {
  app.get("/api/projects", async (req, res) => {
    const projects = await db.all("SELECT * FROM projects ORDER BY created_at DESC");
    res.json(projects);
  });

  app.post("/api/projects", async (req, res) => {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ error: "Missing fields" });

    try {
      const port = await dockerService.findFreePort();
      const path = await dockerService.createProjectEnv(name, code, port);
      const result = await db.run(
        "INSERT INTO projects (name, port, path, status) VALUES (?, ?, ?, ?)",
        [name, port, path, "stopped"]
      );
      res.json({ id: result.lastID, port });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/projects/:id/start", async (req, res) => {
    const project = await db.get<{ name: string; port: number }>("SELECT name, port FROM projects WHERE id = ?", [req.params.id]);
    if (!project) return res.status(404).json({ error: "Project not found" });

    try {
      await dockerService.buildAndRun(project.name, project.port);
      await db.run("UPDATE projects SET status = 'running' WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/projects/:id/stop", async (req, res) => {
    const project = await db.get<{ name: string }>("SELECT name FROM projects WHERE id = ?", [req.params.id]);
    if (!project) return res.status(404).json({ error: "Project not found" });

    try {
      await dockerService.stopAndRemove(project.name);
      await db.run("UPDATE projects SET status = 'stopped' WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    const project = await db.get<{ name: string }>("SELECT name FROM projects WHERE id = ?", [req.params.id]);
    if (project) {
      await dockerService.stopAndRemove(project.name);
    }
    await db.run("DELETE FROM projects WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  });
}
