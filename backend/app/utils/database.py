"""
MongoDB Database Connection Utilities with SQL Translation Layer
"""
import os
import re
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient
from flask import current_app, g
from contextlib import contextmanager

class Database:
    """MongoDB Database Connection Manager"""
    _client = None
    _db = None
    
    @classmethod
    def init_pool(cls, app):
        """Initialize MongoDB client connection pool"""
        try:
            mongo_uri = app.config.get('MONGO_URI') or os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/ethiopian_recommendations'
            cls._client = MongoClient(mongo_uri, maxPoolSize=50)
            
            # Extract database name from URI, default to 'ethiopian_recommendations'
            db_name = 'ethiopian_recommendations'
            if '/' in mongo_uri.replace('mongodb://', '').replace('mongodb+srv://', ''):
                parts = mongo_uri.split('/')
                if parts[-1]:
                    db_name = parts[-1].split('?')[0]
            cls._db = cls._client[db_name]
            print(f"[MongoDB] Connected successfully (DB: {db_name})")
            
            # Setup indexes
            try:
                cls._db.users.create_index("email", unique=True)
                cls._db.users.create_index("username", unique=True)
                cls._db.items.create_index("title", unique=True)
                cls._db.items.create_index("external_id", unique=True, sparse=True)
                cls._db.verification_codes.create_index([("email", 1), ("code", 1)])
                cls._db.site_settings.create_index("config_key", unique=True)
                cls._db.ratings.create_index([("user_id", 1), ("item_id", 1)])
                cls._db.items.create_index([("item_type", 1), ("popularity_score", -1)])
                print("[MongoDB] Indexes initialized successfully.")
            except Exception as e:
                print(f"[MongoDB] Index creation warning: {e}")
                
        except Exception as e:
            print(f"[MongoDB] Connection error: {e}")
            cls._client = None
            cls._db = None

    @classmethod
    def get_connection(cls):
        """Get the database instance"""
        if cls._db is None:
            mongo_uri = None
            try:
                from flask import has_app_context
                if has_app_context():
                    mongo_uri = current_app.config.get('MONGO_URI')
            except Exception:
                pass
                
            if not mongo_uri:
                mongo_uri = os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/ethiopian_recommendations'
                
            cls._client = MongoClient(mongo_uri)
            db_name = 'ethiopian_recommendations'
            if '/' in mongo_uri.replace('mongodb://', '').replace('mongodb+srv://', ''):
                parts = mongo_uri.split('/')
                if parts[-1]:
                    db_name = parts[-1].split('?')[0]
            cls._db = cls._client[db_name]
        return cls._db

    @classmethod
    @contextmanager
    def get_cursor(cls, dictionary=True):
        """Context manager yielding the emulator cursor"""
        db = cls.get_connection()
        cursor = MongoCursorEmulator(db)
        try:
            yield cursor
        except Exception as e:
            raise e


def get_db():
    """Get database connection for current request context"""
    if 'db' not in g:
        g.db = Database.get_connection()
    return g.db


def close_db(e=None):
    """Close connection placeholder (pymongo manages its pool automatically)"""
    pass


def get_next_sequence_value(db, collection_name):
    """Generate autoincrement integer IDs for compatibility with frontend and algorithms"""
    result = db.counters.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=True
    )
    return result["sequence_value"]


def clean_object_ids(data):
    if isinstance(data, list):
        return [clean_object_ids(item) for item in data]
    elif isinstance(data, dict):
        cleaned = {}
        for k, v in data.items():
            if isinstance(v, ObjectId):
                cleaned[k] = str(v)
            else:
                cleaned[k] = clean_object_ids(v)
        return cleaned
    else:
        return data


# Emulated Cursor matching MySQL cursor contract
class MongoCursorEmulator:
    def __init__(self, db):
        self.db = db
        self.results = []
        self.current_idx = 0
        self.lastrowid = None
        self.rowcount = 0

    def execute(self, query, params=None):
        self.results, self.lastrowid, self.rowcount = translate_and_execute_sql(self.db, query, params)
        self.results = clean_object_ids(self.results)
        self.current_idx = 0

    def fetchone(self):
        if self.current_idx < len(self.results):
            res = self.results[self.current_idx]
            self.current_idx += 1
            return res
        return None

    def fetchall(self):
        res = self.results[self.current_idx:]
        self.current_idx = len(self.results)
        return res

    def close(self):
        pass


def execute_query(query, params=None, fetch_one=False, fetch_all=True):
    """Execute a query and return emulated results"""
    try:
        with Database.get_cursor() as cursor:
            cursor.execute(query, params or ())
            if fetch_one:
                return cursor.fetchone()
            if fetch_all:
                return cursor.fetchall()
            return cursor.lastrowid
    except Exception as e:
        print(f"[DB ERROR] Emulating Query: {query}")
        print(f"[DB ERROR] Params: {params}")
        print(f"[DB ERROR] Exception: {str(e)}")
        raise e


def execute_many(query, params_list):
    """Execute multiple queries in bulk"""
    rowcount = 0
    with Database.get_cursor() as cursor:
        for params in params_list:
            cursor.execute(query, params)
            rowcount += cursor.rowcount
    return rowcount


def translate_and_execute_sql(db, sql, params=None):
    if params is None:
        params = ()
    elif not isinstance(params, (list, tuple)):
        params = (params,)
        
    sql_norm = " ".join(sql.split()).strip().lower()
    
    # 1. INSERT PATTERNS
    if sql_norm.startswith("insert"):
        return handle_insert(db, sql, params)
        
    # 2. UPDATE PATTERNS
    elif sql_norm.startswith("update"):
        return handle_update(db, sql, params)
        
    # 3. DELETE PATTERNS
    elif sql_norm.startswith("delete"):
        return handle_delete(db, sql, params)
        
    # 4. SELECT PATTERNS
    elif sql_norm.startswith("select"):
        return handle_select(db, sql, params)
        
    # 5. CREATE TABLE / ALTER / OTHER DDL (mock since MongoDB is schemaless)
    else:
        print(f"[MongoDB Mock DDL] SQL: {sql}")
        return [], None, 0


def handle_insert(db, sql, params):
    # Pattern: INSERT INTO table (col1, col2) VALUES (%s, %s)
    table_match = re.search(r"insert\s+into\s+(\w+)", sql, re.IGNORECASE)
    if not table_match:
        raise ValueError(f"Could not parse INSERT table from SQL: {sql}")
    table_name = table_match.group(1).lower()
    
    # Extract columns
    cols_match = re.search(r"\(([^)]+)\)\s*values", sql, re.IGNORECASE)
    if not cols_match:
        raise ValueError(f"Could not parse INSERT columns from SQL: {sql}")
    columns = [c.strip().lower() for c in cols_match.group(1).split(",")]
    
    # Construct document
    doc = {}
    for i, col in enumerate(columns):
        if i < len(params):
            val = params[i]
            doc[col] = val
            
    # Autoincrement sequence ID
    next_id = get_next_sequence_value(db, table_name)
    doc["_id"] = next_id
    doc["id"] = next_id
    if "created_at" not in doc:
        doc["created_at"] = datetime.utcnow()
        
    # Special collection schema integrations:
    # If inserting into movies, music, books: merge directly into items!
    if table_name in ("movies", "music", "books"):
        item_id = doc.get("item_id")
        if item_id:
            update_fields = {k: v for k, v in doc.items() if k not in ("item_id", "_id", "id")}
            db.items.update_one({"_id": item_id}, {"$set": update_fields})
            return [], next_id, 1
            
    if table_name == "ethiopian_content_metadata":
        item_id = doc.get("item_id")
        if item_id:
            update_fields = {k: v for k, v in doc.items() if k not in ("item_id", "_id", "id")}
            db.items.update_one({"_id": item_id}, {"$set": update_fields})
            return [], next_id, 1
            
    # Regular insert
    db[table_name].insert_one(doc)
    return [], next_id, 1


def handle_update(db, sql, params):
    # Pattern: UPDATE table SET col1 = %s, col2 = %s WHERE id = %s
    table_match = re.search(r"update\s+(\w+)", sql, re.IGNORECASE)
    if not table_match:
        raise ValueError(f"Could not parse UPDATE table from SQL: {sql}")
    table_name = table_match.group(1).lower()
    
    # Check for atomic credits deduction
    if "credits = credits -" in sql:
        amount, user_id, min_credits = params[0], params[1], params[2]
        res = db.users.update_one(
            {"_id": user_id, "credits": {"$gte": min_credits}},
            {"$inc": {"credits": -amount}}
        )
        return [], None, res.modified_count

    # Extract SET and WHERE parts
    parts = re.split(r"\s+where\s+", sql, flags=re.IGNORECASE)
    set_part = parts[0]
    where_part = parts[1] if len(parts) > 1 else ""
    
    # Clean set_part to remove "UPDATE table SET " prefix
    set_part_clean = re.sub(r"^update\s+\w+\s+set\s+", "", set_part, flags=re.IGNORECASE).strip()
    
    # Count placeholders in SET part
    set_placeholders = len(re.findall(r"%s", set_part_clean))
    set_params = params[:set_placeholders]
    where_params = params[set_placeholders:]
    
    # Split SET assignments by commas, taking care of single-quoted strings
    assignments = []
    current_ass = []
    in_quotes = False
    quote_char = None
    escape = False
    
    for char in set_part_clean:
        if escape:
            current_ass.append(char)
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
            current_ass.append(char)
        elif char == "," and not in_quotes:
            assignments.append("".join(current_ass).strip())
            current_ass = []
        else:
            current_ass.append(char)
            
    if current_ass:
        assignments.append("".join(current_ass).strip())
        
    update_doc = {}
    param_idx = 0
    
    for ass in assignments:
        if "=" not in ass:
            continue
        col_part, val_part = ass.split("=", 1)
        col = col_part.strip().lower()
        val_str = val_part.strip()
        
        if val_str == "%s":
            if param_idx < len(set_params):
                update_doc[col] = set_params[param_idx]
                param_idx += 1
        elif val_str.upper() == "NULL":
            update_doc[col] = None
        elif (val_str.startswith("'") and val_str.endswith("'")) or (val_str.startswith('"') and val_str.endswith('"')):
            update_doc[col] = val_str[1:-1]
        else:
            try:
                if "." in val_str:
                    update_doc[col] = float(val_str)
                else:
                    update_doc[col] = int(val_str)
            except:
                if val_str.startswith("'") or val_str.startswith('"'):
                    val_str = val_str[1:-1]
                update_doc[col] = val_str
                
    # Parse WHERE conditions
    filter_doc = parse_where_clause(where_part, where_params)
    
    # Execute update
    res = db[table_name].update_many(filter_doc, {"$set": update_doc})
    return [], None, res.modified_count


def handle_delete(db, sql, params):
    # Pattern: DELETE FROM table WHERE col = %s
    table_match = re.search(r"delete\s+from\s+(\w+)", sql, re.IGNORECASE)
    if not table_match:
        raise ValueError(f"Could not parse DELETE table from SQL: {sql}")
    table_name = table_match.group(1).lower()
    
    where_match = re.search(r"where\s+(.+)", sql, re.IGNORECASE)
    filter_doc = {}
    if where_match:
        filter_doc = parse_where_clause(where_match.group(1), params)
        
    res = db[table_name].delete_many(filter_doc)
    return [], None, res.deleted_count


def evaluate_aggregations(db, sql, results, table_name):
    # Extract select part: everything between SELECT and FROM
    select_match = re.search(r"select\s+(.+?)\s+from", sql, re.IGNORECASE | re.DOTALL)
    if not select_match:
        return {}
        
    select_cols = select_match.group(1).split(",")
    stats = {}
    
    # Perform in-memory join if needed
    if table_name == "ratings" and "join items" in sql.lower():
        item_ids = {r.get("item_id") for r in results if r.get("item_id") is not None}
        items_dict = {}
        if item_ids:
            items_dict = {item["_id"]: item for item in db.items.find({"_id": {"$in": list(item_ids)}})}
        for r in results:
            item_id = r.get("item_id")
            it = items_dict.get(item_id)
            if it:
                r["item_type"] = it.get("item_type")
                r["title"] = it.get("title")
                
    for col in select_cols:
        col = col.strip()
        # Find column alias
        alias_match = re.search(r"as\s+(\w+)", col, re.IGNORECASE)
        alias = alias_match.group(1).lower() if alias_match else col.split()[-1].lower()
        
        # 1. COUNT(*) or COUNT(id)
        if "count(*)" in col.lower():
            stats[alias] = len(results)
            
        # 2. COUNT(DISTINCT user_id) or COUNT(user_id)
        elif "count(" in col.lower():
            field_match = re.search(r"count\(\s*(?:distinct\s+)?([\w\.]+)\)", col, re.IGNORECASE)
            if field_match:
                field = field_match.group(1).split(".")[-1].lower()
                vals = [r.get(field) for r in results if r.get(field) is not None]
                if "distinct" in col.lower():
                    stats[alias] = len(set(vals))
                else:
                    stats[alias] = len(vals)
            else:
                stats[alias] = len(results)
                
        # 3. SUM(CASE WHEN ...)
        elif "sum(" in col.lower():
            if "role = 'admin'" in col.lower():
                stats[alias] = sum(1 for r in results if r.get('role') == 'admin')
            elif "is_active = true" in col.lower() or "is_active = 1" in col.lower():
                stats[alias] = sum(1 for r in results if r.get('is_active') is True or r.get('is_active') == 1)
            elif "date(created_at) = curdate()" in col.lower():
                today_str = datetime.utcnow().strftime("%Y-%m-%d")
                stats[alias] = sum(1 for r in results if str(r.get('created_at')).startswith(today_str))
            elif "item_type = 'book'" in col.lower():
                stats[alias] = sum(1 for r in results if r.get('item_type') == 'book')
            elif "item_type = 'movie'" in col.lower():
                stats[alias] = sum(1 for r in results if r.get('item_type') == 'movie')
            elif "item_type = 'music'" in col.lower():
                stats[alias] = sum(1 for r in results if r.get('item_type') == 'music')
            elif "is_ethiopian = true" in col.lower() or "is_ethiopian = 1" in col.lower():
                stats[alias] = sum(1 for r in results if r.get('is_ethiopian') is True or r.get('is_ethiopian') == 1)
            else:
                stats[alias] = 0
                
        # 4. AVG(rating) or AVG(field)
        elif "avg(" in col.lower():
            field_match = re.search(r"avg\((\w+)\)", col, re.IGNORECASE)
            if field_match:
                field = field_match.group(1).lower()
                vals = [float(r.get(field)) for r in results if r.get(field) is not None]
                stats[alias] = sum(vals) / len(vals) if vals else 0
            else:
                stats[alias] = 0
                
        else:
            stats[alias] = results[0].get(alias) if results else None
            
    return stats


def handle_select(db, sql, params):
    sql_norm = " ".join(sql.split()).strip().lower()
    
    # Identify tables
    from_match = re.search(r"from\s+(\w+)", sql, re.IGNORECASE)
    if not from_match:
        return [], None, 0
    table_name = from_match.group(1).lower()
    
    # 1. SPECIAL CASE: Joined rating query for ML collaborative filtering
    if table_name == "ratings" and "join items" in sql_norm and "count(" not in sql_norm:
        item_type = None
        limit_val = 5000
        
        if "item_type = %s" in sql_norm:
            item_type = params[0]
            limit_val = params[1] if len(params) > 1 else limit_val
        elif len(params) > 0:
            limit_val = params[0]
            
        ratings = list(db.ratings.find().sort("created_at", -1).limit(limit_val))
        item_ids = {r.get("item_id") for r in ratings if r.get("item_id") is not None}
        
        items_query = {"_id": {"$in": list(item_ids)}}
        if item_type:
            items_query["item_type"] = item_type
            
        items = {}
        if item_ids:
            items = {item["_id"]: item for item in db.items.find(items_query)}
        
        joined = []
        for r in ratings:
            it = items.get(r.get("item_id"))
            if it:
                joined.append({
                    "user_id": r.get("user_id"),
                    "item_id": r.get("item_id"),
                    "rating": r.get("rating"),
                    "item_type": it.get("item_type")
                })
        return joined, None, len(joined)
        
    # 2. SPECIAL CASE: Joined rating query for Content-Based
    if table_name == "ratings" and "join items" in sql_norm and "user_id = %s" in sql_norm and "count(" not in sql_norm:
        user_id = params[0]
        ratings = list(db.ratings.find({"user_id": user_id, "rating": {"$gte": 3}}).sort("rating", -1))
        item_ids = {r.get("item_id") for r in ratings if r.get("item_id") is not None}
        
        items = {}
        if item_ids:
            items = {item["_id"]: item for item in db.items.find({"_id": {"$in": list(item_ids)}})}
        
        joined = []
        for r in ratings:
            it = items.get(r.get("item_id"))
            if it:
                joined.append({
                    "id": it.get("_id"),
                    "genre": it.get("genre"),
                    "description": it.get("description"),
                    "rating": r.get("rating")
                })
        return joined, None, len(joined)
 
    # 3. SPECIAL CASE: Joined rating genre stats
    if table_name == "ratings" and "join items" in sql_norm and "group by" in sql_norm and "count(" not in sql_norm:
        user_id = params[0]
        ratings = list(db.ratings.find({"user_id": user_id}))
        item_ids = {r.get("item_id") for r in ratings if r.get("item_id") is not None}
        
        items = {}
        if item_ids:
            items = {item["_id"]: item for item in db.items.find({"_id": {"$in": list(item_ids)}})}
        
        stats = {}
        for r in ratings:
            it = items.get(r.get("item_id"))
            if it:
                genre = it.get("genre")
                item_type = it.get("item_type")
                key = (genre, item_type) if "i.item_type" in sql_norm else genre
                if key not in stats:
                    stats[key] = {"ratings": [], "genre": genre, "item_type": item_type}
                stats[key]["ratings"].append(r.get("rating"))
                
        joined = []
        for key, info in stats.items():
            avg_rating = sum(info["ratings"]) / len(info["ratings"])
            count = len(info["ratings"])
            if "i.item_type" in sql_norm:
                if avg_rating >= 4:
                    joined.append({
                        "genre": info["genre"],
                        "item_type": info["item_type"],
                        "avg_rating": avg_rating,
                        "count": count
                    })
            else:
                joined.append({
                    "genre": info["genre"],
                    "avg_rating": avg_rating,
                    "cnt": count
                })
        
        joined.sort(key=lambda x: x.get("avg_rating", 0), reverse=True)
        return joined, None, len(joined)
 
    # 3.1 SPECIAL CASE: Custom Item Search for SQL MATCH & LIKE fallback queries
    if table_name == "items" and ("title like" in sql_norm or "match(" in sql_norm):
        query_text = ""
        if params:
            query_text = str(params[0]).replace('%', '').strip()
            
        item_type = None
        for p in params:
            if str(p) in ('movie', 'book', 'music'):
                item_type = str(p)
                break
                
        search_filter = {
            "$or": [
                {"title": {"$regex": query_text, "$options": "i"}},
                {"title_am": {"$regex": query_text, "$options": "i"}},
                {"amharic_title": {"$regex": query_text, "$options": "i"}},
                {"description": {"$regex": query_text, "$options": "i"}},
                {"description_am": {"$regex": query_text, "$options": "i"}},
                {"genre": {"$regex": query_text, "$options": "i"}},
                {"author": {"$regex": query_text, "$options": "i"}},
                {"director": {"$regex": query_text, "$options": "i"}},
                {"artist": {"$regex": query_text, "$options": "i"}}
            ]
        }
        
        if item_type:
            search_filter = {"$and": [{"item_type": item_type}, search_filter]}
            
        cursor = db.items.find(search_filter).sort("popularity_score", -1).limit(50)
        results = []
        for doc in cursor:
            row = {**doc}
            if "_id" in row:
                row["id"] = row["_id"]
            row["creator"] = row.get("author") or row.get("director") or row.get("artist") or "Various"
            row["amharic_title"] = row.get("amharic_title") or row.get("title")
            row["cultural_significance"] = row.get("cultural_significance") or ""
            results.append(row)
            
        return results, None, len(results)

    # 3.2 SPECIAL CASE: Custom User Search in Admin Dashboard
    if table_name == "users" and "username like" in sql_norm:
        search_text = ""
        if params:
            search_text = str(params[0]).replace('%', '').strip()
            
        search_filter = {
            "$or": [
                {"username": {"$regex": search_text, "$options": "i"}},
                {"email": {"$regex": search_text, "$options": "i"}}
            ]
        }
        
        if "count(" in sql_norm:
            total = db.users.count_documents(search_filter)
            return [{"total": total}], None, 1
            
        limit_val = 20
        offset_val = 0
        limit_match = re.search(r"limit\s+(\d+)", sql, re.IGNORECASE)
        offset_match = re.search(r"offset\s+(\d+)", sql, re.IGNORECASE)
        if limit_match:
            limit_val = int(limit_match.group(1))
        if offset_match:
            offset_val = int(offset_match.group(1))
            
        cursor = db.users.find(search_filter).sort("created_at", -1).skip(offset_val).limit(limit_val)
        results = []
        for doc in cursor:
            row = {**doc}
            if "_id" in row:
                row["id"] = row["_id"]
            results.append(row)
            
        return results, None, len(results)

    # 4. STANDARD SELECT
    where_match = re.search(r"where\s+(.+?)(?:group\s+by|order\s+by|limit|$)", sql, re.IGNORECASE)
    filter_doc = {}
    if where_match:
        where_clause = where_match.group(1).strip()
        filter_doc = parse_where_clause(where_clause, params)
        
    # Check limit
    limit_match = re.search(r"limit\s+(\d+|%s)", sql, re.IGNORECASE)
    limit_val = 0
    if limit_match:
        limit_str = limit_match.group(1)
        if limit_str == "%s":
            limit_val = int(params[-1])
        else:
            limit_val = int(limit_str)
            
    # Check sorting
    sort_match = re.search(r"order\s+by\s+([\w\.]+)\s*(asc|desc)?", sql, re.IGNORECASE)
    sort_fields = []
    if sort_match:
        field = sort_match.group(1).replace("i.", "").replace("r.", "").strip()
        direction = sort_match.group(2)
        direction_val = -1 if direction and direction.lower() == "desc" else 1
        sort_fields.append((field, direction_val))
        
    # Query MongoDB
    cursor = db[table_name].find(filter_doc)
    if sort_fields:
        cursor = cursor.sort(sort_fields)
    if limit_val > 0:
        cursor = cursor.limit(limit_val)
        
    results = []
    for doc in cursor:
        row = {**doc}
        if "_id" in row:
            row["id"] = row["_id"]
            
        if table_name == "items":
            row["creator"] = row.get("author") or row.get("director") or row.get("artist") or "Various"
            row["amharic_title"] = row.get("amharic_title") or row.get("title")
            row["cultural_significance"] = row.get("cultural_significance") or ""
            
        results.append(row)
        
    # Check if this query is an aggregate query
    if "count(" in sql_norm or "sum(" in sql_norm or "avg(" in sql_norm:
        agg_result = evaluate_aggregations(db, sql, results, table_name)
        return [agg_result], None, 1
        
    return results, None, len(results)


def parse_where_clause(where_clause, params):
    if not where_clause:
        return {}
        
    where_clause = " ".join(where_clause.split()).strip()
    where_clause = re.sub(r"\b[i|r]\.", "", where_clause)
    
    filter_doc = {}
    
    # SPECIAL PATTERN: email = %s or username = %s
    if "or" in where_clause.lower() and len(params) >= 2:
        return {"$or": [{"email": params[0]}, {"username": params[1]}]}
        
    # Extract comparison pairs
    matches = re.findall(r"(\w+)\s*(=|>|<|like|in)\s*(%s|'[^']*'|\d+)", where_clause, re.IGNORECASE)
    
    param_idx = 0
    for col, op, val_str in matches:
        col = col.lower()
        if col == "id":
            col = "_id"
            
        if val_str == "%s":
            if param_idx < len(params):
                val = params[param_idx]
                param_idx += 1
            else:
                continue
        elif val_str.startswith("'") and val_str.endswith("'"):
            val = val_str[1:-1]
        else:
            try:
                val = int(val_str)
            except:
                val = val_str
                
        if col == "_id":
            if isinstance(val, str) and len(val) == 24 and all(c in '0123456789abcdefABCDEF' for c in val):
                try:
                    val = ObjectId(val)
                except Exception:
                    pass

        op = op.lower()
        if op == "=":
            filter_doc[col] = val
        elif op == ">":
            filter_doc[col] = {"$gt": val}
        elif op == "<":
            filter_doc[col] = {"$lt": val}
        elif op == "like":
            clean_val = str(val).replace("%", "")
            filter_doc[col] = {"$regex": clean_val, "$options": "i"}
        elif op == "in":
            if isinstance(val, (list, tuple)):
                filter_doc[col] = {"$in": list(val)}
            else:
                filter_doc[col] = {"$in": [val]}
                
    if "in (" in where_clause.lower():
        in_match = re.search(r"(\w+)\s+in\s*\(([^)]+)\)", where_clause, re.IGNORECASE)
        if in_match:
            col = in_match.group(1).lower()
            if col == "id":
                col = "_id"
            placeholders_count = len(re.findall(r"%s", in_match.group(2)))
            in_vals = list(params[param_idx:param_idx + placeholders_count])
            filter_doc[col] = {"$in": in_vals}
            
    if "curdate()" in where_clause.lower():
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        filter_doc["created_at"] = {"$gte": today_start}

    return filter_doc
