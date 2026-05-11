import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv('backend/.env')

db = mysql.connector.connect(
    host=os.getenv('MYSQL_HOST', 'localhost'),
    user=os.getenv('MYSQL_USER', 'root'),
    password=os.getenv('MYSQL_PASSWORD', 'root123'),
    database=os.getenv('MYSQL_DB', 'defaultdb'),
    port=int(os.getenv('MYSQL_PORT', 3306))
)

import bcrypt

# Admin Credentials
email = 'admin@example.com'
username = 'admin'
password = '12121212'

print(f"Hashing password for {email}...")
admin_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')

# Try to update if exists, otherwise insert
cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
user = cursor.fetchone()

if user:
    print("Admin exists. Updating password...")
    cursor.execute(
        "UPDATE users SET password_hash = %s, role = 'admin', is_active = 1 WHERE email = %s",
        (admin_hash, email)
    )
else:
    print("Admin not found. Creating...")
    cursor.execute(
        "INSERT INTO users (username, email, password_hash, role, credits, is_active) VALUES (%s, %s, %s, 'admin', 99999, 1)",
        (username, email, admin_hash)
    )

# Ensure preferences exist for admin (ID 1)
cursor.execute("SELECT user_id FROM preferences WHERE user_id = 1")
if not cursor.fetchone():
    cursor.execute(
        "INSERT INTO preferences (user_id, preferred_genres, preferred_languages, ethiopian_content_preference) VALUES (1, '[]', '[\"English\", \"Amharic\"]', 1)"
    )

db.commit()
print("Admin configured successfully!")
cursor.close()
db.close()
