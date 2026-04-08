FROM python:3.11-slim

# Install Docker CLI to manage host containers
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# No requirements.txt because we use pure Python!
# But we need to ensure the directories exist
RUN mkdir -p data projects logs

COPY . .

EXPOSE 3000

CMD ["python3", "main.py"]
