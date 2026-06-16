import sys
sys.path.insert(0, '.')

from app import create_app
app = create_app()

with app.app_context():
    from app.utils.database import execute_query
    
    for uid in [1, 2]:
        u = execute_query('SELECT * FROM users WHERE id=%s', (uid,), fetch_one=True)
        pref = execute_query('SELECT * FROM preferences WHERE user_id=%s', (uid,), fetch_one=True)
        if u:
            print(f"User [{uid}] {u['username']} ({u['email']}):")
            if pref:
                print(f"  preferred_genres: {pref.get('preferred_genres')}")
                print(f"  favorite_media_types: {pref.get('favorite_media_types')}")
                print(f"  favorite_countries: {pref.get('favorite_countries')}")
                print(f"  ethiopian_content_preference: {pref.get('ethiopian_content_preference')}")
            else:
                print("  NO PREFERENCES")
