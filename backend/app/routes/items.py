"""
Items Routes - Browse, Search, View Content
"""
from flask import Blueprint, request, jsonify, g, current_app
from app.utils.database import execute_query
from app.utils.auth import token_required, credits_required
import json

items_bp = Blueprint('items', __name__)


def _attach_streaming_links(items):
    """Attach streaming_links list to each item dict by querying external_links table."""
    if not items:
        return items
    try:
        ids = [it['id'] for it in items if it.get('id')]
        if not ids:
            return items
        # Build placeholders and params
        placeholders = ','.join(['%s'] * len(ids))
        query = f"SELECT item_id, provider, url FROM external_links WHERE item_id IN ({placeholders})"
        rows = execute_query(query, tuple(ids))
        mapping = {}
        for r in rows:
            mapping.setdefault(r['item_id'], []).append({'provider': r.get('provider'), 'url': r.get('url')})
        for it in items:
            it['streaming_links'] = mapping.get(it.get('id'), [])
    except Exception:
        # If table doesn't exist or query fails, silently continue without links
        for it in items:
            it['streaming_links'] = []
    return items


@items_bp.route('', methods=['GET'])
def get_items():
    """Get all items with filtering and pagination"""
    # Query parameters
    item_type = request.args.get('type')  # book, movie, music
    genre = request.args.get('genre')
    ethiopian_only = request.args.get('ethiopian', 'false').lower() == 'true'
    sort_by = request.args.get('sort', 'popularity')  # popularity, rating, recent
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(int(request.args.get('per_page', 20)), current_app.config['MAX_PAGE_SIZE'])
    
    # Build query
    query = """
        SELECT i.*, 
               CASE 
                   WHEN i.item_type = 'book' THEN b.author
                   WHEN i.item_type = 'movie' THEN m.director
                   WHEN i.item_type = 'music' THEN mu.artist
               END as creator,
               CASE 
                   WHEN i.item_type = 'book' THEN b.publication_year
                   WHEN i.item_type = 'movie' THEN m.release_year
                   WHEN i.item_type = 'music' THEN mu.release_year
               END as year
        FROM items i
        LEFT JOIN books b ON i.id = b.item_id AND i.item_type = 'book'
        LEFT JOIN movies m ON i.id = m.item_id AND i.item_type = 'movie'
        LEFT JOIN music mu ON i.id = mu.item_id AND i.item_type = 'music'
        WHERE 1=1
    """
    params = []
    
    if item_type:
        query += " AND i.item_type = %s"
        params.append(item_type)
    
    if genre:
        query += " AND i.genre LIKE %s"
        params.append(f'%{genre}%')
    
    if ethiopian_only:
        query += " AND i.is_ethiopian = TRUE"
    
    # Sorting
    sort_map = {
        'popularity': 'i.popularity_score DESC',
        'rating': 'i.avg_rating DESC',
        'recent': 'i.created_at DESC',
        'title': 'i.title ASC'
    }
    query += f" ORDER BY {sort_map.get(sort_by, 'i.popularity_score DESC')}"
    
    # Pagination
    offset = (page - 1) * per_page
    query += f" LIMIT {per_page} OFFSET {offset}"
    
    items = execute_query(query, tuple(params))
    # Attach streaming links (external links) to each item for easy frontend access
    items = _attach_streaming_links(items)
    
    # Get total count
    count_query = """
        SELECT COUNT(*) as total FROM items i WHERE 1=1
    """
    count_params = []
    
    if item_type:
        count_query += " AND i.item_type = %s"
        count_params.append(item_type)
    
    if genre:
        count_query += " AND i.genre LIKE %s"
        count_params.append(f'%{genre}%')
    
    if ethiopian_only:
        count_query += " AND i.is_ethiopian = TRUE"
    
    total = execute_query(count_query, tuple(count_params), fetch_one=True)['total']
    
    return jsonify({
        'items': items,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    }), 200


@items_bp.route('/<int:item_id>', methods=['GET'])
def get_item(item_id):
    """Get single item with full details"""
    # Get base item
    item = execute_query(
        "SELECT * FROM items WHERE id = %s",
        (item_id,),
        fetch_one=True
    )
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    # Get type-specific details
    if item['item_type'] == 'book':
        details = execute_query(
            "SELECT * FROM books WHERE item_id = %s",
            (item_id,),
            fetch_one=True
        )
    elif item['item_type'] == 'movie':
        details = execute_query(
            "SELECT * FROM movies WHERE item_id = %s",
            (item_id,),
            fetch_one=True
        )
    elif item['item_type'] == 'music':
        # Some deployments may lack the legacy `spotify_id` column.
        # Use a safe select to avoid raising SQL errors on older DBs.
        details = execute_query(
            "SELECT * FROM music WHERE item_id = %s",
            (item_id,),
            fetch_one=True
        )
    else:
        details = {}
    
    # Get Ethiopian metadata if applicable
    ethiopian_metadata = None
    if item['is_ethiopian']:
        ethiopian_metadata = execute_query(
            "SELECT * FROM ethiopian_content_metadata WHERE item_id = %s",
            (item_id,),
            fetch_one=True
        )
    
    # Get recent ratings
    ratings = execute_query(
        """SELECT r.rating, r.review, r.created_at, u.username
           FROM ratings r
           JOIN users u ON r.user_id = u.id
           WHERE r.item_id = %s
           ORDER BY r.created_at DESC
           LIMIT 10""",
        (item_id,)
    )

    # Get external/streaming links if available
    try:
        external_links = execute_query(
            "SELECT provider, url FROM external_links WHERE item_id = %s",
            (item_id,)
        )
    except Exception:
        external_links = []
    
    # Log view if user is authenticated
    from app.utils.auth import get_current_user
    user = get_current_user()
    if user:
        execute_query(
            """INSERT INTO user_activity (user_id, activity_type, item_id)
               VALUES (%s, 'view', %s)""",
            (user['id'], item_id),
            fetch_all=False
        )
    
    return jsonify({
        'item': item,
        'details': details,
        'ethiopian_metadata': ethiopian_metadata,
        'ratings': ratings,
        'external_links': external_links
    }), 200


@items_bp.route('/<item_id>/spotify', methods=['GET'])
def get_item_spotify(item_id):
    """Return spotify_id for music items if available"""
    try:
        item_id_parsed = int(item_id)
    except ValueError:
        item_id_parsed = item_id

    item = execute_query(
        "SELECT id, item_type FROM items WHERE id = %s",
        (item_id_parsed,),
        fetch_one=True
    )
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    if item.get('item_type') != 'music':
        return jsonify({'error': 'Spotify ID available only for music items'}), 400

    try:
        music = execute_query(
            "SELECT spotify_id FROM music WHERE item_id = %s",
            (item_id,),
            fetch_one=True
        )
        spotify_id = music.get('spotify_id') if music else None
    except Exception as e:
        # Older databases may not have spotify_id column; return null instead of failing
        spotify_id = None
    return jsonify({'spotify_id': spotify_id}), 200


@items_bp.route('/search', methods=['GET'])
@token_required
@credits_required('search')
def search_items():
    """Search items by query"""
    query_text = request.args.get('q', '').strip()
    item_type = request.args.get('type')
    
    if not query_text:
        return jsonify({'error': 'Search query is required'}), 400
    
    # Deduct credits
    deduct_credits(g.current_user['id'], g.credit_cost, 'search', f'Search: {query_text}')
    
    # Full-text search
    search_query = """
        SELECT i.*, 
               MATCH(i.title, i.title_am, i.description, i.description_am, i.genre) AGAINST(%s IN NATURAL LANGUAGE MODE) as relevance,
               CASE 
                   WHEN i.item_type = 'book' THEN b.author
                   WHEN i.item_type = 'movie' THEN m.director
                   WHEN i.item_type = 'music' THEN mu.artist
               END as creator
        FROM items i
        LEFT JOIN books b ON i.id = b.item_id AND i.item_type = 'book'
        LEFT JOIN movies m ON i.id = m.item_id AND i.item_type = 'movie'
        LEFT JOIN music mu ON i.id = mu.item_id AND i.item_type = 'music'
        WHERE MATCH(i.title, i.title_am, i.description, i.description_am, i.genre) AGAINST(%s IN NATURAL LANGUAGE MODE)
    """
    params = [query_text, query_text]
    
    if item_type:
        search_query += " AND i.item_type = %s"
        params.append(item_type)
    
    search_query += " ORDER BY relevance DESC LIMIT 50"
    
    results = execute_query(search_query, tuple(params))
    
    # If no full-text results, fall back to LIKE search
    if not results:
        like_query = """
            SELECT i.*, 
                   CASE 
                       WHEN i.item_type = 'book' THEN b.author
                       WHEN i.item_type = 'movie' THEN m.director
                       WHEN i.item_type = 'music' THEN mu.artist
                   END as creator
            FROM items i
            LEFT JOIN books b ON i.id = b.item_id AND i.item_type = 'book'
            LEFT JOIN movies m ON i.id = m.item_id AND i.item_type = 'movie'
            LEFT JOIN music mu ON i.id = mu.item_id AND i.item_type = 'music'
            WHERE i.title LIKE %s OR i.title_am LIKE %s OR i.description LIKE %s OR i.description_am LIKE %s OR i.genre LIKE %s
        """
        like_params = [f'%{query_text}%', f'%{query_text}%', f'%{query_text}%', f'%{query_text}%', f'%{query_text}%']
        
        if item_type:
            like_query += " AND i.item_type = %s"
            like_params.append(item_type)
        
        like_query += " ORDER BY i.popularity_score DESC LIMIT 50"
        results = execute_query(like_query, tuple(like_params))
    
    # Log search activity
    execute_query(
        """INSERT INTO user_activity (user_id, activity_type, details)
           VALUES (%s, 'search', %s)""",
        (g.current_user['id'], json.dumps({'query': query_text, 'results': len(results)})),
        fetch_all=False
    )
    
    return jsonify({
        'results': results,
        'query': query_text,
        'count': len(results)
    }), 200


@items_bp.route('/genres', methods=['GET'])
def get_genres():
    """Get all available genres by item type"""
    item_type = request.args.get('type')
    
    query = "SELECT DISTINCT genre FROM items WHERE genre IS NOT NULL"
    params = []
    
    if item_type:
        query += " AND item_type = %s"
        params.append(item_type)
    
    query += " ORDER BY genre"
    
    genres = execute_query(query, tuple(params))
    
    return jsonify({
        'genres': [g['genre'] for g in genres]
    }), 200


@items_bp.route('/ethiopian-genres', methods=['GET'])
def get_ethiopian_genres():
    """Get Ethiopian music genres"""
    genres = execute_query(
        """SELECT DISTINCT ethiopian_genre FROM music 
           WHERE ethiopian_genre IS NOT NULL
           ORDER BY ethiopian_genre"""
    )
    
    return jsonify({
        'ethiopian_genres': [g['ethiopian_genre'] for g in genres]
    }), 200


@items_bp.route('/popular', methods=['GET'])
def get_popular():
    """Get popular items (for cold start)"""
    item_type = request.args.get('type')
    limit = min(int(request.args.get('limit', 10)), 50)
    
    query = """
        SELECT i.*, 
               CASE 
                   WHEN i.item_type = 'book' THEN b.author
                   WHEN i.item_type = 'movie' THEN m.director
                   WHEN i.item_type = 'music' THEN mu.artist
               END as creator
        FROM items i
        LEFT JOIN books b ON i.id = b.item_id AND i.item_type = 'book'
        LEFT JOIN movies m ON i.id = m.item_id AND i.item_type = 'movie'
        LEFT JOIN music mu ON i.id = mu.item_id AND i.item_type = 'music'
        WHERE 1=1
    """
    params = []
    
    if item_type:
        query += " AND i.item_type = %s"
        params.append(item_type)
    
    query += f" ORDER BY i.popularity_score DESC, i.avg_rating DESC LIMIT {limit}"
    
    items = execute_query(query, tuple(params))
    # Attach streaming links for returned items
    items = _attach_streaming_links(items)
    
    return jsonify({'items': items}), 200


@items_bp.route('/ethiopian', methods=['GET'])
def get_ethiopian_content():
    """Get Ethiopian content with special metadata"""
    item_type = request.args.get('type')
    limit = min(int(request.args.get('limit', 20)), 50)
    
    query = """
        SELECT i.*, e.amharic_title, e.cultural_significance, e.region, e.traditional_genre,
               CASE 
                   WHEN i.item_type = 'book' THEN b.author
                   WHEN i.item_type = 'movie' THEN m.director
                   WHEN i.item_type = 'music' THEN mu.artist
               END as creator
        FROM items i
        LEFT JOIN ethiopian_content_metadata e ON i.id = e.item_id
        LEFT JOIN books b ON i.id = b.item_id AND i.item_type = 'book'
        LEFT JOIN movies m ON i.id = m.item_id AND i.item_type = 'movie'
        LEFT JOIN music mu ON i.id = mu.item_id AND i.item_type = 'music'
        WHERE i.is_ethiopian = TRUE
    """
    params = []
    
    if item_type:
        query += " AND i.item_type = %s"
        params.append(item_type)
    
    query += f" ORDER BY i.popularity_score DESC LIMIT {limit}"
    
    items = execute_query(query, tuple(params))
    # Attach streaming links for Ethiopian content
    items = _attach_streaming_links(items)
    
    return jsonify({'items': items}), 200


from app.utils.credits import deduct_credits
