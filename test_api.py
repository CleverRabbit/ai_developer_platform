import json
import urllib.request
import os

api_key = os.environ.get("GEMINI_API_KEY")
models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-3-flash-preview"]

results = []

for model in models:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    data = {
        "contents": [{"parts": [{"text": "Hello"}]}]
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req) as response:
            results.append(f"{model}: SUCCESS")
    except Exception as e:
        body = ""
        if hasattr(e, 'read'):
            body = e.read().decode()
        results.append(f"{model}: FAILED - {str(e)}\nBody: {body}")

with open("api_test_results.txt", "w") as f:
    f.write("\n\n".join(results))
