"""
Flask Application Factory
"""
from flask import Flask
from flask_cors import CORS
from config import config


def create_app(config_name='default'):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize Database
    from app.utils.database import Database
    Database.init_pool(app)
    
    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
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
        return {'status': 'healthy', 'message': 'API is running'}
    
    return app
