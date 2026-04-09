"""
Settings Routes - Admin Configuration Management
"""
from flask import Blueprint, request, jsonify, g
from app.utils.database import execute_query
from app.utils.auth import admin_required

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('', methods=['GET'])
@admin_required
def get_settings():
    """Get all site settings"""
    settings = execute_query("SELECT id, config_key, config_value, config_group, description FROM site_settings")
    return jsonify({'settings': settings}), 200

@settings_bp.route('/batch', methods=['POST'])
@admin_required
def update_settings_batch():
    """Update multiple settings at once"""
    data = request.get_json()
    if not data or 'settings' not in data:
        return jsonify({'error': 'Invalid data format'}), 400
        
    updates = data['settings'] # Expected format: [{'key': 'TMDB_API_KEY', 'value': '...'}, ...]
    
    for item in updates:
        key = item.get('key')
        value = item.get('value')
        if key is not None:
            execute_query(
                "UPDATE site_settings SET config_value = %s WHERE config_key = %s",
                (value, key),
                fetch_all=False
            )
            
    return jsonify({'message': 'Settings updated successfully'}), 200

@settings_bp.route('/<string:key>', methods=['GET'])
def get_setting_public(key):
    """Get a specific public setting (e.g. SITE_NAME)"""
    # Only allow specific public keys
    public_keys = ['SITE_NAME', 'SITE_DESCRIPTION']
    if key not in public_keys:
        return jsonify({'error': 'Unauthorized access to setting'}), 401
        
    setting = execute_query(
        "SELECT config_value FROM site_settings WHERE config_key = %s",
        (key,),
        fetch_one=True
    )
    
    if not setting:
        return jsonify({'error': 'Setting not found'}), 404
        
    return jsonify({'key': key, 'value': setting['config_value']}), 200
