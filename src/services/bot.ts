import { Telegraf, Context } from "telegraf";
import { db } from "./database.ts";
import { dockerService } from "./docker.ts";

export class BotService {
  private bot: Telegraf | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    const tokenSetting = await db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'tg_token'");
    if (tokenSetting?.value) {
      this.start(tokenSetting.value);
    }
  }

  public start(token: string) {
    if (this.bot) {
      this.bot.stop();
    }

    this.bot = new Telegraf(token);

    this.bot.start((ctx) => ctx.reply("Welcome to AI Developer Bot! Use /newproject to start."));
    this.bot.help((ctx) => ctx.reply("Commands:\n/start - Start bot\n/newproject <idea> - Create a new project\n/projects - List your projects\n/help - Show this help"));

    this.bot.command("projects", async (ctx) => {
      const projects = await db.all<{ name: string; status: string; port: number }>("SELECT name, status, port FROM projects");
      if (projects.length === 0) {
        return ctx.reply("No projects found.");
      }
      const list = projects.map(p => `- ${p.name} (${p.status}) on port ${p.port}`).join("\n");
      ctx.reply(`Your projects:\n${list}`);
    });

    this.bot.command("newproject", async (ctx) => {
      const idea = ctx.message.text.replace("/newproject", "").trim();
      if (!idea) {
        return ctx.reply("Please provide an idea: /newproject <idea>");
      }

      const statusMsg = await ctx.reply("🚀 Analyzing idea... [██░░░░░░░░] 20%");
      
      // Note: Real generation should happen via the web UI or a dedicated AI service
      // For the bot, we might need a server-side AI call if allowed, 
      // but the instructions say frontend only.
      // I'll implement a placeholder or a way to trigger generation from the bot.
      
      ctx.reply("Please use the web interface to generate and deploy projects for now, as AI generation requires frontend context.");
    });

    this.bot.launch().catch(err => console.error("Bot launch error:", err));
  }

  public stop() {
    if (this.bot) {
      this.bot.stop();
    }
  }
}

export const botService = new BotService();
