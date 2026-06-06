"""
Data Migration Script: MongoDB to MySQL (Robust Version)
"""
import os
import sys
import re
import json
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient
import mysql.connector
from dotenv import load_dotenv

# Get absolute paths relative to this script
script_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.abspath(os.path.join(script_dir, '..', '.env'))
schema_path = os.path.abspath(os.path.join(script_dir, '..', 'database', 'schema.sql'))

# Load environment
load_dotenv(dotenv_path)

MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/ethiopian_recommendations'
MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '')
MYSQL_DB = os.environ.get('MYSQL_DB', 'ethiopian_recommendations')
MYSQL_PORT = int(os.environ.get('MYSQL_PORT', 3306))

# Id mappings to handle duplicates
mapped_user_ids = {}
mapped_item_ids = {}

def init_mysql_schema(mysql_conn):
    print(f"Reading MySQL schema from {schema_path}...")
    if not os.path.exists(schema_path):
        print(f"Error: schema.sql not found at {schema_path}")
        sys.exit(1)
        
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
        
    # Remove single line comments starting with --
    schema_sql = re.sub(r'--.*$', '', schema_sql, flags=re.MULTILINE)
    
    # Split queries by ;
    queries = schema_sql.split(';')
    cursor = mysql_conn.cursor()
    for query in queries:
        query = query.strip()
        if not query:
            continue
        try:
            cursor.execute(query)
        except Exception as e:
            if "database exists" in str(e).lower():
                continue
            print(f"Warning/Error executing schema query: {e}")
    cursor.close()
    print("MySQL schema initialized.")

def get_table_columns(cursor, table_name):
    cursor.execute(f"DESCRIBE `{table_name}`")
    rows = cursor.fetchall()
    columns = []
    for row in rows:
        if isinstance(row, dict):
            columns.append(row['Field'])
        else:
            columns.append(row[0])
    return columns

def migrate_users(mongo_db, mysql_conn):
    print("Migrating users -> users...")
    global mapped_user_ids
    mapped_user_ids = {}
    
    collection = mongo_db['users']
    docs = list(collection.find())
    
    mysql_cursor = mysql_conn.cursor(dictionary=True)
    columns = get_table_columns(mysql_cursor, 'users')
    mysql_cursor.execute("DELETE FROM `users`")
    mysql_conn.commit()
    
    used_ids = set()
    
    # Step 1: Process integer _id records first
    for doc in docs:
        mongo_id = doc.get('_id')
        if isinstance(mongo_id, int):
            # Check if username/email is empty/None
            if not doc.get('username') or not doc.get('email'):
                print(f"Skipping corrupted user with _id={mongo_id}")
                continue
                
            mapped_user_ids[mongo_id] = mongo_id
            mapped_user_ids[str(mongo_id)] = mongo_id
            used_ids.add(mongo_id)
            
            # Insert into MySQL
            row_data = {}
            for col in columns:
                if col == 'id':
                    row_data[col] = mongo_id
                elif col in doc:
                    row_data[col] = doc[col]
            
            cols = ", ".join([f"`{c}`" for c in row_data.keys()])
            placeholders = ", ".join(["%s"] * len(row_data))
            query = f"INSERT INTO `users` ({cols}) VALUES ({placeholders})"
            try:
                mysql_cursor.execute(query, tuple(row_data.values()))
            except Exception as e:
                print(f"Error inserting user ID {mongo_id}: {e}")
                
    # Step 2: Process ObjectId _id records (assign new IDs if duplicate)
    next_id = max(used_ids) + 1 if used_ids else 1
    
    for doc in docs:
        mongo_id = doc.get('_id')
        if isinstance(mongo_id, ObjectId):
            if not doc.get('username') or not doc.get('email'):
                print(f"Skipping corrupted user with ObjectId={mongo_id}")
                continue
                
            requested_id = doc.get('id')
            # If requested_id is already used or not set, assign next_id
            if requested_id is None or requested_id in used_ids:
                assigned_id = next_id
                next_id += 1
            else:
                assigned_id = int(requested_id)
                
            mapped_user_ids[mongo_id] = assigned_id
            mapped_user_ids[str(mongo_id)] = assigned_id
            used_ids.add(assigned_id)
            
            row_data = {}
            for col in columns:
                if col == 'id':
                    row_data[col] = assigned_id
                elif col in doc:
                    row_data[col] = doc[col]
                    
            cols = ", ".join([f"`{c}`" for c in row_data.keys()])
            placeholders = ", ".join(["%s"] * len(row_data))
            query = f"INSERT INTO `users` ({cols}) VALUES ({placeholders})"
            try:
                mysql_cursor.execute(query, tuple(row_data.values()))
            except Exception as e:
                print(f"Error inserting user ObjectId {mongo_id} as ID {assigned_id}: {e}")
                
    mysql_conn.commit()
    mysql_cursor.close()
    print(f"User migration done. Mapped {len(mapped_user_ids)} MongoDB keys.")

def migrate_items(mongo_db, mysql_conn):
    print("Migrating items -> items...")
    global mapped_item_ids
    mapped_item_ids = {}
    
    collection = mongo_db['items']
    docs = list(collection.find())
    
    mysql_cursor = mysql_conn.cursor(dictionary=True)
    columns = get_table_columns(mysql_cursor, 'items')
    mysql_cursor.execute("DELETE FROM `items`")
    mysql_conn.commit()
    
    used_ids = set()
    
    # Step 1: Process integer _id records first
    for doc in docs:
        mongo_id = doc.get('_id')
        if isinstance(mongo_id, int):
            if not doc.get('title'):
                print(f"Skipping corrupted item with _id={mongo_id}")
                continue
                
            mapped_item_ids[mongo_id] = mongo_id
            mapped_item_ids[str(mongo_id)] = mongo_id
            used_ids.add(mongo_id)
            
            row_data = {}
            for col in columns:
                if col == 'id':
                    row_data[col] = mongo_id
                elif col in doc:
                    val = doc[col]
                    row_data[col] = json.dumps(val) if isinstance(val, (dict, list)) else val
                    
            cols = ", ".join([f"`{c}`" for c in row_data.keys()])
            placeholders = ", ".join(["%s"] * len(row_data))
            query = f"INSERT INTO `items` ({cols}) VALUES ({placeholders})"
            try:
                mysql_cursor.execute(query, tuple(row_data.values()))
            except Exception as e:
                print(f"Error inserting item ID {mongo_id}: {e}")
                
    # Step 2: Process ObjectId _id records
    next_id = max(used_ids) + 1 if used_ids else 1
    
    for doc in docs:
        mongo_id = doc.get('_id')
        if isinstance(mongo_id, ObjectId):
            if not doc.get('title'):
                print(f"Skipping corrupted item with ObjectId={mongo_id}")
                continue
                
            requested_id = doc.get('id')
            if requested_id is None or requested_id in used_ids:
                assigned_id = next_id
                next_id += 1
            else:
                assigned_id = int(requested_id)
                
            mapped_item_ids[mongo_id] = assigned_id
            mapped_item_ids[str(mongo_id)] = assigned_id
            used_ids.add(assigned_id)
            
            row_data = {}
            for col in columns:
                if col == 'id':
                    row_data[col] = assigned_id
                elif col in doc:
                    val = doc[col]
                    row_data[col] = json.dumps(val) if isinstance(val, (dict, list)) else val
                    
            cols = ", ".join([f"`{c}`" for c in row_data.keys()])
            placeholders = ", ".join(["%s"] * len(row_data))
            query = f"INSERT INTO `items` ({cols}) VALUES ({placeholders})"
            try:
                mysql_cursor.execute(query, tuple(row_data.values()))
            except Exception as e:
                print(f"Error inserting item ObjectId {mongo_id} as ID {assigned_id}: {e}")
                
    mysql_conn.commit()
    mysql_cursor.close()
    print(f"Item migration done. Mapped {len(mapped_item_ids)} MongoDB keys.")

def migrate_general_table(mongo_db, mysql_conn, collection_name, table_name):
    print(f"Migrating {collection_name} -> {table_name}...")
    
    collection = mongo_db[collection_name]
    docs = list(collection.find())
    
    mysql_cursor = mysql_conn.cursor(dictionary=True)
    columns = get_table_columns(mysql_cursor, table_name)
    mysql_cursor.execute(f"DELETE FROM `{table_name}`")
    mysql_conn.commit()
    
    inserted = 0
    errors = 0
    
    for doc in docs:
        row_data = {}
        skip_row = False
        
        for col in columns:
            if col == 'id':
                # Let MySQL auto-generate PK id for all table mappings except users/items
                continue
                
            # Perform mapping for user_id and item_id foreign keys
            if col == 'user_id' and 'user_id' in doc:
                raw_uid = doc['user_id']
                if raw_uid in mapped_user_ids:
                    row_data[col] = mapped_user_ids[raw_uid]
                elif str(raw_uid) in mapped_user_ids:
                    row_data[col] = mapped_user_ids[str(raw_uid)]
                else:
                    try:
                        row_data[col] = int(raw_uid)
                    except (ValueError, TypeError):
                        print(f"Warning: user_id '{raw_uid}' could not be resolved. Skipping row in {table_name}.")
                        skip_row = True
                        break
                        
            elif col == 'item_id' and 'item_id' in doc:
                raw_iid = doc['item_id']
                if raw_iid in mapped_item_ids:
                    row_data[col] = mapped_item_ids[raw_iid]
                elif str(raw_iid) in mapped_item_ids:
                    row_data[col] = mapped_item_ids[str(raw_iid)]
                else:
                    try:
                        row_data[col] = int(raw_iid)
                    except (ValueError, TypeError):
                        print(f"Warning: item_id '{raw_iid}' could not be resolved. Skipping row in {table_name}.")
                        skip_row = True
                        break
                        
            elif col in doc:
                val = doc[col]
                if isinstance(val, (dict, list)):
                    row_data[col] = json.dumps(val)
                elif isinstance(val, ObjectId):
                    row_data[col] = str(val)
                else:
                    row_data[col] = val
                    
        if skip_row or not row_data:
            continue
            
        cols = ", ".join([f"`{c}`" for c in row_data.keys()])
        placeholders = ", ".join(["%s"] * len(row_data))
        query = f"INSERT INTO `{table_name}` ({cols}) VALUES ({placeholders})"
        try:
            mysql_cursor.execute(query, tuple(row_data.values()))
            inserted += 1
        except Exception as e:
            print(f"Error inserting row in {table_name}: {e}")
            errors += 1
            
    mysql_conn.commit()
    mysql_cursor.close()
    print(f"Successfully migrated {inserted} rows to '{table_name}' ({errors} errors)")

def main():
    print("Starting database migration from MongoDB to MySQL...")
    
    # Connect to MongoDB
    try:
        print(f"Connecting to MongoDB...")
        mongo_client = MongoClient(MONGO_URI, tlsAllowInvalidCertificates=True)
        db_name = 'ethiopian_recommendations'
        if '/' in MONGO_URI.replace('mongodb://', '').replace('mongodb+srv://', ''):
            parts = MONGO_URI.split('/')
            if parts[-1]:
                db_name = parts[-1].split('?')[0]
        mongo_db = mongo_client[db_name]
        print(f"Connected to MongoDB database: '{db_name}'")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        sys.exit(1)
        
    # Connect to MySQL
    try:
        print(f"Connecting to MySQL ({MYSQL_HOST}:{MYSQL_PORT})...")
        mysql_conn = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            port=MYSQL_PORT
        )
        print("Connected to MySQL server.")
    except Exception as e:
        print(f"Error connecting to MySQL: {e}")
        sys.exit(1)
        
    # Initialize Schema
    init_mysql_schema(mysql_conn)
    
    # Re-connect to specific database
    mysql_conn.database = MYSQL_DB
    
    # Disable foreign key checks
    cursor = mysql_conn.cursor()
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
    cursor.close()
    
    try:
        # Migrate users and items (which build the ID mappings)
        migrate_users(mongo_db, mysql_conn)
        migrate_items(mongo_db, mysql_conn)
        
        # Migrate dependent tables
        dependent_tables = [
            ('books', 'books'),
            ('movies', 'movies'),
            ('music', 'music'),
            ('ratings', 'ratings'),
            ('preferences', 'preferences'),
            ('recommendations', 'recommendations'),
            ('wishlist', 'wishlist'),
            ('ethiopian_content_metadata', 'ethiopian_content_metadata'),
            ('credit_transactions', 'credit_transactions'),
            ('user_activity', 'user_activity'),
            ('verification_codes', 'verification_codes'),
            ('external_links', 'external_links')
        ]
        
        for collection_name, table_name in dependent_tables:
            migrate_general_table(mongo_db, mysql_conn, collection_name, table_name)
            
    finally:
        # Restore foreign key checks
        cursor = mysql_conn.cursor()
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        cursor.close()
        
    mongo_client.close()
    mysql_conn.close()
    print("Database migration completed successfully!")

if __name__ == '__main__':
    main()
