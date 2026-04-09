import json
import urllib.request
import time
import logging
import os

class GeminiClient:
    def __init__(self):
        self.logger = logging.getLogger("GeminiClient")

    def generate(self, prompt, system_instruction=None, api_key_override=None):
        # Priority: 1. Override (test), 2. Database (settings), 3. Environment
        api_key = api_key_override
        
        if not api_key:
            from core.db import db
            key_setting = db.fetch_one("SELECT value FROM settings WHERE key = 'gemini_key'")
            if key_setting and key_setting['value']:
                api_key = key_setting['value']
        
        if not api_key:
            api_key = os.environ.get("GEMINI_API_KEY")

        if not api_key:
            return "Error: Gemini API Key missing (not in settings or environment)"

        # Try multiple models in order of preference
        models = ["gemini-3-flash-preview", "gemini-1.5-flash", "gemini-1.5-flash-latest"]
        
        # Combine system instruction into prompt for maximum compatibility
        full_prompt = prompt
        if system_instruction:
            full_prompt = f"SYSTEM INSTRUCTIONS:\n{system_instruction}\n\nUSER REQUEST:\n{prompt}"
        
        last_error = ""
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            data = {
                "contents": [{
                    "parts": [{"text": full_prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 4096,
                }
            }
            
            req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={"Content-Type": "application/json"})
            
            try:
                with urllib.request.urlopen(req) as response:
                    res_body = response.read().decode()
                    res_data = json.loads(res_body)
                    if 'candidates' in res_data and res_data['candidates']:
                        return res_data['candidates'][0]['content']['parts'][0]['text']
                    else:
                        self.logger.error(f"Model {model} returned unexpected format: {res_body}")
                        continue
            except Exception as e:
                err_body = ""
                if hasattr(e, 'read'):
                    err_body = e.read().decode()
                
                # Mask API key in logs
                err_msg = str(e).replace(api_key, "[REDACTED]")
                self.logger.error(f"Model {model} failed: {err_msg}")
                if err_body:
                    self.logger.error(f"Error Body for {model}: {err_body}")
                last_error = err_body or err_msg
                continue
        
        return f"Error: All Gemini models failed. Last error: {last_error}"

gemini_client = GeminiClient()
