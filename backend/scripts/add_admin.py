import os
import sys
from dotenv import load_dotenv
import bcrypt

# Add backend directory to sys.path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(backend_dir)

load_dotenv(os.path.join(backend_dir, '.env'))

from app.utils.database import execute_query

# Admin Credentials
email = 'admin@example.com'
username = 'admin'
password = '12121212'

print(f"Hashing password for {email}...")
admin_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')

# Try to update if exists, otherwise insert
user = execute_query("SELECT id FROM users WHERE email = %s", (email,), fetch_one=True)

if user:
    print("Admin exists. Updating password...")
    execute_query(
        "UPDATE users SET password_hash = %s, role = 'admin', is_active = 1 WHERE email = %s",
        (admin_hash, email),
        fetch_all=False
    )
else:
    print("Admin not found. Creating...")
    execute_query(
        "INSERT INTO users (username, email, password_hash, role, credits, is_active) VALUES (%s, %s, %s, 'admin', 99999, 1)",
        (username, email, admin_hash),
        fetch_all=False
    )

# Ensure preferences exist for admin (ID 1)
pref = execute_query("SELECT user_id FROM preferences WHERE user_id = 1", fetch_one=True)
if not pref:
    execute_query(
        "INSERT INTO preferences (user_id, preferred_genres, preferred_languages, ethiopian_content_preference) VALUES (1, '[]', '[\"English\", \"Amharic\"]', 1)",
        fetch_all=False
    )

print("Admin configured successfully!")
