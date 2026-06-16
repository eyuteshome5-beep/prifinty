import sys
sys.path.insert(0, '.')

from app import create_app
app = create_app()

with app.app_context():
    from app.utils.database import execute_query
    
    users = execute_query('SELECT id, username, email FROM users')
    for u in users:
        pref = execute_query('SELECT * FROM preferences WHERE user_id=%s', (u['id'],), fetch_one=True)
        if pref:
            print(f"User [{u['id']}] {u['username']} ({u['email']}):")
            print(f"  preferred_genres: {pref.get('preferred_genres')}")
            print(f"  favorite_media_types: {pref.get('favorite_media_types')}")
            print(f"  favorite_countries: {pref.get('favorite_countries')}")
            print(f"  favorite_authors: {pref.get('favorite_authors')}")
            print(f"  favorite_artists: {pref.get('favorite_artists')}")
            print(f"  favorite_book_types: {pref.get('favorite_book_types')}")
            print(f"  favorite_music_genres: {pref.get('favorite_music_genres')}")
            print(f"  ethiopian_content_preference: {pref.get('ethiopian_content_preference')}")
        else:
            print(f"User [{u['id']}] {u['username']} ({u['email']}) has NO preferences.")
