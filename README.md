# AI Developer - Lightweight Pure Python Edition

This application is a highly optimized, zero-dependency AI development platform. It uses only Python's built-in libraries to ensure maximum performance and minimum memory footprint (ideal for 1vCPU / 2GB RAM servers).

## Features
- **Pure Python**: No Flask, no heavy frameworks.
- **Zero Dependencies**: Uses only built-in libraries (`http.server`, `sqlite3`, `urllib`, `hashlib`).
- **Docker Integration**: Manages host containers via CLI.
- **Telegram Bot**: Built-in long polling bot.
- **Security**: SHA-256 salted password hashing, login attempt tracking.

## Deployment
The project is designed to be run via `docker-compose`:
```bash
docker-compose up --build -d
```

## Admin Registration & User Management

### 1. Registering the First Admin
By default, the registration page creates users with the `user` role. To create the first administrator:
1. Register a normal account via the web interface (e.g., username `admin`).
2. Access the SQLite database directly on the server:
   ```bash
   sqlite3 data/app.db "UPDATE users SET role = 'admin' WHERE username = 'admin';"
   ```
3. Now you can log in as an administrator.

### 2. Granting Rights to Users
Currently, user management is handled directly via the database for maximum security and minimal code weight.
- **To promote a user to admin**:
  ```bash
  sqlite3 data/app.db "UPDATE users SET role = 'admin' WHERE username = 'target_user';"
  ```
- **To deactivate a user**:
  ```bash
  sqlite3 data/app.db "DELETE FROM users WHERE username = 'target_user';"
  ```

## Self-Testing
The application performs a self-test on every startup, checking:
- Database connectivity and schema integrity.
- File system permissions for `data` and `projects` directories.
- Telegram bot connectivity (if token is provided).

## Volumes
All persistent data is stored in mapped volumes:
- `./data`: SQLite database.
- `./projects`: Generated project source codes and Dockerfiles.
- `./logs`: System logs.
- `./.env`: Environment variables.
