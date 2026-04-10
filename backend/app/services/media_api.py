import requests
import os
import base64
import json
from app.utils.database import execute_query

class MediaAPIService:
    """
    Unified service for Real-World Media API Integrations.
    Prioritizes API keys in database (site_settings), falls back to .env.
    """
    
    @staticmethod
    def _get_config(config_key):
        """Fetch config from DB, fallback to environment variable"""
        # 1. Try DB first
        try:
            from app.utils.database import execute_query
            result = execute_query(
                "SELECT config_value FROM site_settings WHERE config_key = %s",
                (config_key,),
                fetch_one=True
            )
            if result and result['config_value']:
                val = result['config_value'].strip()
                # If it's a real value (not a placeholder), use it
                if val and not val.startswith('your_') and not val.endswith('_here'):
                    print(f"DEBUG: Using {config_key} from Database")
                    return val
        except Exception as e:
            print(f"ERROR: DB config fetch failed for {config_key}: {e}")
        
        # 2. Fallback to env var
        env_val = os.getenv(config_key)
        if env_val:
            env_val = env_val.strip()
            if env_val and not env_val.startswith('your_') and not env_val.endswith('_here'):
                print(f"DEBUG: Using {config_key} from Environment")
                return env_val
        
        print(f"WARNING: {config_key} is not configured or still uses a placeholder")
        return None

    @staticmethod
    def search(item_type, query):
        if item_type == 'movie':
            return MediaAPIService._search_tmdb(query)
        elif item_type == 'music':
            return MediaAPIService._search_spotify(query)
        elif item_type == 'book':
            return MediaAPIService._search_google_books(query)
        return []

    # --- TMDB (Movies) ---
    @staticmethod
    def _search_tmdb(query):
        api_key = MediaAPIService._get_config('TMDB_API_KEY')
        if not api_key:
            print("ERROR: TMDB_API_KEY not configured")
            return []

        url = "https://api.themoviedb.org/3/search/movie"
        params = {
            'api_key': api_key,
            'query': query,
            'language': 'en-US',
            'include_adult': False
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                results = []
                for movie in data.get('results', []):
                    results.append({
                        'external_id': str(movie['id']),
                        'title': movie['title'],
                        'description': movie['overview'],
                        'genre': "Movie",
                        'item_type': 'movie',
                        'cover_image': f"https://image.tmdb.org/t/p/w500{movie['poster_path']}" if movie.get('poster_path') else None,
                        'release_year': movie['release_date'][:4] if movie.get('release_date') else None,
                        'popularity': movie.get('popularity', 0)
                    })
                return results
            return []
        except Exception as e:
            print(f"TMDB API Error: {e}")
            return []

    # --- Spotify (Music) ---
    @staticmethod
    def _search_spotify(query):
        client_id = MediaAPIService._get_config('SPOTIFY_CLIENT_ID')
        client_secret = MediaAPIService._get_config('SPOTIFY_CLIENT_SECRET')
        
        if not client_id or not client_secret:
            print("ERROR: Spotify credentials not configured")
            return []

        # Auth
        auth_string = f"{client_id}:{client_secret}"
        auth_base64 = base64.b64encode(auth_string.encode('utf-8')).decode('utf-8')
        auth_url = "https://accounts.spotify.com/api/token"
        try:
            auth_response = requests.post(
                auth_url, 
                headers={"Authorization": f"Basic {auth_base64}"},
                data={"grant_type": "client_credentials"},
                timeout=10
            )
            token = auth_response.json().get('access_token')
        except Exception as e:
            print(f"Spotify Auth Error: {e}")
            return []

        if not token: return []

        # Search
        search_url = "https://api.spotify.com/v1/search"
        params = {"q": query, "type": "track", "limit": 10}
        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            response = requests.get(search_url, headers=headers, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                results = []
                for track in data.get('tracks', {}).get('items', []):
                    results.append({
                        'external_id': track['id'],
                        'title': track['name'],
                        'creator': track['artists'][0]['name'],
                        'album': track['album']['name'],
                        'genre': "Music",
                        'item_type': 'music',
                        'cover_image': track['album']['images'][0]['url'] if track['album'].get('images') else None,
                        'release_year': track['album']['release_date'][:4] if track['album'].get('release_date') else None,
                        'popularity': track.get('popularity', 0)
                    })
                return results
            return []
        except Exception as e:
            print(f"Spotify API Error: {e}")
            return []

    # --- Google Books ---
    @staticmethod
    def get_trending(item_type):
        """Fetch trending items from external APIs"""
        if item_type == 'movie':
            return MediaAPIService._get_trending_movies()
        elif item_type == 'music':
            # Spotify doesn't have a direct 'trending' global API for search without specific chart IDs
            # We'll search for popular new hits as a proxy
            return MediaAPIService._search_spotify("popular hits 2024")
        elif item_type == 'book':
            # Search for bestsellers proxy
            return MediaAPIService._search_google_books("bestsellers 2024")
        return []

    # --- TMDB (Trending) ---
    @staticmethod
    def _get_trending_movies():
        api_key = MediaAPIService._get_config('TMDB_API_KEY')
        if not api_key: return []

        url = "https://api.themoviedb.org/3/trending/movie/week"
        params = {'api_key': api_key, 'language': 'en-US'}
        
        try:
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                results = []
                for movie in data.get('results', [])[:20]:
                    results.append({
                        'external_id': str(movie['id']),
                        'title': movie['title'],
                        'description': movie['overview'],
                        'genre': "Movie",
                        'item_type': 'movie',
                        'cover_image': f"https://image.tmdb.org/t/p/w500{movie['poster_path']}" if movie.get('poster_path') else None,
                        'release_year': movie['release_date'][:4] if movie.get('release_date') else None,
                        'popularity': movie.get('popularity', 0)
                    })
                return results
            return []
        except Exception:
            return []

    # --- TMDB (Details) ---
    @staticmethod
    def get_external_details(item_type, external_id):
        """Fetch full details for an item from its external source"""
        if item_type == 'movie':
            return MediaAPIService._get_tmdb_details(external_id)
        # Add others as needed
        return None

    @staticmethod
    def _get_tmdb_details(movie_id):
        api_key = MediaAPIService._get_config('TMDB_API_KEY')
        if not api_key: return None

        url = f"https://api.themoviedb.org/3/movie/{movie_id}"
        params = {
            'api_key': api_key, 
            'language': 'en-US',
            'append_to_response': 'credits'
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                movie = response.json()
                
                # Find director
                director = "Unknown"
                if 'credits' in movie:
                    for crew_member in movie['credits'].get('crew', []):
                        if crew_member.get('job') == 'Director':
                            director = crew_member.get('name')
                            break

                return {
                    'external_id': str(movie['id']),
                    'title': movie['title'],
                    'description': movie['overview'],
                    'genre': movie['genres'][0]['name'] if movie.get('genres') else 'Movie',
                    'item_type': 'movie',
                    'cover_image': f"https://image.tmdb.org/t/p/w500{movie['poster_path']}" if movie.get('poster_path') else None,
                    'release_year': movie['release_date'][:4] if movie.get('release_date') else None,
                    'popularity': movie.get('vote_average', 0) * 10,
                    'creator': director
                }
            return None
        except Exception:
            return None

    # --- Google Books (Search) ---
    @staticmethod
    def _search_google_books(query):
        api_key = MediaAPIService._get_config('GOOGLE_BOOKS_API_KEY')
        if not api_key:
            print("ERROR: GOOGLE_BOOKS_API_KEY not configured")
            return []

        url = "https://www.googleapis.com/books/v1/volumes"
        params = {
            'q': query,
            'key': api_key,
            'maxResults': 12
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                results = []
                for item in data.get('items', []):
                    volume_info = item.get('volumeInfo', {})
                    authors = volume_info.get('authors', ['Unknown Author'])
                    images = volume_info.get('imageLinks', {})
                    # Prefer high-res if available, fall back to max available
                    cover = images.get('thumbnail', images.get('smallThumbnail'))
                    
                    if cover and cover.startswith('http:'):
                        cover = cover.replace('http:', 'https:')

                    results.append({
                        'external_id': item.get('id'),
                        'title': volume_info.get('title', 'Unknown Title'),
                        'description': volume_info.get('description', ''),
                        'genre': volume_info.get('categories', ['Book'])[0],
                        'item_type': 'book',
                        'cover_image': cover,
                        'release_year': volume_info.get('publishedDate', '')[:4] if volume_info.get('publishedDate') else None,
                        'popularity': volume_info.get('averageRating', 0) * 20,
                        'creator': authors[0]
                    })
                return results
            return []
        except Exception as e:
            print(f"Google Books API Error: {e}")
            return []
