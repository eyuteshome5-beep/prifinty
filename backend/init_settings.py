import os
import sys
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.getcwd())

# Load environment variables
load_dotenv()

from app import create_app
from app.utils.database import execute_query

def init_db():
    app = create_app('default')
    # Use the password from config explicitly to debug if needed
    print(f"Connecting to {app.config['MYSQL_DB']} on {app.config['MYSQL_HOST']} as {app.config['MYSQL_USER']}...")
    
    with app.app_context():
        print("Initializing site_settings table...")
        try:
            execute_query("""
            CREATE TABLE IF NOT EXISTS site_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                config_key VARCHAR(100) NOT NULL UNIQUE,
                config_value TEXT,
                config_group VARCHAR(50) DEFAULT 'general',
                description VARCHAR(255),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
            """, fetch_all=False)
            
            # Insert default placeholders
            settings = [
                ('TMDB_API_KEY', '', 'api_keys', 'The Movie Database API Key (v3)'),
                ('SPOTIFY_CLIENT_ID', '', 'api_keys', 'Spotify Developer Client ID'),
                ('SPOTIFY_CLIENT_SECRET', '', 'api_keys', 'Spotify Developer Client Secret'),
                ('GOOGLE_BOOKS_API_KEY', '', 'api_keys', 'Google Books API Key'),
                ('SITE_NAME', 'Prefinity AI', 'general', 'Display name of the platform'),
                ('SITE_DESCRIPTION', 'Advanced Ethiopian Recommendation Engine', 'general', 'Meta description for SEO')
            ]
            
            for key, val, group, desc in settings:
                try:
                    execute_query(
                        "INSERT INTO site_settings (config_key, config_value, config_group, description) VALUES (%s, %s, %s, %s)",
                        (key, val, group, desc),
                        fetch_all=False
                    )
                    print(f"Added setting: {key}")
                except:
                    # Setting likely exists
                    pass
            
            print("DB Initialization complete.")
        except Exception as e:
            print(f"Error initializing DB: {e}")

if __name__ == "__main__":
    init_db()
