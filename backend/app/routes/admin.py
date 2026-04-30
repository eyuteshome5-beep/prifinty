"""
Admin Routes - Content Management, User Management
"""
from flask import Blueprint, request, jsonify, g, current_app
from app.utils.database import execute_query
from app.utils.auth import admin_required
from app.services.media_api import MediaAPIService
import json

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    """Get admin dashboard statistics"""
    # User stats
    user_stats = execute_query(
        """SELECT 
            COUNT(*) as total_users,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
            SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users,
            SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as new_today
           FROM users""",
        fetch_one=True
    )
    
    # Content stats
    content_stats = execute_query(
        """SELECT 
            COUNT(*) as total_items,
            SUM(CASE WHEN item_type = 'book' THEN 1 ELSE 0 END) as books,
            SUM(CASE WHEN item_type = 'movie' THEN 1 ELSE 0 END) as movies,
            SUM(CASE WHEN item_type = 'music' THEN 1 ELSE 0 END) as music,
            SUM(CASE WHEN is_ethiopian = TRUE THEN 1 ELSE 0 END) as ethiopian_content
           FROM items""",
        fetch_one=True
    )
    
    # Rating stats
    rating_stats = execute_query(
        """SELECT 
            COUNT(*) as total_ratings,
            AVG(rating) as avg_rating,
            COUNT(DISTINCT user_id) as users_who_rated
           FROM ratings""",
        fetch_one=True
    )
    
    # Recent activity
    recent_users = execute_query(
        """SELECT id, username, email, created_at 
           FROM users ORDER BY created_at DESC LIMIT 5"""
    )
    
    return jsonify({
        'users': user_stats,
        'content': content_stats,
        'ratings': {
            'total': rating_stats['total_ratings'] or 0,
            'average': round(float(rating_stats['avg_rating'] or 0), 2),
            'unique_raters': rating_stats['users_who_rated'] or 0
        },
        'recent_users': recent_users
    }), 200


@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    """Get all users with pagination"""
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(int(request.args.get('per_page', 20)), 100)
    search = request.args.get('search', '')
    
    offset = (page - 1) * per_page
    
    query = """
        SELECT id, username, email, role, credits, is_active, created_at, last_login
        FROM users WHERE 1=1
    """
    params = []
    
    if search:
        query += " AND (username LIKE %s OR email LIKE %s)"
        params.extend([f'%{search}%', f'%{search}%'])
    
    query += f" ORDER BY created_at DESC LIMIT {per_page} OFFSET {offset}"
    
    users = execute_query(query, tuple(params))
    
    # Get total count
    count_query = "SELECT COUNT(*) as total FROM users WHERE 1=1"
    count_params = []
    
    if search:
        count_query += " AND (username LIKE %s OR email LIKE %s)"
        count_params.extend([f'%{search}%', f'%{search}%'])
    
    total = execute_query(count_query, tuple(count_params), fetch_one=True)['total']
    
    return jsonify({
        'users': users,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Update user (role, status, credits)"""
    data = request.get_json()
    
    updates = []
    params = []
    
    if 'role' in data and data['role'] in ['user', 'admin']:
        updates.append("role = %s")
        params.append(data['role'])
    
    if 'is_active' in data:
        updates.append("is_active = %s")
        params.append(bool(data['is_active']))
    
    if 'credits' in data:
        updates.append("credits = %s")
        params.append(int(data['credits']))
    
    if updates:
        params.append(user_id)
        execute_query(
            f"UPDATE users SET {', '.join(updates)} WHERE id = %s",
            tuple(params),
            fetch_all=False
        )
    
    return jsonify({'message': 'User updated successfully'}), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete user (soft delete - deactivate)"""
    # Prevent self-deletion
    if user_id == g.current_user['id']:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    execute_query(
        "UPDATE users SET is_active = FALSE WHERE id = %s",
        (user_id,),
        fetch_all=False
    )
    
    return jsonify({'message': 'User deactivated successfully'}), 200


@admin_bp.route('/add-item', methods=['POST'])
@admin_required
def add_item():
    """Add new content item"""
    data = request.get_json()
    
    # Validate required fields
    required = ['title', 'item_type']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    item_type = data['item_type']
    if item_type not in ['book', 'movie', 'music']:
        return jsonify({'error': 'Invalid item type'}), 400
    
    # Insert base item
    item_id = execute_query(
        """INSERT INTO items (title, description, genre, item_type, cover_image, is_ethiopian, popularity_score)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (
            data['title'],
            data.get('description', ''),
            data.get('genre', ''),
            item_type,
            data.get('cover_image', ''),
            data.get('is_ethiopian', False),
            data.get('popularity_score', 50)
        ),
        fetch_all=False
    )
    
    # Insert type-specific details
    if item_type == 'book':
        execute_query(
            """INSERT INTO books (item_id, author, isbn, publisher, publication_year, page_count, language)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                item_id,
                data.get('author', 'Unknown'),
                data.get('isbn', ''),
                data.get('publisher', ''),
                data.get('publication_year'),
                data.get('page_count'),
                data.get('language', 'English')
            ),
            fetch_all=False
        )
    
    elif item_type == 'movie':
        execute_query(
            """INSERT INTO movies (item_id, director, release_year, duration_minutes, language, country, cast_members)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                item_id,
                data.get('director', 'Unknown'),
                data.get('release_year'),
                data.get('duration_minutes'),
                data.get('language', 'English'),
                data.get('country', ''),
                data.get('cast_members', '')
            ),
            fetch_all=False
        )
    
    elif item_type == 'music':
        execute_query(
            """INSERT INTO music (item_id, artist, album, release_year, duration_seconds, language, ethiopian_genre)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                item_id,
                data.get('artist', 'Unknown'),
                data.get('album', ''),
                data.get('release_year'),
                data.get('duration_seconds'),
                data.get('language', 'English'),
                data.get('ethiopian_genre')
            ),
            fetch_all=False
        )
    
    # Add Ethiopian metadata if applicable
    if data.get('is_ethiopian') and any(data.get(k) for k in ['amharic_title', 'cultural_significance', 'region']):
        execute_query(
            """INSERT INTO ethiopian_content_metadata (item_id, amharic_title, cultural_significance, region, traditional_genre)
               VALUES (%s, %s, %s, %s, %s)""",
            (
                item_id,
                data.get('amharic_title', ''),
                data.get('cultural_significance', ''),
                data.get('region', ''),
                data.get('traditional_genre', '')
            ),
            fetch_all=False
        )
    
    return jsonify({
        'message': 'Item added successfully',
        'item_id': item_id
    }), 201


@admin_bp.route('/item/<int:item_id>', methods=['PUT'])
@admin_required
def update_item(item_id):
    """Update content item"""
    data = request.get_json()
    
    # Update base item fields
    base_updates = []
    base_params = []
    
    for field in ['title', 'description', 'genre', 'cover_image', 'is_ethiopian', 'popularity_score']:
        if field in data:
            base_updates.append(f"{field} = %s")
            base_params.append(data[field])
    
    if base_updates:
        base_params.append(item_id)
        execute_query(
            f"UPDATE items SET {', '.join(base_updates)} WHERE id = %s",
            tuple(base_params),
            fetch_all=False
        )
    
    return jsonify({'message': 'Item updated successfully'}), 200


@admin_bp.route('/item/<int:item_id>', methods=['DELETE'])
@admin_required
def delete_item(item_id):
    """Delete content item"""
    # Check if item exists
    item = execute_query(
        "SELECT id FROM items WHERE id = %s",
        (item_id,),
        fetch_one=True
    )
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    # Delete item (cascades to related tables)
    execute_query(
        "DELETE FROM items WHERE id = %s",
        (item_id,),
        fetch_all=False
    )
    
    return jsonify({'message': 'Item deleted successfully'}), 200


@admin_bp.route('/ethiopian-metadata/<int:item_id>', methods=['PUT'])
@admin_required
def update_ethiopian_metadata(item_id):
    """Update or create Ethiopian content metadata"""
    data = request.get_json()
    
    # Check if metadata exists
    existing = execute_query(
        "SELECT id FROM ethiopian_content_metadata WHERE item_id = %s",
        (item_id,),
        fetch_one=True
    )
    
    if existing:
        execute_query(
            """UPDATE ethiopian_content_metadata SET
               amharic_title = %s,
               cultural_significance = %s,
               region = %s,
               traditional_genre = %s,
               historical_period = %s
               WHERE item_id = %s""",
            (
                data.get('amharic_title', ''),
                data.get('cultural_significance', ''),
                data.get('region', ''),
                data.get('traditional_genre', ''),
                data.get('historical_period', ''),
                item_id
            ),
            fetch_all=False
        )
    else:
        execute_query(
            """INSERT INTO ethiopian_content_metadata 
               (item_id, amharic_title, cultural_significance, region, traditional_genre, historical_period)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (
                item_id,
                data.get('amharic_title', ''),
                data.get('cultural_significance', ''),
                data.get('region', ''),
                data.get('traditional_genre', ''),
                data.get('historical_period', '')
            ),
            fetch_all=False
        )
    
    # Mark item as Ethiopian
    execute_query(
        "UPDATE items SET is_ethiopian = TRUE WHERE id = %s",
        (item_id,),
        fetch_all=False
    )
    
    return jsonify({'message': 'Ethiopian metadata updated successfully'}), 200


@admin_bp.route('/import/search', methods=['GET'])
@admin_required
def search_external():
    """Search for media on external APIs (TMDB, Spotify, Google Books)"""
    item_type = request.args.get('type') # movie, music, book
    query = request.args.get('q')
    
    if not item_type or not query:
        return jsonify({'error': 'Item type and query are required'}), 400
        
    results = MediaAPIService.search(item_type, query)
    return jsonify({'results': results}), 200


@admin_bp.route('/items/search', methods=['GET'])
@admin_required
def search_items_admin():
    """Admin-only search for items without credit deduction.

    Supports optional `type` and `ethiopian_first` query params.
    Uses full-text MATCH search when available and falls back to LIKE.
    """
    item_type = request.args.get('type')
    query_text = (request.args.get('q') or '').strip()
    ethiopian_first = request.args.get('ethiopian_first', 'false').lower() == 'true'

    if not query_text:
        return jsonify({'results': [], 'query': query_text, 'count': 0}), 200

    # Try full-text search first (MySQL MATCH). If it fails or returns no rows, fall back to LIKE.
    try:
        search_query = """
            SELECT i.*, 
                   MATCH(i.title, i.description, i.genre) AGAINST(%s IN NATURAL LANGUAGE MODE) as relevance,
                   CASE 
                       WHEN i.item_type = 'book' THEN b.author
                       WHEN i.item_type = 'movie' THEN m.director
                       WHEN i.item_type = 'music' THEN mu.artist
                   END as creator
            FROM items i
            LEFT JOIN books b ON i.id = b.item_id AND i.item_type = 'book'
            LEFT JOIN movies m ON i.id = m.item_id AND i.item_type = 'movie'
            LEFT JOIN music mu ON i.id = mu.item_id AND i.item_type = 'music'
            WHERE MATCH(i.title, i.description, i.genre) AGAINST(%s IN NATURAL LANGUAGE MODE)
        """
        params = [query_text, query_text]
        if item_type:
            search_query += " AND i.item_type = %s"
            params.append(item_type)

        order_clause = 'relevance DESC'
        if ethiopian_first:
            order_clause = 'i.is_ethiopian DESC, relevance DESC'

        search_query += f" ORDER BY {order_clause} LIMIT 50"

        results = execute_query(search_query, tuple(params))
    except Exception:
        results = []

    # Fallback to LIKE when no results from full-text or on error
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
            WHERE i.title LIKE %s OR i.description LIKE %s OR i.genre LIKE %s
        """
        like_params = [f'%{query_text}%', f'%{query_text}%', f'%{query_text}%']
        if item_type:
            like_query += " AND i.item_type = %s"
            like_params.append(item_type)

        order_clause_like = 'i.popularity_score DESC'
        if ethiopian_first:
            order_clause_like = 'i.is_ethiopian DESC, i.popularity_score DESC'

        like_query += f" ORDER BY {order_clause_like} LIMIT 50"
        results = execute_query(like_query, tuple(like_params))

    return jsonify({'results': results, 'query': query_text, 'count': len(results)}), 200


@admin_bp.route('/import/add', methods=['POST'])
@admin_required
def import_external():
    """Import an item from an external API into the local database"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Data is required'}), 400
        
    item_type = data.get('item_type')

    # Attempt to enrich missing metadata server-side (description, cover_image, creator, streaming links)
    try:
        needs_enrich = not data.get('description') or not data.get('cover_image') or not data.get('creator')
        if needs_enrich and data.get('title'):
            candidates = MediaAPIService.search(item_type, data.get('title'))
            if candidates:
                best = candidates[0]
                # Fill missing fields conservatively
                data['description'] = data.get('description') or best.get('description') or best.get('overview') or ''
                data['cover_image'] = data.get('cover_image') or best.get('cover_image') or best.get('image') or ''
                data['creator'] = data.get('creator') or best.get('creator') or best.get('artist') or best.get('author') or ''
                # Merge streaming links (dedupe by URL)
                existing_links = data.get('streaming_links') or []
                best_links = best.get('streaming_links') or []
                seen = {l.get('url') for l in existing_links if l.get('url')}
                for l in best_links:
                    if l.get('url') and l.get('url') not in seen:
                        existing_links.append(l)
                        seen.add(l.get('url'))
                data['streaming_links'] = existing_links
    except Exception:
        # Best-effort enrichment — do not fail the import on enrichment errors
        pass
    
    # 1. Insert into base items table (include is_ethiopian if provided)
    # Apply an optional boost to popularity for Ethiopian imports so they surface at the top
    try:
        base_popularity = int(data.get('popularity') or 0)
    except Exception:
        base_popularity = 0

    if bool(data.get('is_ethiopian', False)):
        boost = int(current_app.config.get('ETHIOPIAN_IMPORT_POPULARITY_BOOST', 1000))
        popularity_score = max(base_popularity, boost)
    else:
        popularity_score = base_popularity

    item_id = execute_query(
        """INSERT INTO items (title, description, genre, item_type, cover_image, popularity_score, external_id, is_ethiopian)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            data['title'],
            data.get('description', ''),
            data.get('genre', 'Other'),
            item_type,
            data.get('cover_image', ''),
            popularity_score,
            data.get('external_id'),
            bool(data.get('is_ethiopian', False))
        ),
        fetch_all=False
    )
    
    # 2. Insert into type-specific table
    if item_type == 'movie':
        execute_query(
            "INSERT INTO movies (item_id, director, release_year) VALUES (%s, %s, %s)",
            (item_id, data.get('creator', 'Unknown'), data.get('release_year')),
            fetch_all=False
        )
    elif item_type == 'music':
        # Insert without assuming legacy `spotify_id` column exists.
        execute_query(
            "INSERT INTO music (item_id, artist, album, release_year) VALUES (%s, %s, %s, %s)",
            (item_id, data.get('creator', 'Unknown'), data.get('album', ''), data.get('release_year')),
            fetch_all=False
        )
        # Attempt to set legacy external id in a best-effort way. If the column
        # does not exist on older deployments, ignore the error.
        if data.get('external_id'):
            try:
                execute_query(
                    "UPDATE music SET spotify_id = %s WHERE item_id = %s",
                    (data.get('external_id'), item_id),
                    fetch_all=False
                )
            except Exception:
                # Legacy column not present — safe to ignore.
                pass
    elif item_type == 'book':
        execute_query(
            "INSERT INTO books (item_id, author, publication_year) VALUES (%s, %s, %s)",
            (item_id, data.get('creator', 'Unknown'), data.get('release_year')),
            fetch_all=False
        )
    # 3. Save external streaming links if provided
    streaming_links = data.get('streaming_links') or []
    if streaming_links:
        # Ensure table exists (best-effort)
        try:
            execute_query(
                """CREATE TABLE IF NOT EXISTS external_links (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    item_id INT NOT NULL,
                    provider VARCHAR(128),
                    url VARCHAR(512),
                    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
                )""",
                fetch_all=False
            )
        except Exception:
            # Ignore create errors; proceed to insert if possible
            pass

        for link in streaming_links:
            try:
                execute_query(
                    "INSERT INTO external_links (item_id, provider, url) VALUES (%s, %s, %s)",
                    (item_id, link.get('provider'), link.get('url')),
                    fetch_all=False
                )
            except Exception:
                continue
        
    return jsonify({
        'message': f'{item_type.capitalize()} imported successfully',
        'item_id': item_id
    }), 201


@admin_bp.route('/activity', methods=['GET'])
@admin_required
def get_activity():
    """Get recent platform activity"""
    limit = min(int(request.args.get('limit', 20)), 100)
    
    # Query recent activity with user and item information
    # We use a try-except block here to handle cases where the table might not have data yet
    try:
        activities_raw = execute_query(
            """SELECT 
                ua.id, 
                ua.activity_type, 
                ua.details, 
                ua.created_at,
                u.username,
                i.title as item_name
               FROM user_activity ua
               JOIN users u ON ua.user_id = u.id
               LEFT JOIN items i ON ua.item_id = i.id
               ORDER BY ua.created_at DESC
               LIMIT %s""",
            (limit,)
        )
        
        activities = []
        for act in activities_raw:
            # Create a friendly description based on activity type
            desc = ""
            type_prefix = "user"
            
            # Handle JSON details (MySQL returns dict, SQLite might return str)
            details = act['details']
            if isinstance(details, str):
                try:
                    details = json.loads(details)
                except:
                    details = {}
            elif details is None:
                details = {}
            
            a_type = act['activity_type']
            if a_type == 'view':
                desc = f"{act['username']} viewed {act['item_name'] or 'an item'}"
                type_prefix = "item"
            elif a_type == 'search':
                term = details.get('query', 'something')
                desc = f"{act['username']} searched for '{term}'"
                type_prefix = "user"
            elif a_type == 'rate':
                rating = details.get('rating', '?')
                desc = f"{act['username']} rated {act['item_name'] or 'an item'} {rating} stars"
                type_prefix = "rating"
            elif a_type == 'wishlist':
                desc = f"{act['username']} added {act['item_name'] or 'an item'} to wishlist"
                type_prefix = "item"
            elif a_type == 'recommendation':
                desc = f"AI generated recommendations for {act['username']}"
                type_prefix = "user"
            else:
                desc = f"{act['username']} performed {a_type} action"
                
            activities.append({
                'id': act['id'],
                'type': type_prefix,
                'description': desc,
                'timestamp': act['created_at'].isoformat() if hasattr(act['created_at'], 'isoformat') else str(act['created_at'])
            })
            
        return jsonify({
            'activities': activities
        }), 200
    except Exception as e:
        # Fallback to empty list if there's any database error or missing data
        print(f"Activity fetch error: {e}")
        return jsonify({'activities': []}), 200
