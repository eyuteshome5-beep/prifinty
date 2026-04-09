"""
Authentication Routes - Register, Login, Logout
"""
from flask import Blueprint, request, jsonify, current_app
from app.utils.database import execute_query
from app.utils.auth import (
    hash_password, verify_password, generate_token, 
    token_required, get_current_user
)
from datetime import datetime

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'email', 'password']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    username = data['username'].strip()
    email = data['email'].strip().lower()
    password = data['password']
    
    # Validate email format
    if '@' not in email or '.' not in email:
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Validate password strength
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    # Check if user already exists
    existing_user = execute_query(
        "SELECT id FROM users WHERE email = %s OR username = %s",
        (email, username),
        fetch_one=True
    )
    
    if existing_user:
        return jsonify({'error': 'User with this email or username already exists'}), 409
    
    # Hash password and create user
    password_hash = hash_password(password)
    initial_credits = current_app.config.get('INITIAL_CREDITS', 100)
    
    try:
        user_id = execute_query(
            """INSERT INTO users (username, email, password_hash, role, credits) 
               VALUES (%s, %s, %s, 'user', %s)""",
            (username, email, password_hash, initial_credits),
            fetch_all=False
        )
        
        # Create default preferences
        execute_query(
            """INSERT INTO preferences (user_id, preferred_genres, preferred_languages, ethiopian_content_preference)
               VALUES (%s, '[]', '["English", "Amharic"]', FALSE)""",
            (user_id,),
            fetch_all=False
        )
        
        # Generate token
        token = generate_token(user_id, 'user')
        
        return jsonify({
            'message': 'Registration successful',
            'token': token,
            'user': {
                'id': user_id,
                'username': username,
                'email': email,
                'role': 'user',
                'credits': initial_credits
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': 'Registration failed', 'details': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and return JWT token"""
    data = request.get_json()
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Find user
    user = execute_query(
        """SELECT id, username, email, password_hash, role, credits, is_active 
           FROM users WHERE email = %s""",
        (email,),
        fetch_one=True
    )
    
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if not user.get('is_active', True):
        return jsonify({'error': 'Account is deactivated'}), 403
    
    # Verify password
    if not verify_password(password, user['password_hash']):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Update last login
    execute_query(
        "UPDATE users SET last_login = %s WHERE id = %s",
        (datetime.utcnow(), user['id']),
        fetch_all=False
    )
    
    # Check for daily login bonus
    bonus_awarded = award_daily_login_bonus(user['id'])
    
    # Generate token
    token = generate_token(user['id'], user['role'])
    
    # Get updated credits
    updated_user = execute_query(
        "SELECT credits FROM users WHERE id = %s",
        (user['id'],),
        fetch_one=True
    )
    
    response_data = {
        'message': 'Login successful',
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role'],
            'credits': updated_user['credits']
        }
    }
    
    if bonus_awarded:
        response_data['bonus'] = {
            'type': 'daily_login',
            'amount': current_app.config['CREDIT_REWARDS']['daily_login'],
            'message': 'Daily login bonus awarded!'
        }
    
    return jsonify(response_data), 200


def award_daily_login_bonus(user_id):
    """Award daily login bonus if not already awarded today"""
    # Check if bonus was already awarded today
    today_bonus = execute_query(
        """SELECT id FROM credit_transactions 
           WHERE user_id = %s AND transaction_type = 'bonus' 
           AND DATE(created_at) = CURDATE()""",
        (user_id,),
        fetch_one=True
    )
    
    if today_bonus:
        return False
    
    bonus_amount = current_app.config['CREDIT_REWARDS']['daily_login']
    
    # Get current credits
    user = execute_query(
        "SELECT credits FROM users WHERE id = %s",
        (user_id,),
        fetch_one=True
    )
    
    new_balance = user['credits'] + bonus_amount
    
    # Update credits
    execute_query(
        "UPDATE users SET credits = %s WHERE id = %s",
        (new_balance, user_id),
        fetch_all=False
    )
    
    # Record transaction
    execute_query(
        """INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
           VALUES (%s, %s, 'bonus', 'Daily login bonus', %s)""",
        (user_id, bonus_amount, new_balance),
        fetch_all=False
    )
    
    return True


@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    """Logout user (client should discard token)"""
    return jsonify({'message': 'Logout successful'}), 200


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_me():
    """Get current user info"""
    from flask import g
    user = g.current_user
    
    # Get preferences
    preferences = execute_query(
        "SELECT * FROM preferences WHERE user_id = %s",
        (user['id'],),
        fetch_one=True
    )
    
    return jsonify({
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role'],
            'credits': user['credits']
        },
        'preferences': preferences
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@token_required
def refresh_token():
    """Refresh JWT token"""
    from flask import g
    user = g.current_user
    
    new_token = generate_token(user['id'], user['role'])
    
    return jsonify({
        'token': new_token,
        'message': 'Token refreshed successfully'
    }), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset user password directly for local dev"""
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    new_password = data.get('new_password', '')

    if not email or not new_password:
        return jsonify({'error': 'Email and new password are required'}), 400

    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    # Find user
    user = execute_query(
        "SELECT id FROM users WHERE email = %s",
        (email,),
        fetch_one=True
    )

    if not user:
        return jsonify({'error': 'No user found with this email address'}), 404

    # Update password
    password_hash = hash_password(new_password)
    execute_query(
        "UPDATE users SET password_hash = %s WHERE id = %s",
        (password_hash, user['id']),
        fetch_all=False
    )

    return jsonify({'message': 'Password reset successfully. You can now login with your new password.'}), 200


@auth_bp.route('/forgot-password/request', methods=['POST'])
def forgot_password_request():
    """Request a password reset code via email"""
    data = request.get_json()
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    # Check if user exists
    user = execute_query(
        "SELECT id FROM users WHERE email = %s",
        (email,),
        fetch_one=True
    )

    if not user:
        return jsonify({'error': 'No account found with this email address'}), 404

    # Generate 6-digit code
    import random
    import string
    code = ''.join(random.choices(string.digits, k=6))
    
    # Store in database (expires in 15 minutes)
    from datetime import datetime, timedelta
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    try:
        # Delete any existing codes for this email
        execute_query(
            "DELETE FROM verification_codes WHERE email = %s",
            (email,),
            fetch_all=False
        )
        
        # Insert new code
        execute_query(
            "INSERT INTO verification_codes (email, code, expires_at) VALUES (%s, %s, %s)",
            (email, code, expires_at),
            fetch_all=False
        )
        
        # LOG CODE TO CONSOLE (Simulation)
        print(f"\n[EMAIL SIMULATION] To: {email}")
        print(f"[EMAIL SIMULATION] Your Prefinity AI Verification Code is: {code}")
        print(f"[EMAIL SIMULATION] Expiring at: {expires_at}\n")
        
        # In a real production app, you would use an email service here:
        # send_verification_email(email, code)
        
        return jsonify({
            'message': 'Verification code sent to your email',
            'email': email
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to generate verification code', 'details': str(e)}), 500


@auth_bp.route('/forgot-password/verify', methods=['POST'])
def forgot_password_verify():
    """Verify the 6-digit code"""
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    code = data.get('code', '').strip()

    if not email or not code:
        return jsonify({'error': 'Email and code are required'}), 400

    # Find valid code
    record = execute_query(
        """SELECT id FROM verification_codes 
           WHERE email = %s AND code = %s AND expires_at > %s""",
        (email, code, datetime.utcnow()),
        fetch_one=True
    )

    if not record:
        return jsonify({'error': 'Invalid or expired verification code'}), 400

    # Verification successful
    return jsonify({
        'message': 'Code verified successfully',
        'email': email,
        'verification_id': record['id']
    }), 200


@auth_bp.route('/forgot-password/reset', methods=['POST'])
def forgot_password_reset_final():
    """Final step: update password using verified code"""
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    code = data.get('code', '').strip()
    new_password = data.get('new_password', '')

    if not email or not code or not new_password:
        return jsonify({'error': 'All fields are required'}), 400

    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    # Verify code one last time
    record = execute_query(
        """SELECT id FROM verification_codes 
           WHERE email = %s AND code = %s AND expires_at > %s""",
        (email, code, datetime.utcnow()),
        fetch_one=True
    )

    if not record:
        return jsonify({'error': 'Verification session expired. Please start over.'}), 400

    # Hash new password
    password_hash = hash_password(new_password)
    
    try:
        # Update user password
        execute_query(
            "UPDATE users SET password_hash = %s WHERE email = %s",
            (password_hash, email),
            fetch_all=False
        )
        
        # Delete the used code
        execute_query(
            "DELETE FROM verification_codes WHERE email = %s",
            (email,),
            fetch_all=False
        )
        
        return jsonify({'message': 'Password reset successful. You can now login.'}), 200
        
    except Exception as e:
        return jsonify({'error': 'Reset failed', 'details': str(e)}), 500
