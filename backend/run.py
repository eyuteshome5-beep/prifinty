"""
Flask Application Entry Point
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from app import create_app

# Get configuration from environment
config_name = os.environ.get('FLASK_ENV', 'development')

# Create the application
app = create_app(config_name)

if __name__ == '__main__':
    # Run the development server
    port = int(os.environ.get('PORT', 5000))
    debug = config_name == 'development'
    
    print(f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║     Personal Movie, Music, and Book Recommendation System    ║
    ║                      API Server Running                       ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  Environment: {config_name:<44} ║
    ║  Port: {port:<50} ║
    ║  Debug: {str(debug):<49} ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  API Endpoints:                                               ║
    ║  - POST /api/auth/register    - Register new user            ║
    ║  - POST /api/auth/login       - Login user                   ║
    ║  - GET  /api/items            - Browse content               ║
    ║  - GET  /api/recommendations  - Get AI recommendations       ║
    ║  - GET  /api/credits/balance  - Check credit balance         ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    app.run(host='0.0.0.0', port=port, debug=debug)
