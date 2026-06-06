"""
MySQL Database Connection Utilities
"""
import os
from flask import current_app, g
from contextlib import contextmanager
import mysql.connector
from mysql.connector.pooling import MySQLConnectionPool

class Database:
    """MySQL Database Connection Manager"""
    _pool = None
    
    @classmethod
    def init_pool(cls, app):
        """Initialize MySQL connection pool"""
        try:
            host = app.config.get('MYSQL_HOST') or os.environ.get('MYSQL_HOST') or 'localhost'
            user = app.config.get('MYSQL_USER') or os.environ.get('MYSQL_USER') or 'root'
            password = app.config.get('MYSQL_PASSWORD') or os.environ.get('MYSQL_PASSWORD') or ''
            database = app.config.get('MYSQL_DB') or os.environ.get('MYSQL_DB') or 'ethiopian_recommendations'
            port = int(app.config.get('MYSQL_PORT') or os.environ.get('MYSQL_PORT') or 3306)
            pool_size = int(app.config.get('DB_POOL_SIZE') or os.environ.get('DB_POOL_SIZE') or 10)

            # Ensure the database exists
            conn = mysql.connector.connect(
                host=host,
                user=user,
                password=password,
                port=port
            )
            cursor = conn.cursor()
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {database}")
            cursor.close()
            conn.close()

            cls._pool = MySQLConnectionPool(
                pool_name="prifinity_pool",
                pool_size=pool_size,
                host=host,
                user=user,
                password=password,
                database=database,
                port=port,
                autocommit=True
            )
            print(f"[MySQL] Connection pool initialized (DB: {database}, Size: {pool_size})")
        except Exception as e:
            print(f"[MySQL] Connection pool initialization error: {e}")
            cls._pool = None

    @classmethod
    def get_connection(cls):
        """Get a database connection from the pool"""
        if cls._pool is None:
            # Fallback inline initialization
            host = os.environ.get('MYSQL_HOST', 'localhost')
            user = os.environ.get('MYSQL_USER', 'root')
            password = os.environ.get('MYSQL_PASSWORD', '')
            database = os.environ.get('MYSQL_DB', 'ethiopian_recommendations')
            port = int(os.environ.get('MYSQL_PORT', 3306))
            
            # Ensure DB exists
            try:
                conn = mysql.connector.connect(host=host, user=user, password=password, port=port)
                cursor = conn.cursor()
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS {database}")
                cursor.close()
                conn.close()
            except Exception:
                pass

            cls._pool = MySQLConnectionPool(
                pool_name="prifinity_pool",
                pool_size=5,
                host=host,
                user=user,
                password=password,
                database=database,
                port=port,
                autocommit=True
            )
        return cls._pool.get_connection()

    @classmethod
    @contextmanager
    def get_cursor(cls, dictionary=True):
        """Context manager yielding a database cursor"""
        conn = cls.get_connection()
        cursor = conn.cursor(dictionary=dictionary)
        try:
            yield cursor
        finally:
            cursor.close()
            conn.close()


def get_db():
    """Get database connection for current request context"""
    if 'db' not in g:
        g.db = Database.get_connection()
    return g.db


def close_db(e=None):
    """Close connection if it was opened during the request context"""
    db = g.pop('db', None)
    if db is not None:
        try:
            db.close()
        except Exception:
            pass


def execute_query(query, params=None, fetch_one=False, fetch_all=True):
    """Execute a SQL query and return results"""
    if params is None:
        params = ()
    elif not isinstance(params, (list, tuple)):
        params = (params,)
        
    try:
        with Database.get_cursor(dictionary=True) as cursor:
            cursor.execute(query, params)
            
            normalized_query = " ".join(query.split()).strip().lower()
            if normalized_query.startswith(('select', 'show', 'describe', 'explain')):
                if fetch_one:
                    return cursor.fetchone()
                if fetch_all:
                    return cursor.fetchall()
            else:
                if normalized_query.startswith('insert'):
                    return cursor.lastrowid
                return cursor.rowcount
    except Exception as e:
        print(f"[DB ERROR] Query: {query}")
        print(f"[DB ERROR] Params: {params}")
        print(f"[DB ERROR] Exception: {str(e)}")
        raise e


def execute_many(query, params_list):
    """Execute multiple queries in bulk"""
    try:
        with Database.get_cursor(dictionary=True) as cursor:
            cursor.executemany(query, params_list)
            return cursor.rowcount
    except Exception as e:
        print(f"[DB ERROR] execute_many: {query}")
        print(f"[DB ERROR] Exception: {str(e)}")
        raise e
