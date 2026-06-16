import sys
sys.path.insert(0, '.')

from app import create_app
app = create_app()

with app.app_context():
    from app.utils.database import execute_query
    
    # Check all Ethiopian items
    items = execute_query('SELECT id, title, item_type, cover_image, genre FROM items WHERE is_ethiopian=1')
    print(f"Total Ethiopian items: {len(items)}")
    for i in items[:15]:
        print(f"  [{i['id']:3}] {i['item_type']:5} | {str(i['title'])[:30]:30} | {i['cover_image']}")
