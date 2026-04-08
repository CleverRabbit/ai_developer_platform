import subprocess
import os
import shutil

class DockerManager:
    def __init__(self, projects_dir="projects"):
        self.projects_dir = projects_dir
        os.makedirs(self.projects_dir, exist_ok=True)

    def _run_cmd(self, cmd):
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return res.stdout.strip()
        except subprocess.CalledProcessError as e:
            return f"Error: {e.stderr.strip()}"

    def create_project(self, name, code, port):
        path = os.path.join(self.projects_dir, name)
        os.makedirs(path, exist_ok=True)
        
        with open(os.path.join(path, "app.py"), "w") as f:
            f.write(code)
            
        dockerfile = f"""
FROM python:3.11-slim
WORKDIR /app
COPY app.py .
RUN pip install flask
EXPOSE 5000
CMD ["python", "app.py"]
"""
        with open(os.path.join(path, "Dockerfile"), "w") as f:
            f.write(dockerfile)
            
        return path

    def start_project(self, name, port):
        path = os.path.join(self.projects_dir, name)
        image_name = f"ai_proj_{name.lower()}"
        container_name = f"ai_cont_{name.lower()}"
        
        # Build
        self._run_cmd(["docker", "build", "-t", image_name, path])
        
        # Run
        self._run_cmd(["docker", "run", "-d", "--name", container_name, "-p", f"{port}:5000", "--memory", "256m", image_name])
        return container_name

    def stop_project(self, name):
        container_name = f"ai_cont_{name.lower()}"
        self._run_cmd(["docker", "stop", container_name])
        self._run_cmd(["docker", "rm", container_name])

    def get_status(self, name):
        container_name = f"ai_cont_{name.lower()}"
        res = self._run_cmd(["docker", "inspect", "-f", "{{.State.Status}}", container_name])
        if "Error" in res:
            return "stopped"
        return res

    def find_free_port(self, start=8000):
        # Simple check via docker ps
        used_ports = []
        res = self._run_cmd(["docker", "ps", "--format", "{{.Ports}}"])
        for line in res.split("\n"):
            if "->" in line:
                port_part = line.split("->")[0].split(":")[-1]
                used_ports.append(int(port_part))
        
        port = start
        while port in used_ports:
            port += 1
        return port

docker_mgr = DockerManager()
