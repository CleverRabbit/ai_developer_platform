import { Express } from "express";
import { db } from "../../services/database.ts";
import { botService } from "../../services/bot.ts";

export function setupSettingsRoutes(app: Express) {
  app.get("/api/settings", async (req, res) => {
    const settings = await db.all<{ key: string; value: string }>("SELECT * FROM settings");
    const settingsMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    res.json(settingsMap);
  });

  app.post("/api/settings", async (req, res) => {
    const { key, value } = req.body;
    await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
    
    if (key === "tg_token") {
      botService.start(value);
    }
    
    res.json({ success: true });
  });
}
