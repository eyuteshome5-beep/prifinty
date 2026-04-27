"""
Recommendations Routes - AI-Powered Recommendation System
"""
from flask import Blueprint, request, jsonify, g, current_app
from app.utils.database import execute_query
from app.utils.auth import token_required, credits_required
def get_recommendation_engine():
    """Try to import and construct the RecommendationEngine.
    Returns None if the ML dependencies are not available so the app can
    continue to run with a simple DB fallback.
    """
    try:
        from app.ml.recommendation_engine import RecommendationEngine
        return RecommendationEngine()
    except Exception as e:
        # Log the import failure and continue with fallback behavior
        try:
            current_app.logger.warning(f"Recommendation engine not available: {e}")
        except Exception:
            pass
        return None
import concurrent.futures
import threading
import json

recommendations_bp = Blueprint('recommendations', __name__)


@recommendations_bp.route('', methods=['GET'])
@token_required
@credits_required('recommendation')
def get_recommendations():
    """Get personalized recommendations for the current user"""
    user_id = g.current_user['id']
    item_type = request.args.get('type')  # book, movie, music, or None for all
    limit = min(int(request.args.get('limit', 20)), 50)
    algorithm = request.args.get('algorithm', 'hybrid')  # collaborative, content, hybrid
    
    # Initialize recommendation engine (may be None if ML deps missing)
    engine = get_recommendation_engine()

    # Get user preferences
    preferences = execute_query(
        "SELECT * FROM preferences WHERE user_id = %s",
        (user_id,),
        fetch_one=True
    )
    
    ethiopian_boost = preferences.get('ethiopian_content_preference', False) if preferences else False
    
    # Helper to run heavy engine calls with a short timeout to avoid blocking the web worker
    def run_with_timeout(fn, timeout=8):
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(fn)
            try:
                return future.result(timeout=timeout)
            except concurrent.futures.TimeoutError:
                future.cancel()
                raise

    # Fast personalized heuristic for quick responses (no heavy ML libraries)
    try:
        if engine:
            fast_recs = engine.fast_personalized_recommendations(user_id, item_type, limit)
            if fast_recs:
                recommendations = fast_recs
                fallback_used = False
            else:
                recommendations = None
        else:
            recommendations = None
    except Exception as e:
        print(f"FAST PERSONALIZED FAILED: {e}")
        recommendations = None

    # Get recommendations based on algorithm, but guard with timeout and fallbacks
    fallback_used = False
    try:
        if engine is None:
            # Simple DB-based fallback: return top popular items (optionally filtered by type)
            q = "SELECT id, title, description, item_type, genre, cover_image, is_ethiopian, popularity_score, avg_rating, rating_count FROM items"
            params = []
            if item_type:
                q += " WHERE item_type = %s"
                params.append(item_type)
            q += " ORDER BY popularity_score DESC LIMIT %s"
            params.append(limit)
            rows = execute_query(q, tuple(params))
            recommendations = [{
                'id': r['id'],
                'score': r.get('popularity_score', 0),
                'title': r.get('title'),
                'description': r.get('description'),
            } for r in rows]
            fallback_used = True
        else:
            if recommendations is None:
                if algorithm == 'collaborative':
                    recommendations = run_with_timeout(lambda: engine.collaborative_filtering(user_id, item_type, limit))
            elif algorithm == 'content':
                    recommendations = run_with_timeout(lambda: engine.content_based_filtering(user_id, item_type, limit))
            elif algorithm == 'cross_domain':
                    recommendations = run_with_timeout(lambda: engine.cross_domain_recommendations(user_id, limit))
            else:  # hybrid (default)
                    recommendations = run_with_timeout(lambda: engine.hybrid_recommendations(user_id, item_type, limit, ethiopian_boost))
    except Exception as e:
        print(f"RECOMMENDATION ENGINE ERROR or TIMEOUT: {e}")
        try:
            if engine:
                recommendations = engine.cold_start_recommendations(item_type, limit)
            else:
                recommendations = []
            fallback_used = True
        except Exception as e2:
            print(f"COLD-START FALLBACK FAILED: {e2}")
            recommendations = []
            fallback_used = True

    # Deduct credits (skip for admin users) AFTER successful computation to avoid charging when engine fails
    try:
        if g.current_user.get('role') != 'admin' and (recommendations or fallback_used):
            deduct_credits(user_id, g.credit_cost, 'recommendation', f'Get {item_type or "all"} recommendations')
    except Exception as e:
        print(f"CREDIT DEDUCTION ERROR: {e}")
    
    # Apply Ethiopian content boost if preferred (only available if engine present)
    if ethiopian_boost and engine:
        try:
            recommendations = engine.boost_ethiopian_content(recommendations)
        except Exception:
            pass
    
    # Save recommendations to database (best-effort, don't fail the API if DB write errors)
    try:
        for rec in recommendations:
            try:
                execute_query(
                    """INSERT INTO recommendations (user_id, item_id, score, algorithm_type, explanation)
                       VALUES (%s, %s, %s, %s, %s)
                       ON DUPLICATE KEY UPDATE score = VALUES(score), explanation = VALUES(explanation)""",
                    (user_id, rec['id'], rec['score'], algorithm, rec.get('explanation', '')),
                    fetch_all=False
                )
            except Exception as e:
                print(f"Failed to save recommendation row for user {user_id}, item {rec.get('id')}: {e}")
                continue
    except Exception as e:
        print(f"Failed to save recommendations batch for user {user_id}: {e}")
    
    # Log activity
    execute_query(
        """INSERT INTO user_activity (user_id, activity_type, details)
           VALUES (%s, 'recommendation', %s)""",
        (user_id, json.dumps({'algorithm': algorithm, 'type': item_type, 'count': len(recommendations)})),
        fetch_all=False
    )
    
    response = {
        'recommendations': recommendations,
        'algorithm': algorithm,
        'count': len(recommendations)
    }
    if 'fallback_used' in locals() and fallback_used:
        response['fallback'] = True

    return jsonify(response), 200


@recommendations_bp.route('/explain/<int:item_id>', methods=['GET'])
@token_required
def explain_recommendation(item_id):
    """Get explanation for why an item was recommended"""
    user_id = g.current_user['id']
    
    # Get the recommendation
    recommendation = execute_query(
        """SELECT r.*, i.title, i.item_type
           FROM recommendations r
           JOIN items i ON r.item_id = i.id
           WHERE r.user_id = %s AND r.item_id = %s
           ORDER BY r.created_at DESC
           LIMIT 1""",
        (user_id, item_id),
        fetch_one=True
    )
    
    if not recommendation:
        return jsonify({'error': 'Recommendation not found'}), 404
    
    # Generate detailed explanation (if engine available)
    engine = get_recommendation_engine()
    if engine:
        try:
            explanation = engine.generate_explanation(user_id, item_id)
        except Exception:
            explanation = 'Explanation not available.'
    else:
        explanation = 'Explanation not available (ML engine not installed).'
    
    return jsonify({
        'item_id': item_id,
        'title': recommendation['title'],
        'score': recommendation['score'],
        'algorithm': recommendation['algorithm_type'],
        'explanation': explanation
    }), 200


@recommendations_bp.route('/history', methods=['GET'])
@token_required
def get_recommendation_history():
    """Get history of recommendations shown to user"""
    user_id = g.current_user['id']
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(int(request.args.get('per_page', 20)), 100)
    
    offset = (page - 1) * per_page
    
    recommendations = execute_query(
        """SELECT r.*, i.title, i.item_type, i.genre, i.cover_image, i.avg_rating
           FROM recommendations r
           JOIN items i ON r.item_id = i.id
           WHERE r.user_id = %s
           ORDER BY r.created_at DESC
           LIMIT %s OFFSET %s""",
        (user_id, per_page, offset)
    )
    
    total = execute_query(
        "SELECT COUNT(*) as total FROM recommendations WHERE user_id = %s",
        (user_id,),
        fetch_one=True
    )['total']
    
    return jsonify({
        'recommendations': recommendations,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    }), 200


@recommendations_bp.route('/similar/<int:item_id>', methods=['GET'])
@token_required
def get_similar_items(item_id):
    """Get items similar to a specific item"""
    limit = min(int(request.args.get('limit', 10)), 30)
    
    engine = get_recommendation_engine()
    if engine:
        similar_items = engine.find_similar_items(item_id, limit)
    else:
        # Simple fallback: find items with same genre or type
        base = execute_query("SELECT genre, item_type FROM items WHERE id = %s", (item_id,), fetch_one=True)
        if base:
            genre = base.get('genre')
            itype = base.get('item_type')
            if genre:
                similar_rows = execute_query(
                    "SELECT id, title, cover_image FROM items WHERE genre = %s AND id != %s ORDER BY popularity_score DESC LIMIT %s",
                    (genre, item_id, limit)
                )
            else:
                similar_rows = execute_query(
                    "SELECT id, title, cover_image FROM items WHERE item_type = %s AND id != %s ORDER BY popularity_score DESC LIMIT %s",
                    (itype, item_id, limit)
                )
            similar_items = similar_rows
        else:
            similar_items = []
    
    return jsonify({
        'item_id': item_id,
        'similar_items': similar_items
    }), 200


@recommendations_bp.route('/cold-start', methods=['GET'])
def get_cold_start_recommendations():
    """Get recommendations for new users (popular items)"""
    item_type = request.args.get('type')
    limit = min(int(request.args.get('limit', 10)), current_app.config['COLD_START_POPULAR_LIMIT'])
    
    engine = get_recommendation_engine()
    if engine:
        recommendations = engine.cold_start_recommendations(item_type, limit)
    else:
        rows = execute_query(
            "SELECT id, title, description, cover_image, popularity_score FROM items" + (" WHERE item_type = %s" if item_type else "") + " ORDER BY popularity_score DESC LIMIT %s",
            (item_type, limit) if item_type else (limit,)
        )
        recommendations = [{ 'id': r['id'], 'title': r.get('title'), 'score': r.get('popularity_score', 0) } for r in rows]
    
    return jsonify({
        'recommendations': recommendations,
        'type': 'cold_start'
    }), 200


@recommendations_bp.route('/ethiopian', methods=['GET'])
@token_required
def get_ethiopian_recommendations():
    """Get Ethiopian content recommendations"""
    user_id = g.current_user['id']
    item_type = request.args.get('type')
    limit = min(int(request.args.get('limit', 20)), 50)
    
    engine = get_recommendation_engine()
    if engine:
        recommendations = engine.ethiopian_content_recommendations(user_id, item_type, limit)
    else:
        # Fallback: query items flagged as ethiopian
        q = "SELECT id, title, description, cover_image, popularity_score FROM items WHERE is_ethiopian = TRUE"
        params = []
        if item_type:
            q += " AND item_type = %s"
            params.append(item_type)
        q += " ORDER BY popularity_score DESC LIMIT %s"
        params.append(limit)
        rows = execute_query(q, tuple(params))
        recommendations = [{ 'id': r['id'], 'title': r.get('title'), 'score': r.get('popularity_score', 0) } for r in rows]
    
    return jsonify({
        'recommendations': recommendations,
        'count': len(recommendations)
    }), 200


@recommendations_bp.route('/feedback', methods=['POST'])
@token_required
def recommendation_feedback():
    """Provide feedback on a recommendation (helps improve future recommendations)"""
    user_id = g.current_user['id']
    data = request.get_json()
    
    item_id = data.get('item_id')
    feedback = data.get('feedback')  # 'helpful', 'not_helpful', 'already_seen'
    
    if not item_id or not feedback:
        return jsonify({'error': 'item_id and feedback are required'}), 400
    
    if feedback not in ['helpful', 'not_helpful', 'already_seen']:
        return jsonify({'error': 'Invalid feedback type'}), 400
    
    # Update recommendation record
    execute_query(
        """UPDATE recommendations 
           SET is_viewed = TRUE
           WHERE user_id = %s AND item_id = %s""",
        (user_id, item_id),
        fetch_all=False
    )
    
    # Log feedback for ML improvement
    execute_query(
        """INSERT INTO user_activity (user_id, activity_type, item_id, details)
           VALUES (%s, 'recommendation', %s, %s)""",
        (user_id, item_id, json.dumps({'feedback': feedback})),
        fetch_all=False
    )
    
    return jsonify({'message': 'Feedback recorded successfully'}), 200


def deduct_credits(user_id, amount, transaction_type, description):
    """Deduct credits from user account"""
    if amount <= 0:
        return
    
    user = execute_query(
        "SELECT credits FROM users WHERE id = %s",
        (user_id,),
        fetch_one=True
    )
    
    new_balance = user['credits'] - amount
    
    execute_query(
        "UPDATE users SET credits = %s WHERE id = %s",
        (new_balance, user_id),
        fetch_all=False
    )
    
    execute_query(
        """INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
           VALUES (%s, %s, %s, %s, %s)""",
        (user_id, -amount, transaction_type, description, new_balance),
        fetch_all=False
    )
