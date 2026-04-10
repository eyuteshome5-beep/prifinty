"""
Wishlist Routes - User Personal Favorites
"""
from flask import Blueprint, request, jsonify, g
from app.utils.database import execute_query
from app.utils.auth import token_required

wishlist_bp = Blueprint('wishlist', __name__)

@wishlist_bp.route('', methods=['GET'])
@token_required
def get_wishlist():
    """Get user's wishlist items"""
    user_id = g.current_user['id']
    
    query = """
        SELECT w.id as wishlist_id, w.added_at, w.notes,
               i.id, i.title, i.description, i.genre, i.item_type,
               i.cover_image, i.avg_rating, i.rating_count,
               i.is_ethiopian, i.creator
        FROM wishlist w
        JOIN items i ON w.item_id = i.id
        WHERE w.user_id = %s
        ORDER BY w.added_at DESC
    """
    
    items = execute_query(query, (user_id,))
    return jsonify({'wishlist': items or []}), 200

@wishlist_bp.route('/add', methods=['POST'])
@token_required
def add_to_wishlist():
    """Add an item to user's wishlist"""
    user_id = g.current_user['id']
    data = request.get_json()
    
    if not data or 'item_id' not in data:
        return jsonify({'error': 'item_id is required'}), 400
        
    item_id = data['item_id']
    notes = data.get('notes', '')
    
    try:
        execute_query(
            "INSERT INTO wishlist (user_id, item_id, notes) VALUES (%s, %s, %s)",
            (user_id, item_id, notes),
            fetch_all=False
        )
        return jsonify({'message': 'Added to wishlist'}), 201
    except Exception as e:
        return jsonify({'error': 'Item already in wishlist or invalid item_id'}), 400

@wishlist_bp.route('/<int:item_id>', methods=['DELETE'])
@token_required
def remove_from_wishlist(item_id):
    """Remove an item from user's wishlist"""
    user_id = g.current_user['id']
    
    execute_query(
        "DELETE FROM wishlist WHERE user_id = %s AND item_id = %s",
        (user_id, item_id),
        fetch_all=False
    )
    
    return jsonify({'message': 'Removed from wishlist'}), 200

@wishlist_bp.route('/check/<int:item_id>', methods=['GET'])
@token_required
def check_wishlist(item_id):
    """Check if an item is in user's wishlist"""
    user_id = g.current_user['id']
    
    item = execute_query(
        "SELECT id FROM wishlist WHERE user_id = %s AND item_id = %s",
        (user_id, item_id),
        fetch_one=True
    )
    
    return jsonify({'in_wishlist': item is not None}), 200
