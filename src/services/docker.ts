import Docker from "dockerode";
import path from "path";
import fs from "fs";

export class DockerService {
  private docker: Docker;
  private baseProjectsPath: string;

  constructor() {
    this.docker = new Docker({ socketPath: "/var/run/docker.sock" });
    this.baseProjectsPath = path.resolve(process.cwd(), "projects");
  }

  public async createProjectEnv(projectName: string, code: string, port: number) {
    const projectDir = path.join(this.baseProjectsPath, projectName);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Save code
    fs.writeFileSync(path.join(projectDir, "app.py"), code);

    // Generate Dockerfile
    const dockerfile = `
FROM python:3.11-slim
WORKDIR /app
COPY app.py .
RUN pip install flask
EXPOSE 5000
CMD ["python", "app.py"]
`;
    fs.writeFileSync(path.join(projectDir, "Dockerfile"), dockerfile);

    return projectDir;
  }

  public async buildAndRun(projectName: string, port: number) {
    const projectDir = path.join(this.baseProjectsPath, projectName);
    const imageName = `project_${projectName.toLowerCase().replace(/\s+/g, "_")}`;
    const containerName = `container_${projectName.toLowerCase().replace(/\s+/g, "_")}`;

    // Build image
    const stream = await this.docker.buildImage(
      {
        context: projectDir,
        src: ["Dockerfile", "app.py"],
      },
      { t: imageName }
    );

    await new Promise((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err, res) => (err ? reject(err) : resolve(res)));
    });

    // Run container
    const container = await this.docker.createContainer({
      Image: imageName,
      name: containerName,
      HostConfig: {
        PortBindings: {
          "5000/tcp": [{ HostPort: port.toString() }],
        },
        Memory: 256 * 1024 * 1024, // 256MB limit
      },
    });

    await container.start();
    return container.id;
  }

  public async stopAndRemove(projectName: string) {
    const containerName = `container_${projectName.toLowerCase().replace(/\s+/g, "_")}`;
    try {
      const container = this.docker.getContainer(containerName);
      await container.stop();
      await container.remove();
    } catch (e) {
      console.error(`Error stopping/removing container ${containerName}:`, e);
    }
  }

  public async getContainerStatus(projectName: string) {
    const containerName = `container_${projectName.toLowerCase().replace(/\s+/g, "_")}`;
    try {
      const container = this.docker.getContainer(containerName);
      const data = await container.inspect();
      return data.State.Status;
    } catch (e) {
      return "not_found";
    }
  }

  public async findFreePort(startPort: number = 8000): Promise<number> {
    // Simple port finding logic
    let port = startPort;
    while (port < 9000) {
      const isTaken = await this.isPortTaken(port);
      if (!isTaken) return port;
      port++;
    }
    throw new Error("No free ports found");
  }

  private async isPortTaken(port: number): Promise<boolean> {
    const containers = await this.docker.listContainers({ all: true });
    for (const container of containers) {
      for (const p of container.Ports) {
        if (p.PublicPort === port) return true;
      }
    }
    return false;
  }
}

export const dockerService = new DockerService();
