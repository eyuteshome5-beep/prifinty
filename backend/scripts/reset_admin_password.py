#!/usr/bin/env python3
"""
Reset or create an admin account and print a generated password.

Usage (run on the server or locally with DB access):
  python reset_admin_password.py --yes

This script reads DB credentials from `backend/.env` (dotenv) or from
environment variables and will update or create an `admin` user. It prints
the plaintext password only to stdout so it is not stored in the repo.
"""
import os
import argparse
import secrets
import string
import sys

try:
    import bcrypt
except Exception:
    print("Missing dependency: bcrypt. Install with 'pip install bcrypt'")
    raise

try:
    import mysql.connector
except Exception:
    print("Missing dependency: mysql-connector-python. Install with 'pip install mysql-connector-python'")
    raise

from dotenv import load_dotenv


def generate_password(length: int = 14) -> str:
    alphabet = string.ascii_letters + string.digits + "-_.@"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def main():
    parser = argparse.ArgumentParser(description='Reset or create admin user and print generated password')
    parser.add_argument('--username', default='admin', help='Admin username')
    parser.add_argument('--email', default='admin@example.com', help='Admin email')
    parser.add_argument('--length', type=int, default=14, help='Generated password length')
    parser.add_argument('--password', default=None, help='Explicit password to set (use with care)')
    parser.add_argument('--yes', action='store_true', help='Skip interactive confirmation')
    args = parser.parse_args()

    # Load .env from backend directory by default
    script_dir = os.path.dirname(__file__)
    dotenv_path = os.path.abspath(os.path.join(script_dir, '..', '.env'))
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path)

    host = os.getenv('MYSQL_HOST', 'localhost')
    user = os.getenv('MYSQL_USER', 'root')
    pwd = os.getenv('MYSQL_PASSWORD', '')
    db_name = os.getenv('MYSQL_DB', 'ethiopian_recommendations')
    port = int(os.getenv('MYSQL_PORT', 3306))

    print(f"Target DB: {user}@{host}:{port}/{db_name}")
    if not args.yes:
        c = input(f"This will set password for '{args.username}' ({args.email}). Type 'yes' to proceed: ")
        if c.strip().lower() != 'yes':
            print('Aborted.')
            sys.exit(1)

    # Use explicit password if provided, otherwise generate one
    if args.password:
        new_password = args.password
        if len(new_password) < 8:
            print('Provided password is too short. Password must be at least 8 characters.')
            sys.exit(1)
    else:
        new_password = generate_password(args.length)
    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    try:
        conn = mysql.connector.connect(host=host, user=user, password=pwd, database=db_name, port=port)
        cursor = conn.cursor()
    except Exception as e:
        print('Failed to connect to database:', e)
        sys.exit(1)

    try:
        cursor.execute("SELECT id FROM users WHERE username = %s OR email = %s", (args.username, args.email))
        row = cursor.fetchone()
        if row:
            uid = row[0]
            cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (hashed, uid))
            print(f"Updated password for existing user id={uid}")
        else:
            cursor.execute(
                "INSERT INTO users (username, email, password_hash, role, credits, is_active) VALUES (%s, %s, %s, 'admin', 99999, 1)",
                (args.username, args.email, hashed)
            )
            uid = cursor.lastrowid
            print(f"Created admin user id={uid}")

        conn.commit()
        cursor.close()
        conn.close()

        print('\n=== ADMIN CREDENTIALS ===')
        print('Username:', args.username)
        print('Email:', args.email)
        print('Password:', new_password)
        print('========================\n')
        print('Copy the password and delete this script or rotate the password after login.')

    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        print('Error while updating database:', e)
        sys.exit(1)


if __name__ == '__main__':
    main()
