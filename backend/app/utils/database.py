"""
MySQL Database Connection Utilities
"""
import os
import mysql.connector
from mysql.connector import pooling
from flask import current_app, g
from contextlib import contextmanager


class Database:
    """Database connection manager with connection pooling"""
    
    _pool = None
    
    @classmethod
    def init_pool(cls, app):
        """Initialize connection pool with SSL support for Aiven MySQL"""
        try:
            # Aiven and other cloud MySQL providers require SSL
            ssl_args = {}
            if app.config.get('MYSQL_SSL', True):
                ssl_args['ssl_disabled'] = False
                ssl_args['ssl_verify_cert'] = False  # Skip cert verification for simplicity

            cls._pool = pooling.MySQLConnectionPool(
                pool_name="recommendation_pool",
                pool_size=5,
                pool_reset_session=True,
                host=app.config['MYSQL_HOST'],
                user=app.config['MYSQL_USER'],
                password=app.config['MYSQL_PASSWORD'],
                database=app.config['MYSQL_DB'],
                port=app.config['MYSQL_PORT'],
                autocommit=False,
                connection_timeout=30,
                **ssl_args
            )
            print(f"[DB] Connection pool initialized successfully (host: {app.config['MYSQL_HOST']})")
        except Exception as e:
            print(f"[DB] WARNING: Could not initialize connection pool: {e}")
            print("[DB] App will start, but database operations will fail until connection is available.")
            cls._pool = None
    
    @classmethod
    def get_connection(cls):
        """Get a connection from the pool"""
        if cls._pool is None:
            # Fallback for direct connection with SSL
            return mysql.connector.connect(
                host=current_app.config['MYSQL_HOST'],
                user=current_app.config['MYSQL_USER'],
                password=current_app.config['MYSQL_PASSWORD'],
                database=current_app.config['MYSQL_DB'],
                port=current_app.config['MYSQL_PORT'],
                ssl_disabled=False,
                ssl_verify_cert=False,
                connection_timeout=30,
            )
        return cls._pool.get_connection()
    
    @classmethod
    @contextmanager
    def get_cursor(cls, dictionary=True):
        """Context manager for database cursor"""
        conn = cls.get_connection()
        cursor = conn.cursor(dictionary=dictionary)
        try:
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()


def get_db():
    """Get database connection for current request context"""
    if 'db' not in g:
        g.db = Database.get_connection()
    return g.db


def close_db(e=None):
    """Close database connection"""
    db = g.pop('db', None)
    if db is not None:
        db.close()


def execute_query(query, params=None, fetch_one=False, fetch_all=True):
    """Execute a database query and return results"""
    with Database.get_cursor() as cursor:
        cursor.execute(query, params or ())
        if fetch_one:
            return cursor.fetchone()
        if fetch_all:
            return cursor.fetchall()
        return cursor.lastrowid


def execute_many(query, params_list):
    """Execute multiple queries"""
    with Database.get_cursor() as cursor:
        cursor.executemany(query, params_list)
        return cursor.rowcount
