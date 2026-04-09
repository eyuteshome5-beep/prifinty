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

cursor = db.cursor()

admin_hash = '$2b$12$SGW.VbAnYaJwiX2WDJGcDOHGbijDs3XqvVrTMpzjMAK9b3x2KC7c2'

# Insert admin
cursor.execute(
    "INSERT IGNORE INTO users (username, email, password_hash, role, credits, is_active) VALUES ('admin', 'admin@example.com', %s, 'admin', 99999, 1)",
    (admin_hash,)
)

# Insert preferences
cursor.execute(
    "INSERT IGNORE INTO preferences (user_id, preferred_genres, preferred_languages, ethiopian_content_preference) VALUES (1, '[]', '[\"English\", \"Amharic\"]', 1)"
)

db.commit()
print("Admin added successfully!")
cursor.close()
db.close()
