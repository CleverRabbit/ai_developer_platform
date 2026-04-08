import subprocess
import os

with open("pip_check.txt", "w") as f:
    try:
        res = subprocess.run(["python3", "-m", "pip", "--version"], capture_output=True, text=True)
        f.write(f"Pip version: {res.stdout}\n")
    except Exception as e:
        f.write(f"Pip error: {str(e)}\n")
