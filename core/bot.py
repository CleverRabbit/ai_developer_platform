import json
import urllib.request
import threading
import time
from core.db import db

class TelegramBot:
    def __init__(self):
        self.token = None
        self.offset = 0
        self._running = False
        self._thread = None

    def _get_token(self):
        res = db.fetch_one("SELECT value FROM settings WHERE key = 'tg_token'")
        return res['value'] if res else None

    def _api_call(self, method, data=None):
        if not self.token: return None
        url = f"https://api.telegram.org/bot{self.token}/{method}"
        try:
            req = urllib.request.Request(url, data=json.dumps(data).encode() if data else None, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read().decode())
        except:
            return None

    def start(self):
        self.token = self._get_token()
        if not self.token: return
        
        if self._running: return
        self._running = True
        self._thread = threading.Thread(target=self._poll, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def _poll(self):
        while self._running:
            updates = self._api_call("getUpdates", {"offset": self.offset, "timeout": 30})
            if updates and updates.get("ok"):
                for update in updates["result"]:
                    self.offset = update["update_id"] + 1
                    self._handle_update(update)
            time.sleep(1)

    def _handle_update(self, update):
        if "message" not in update: return
        msg = update["message"]
        chat_id = msg["chat"]["id"]
        text = msg.get("text", "")

        if text == "/start":
            self._api_call("sendMessage", {"chat_id": chat_id, "text": "Welcome to AI Developer Bot! Use /projects to see your projects."})
        elif text == "/projects":
            projects = db.fetch_all("SELECT name, status, port FROM projects")
            if not projects:
                self._api_call("sendMessage", {"chat_id": chat_id, "text": "No projects found."})
            else:
                resp = "Your projects:\n" + "\n".join([f"- {p['name']} ({p['status']}) on port {p['port']}" for p in projects])
                self._api_call("sendMessage", {"chat_id": chat_id, "text": resp})
        elif text.startswith("/new"):
            self._api_call("sendMessage", {"chat_id": chat_id, "text": "Project creation is currently available only via the Web UI for security reasons."})

bot_service = TelegramBot()
