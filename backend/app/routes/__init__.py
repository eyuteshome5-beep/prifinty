# Routes package
from .auth import auth_bp
from .users import users_bp
from .items import items_bp
from .admin import admin_bp
from .credits import credits_bp
from .recommendations import recommendations_bp

__all__ = [
    'auth_bp',
    'users_bp', 
    'items_bp',
    'admin_bp',
    'credits_bp',
    'recommendations_bp'
]
