import json
import urllib.request
import time
import logging

class GeminiClient:
    def __init__(self):
        self.api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
        self.logger = logging.getLogger("GeminiClient")

    def generate(self, api_key, prompt, system_instruction=None):
        if not api_key:
            return "Error: API Key missing"

        url = f"{self.api_url}?key={api_key}"
        
        contents = []
        if system_instruction:
            contents.append({"role": "user", "parts": [{"text": f"System Instruction: {system_instruction}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood. I will follow these instructions."}]})
        
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        data = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 2048,
            }
        }

        req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={"Content-Type": "application/json"})
        
        retries = 3
        for i in range(retries):
            try:
                with urllib.request.urlopen(req) as response:
                    res_data = json.loads(response.read().decode())
                    return res_data['candidates'][0]['content']['parts'][0]['text']
            except Exception as e:
                err_msg = str(e)
                # Mask API key in logs
                safe_msg = err_msg.replace(api_key, "[REDACTED]")
                self.logger.error(f"Gemini attempt {i+1} failed: {safe_msg}")
                
                if "429" in err_msg:
                    time.sleep(2 ** i)
                else:
                    break
        
        return "Error: Failed to generate content"

gemini_client = GeminiClient()
