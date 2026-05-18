import os
import re
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

# Get absolute paths relative to this script
script_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.abspath(os.path.join(script_dir, '..', '.env'))
sql_dir = os.path.abspath(os.path.join(script_dir, '..', 'database'))

# Load environment
load_dotenv(dotenv_path)

def parse_and_insert_sql_inserts(db, sql_content):
    # Dictionary of default columns mapping in case column names are omitted in standard dumps
    TABLE_COLUMNS = {
        'users': ['id', 'username', 'email', 'password_hash', 'role', 'credits', 'created_at', 'updated_at', 'last_login', 'is_active'],
        'items': ['id', 'title', 'description', 'genre', 'item_type', 'cover_image', 'is_ethiopian', 'popularity_score', 'avg_rating', 'rating_count', 'created_at', 'updated_at'],
        'books': ['id', 'item_id', 'author', 'isbn', 'publisher', 'publication_year', 'page_count', 'language'],
        'movies': ['id', 'item_id', 'director', 'release_year', 'duration_minutes', 'language', 'country', 'cast_members'],
        'music': ['id', 'item_id', 'artist', 'album', 'release_year', 'duration_seconds', 'language', 'ethiopian_genre'],
        'ethiopian_content_metadata': ['id', 'item_id', 'amharic_title', 'cultural_significance', 'region', 'traditional_genre', 'historical_period', 'created_at'],
        'ratings': ['id', 'user_id', 'item_id', 'rating', 'review', 'created_at', 'updated_at'],
        'recommendations': ['id', 'user_id', 'item_id', 'score', 'algorithm_type', 'explanation', 'is_viewed', 'created_at'],
        'preferences': ['id', 'user_id', 'preferred_genres', 'preferred_languages', 'ethiopian_content_preference', 'notification_enabled', 'created_at', 'updated_at'],
        'credit_transactions': ['id', 'user_id', 'amount', 'transaction_type', 'description', 'balance_after', 'created_at'],
        'user_activity': ['id', 'user_id', 'activity_type', 'item_id', 'details', 'created_at'],
        'wishlist': ['id', 'user_id', 'item_id', 'added_at', 'notes']
    }

    # Match standard INSERT INTO table (col1, ...) VALUES (val1, ...), (val2, ...);
    # Also matches column-less inserts: INSERT INTO table VALUES (val1, ...), (val2, ...);
    pattern = re.compile(
        r"insert\s+into\s+`?(\w+)`?(?:\s*\(([^)]+)\))?\s*values\s*(.+?);",
        re.IGNORECASE | re.DOTALL
    )
    
    # Subquery regex to resolve SELECT id FROM items WHERE title = 'Oromay'
    subquery_pattern = re.compile(r"\(SELECT\s+id\s+FROM\s+items\s+WHERE\s+title\s*=\s*'([^']+)'\)", re.IGNORECASE)
    
    matches = pattern.finditer(sql_content)
    inserted_count = 0
    
    for match in matches:
        table_name = match.group(1).lower()
        
        # Extract or default column names
        if match.group(2):
            columns = [c.strip().replace("`", "").lower() for c in match.group(2).split(",")]
        else:
            columns = TABLE_COLUMNS.get(table_name, [])
            
        values_block = match.group(3).strip()
        
        # Split multi-row parenthesized values character by character (to handle quotes and commas inside parens)
        rows = []
        current_row = []
        in_quotes = False
        quote_char = None
        escape = False
        paren_depth = 0
        
        for char in values_block:
            if escape:
                current_row.append(char)
                escape = False
                continue
            if char == "\\":
                escape = True
                continue
            if char in ("'", '"'):
                if not in_quotes:
                    in_quotes = True
                    quote_char = char
                elif char == quote_char:
                    in_quotes = False
                current_row.append(char)
            elif char == "(" and not in_quotes:
                paren_depth += 1
                if paren_depth > 1 or len(current_row) > 0:
                    current_row.append(char)
            elif char == ")" and not in_quotes:
                paren_depth -= 1
                if paren_depth == 0:
                    rows.append("".join(current_row).strip())
                    current_row = []
                else:
                    current_row.append(char)
            else:
                if paren_depth > 0:
                    current_row.append(char)
                    
        for row_str in rows:
            # Character-by-character SQL comma split inside the row
            vals = []
            current_val = []
            in_quotes = False
            quote_char = None
            escape = False
            
            for char in row_str:
                if escape:
                    current_val.append(char)
                    escape = False
                    continue
                if char == "\\":
                    escape = True
                    continue
                if char in ("'", '"'):
                    if not in_quotes:
                        in_quotes = True
                        quote_char = char
                    elif char == quote_char:
                        in_quotes = False
                    else:
                        current_val.append(char)
                elif char == "," and not in_quotes:
                    vals.append("".join(current_val).strip())
                    current_val = []
                else:
                    current_val.append(char)
                    
            if current_val:
                vals.append("".join(current_val).strip())
                
            cleaned_vals = []
            for v in vals:
                # Check for SELECT query mapping
                sub_match = subquery_pattern.match(v)
                if sub_match:
                    title = sub_match.group(1)
                    item = db.items.find_one({"title": title})
                    if item:
                        cleaned_vals.append(item["_id"])
                    else:
                        cleaned_vals.append(None)
                elif v.upper() == "NULL":
                    cleaned_vals.append(None)
                elif (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
                    cleaned_vals.append(v[1:-1])
                else:
                    try:
                        if "." in v:
                            cleaned_vals.append(float(v))
                        else:
                            cleaned_vals.append(int(v))
                    except:
                        if v.startswith("'") or v.startswith('"'):
                            v = v[1:-1]
                        cleaned_vals.append(v)
                        
            # Create document
            STRING_COLUMNS = {
                'title', 'description', 'genre', 'item_type', 'cover_image',
                'username', 'email', 'password_hash', 'role',
                'author', 'isbn', 'publisher', 'language',
                'director', 'country', 'cast_members',
                'artist', 'album', 'ethiopian_genre',
                'amharic_title', 'cultural_significance', 'region', 'traditional_genre', 'historical_period',
                'review', 'algorithm_type', 'explanation',
                'activity_type', 'details', 'notes'
            }
            doc = {}
            for col, val in zip(columns, cleaned_vals):
                col_lower = col.lower()
                if col_lower in STRING_COLUMNS and val is not None:
                    doc[col] = str(val)
                else:
                    doc[col] = val
                
            # Autoincrement sequence support for standard collections
            if 'id' not in doc and table_name not in ("movies", "music", "books", "ethiopian_content_metadata"):
                counter = db.counters.find_one({"_id": table_name})
                seq = (counter["sequence_value"] if counter else 0) + 1
                doc["id"] = seq
                db.counters.update_one(
                    {"_id": table_name},
                    {"$set": {"sequence_value": seq}},
                    upsert=True
                )
                
            if "id" in doc:
                doc["_id"] = doc["id"]
                
            # MongoDB Document Schema Merges (books, movies, music metadata embed in items)
            if table_name in ("movies", "music", "books"):
                item_id = doc.get("item_id")
                if item_id:
                    update_fields = {k: v for k, v in doc.items() if k not in ("item_id", "_id", "id")}
                    db.items.update_one({"_id": item_id}, {"$set": update_fields})
                    continue
                    
            if table_name == "ethiopian_content_metadata":
                item_id = doc.get("item_id")
                if item_id:
                    update_fields = {k: v for k, v in doc.items() if k not in ("item_id", "_id", "id")}
                    db.items.update_one({"_id": item_id}, {"$set": update_fields})
                    continue
                    
            # Insert document ignoring duplicates
            try:
                db[table_name].insert_one(doc)
            except Exception:
                pass
            
            # Seed autoincrement sequence collections
            if "_id" in doc and isinstance(doc["_id"], int):
                db.counters.update_one(
                    {"_id": table_name},
                    {"$max": {"sequence_value": doc["_id"]}},
                    upsert=True
                )
                
            inserted_count += 1
            
    return inserted_count


def init_db():
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/ethiopian_recommendations')
    print(f"Connecting to MongoDB at {mongo_uri}...")
    
    client = MongoClient(mongo_uri)
    db_name = 'ethiopian_recommendations'
    if '/' in mongo_uri.replace('mongodb://', '').replace('mongodb+srv://', ''):
        parts = mongo_uri.split('/')
        if parts[-1]:
            db_name = parts[-1].split('?')[0]
            
    db = client[db_name]
    
    # Drop all collections for a fresh start
    print("Dropping existing collections to perform fresh MongoDB seed...")
    collections_to_drop = ["users", "items", "ratings", "wishlist", "credit_transactions", "verification_codes", "site_settings", "preferences", "counters"]
    for col in collections_to_drop:
        db[col].drop()
        
    # Setup Indexes
    print("Setting up indexes...")
    db.users.create_index("email", unique=True)
    db.users.create_index("username", unique=True)
    db.items.create_index("title", unique=True)
    db.items.create_index("external_id", unique=True, sparse=True)
    db.verification_codes.create_index([("email", 1), ("code", 1)])
    db.site_settings.create_index("config_key", unique=True)
    
    # Load SQL files
    sql_files = ["database_setup.sql", "full_database_export.sql"]
    total_inserted = 0
    
    for filename in sql_files:
        file_path = os.path.join(sql_dir, filename)
        if os.path.exists(file_path):
            print(f"Parsing and seeding from SQL file: {filename}...")
            with open(file_path, "r", encoding="utf-8") as f:
                sql_content = f.read()
            inserted = parse_and_insert_sql_inserts(db, sql_content)
            print(f"Seeded {inserted} documents from {filename}")
            total_inserted += inserted
        else:
            print(f"Warning: SQL file {filename} not found at {file_path}, skipping.")
            
    print(f"\nMongoDB Initialization complete! Total documents seeded: {total_inserted}")


if __name__ == "__main__":
    init_db()
