from flask import Blueprint, request, jsonify, current_app
from app.services.media_api import MediaAPIService
from app.utils.database import execute_query
from app.utils.auth import token_required
from app.utils.limiter import limiter
import requests

discover_bp = Blueprint('discover', __name__)

def set_synced(results):
    if not results: return {'results': []}
    
    external_ids = [r['external_id'] for r in results]
    placeholders = ', '.join(['%s'] * len(external_ids))
    
    try:
        synced = execute_query(
            f"SELECT external_id FROM items WHERE external_id IN ({placeholders})",
            tuple(external_ids)
        )
        synced_ids = {s['external_id'] for s in synced}
    except:
        synced_ids = set()
    
    for r in results:
        r['is_synced'] = r['external_id'] in synced_ids
        
    return {'results': results}

@discover_bp.route('/trending', methods=['GET'])
@limiter.limit("60 per minute")
def get_trending():
    item_type = request.args.get('type', 'movie')
    limit = min(int(request.args.get('limit', 10)), 50)
    if item_type not in ['movie', 'book', 'music']:
        return jsonify({'results': []}), 200

    try:
        results = []

        if item_type == 'movie':
            tmdb_key = current_app.config.get('TMDB_API_KEY')
            if not tmdb_key:
                results = MediaAPIService.get_trending('movie')
            else:
                url = 'https://api.themoviedb.org/3/trending/movie/day'
                resp = requests.get(url, params={'api_key': tmdb_key}, timeout=6)
                if resp.status_code == 200:
                    items = resp.json().get('results', [])[:limit]
                    max_pop = max((i.get('popularity') or 0) for i in items) if items else 1
                    for m in items:
                        pop = m.get('popularity') or 0
                        score = round((pop / max_pop) * 100)
                        results.append({
                            'title': m.get('title'),
                            'external_id': f"tmdb_{m.get('id')}",
                            'cover_image': (f"https://image.tmdb.org/t/p/w500{m.get('poster_path')}" if m.get('poster_path') else None),
                            'item_type': 'movie',
                            'creator': m.get('origin_country', [''])[0] or 'Director',
                            'popularity': pop,
                            'streaming_links': [{'provider': 'tmdb', 'url': f"https://www.themoviedb.org/movie/{m.get('id')}"}] if m.get('id') else [],
                            'score_percent': score
                        })

        else:
            svc_results = MediaAPIService.get_trending(item_type) or []
            items = svc_results[:limit]
            max_pop = max((i.get('popularity') or 0) for i in items) if items else 1
            for i in items:
                pop = i.get('popularity') or 0
                score = round((pop / max_pop) * 100)
                i['score_percent'] = score
            results = items

        return jsonify(set_synced(results)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@discover_bp.route('/search', methods=['GET'])
@limiter.limit("30 per minute")
def search_external():
    item_type = request.args.get('type', 'movie')
    query = request.args.get('q', '')
    if item_type not in ['movie', 'book', 'music'] or not query: return jsonify({'results': []}), 200
    
    try:
        results = MediaAPIService.search(item_type, query)
        return jsonify(set_synced(results)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@discover_bp.route('/sync', methods=['POST'])
@token_required
@limiter.limit("15 per minute")
def sync_external_item():
    data = request.get_json()
    if not data or data.get('item_type') not in ['movie', 'book', 'music']: 
        return jsonify({'error': 'Unsupported item type'}), 400
    
    ext_id = data.get('external_id')
    item_type = data.get('item_type')
    try:
        # Check if exists
        item = execute_query("SELECT id FROM items WHERE external_id = %s", (ext_id,), fetch_one=True)
        item_id = item['id'] if item else None

        # Format Year
        year = None
        if data.get('release_year'):
            try: year = int(str(data['release_year'])[:4])
            except: pass

        if item_id:
            # Update
            execute_query(
                "UPDATE items SET title=%s, cover_image=%s WHERE id=%s",
                (data['title'], data.get('cover_image'), item_id), fetch_all=False
            )
        else:
            # Insert
            item_id = execute_query(
                """INSERT INTO items (title, description, genre, item_type, cover_image, popularity_score, external_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (data['title'], data.get('description', ''), data.get('genre', 'Other'), 
                 item_type, data.get('cover_image'), data.get('popularity', 0), ext_id), fetch_all=False
            )

        # Type specific
        if item_type == 'movie':
            execute_query(
                "INSERT INTO movies (item_id, director, release_year) VALUES (%s, %s, %s) ON DUPLICATE KEY UPDATE release_year=%s",
                (item_id, data.get('creator', 'Director'), year, year), fetch_all=False
            )
        elif item_type == 'book':
            execute_query(
                "INSERT INTO books (item_id, author, publication_year) VALUES (%s, %s, %s) ON DUPLICATE KEY UPDATE publication_year=%s",
                (item_id, data.get('creator', 'Author'), year, year), fetch_all=False
            )
            
        return jsonify({'message': 'Synced', 'item_id': item_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
