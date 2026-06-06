"""
Flask Application Factory
"""
from flask import Flask
from flask_cors import CORS
from config import config
from app.utils.limiter import limiter


def create_app(config_name='default'):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize Rate Limiter
    limiter.init_app(app)
    
    # Initialize Database
    from app.utils.database import Database
    Database.init_pool(app)
    
    # Audit Environment Secrets
    from app.utils.vault import SecretVault
    SecretVault.audit_environment(app)
    
    # Enable CORS with HTTP-only cookie support (supports_credentials=True)
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.items import items_bp
    from app.routes.recommendations import recommendations_bp
    from app.routes.admin import admin_bp
    from app.routes.credits import credits_bp
    from app.routes.settings import settings_bp
    from app.routes.wishlist import wishlist_bp
    from app.routes.discover import discover_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(items_bp, url_prefix='/api/items')
    app.register_blueprint(recommendations_bp, url_prefix='/api/recommendations')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(credits_bp, url_prefix='/api/credits')
    app.register_blueprint(settings_bp, url_prefix='/api/admin/settings')
    app.register_blueprint(wishlist_bp, url_prefix='/api/wishlist')
    app.register_blueprint(discover_bp, url_prefix='/api/discover')
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        try:
            from app.utils.database import Database
            db = Database.get_connection()
            db.ping(reconnect=True)
            db.close()
            db_status = "Connected"
            db_error = None
        except Exception as e:
            db_status = "Disconnected"
            db_error = str(e)
            
        return {
            'status': 'healthy', 
            'message': 'API is running',
            'database': db_status,
            'database_error': db_error,
            'host_configured': app.config.get('MYSQL_HOST')
        }

    # Global error handlers
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return {
            'error': 'Too many requests',
            'message': 'Rate limit exceeded. Please try again shortly.',
            'code': 429
        }, 429

    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Resource not found', 'message': str(error)}, 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return {'error': 'Method not allowed', 'message': str(error)}, 405

    @app.errorhandler(Exception)
    def handle_exception(e):
        import traceback
        import sys
        # Print complete traceback to standard error for developer visibility
        print("!!! GLOBAL EXCEPTION LOGGED !!!", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        # Log to flask app logger
        app.logger.error(f"Internal exception: {str(e)}\n{traceback.format_exc()}")
        return {
            'error': 'Internal server error', 
            'message': str(e),
            'type': e.__class__.__name__
        }, 500
    
    # Catch-all for API 404s
    @app.route('/api/', defaults={'path': ''})
    @app.route('/api/<path:path>')
    def catch_all_api(path):
        return {'error': 'API endpoint not found', 'path': f'/api/{path}'}, 404
    
    return app
