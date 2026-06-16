import mysql.connector
import os

# Railway credentials (from MYSQL_PUBLIC_URL)
RAILWAY_CONFIG = {
    'host': 'kodama.proxy.rlwy.net',
    'port': 52515,
    'user': 'root',
    'password': 'ZlhgJRPMmnAVWTRyjwlfDvWoNWcxyJiU',
    'database': 'railway',
    'connection_timeout': 30,
    'ssl_disabled': False,
    'use_pure': True,
    'ssl_verify_cert': False,
    'ssl_verify_identity': False
}

# Local credentials
LOCAL_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '',  # Empty password as seen in backend/.env
    'database': 'ethiopian_recommendations'
}

def migrate():
    print("Connecting to local database...")
    try:
        local_conn = mysql.connector.connect(**LOCAL_CONFIG)
        local_cursor = local_conn.cursor()
    except Exception as e:
        print(f"Error connecting to local database: {e}")
        return

    print("Connecting to Railway database...")
    try:
        railway_conn = mysql.connector.connect(**RAILWAY_CONFIG)
        railway_cursor = railway_conn.cursor()
    except Exception as e:
        print(f"Error connecting to Railway database: {e}")
        local_conn.close()
        return

    # Disable foreign key checks for clean migration
    railway_cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
    print("Disabled foreign key checks on Railway.")

    # Get local tables
    local_cursor.execute("SHOW TABLES;")
    tables = [row[0] for row in local_cursor.fetchall()]
    print(f"Found {len(tables)} tables to migrate: {', '.join(tables)}")

    for table in tables:
        print(f"Migrating table: {table}...")
        
        # 1. Get Table Creation SQL
        local_cursor.execute(f"SHOW CREATE TABLE `{table}`")
        create_sql = local_cursor.fetchall()[0][1]
        
        # Drop table on Railway if exists
        railway_cursor.execute(f"DROP TABLE IF EXISTS `{table}`")
        
        # Create table on Railway
        railway_cursor.execute(create_sql)
        print(f"  Created table `{table}` on Railway.")

        # 2. Get Data from local table
        local_cursor.execute(f"SELECT * FROM `{table}`")
        rows = local_cursor.fetchall()
        if not rows:
            print(f"  Table `{table}` is empty.")
            continue

        # Get column names
        local_cursor.execute(f"DESCRIBE `{table}`")
        columns = [row[0] for row in local_cursor.fetchall()]
        col_names = ", ".join([f"`{c}`" for c in columns])
        placeholders = ", ".join(["%s"] * len(columns))

        insert_sql = f"INSERT INTO `{table}` ({col_names}) VALUES ({placeholders})"

        # Insert rows in chunks
        chunk_size = 100
        for i in range(0, len(rows), chunk_size):
            chunk = rows[i:i + chunk_size]
            railway_cursor.executemany(insert_sql, chunk)
            
        print(f"  Migrated {len(rows)} rows into `{table}`.")

    # Re-enable foreign key checks
    railway_cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
    railway_conn.commit()

    print("\nDatabase migration completed successfully!")
    
    local_cursor.close()
    local_conn.close()
    railway_cursor.close()
    railway_conn.close()

if __name__ == '__main__':
    migrate()
