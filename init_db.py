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

with open('database_setup.sql', 'r', encoding='utf-8') as f:
    sql_script = f.read()

# Remove anything after DELIMITER
core_sql = sql_script.split('DELIMITER')[0]

# Replace database name with defaultdb so tables are created in the right place
core_sql = core_sql.replace('ethiopian_recommendations', 'defaultdb')

# Execute multiple statements
for statement in core_sql.split(';'):
    stmt = statement.strip()
    if stmt and not stmt.startswith('--'):
        try:
            cursor.execute(stmt)
            db.commit()
        except Exception as e:
            if 'CREATE DATABASE' in stmt.upper() and 'Access denied' in str(e):
                pass
            else:
                print(f"Failed cmd: {stmt[:50]}... Error: {e}")

db.commit()

db.commit()
cursor.close()
db.close()
print("Database schema created successfully!")
