"""
User Routes - Profile, Ratings, Wishlist
"""
from flask import Blueprint, request, jsonify, g, current_app
from app.utils.database import execute_query
from app.utils.auth import token_required
import json

users_bp = Blueprint('users', __name__)


@users_bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    """Get user profile with stats"""
    user_id = g.current_user['id']
    
    # Get user details
    user = execute_query(
        """SELECT id, username, email, role, credits, created_at, last_login 
           FROM users WHERE id = %s""",
        (user_id,),
        fetch_one=True
    )
    
    # Get rating stats
    rating_stats = execute_query(
        """SELECT 
            COUNT(*) as total_ratings,
            AVG(rating) as avg_rating,
            SUM(CASE WHEN i.item_type = 'book' THEN 1 ELSE 0 END) as book_ratings,
            SUM(CASE WHEN i.item_type = 'movie' THEN 1 ELSE 0 END) as movie_ratings,
            SUM(CASE WHEN i.item_type = 'music' THEN 1 ELSE 0 END) as music_ratings
           FROM ratings r
           JOIN items i ON r.item_id = i.id
           WHERE r.user_id = %s""",
        (user_id,),
        fetch_one=True
    )
    
    # Get wishlist count
    wishlist_count = execute_query(
        "SELECT COUNT(*) as count FROM wishlist WHERE user_id = %s",
        (user_id,),
        fetch_one=True
    )
    
    # Get preferences
    preferences = execute_query(
        "SELECT * FROM preferences WHERE user_id = %s",
        (user_id,),
        fetch_one=True
    )
    
    return jsonify({
        'profile': user,
        'stats': {
            'total_ratings': rating_stats['total_ratings'] or 0,
            'average_rating': round(float(rating_stats['avg_rating'] or 0), 2),
            'book_ratings': rating_stats['book_ratings'] or 0,
            'movie_ratings': rating_stats['movie_ratings'] or 0,
            'music_ratings': rating_stats['music_ratings'] or 0,
            'wishlist_items': wishlist_count['count'] or 0
        },
        'preferences': preferences
    }), 200


@users_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    """Update user profile"""
    user_id = g.current_user['id']
    data = request.get_json()
    
    # Only allow updating certain fields
    allowed_fields = ['username']
    updates = []
    params = []
    
    for field in allowed_fields:
        if field in data:
            updates.append(f"{field} = %s")
            params.append(data[field])
    
    if updates:
        params.append(user_id)
        execute_query(
            f"UPDATE users SET {', '.join(updates)} WHERE id = %s",
            tuple(params),
            fetch_all=False
        )
    
    return jsonify({'message': 'Profile updated successfully'}), 200


@users_bp.route('/preferences', methods=['PUT'])
@token_required
def update_preferences():
    """Update user preferences"""
    user_id = g.current_user['id']
    data = request.get_json()
    
    # Extract preference fields
    preferred_genres = json.dumps(data.get('preferred_genres', []))
    preferred_languages = json.dumps(data.get('preferred_languages', ['English']))
    ethiopian_preference = data.get('ethiopian_content_preference', False)
    notification_enabled = data.get('notification_enabled', True)
    
    execute_query(
        """UPDATE preferences SET 
           preferred_genres = %s,
           preferred_languages = %s,
           ethiopian_content_preference = %s,
           notification_enabled = %s
           WHERE user_id = %s""",
        (preferred_genres, preferred_languages, ethiopian_preference, notification_enabled, user_id),
        fetch_all=False
    )
    
    return jsonify({'message': 'Preferences updated successfully'}), 200


@users_bp.route('/rate', methods=['POST'])
@token_required
def rate_item():
    """Rate an item (1-5 stars) - Optimized for resilience"""
    user_id = g.current_user['id']
    data = request.get_json()
    
    item_id = data.get('item_id')
    rating = data.get('rating')
    review = data.get('review', '')
    
    if not item_id or not rating:
        return jsonify({'error': 'item_id and rating are required'}), 400
    
    try:
        # Check if user already rated
        existing = execute_query(
            "SELECT id FROM ratings WHERE user_id = %s AND item_id = %s",
            (user_id, item_id),
            fetch_one=True
        )
        
        if existing:
            execute_query(
                "UPDATE ratings SET rating = %s, review = %s, created_at = CURRENT_TIMESTAMP WHERE id = %s",
                (rating, review, existing['id']),
                fetch_all=False
            )
            message = 'Rating updated'
        else:
            execute_query(
                "INSERT INTO ratings (user_id, item_id, rating, review) VALUES (%s, %s, %s, %s)",
                (user_id, item_id, rating, review),
                fetch_all=False
            )
            message = 'Rating saved'
        
        # Update item's average rating
        update_item_rating(item_id)
        
        # Immediate logging for dashboard stats verification
        print(f"DEBUG: User {user_id} rated item {item_id} with {rating} stars.")
        
        return jsonify({'message': message, 'status': 'success'}), 200
    except Exception as e:
        print(f"RATING ERROR: {str(e)}")
        return jsonify({'error': 'Failed to save rating'}), 500


def update_item_rating(item_id):
    """Update item's average rating and count"""
    stats = execute_query(
        "SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM ratings WHERE item_id = %s",
        (item_id,),
        fetch_one=True
    )
    
    execute_query(
        "UPDATE items SET avg_rating = %s, rating_count = %s WHERE id = %s",
        (stats['avg_rating'] or 0, stats['count'] or 0, item_id),
        fetch_all=False
    )


@users_bp.route('/ratings', methods=['GET'])
@token_required
def get_user_ratings():
    """Get all ratings by current user"""
    user_id = g.current_user['id']
    item_type = request.args.get('type')
    
    query = """
        SELECT r.*, i.title, i.item_type, i.cover_image, i.genre
        FROM ratings r
        JOIN items i ON r.item_id = i.id
        WHERE r.user_id = %s
    """
    params = [user_id]
    
    if item_type:
        query += " AND i.item_type = %s"
        params.append(item_type)
    
    query += " ORDER BY r.created_at DESC"
    
    ratings = execute_query(query, tuple(params))
    
    return jsonify({'ratings': ratings}), 200


@users_bp.route('/activity', methods=['GET'])
@token_required
def get_activity():
    """Get user's activity history"""
    user_id = g.current_user['id']
    limit = min(int(request.args.get('limit', 20)), 100)
    
    activity = execute_query(
        """SELECT ua.*, i.title, i.item_type
           FROM user_activity ua
           LEFT JOIN items i ON ua.item_id = i.id
           WHERE ua.user_id = %s
           ORDER BY ua.created_at DESC
           LIMIT %s""",
        (user_id, limit)
    )
    
    return jsonify({'activity': activity}), 200
