#!/usr/bin/env python3
"""
Reset or create an admin account and print a generated password.

Usage:
  python reset_admin_password.py --yes
"""
import os
import sys
import argparse
import secrets
import string
from dotenv import load_dotenv

try:
    import bcrypt
except Exception:
    print("Missing dependency: bcrypt. Install with 'pip install bcrypt'")
    raise

# Add backend directory to sys.path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(backend_dir)

load_dotenv(os.path.join(backend_dir, '.env'))

from app.utils.database import execute_query


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

    print(f"Target DB: MongoDB (via execute_query)")
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
        row = execute_query(
            "SELECT id FROM users WHERE username = %s OR email = %s",
            (args.username, args.email),
            fetch_one=True
        )
        if row:
            uid = row['id']
            execute_query(
                "UPDATE users SET password_hash = %s WHERE id = %s",
                (hashed, uid),
                fetch_all=False
            )
            print(f"Updated password for existing user id={uid}")
        else:
            uid = execute_query(
                "INSERT INTO users (username, email, password_hash, role, credits, is_active) VALUES (%s, %s, %s, 'admin', 99999, 1)",
                (args.username, args.email, hashed),
                fetch_all=False
            )
            print(f"Created admin user id={uid}")

        print('\n=== ADMIN CREDENTIALS ===')
        print('Username:', args.username)
        print('Email:', args.email)
        print('Password:', new_password)
        print('========================\n')
        print('Copy the password and rotate or store it securely.')

    except Exception as e:
        print('Error while updating database:', e)
        sys.exit(1)


if __name__ == '__main__':
    main()
