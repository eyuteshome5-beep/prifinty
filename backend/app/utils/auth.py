"""
Authentication Utilities - JWT and Password Hashing
"""
import jwt
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app, g
from app.utils.database import execute_query


def hash_password(password):
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password, password_hash):
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def generate_token(user_id, role, expires_delta=None):
    """Generate a JWT token"""
    if expires_delta is None:
        expires_delta = current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', timedelta(hours=24))
    
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.utcnow() + expires_delta,
        'iat': datetime.utcnow()
    }
    
    return jwt.encode(
        payload,
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )


def decode_token(token):
    """Decode a JWT token"""
    try:
        payload = jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=['HS256']
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def generate_tokens_pair(user_id, role):
    """Generate a short-lived access token (15 mins) and a long-lived refresh token (7 days)"""
    access_delta = timedelta(minutes=15)
    refresh_delta = timedelta(days=7)
    
    access_token = generate_token(user_id, role, expires_delta=access_delta)
    
    payload = {
        'user_id': user_id,
        'role': role,
        'type': 'refresh',
        'exp': datetime.utcnow() + refresh_delta,
        'iat': datetime.utcnow()
    }
    
    refresh_token = jwt.encode(
        payload,
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )
    
    return access_token, refresh_token


def decode_refresh_token(token):
    """Decode and validate a refresh token"""
    try:
        payload = jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=['HS256']
        )
        if payload.get('type') == 'refresh':
            return payload
        return None
    except Exception:
        return None


def get_current_user():
    """Get current user from token"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    payload = decode_token(token)
    
    if not payload:
        return None
    
    user = execute_query(
        "SELECT id, username, email, role, credits, is_active FROM users WHERE id = %s",
        (payload['user_id'],),
        fetch_one=True
    )
    
    return user


def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        if not user.get('is_active', True):
            return jsonify({'error': 'Account is deactivated'}), 403
        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if g.current_user.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated


def credits_required(cost_type):
    """Decorator to check and deduct credits (admins are exempt)"""
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated(*args, **kwargs):
            # Admin users get everything for free
            if g.current_user.get('role') == 'admin':
                g.credit_cost = 0
                g.cost_type = cost_type
                return f(*args, **kwargs)
            
            cost = current_app.config['CREDIT_COSTS'].get(cost_type, 0)
            user_credits = g.current_user.get('credits', 0)
            
            if user_credits < cost:
                return jsonify({
                    'error': 'Insufficient credits',
                    'required': cost,
                    'available': user_credits
                }), 402
            
            # Store cost info for later deduction
            g.credit_cost = cost
            g.cost_type = cost_type
            
            return f(*args, **kwargs)
        return decorated
    return decorator
