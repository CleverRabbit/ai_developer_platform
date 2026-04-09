import http.server
import socketserver
import json
import os
import urllib.parse
from core.db import db
from core.auth import auth_service
from core.ai import gemini_client
from core.docker_mgr import docker_mgr
from core.bot import bot_service

PORT = 3000

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
        except:
            data = {}
        
        path = self.path
        response = {"error": "Not Found"}
        status = 404

        if path == "/api/auth/login":
            res = auth_service.login(data.get("username"), data.get("password"))
            if res:
                response = res
                status = 200
            else:
                response = {"error": "Invalid credentials"}
                status = 401
        
        elif path == "/api/auth/register":
            try:
                if auth_service.register(data.get("username"), data.get("password")):
                    response = {"success": True}
                    status = 200
                else:
                    response = {"error": "Registration failed"}
                    status = 400
            except Exception as e:
                response = {"error": str(e)}
                status = 400

        elif path == "/api/projects/generate":
            sys_prompt = db.fetch_one("SELECT value FROM settings WHERE key = 'system_prompt'")
            
            code = gemini_client.generate(
                data.get("prompt"),
                sys_prompt['value'] if sys_prompt else None
            )
            
            if "Error" in code:
                response = {"error": code}
                status = 500
            else:
                name = data.get("name", f"proj_{int(os.times()[4])}")
                port = docker_mgr.find_free_port()
                proj_path = docker_mgr.create_project(name, code, port)
                
                db.execute("INSERT INTO projects (name, port, path, status) VALUES (?, ?, ?, ?)",
                           (name, port, proj_path, "stopped"))
                
                response = {"success": True, "code": code, "name": name, "port": port}
                status = 200

        elif path == "/api/diagnostics":
            results = {}
            
            # 1. Database Test
            try:
                db.fetch_one("SELECT 1")
                results["database"] = {"status": "ok"}
            except Exception as e:
                results["database"] = {"status": "error", "message": str(e)}
                
            # 2. Gemini API Test
            key_setting = db.fetch_one("SELECT value FROM settings WHERE key = 'gemini_key'")
            api_key = key_setting['value'] if key_setting and key_setting['value'] else os.environ.get("GEMINI_API_KEY")
            
            if not api_key:
                results["gemini_api"] = {"status": "error", "message": "Key missing in settings and environment"}
            else:
                test_res = gemini_client.generate("Say 'ok'", api_key_override=api_key)
                if "Error" in test_res:
                    results["gemini_api"] = {"status": "error", "message": test_res}
                else:
                    results["gemini_api"] = {"status": "ok", "message": f"Model responded: {test_res[:20]}..."}
            
            # 3. Telegram Bot Test
            tg_token = db.fetch_one("SELECT value FROM settings WHERE key = 'tg_token'")
            if not tg_token or not tg_token['value']:
                results["telegram_bot"] = {"status": "error", "message": "Token missing in settings"}
            else:
                try:
                    import urllib.request
                    url = f"https://api.telegram.org/bot{tg_token['value']}/getMe"
                    with urllib.request.urlopen(url, timeout=5) as r:
                        bot_data = json.loads(r.read().decode())
                        if bot_data.get("ok"):
                            results["telegram_bot"] = {"status": "ok", "message": f"Bot @{bot_data['result']['username']} is active"}
                        else:
                            results["telegram_bot"] = {"status": "error", "message": bot_data.get("description")}
                except Exception as e:
                    results["telegram_bot"] = {"status": "error", "message": str(e)}
            
            # 4. Docker Test
            try:
                import subprocess
                res = subprocess.run(["docker", "version", "--format", "{{.Server.Version}}"], capture_output=True, text=True, timeout=5)
                if res.returncode == 0:
                    results["docker"] = {"status": "ok", "message": f"Docker Engine {res.stdout.strip()} detected"}
                else:
                    results["docker"] = {"status": "error", "message": "Docker CLI available but daemon unreachable"}
            except Exception as e:
                results["docker"] = {"status": "error", "message": str(e)}

            response = results
            status = 200

        elif path == "/api/settings/save":
            db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                       (data.get("key"), data.get("value")))
            if data.get("key") == "tg_token":
                bot_service.start()
            response = {"success": True}
            status = 200

        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())

    def do_GET(self):
        if self.path.startswith("/api/projects"):
            projects = db.fetch_all("SELECT * FROM projects ORDER BY created_at DESC")
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(projects).encode())
        elif self.path.startswith("/api/settings"):
            settings = db.fetch_all("SELECT * FROM settings")
            res = {s['key']: s['value'] for s in settings}
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())
        else:
            # Serve static files
            if self.path == "/":
                self.path = "/index.html"
            return super().do_GET()

def run_server():
    # Self-test
    print("--- AI Developer Self-Test ---")
    try:
        db.execute("SELECT 1")
        print("[OK] Database connectivity")
    except Exception as e:
        print(f"[FAIL] Database: {e}")

    if os.access(".", os.W_OK):
        print("[OK] File system write permissions")
    else:
        print("[FAIL] File system: No write permission")
    
    print("------------------------------")

    # Start bot
    bot_service.start()
    
    with socketserver.TCPServer(("", PORT), RequestHandler) as httpd:
        print(f"Server started at port {PORT}")
        httpd.serve_forever()

if __name__ == "__main__":
    run_server()
