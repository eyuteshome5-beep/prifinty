"""
Settings Routes - Admin Configuration Management
"""
import threading
from flask import Blueprint, request, jsonify, g, current_app
from app.utils.database import execute_query
from app.utils.auth import admin_required

settings_bp = Blueprint('settings', __name__)

_update_running = False

def update_all_missing_images_in_background(app):
    global _update_running
    try:
        with app.app_context():
            print("[Background Update] Starting seed update...")
            from app.utils.seed import run_seed_items
            run_seed_items()
            
            print("[Background Update] Scanning for missing cover images...")
            from app.services.media_api import MediaAPIService
            missing = execute_query(
                "SELECT id, title, item_type FROM items WHERE cover_image IS NULL OR cover_image = '' OR cover_image = ' '"
            )
            print(f"[Background Update] Found {len(missing)} items missing cover images.")
            
            updated_count = 0
            for it in missing:
                title = it['title']
                item_type = it['item_type']
                try:
                    candidates = MediaAPIService.search(item_type, title)
                    if candidates:
                        best = candidates[0]
                        cover = best.get('cover_image') or best.get('image') or ''
                        if cover:
                            execute_query(
                                "UPDATE items SET cover_image = %s WHERE id = %s",
                                (cover, it['id']),
                                fetch_all=False
                            )
                            updated_count += 1
                            print(f"[Background Update] Updated cover for '{title}' -> {cover}")
                except Exception as ex:
                    print(f"[Background Update] Error updating '{title}': {ex}")
            print(f"[Background Update] Completed! Updated {updated_count} items.")
    except Exception as e:
        print(f"[Background Update] Error: {e}")
    finally:
        _update_running = False

def start_background_update(app):
    global _update_running
    if not _update_running:
        _update_running = True
        threading.Thread(
            target=update_all_missing_images_in_background,
            args=(app,),
            daemon=True
        ).start()

@settings_bp.route('', methods=['GET'])
@admin_required
def get_settings():
    """Get all site settings"""
    # Ensure default placeholders exist and have correct group
    default_settings = [
        ('TMDB_API_KEY', '', 'api_keys', 'The Movie Database API Key (v3)'),
        ('LASTFM_API_KEY', '', 'api_keys', 'Last.fm API Key'),
        ('GOOGLE_BOOKS_API_KEY', '', 'api_keys', 'Google Books API Key'),
        ('YOUTUBE_API_KEY', '', 'api_keys', 'YouTube Data API v3 Key'),
        ('SITE_NAME', 'Prefinity AI', 'general', 'Display name of the platform'),
        ('SITE_DESCRIPTION', 'Advanced Ethiopian Recommendation Engine', 'general', 'Meta description for SEO')
    ]
    for key, val, group, desc in default_settings:
        try:
            execute_query(
                "INSERT INTO site_settings (config_key, config_value, config_group, description) "
                "VALUES (%s, %s, %s, %s) ON DUPLICATE KEY UPDATE config_group=VALUES(config_group)",
                (key, val, group, desc),
                fetch_all=False
            )
        except Exception:
            pass
            
    # Trigger background image scan and seeding update
    start_background_update(current_app._get_current_object())

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
            
    # Trigger background image scan and seeding update with the new keys
    start_background_update(current_app._get_current_object())

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
