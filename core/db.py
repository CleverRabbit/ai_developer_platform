import sqlite3
import os
import threading

class Database:
    def __init__(self, db_path="data/app.db"):
        self.db_path = db_path
        self._local = threading.local()
        self._ensure_dir()
        self._init_db()

    def _ensure_dir(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

    def _get_conn(self):
        if not hasattr(self._local, "conn"):
            self._local.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def _init_db(self):
        with self._get_conn() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE,
                    password_hash TEXT,
                    role TEXT DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE,
                    user_id INTEGER,
                    status TEXT DEFAULT 'stopped',
                    port INTEGER,
                    path TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER,
                    role TEXT,
                    content TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(project_id) REFERENCES projects(id)
                );
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT,
                    ip TEXT,
                    success INTEGER,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()

    def execute(self, query, params=(), commit=True):
        conn = self._get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(query, params)
            if commit:
                conn.commit()
            return cursor
        except Exception as e:
            conn.rollback()
            raise e

    def fetch_one(self, query, params=()):
        row = self.execute(query, params, commit=False).fetchone()
        return dict(row) if row else None

    def fetch_all(self, query, params=()):
        rows = self.execute(query, params, commit=False).fetchall()
        return [dict(row) for row in rows]

db = Database()
