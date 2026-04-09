"""
Credits Routes - Credit Management System
"""
from flask import Blueprint, request, jsonify, g, current_app
from app.utils.database import execute_query
from app.utils.auth import token_required, admin_required

credits_bp = Blueprint('credits', __name__)


@credits_bp.route('/balance', methods=['GET'])
@token_required
def get_balance():
    """Get current credit balance"""
    user_id = g.current_user['id']
    
    user = execute_query(
        "SELECT credits FROM users WHERE id = %s",
        (user_id,),
        fetch_one=True
    )
    
    return jsonify({
        'credits': user['credits'],
        'costs': current_app.config['CREDIT_COSTS'],
        'rewards': current_app.config['CREDIT_REWARDS']
    }), 200


@credits_bp.route('/transactions', methods=['GET'])
@token_required
def get_transactions():
    """Get credit transaction history"""
    user_id = g.current_user['id']
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(int(request.args.get('per_page', 20)), 100)
    transaction_type = request.args.get('type')
    
    offset = (page - 1) * per_page
    
    query = """
        SELECT * FROM credit_transactions
        WHERE user_id = %s
    """
    params = [user_id]
    
    if transaction_type:
        query += " AND transaction_type = %s"
        params.append(transaction_type)
    
    query += f" ORDER BY created_at DESC LIMIT {per_page} OFFSET {offset}"
    
    transactions = execute_query(query, tuple(params))
    
    # Get total count
    count_query = "SELECT COUNT(*) as total FROM credit_transactions WHERE user_id = %s"
    count_params = [user_id]
    
    if transaction_type:
        count_query += " AND transaction_type = %s"
        count_params.append(transaction_type)
    
    total = execute_query(count_query, tuple(count_params), fetch_one=True)['total']
    
    return jsonify({
        'transactions': transactions,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    }), 200


@credits_bp.route('/summary', methods=['GET'])
@token_required
def get_summary():
    """Get credit usage summary"""
    user_id = g.current_user['id']
    
    # Get summary by transaction type
    summary = execute_query(
        """SELECT 
            transaction_type,
            COUNT(*) as count,
            SUM(amount) as total_amount
           FROM credit_transactions
           WHERE user_id = %s
           GROUP BY transaction_type""",
        (user_id,)
    )
    
    # Get recent activity
    recent = execute_query(
        """SELECT * FROM credit_transactions
           WHERE user_id = %s
           ORDER BY created_at DESC
           LIMIT 5""",
        (user_id,)
    )
    
    # Current balance
    user = execute_query(
        "SELECT credits FROM users WHERE id = %s",
        (user_id,),
        fetch_one=True
    )
    
    return jsonify({
        'current_balance': user['credits'],
        'summary': summary,
        'recent_transactions': recent
    }), 200


@credits_bp.route('/purchase', methods=['POST'])
@token_required
def purchase_credits():
    """Purchase credits (mock implementation)"""
    user_id = g.current_user['id']
    data = request.get_json()
    
    amount = data.get('amount', 0)
    
    if amount <= 0:
        return jsonify({'error': 'Invalid credit amount'}), 400
    
    # Credit packages (mock pricing)
    packages = {
        50: 4.99,
        100: 8.99,
        250: 19.99,
        500: 34.99,
        1000: 59.99
    }
    
    if amount not in packages:
        return jsonify({
            'error': 'Invalid package',
            'available_packages': packages
        }), 400
    
    # In production, this would integrate with a payment provider
    # For now, we just add credits
    
    user = execute_query(
        "SELECT credits FROM users WHERE id = %s",
        (user_id,),
        fetch_one=True
    )
    
    new_balance = user['credits'] + amount
    
    execute_query(
        "UPDATE users SET credits = %s WHERE id = %s",
        (new_balance, user_id),
        fetch_all=False
    )
    
    execute_query(
        """INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
           VALUES (%s, %s, 'purchase', %s, %s)""",
        (user_id, amount, f'Purchased {amount} credits for ${packages[amount]}', new_balance),
        fetch_all=False
    )
    
    return jsonify({
        'message': 'Credits purchased successfully',
        'amount': amount,
        'new_balance': new_balance,
        'price': packages[amount]
    }), 200


@credits_bp.route('/packages', methods=['GET'])
def get_packages():
    """Get available credit packages"""
    packages = [
        {'credits': 50, 'price': 4.99, 'popular': False},
        {'credits': 100, 'price': 8.99, 'popular': True},
        {'credits': 250, 'price': 19.99, 'popular': False},
        {'credits': 500, 'price': 34.99, 'popular': False},
        {'credits': 1000, 'price': 59.99, 'popular': False},
    ]
    
    return jsonify({'packages': packages}), 200


@credits_bp.route('/admin/grant', methods=['POST'])
@admin_required
def grant_credits():
    """Admin: Grant credits to a user"""
    data = request.get_json()
    
    user_id = data.get('user_id')
    amount = data.get('amount', 0)
    reason = data.get('reason', 'Admin grant')
    
    if not user_id or amount <= 0:
        return jsonify({'error': 'user_id and positive amount required'}), 400
    
    # Check if user exists
    user = execute_query(
        "SELECT id, credits FROM users WHERE id = %s",
        (user_id,),
        fetch_one=True
    )
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    new_balance = user['credits'] + amount
    
    execute_query(
        "UPDATE users SET credits = %s WHERE id = %s",
        (new_balance, user_id),
        fetch_all=False
    )
    
    execute_query(
        """INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
           VALUES (%s, %s, 'bonus', %s, %s)""",
        (user_id, amount, f'Admin grant: {reason}', new_balance),
        fetch_all=False
    )
    
    return jsonify({
        'message': 'Credits granted successfully',
        'user_id': user_id,
        'amount': amount,
        'new_balance': new_balance
    }), 200


@credits_bp.route('/admin/deduct', methods=['POST'])
@admin_required
def deduct_credits():
    """Admin: Deduct credits from a user"""
    data = request.get_json()
    
    user_id = data.get('user_id')
    amount = data.get('amount', 0)
    reason = data.get('reason', 'Admin deduction')
    
    if not user_id or amount <= 0:
        return jsonify({'error': 'user_id and positive amount required'}), 400
    
    # Check if user exists and has enough credits
    user = execute_query(
        "SELECT id, credits FROM users WHERE id = %s",
        (user_id,),
        fetch_one=True
    )
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user['credits'] < amount:
        return jsonify({'error': 'User does not have enough credits'}), 400
    
    new_balance = user['credits'] - amount
    
    execute_query(
        "UPDATE users SET credits = %s WHERE id = %s",
        (new_balance, user_id),
        fetch_all=False
    )
    
    execute_query(
        """INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after)
           VALUES (%s, %s, 'refund', %s, %s)""",
        (user_id, -amount, f'Admin deduction: {reason}', new_balance),
        fetch_all=False
    )
    
    return jsonify({
        'message': 'Credits deducted successfully',
        'user_id': user_id,
        'amount': amount,
        'new_balance': new_balance
    }), 200
