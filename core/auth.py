import hashlib
import os
import secrets
import time
from core.db import db

class Auth:
    @staticmethod
    def hash_password(password, salt=None):
        if salt is None:
            salt = secrets.token_hex(16)
        hash_obj = hashlib.sha256((password + salt).encode())
        return f"{salt}${hash_obj.hexdigest()}"

    @staticmethod
    def verify_password(password, stored_hash):
        try:
            salt, hash_val = stored_hash.split("$")
            return Auth.hash_password(password, salt) == stored_hash
        except:
            return False

    @staticmethod
    def register(username, password, role='user'):
        password_hash = Auth.hash_password(password)
        try:
            db.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", 
                       (username, password_hash, role))
            return True
        except:
            return False

    @staticmethod
    def login(username, password, ip="0.0.0.0"):
        user = db.fetch_one("SELECT * FROM users WHERE username = ?", (username,))
        success = 0
        if user and Auth.verify_password(password, user['password_hash']):
            success = 1
        
        db.execute("INSERT INTO login_attempts (username, ip, success) VALUES (?, ?, ?)", 
                   (username, ip, success))
        
        if success:
            # Simple session token
            token = secrets.token_hex(32)
            # In a real app, we'd store this in a 'sessions' table or use JWT
            # For this lightweight app, we'll return the user info and a mock token
            return {"token": token, "user": {"id": user['id'], "username": user['username'], "role": user['role']}}
        return None

auth_service = Auth()
