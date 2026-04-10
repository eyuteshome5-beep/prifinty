"""
Discovery Routes - Trending and External Sync
"""
from flask import Blueprint, request, jsonify, g
from app.utils.database import execute_query
from app.utils.auth import token_required
from app.services.media_api import MediaAPIService
import json

discover_bp = Blueprint('discover', __name__)

@discover_bp.route('/trending', methods=['GET'])
def get_trending():
    """Get trending items from external APIs"""
    item_type = request.args.get('type', 'movie') # movie, music, book
    
    trending = MediaAPIService.get_trending(item_type)
    
    return set_synced(trending)

def set_synced(items_list):
    if not items_list: return jsonify({'results': []}), 200
    
    external_ids = [item['external_id'] for item in items_list]
    placeholders = ', '.join(['%s'] * len(external_ids))
    
    local_items = execute_query(
        f"SELECT id, external_id FROM items WHERE external_id IN ({placeholders})",
        tuple(external_ids)
    )
    
    mapping = {item['external_id']: item['id'] for item in local_items}
    
    for item in items_list:
        item['local_id'] = mapping.get(item['external_id'])
        item['is_synced'] = item['local_id'] is not None
        if item['is_synced']:
            item['id'] = item['local_id']

    return jsonify({'results': items_list}), 200

@discover_bp.route('/search', methods=['GET'])
def search_external():
    """Live search external APIs"""
    item_type = request.args.get('type', 'movie') # movie, music, book
    query = request.args.get('q')
    
    if not query:
        return jsonify({'results': []}), 200
        
    results = MediaAPIService.search(item_type, query)
    return set_synced(results)

@discover_bp.route('/sync', methods=['POST'])
@token_required
def sync_external_item():
    """Silent sync an external item to the local DB"""
    data = request.get_json()
    if not data or 'external_id' not in data or 'item_type' not in data:
        return jsonify({'error': 'external_id and item_type are required'}), 400
        
    external_id = data['external_id']
    item_type = data['item_type']
    
    # 1. Check if already exists
    item = execute_query(
        "SELECT id, description FROM items WHERE external_id = %s AND item_type = %s",
        (external_id, item_type),
        fetch_one=True
    )
    
    # If exists and has description, we consider it "full"
    if item and item.get('description') and len(item['description']) > 100:
        return jsonify({
            'message': 'Item already synced and complete',
            'item_id': item['id']
        }), 200
        
    item_id = item['id'] if item else None
        
    # 2. Always get full details from external API for sync to ensure complete record (full description, director, etc.)
    full_details = MediaAPIService.get_external_details(item_type, external_id)
    if full_details:
        # Prioritize full details from API over basic info from trending list
        data.update(full_details)
    elif 'title' not in data:
        # Only error if we have NO title and API failed
        return jsonify({'error': 'Could not fetch external details and no fallback provided'}), 404
        
    # 3. Create or update local item
    try:
        if item_id:
            # Update base item with full info
            execute_query(
                """UPDATE items 
                   SET title=%s, description=%s, genre=%s, cover_image=%s, popularity_score=%s
                   WHERE id=%s""",
                (
                    data['title'],
                    data.get('description', ''),
                    data.get('genre', 'Other'),
                    data.get('cover_image', ''),
                    data.get('popularity', 0),
                    item_id
                ),
                fetch_all=False
            )
        else:
            # Insert base item
            item_id = execute_query(
                """INSERT INTO items (title, description, genre, item_type, cover_image, popularity_score, external_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (
                    data['title'],
                    data.get('description', ''),
                    data.get('genre', 'Other'),
                    item_type,
                    data.get('cover_image', ''),
                    data.get('popularity', 0),
                    external_id
                ),
                fetch_all=False
            )
        
        # Insert or Update type-specific details
        if item_type == 'movie':
            execute_query(
                """INSERT INTO movies (item_id, director, release_year) 
                   VALUES (%s, %s, %s)
                   ON DUPLICATE KEY UPDATE director=%s, release_year=%s""",
                (item_id, data.get('creator', 'Unknown'), data.get('release_year'),
                 data.get('creator', 'Unknown'), data.get('release_year')),
                fetch_all=False
            )
        elif item_type == 'music':
            execute_query(
                """INSERT INTO music (item_id, artist, album, release_year, spotify_id) 
                   VALUES (%s, %s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE artist=%s, album=%s, release_year=%s, spotify_id=%s""",
                (item_id, data.get('creator', 'Unknown'), data.get('album', ''), data.get('release_year'), external_id,
                 data.get('creator', 'Unknown'), data.get('album', ''), data.get('release_year'), external_id),
                fetch_all=False
            )
        elif item_type == 'book':
            execute_query(
                """INSERT INTO books (item_id, author, publication_year) 
                   VALUES (%s, %s, %s)
                   ON DUPLICATE KEY UPDATE author=%s, publication_year=%s""",
                (item_id, data.get('creator', 'Unknown'), data.get('release_year'),
                 data.get('creator', 'Unknown'), data.get('release_year')),
                fetch_all=False
            )
            
        return jsonify({
            'message': 'Item synced successfully' if not item_id else 'Item updated successfully',
            'item_id': item_id
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
