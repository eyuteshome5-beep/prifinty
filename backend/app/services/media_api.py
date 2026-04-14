import requests
import json
import urllib.parse
from flask import current_app
from app.utils.database import execute_query

class MediaAPIService:
    """STRICT MOVIE-ONLY Media API Service"""

    @staticmethod
    def _get_config(config_key):
        try:
            result = execute_query(
                "SELECT config_value FROM site_settings WHERE config_key = %s",
                (config_key,),
                fetch_one=True
            )
            val = result['config_value'] if result and result['config_value'] else None
            if val and not val.startswith('your_'):
                return val
            return None
        except:
            return None

    @staticmethod
    def search(item_type, query):
        if not query: return []
        
        if item_type == 'movie':
            return MediaAPIService._search_tmdb(query)
        elif item_type == 'book':
            return MediaAPIService._search_google_books(query)
        elif item_type == 'music':
            # Prefer Last.fm (requires API key); fallback to iTunes public API
            results = MediaAPIService._search_lastfm(query)
            if results:
                return results
            return MediaAPIService._search_itunes_api(query)
        return []

    @staticmethod
    def get_trending(item_type):
        if item_type == 'movie':
            return MediaAPIService._search_tmdb("trending")
        elif item_type == 'book':
            return MediaAPIService._search_google_books("subject:fiction|nonfiction")
        elif item_type == 'music':
            results = MediaAPIService._search_lastfm("2024 hits")
            if results:
                return results
            return MediaAPIService._search_itunes_api("2024 hits")
        return []

    @staticmethod
    def _search_tmdb(query):
        api_key = MediaAPIService._get_config('TMDB_API_KEY')
        if not api_key: return []
        
        url = "https://api.themoviedb.org/3/search/movie"
        params = {"api_key": api_key, "query": query, "language": "en-US"}
        
        try:
            resp = requests.get(url, params=params, timeout=5)
            if resp.status_code == 200:
                results = []
                for m in resp.json().get('results', [])[:20]:
                    if not m.get('poster_path'): continue
                    
                    results.append({
                        'external_id': f"tmdb_{m['id']}",
                        'title': m.get('title'),
                        'description': m.get('overview', 'No description available.'),
                        'genre': 'Movie',
                        'item_type': 'movie',
                        'cover_image': f"https://image.tmdb.org/t/p/w500{m['poster_path']}",
                        'release_year': m.get('release_date', '')[:4],
                        'creator': 'Director',
                        'popularity': m.get('popularity', 0)
                    })
                return results
        except Exception as e:
            print(f"TMDB Search Error: {e}")
        return []

    @staticmethod
    def _search_google_books(query):
        api_key = MediaAPIService._get_config('GOOGLE_BOOKS_API_KEY')
        url = "https://www.googleapis.com/books/v1/volumes"
        params = {"q": query, "maxResults": 40, "printType": "books", "orderBy": "relevance"}
        if api_key: params["key"] = api_key
        
        try:
            resp = requests.get(url, params=params, timeout=5)
            if resp.status_code == 200:
                results = []
                for b in resp.json().get('items', []):
                    info = b.get('volumeInfo', {})
                    if not info.get('imageLinks', {}).get('thumbnail'): continue
                    
                    results.append({
                        'external_id': f"gb_{b['id']}",
                        'title': info.get('title'),
                        'description': info.get('description', 'No description available.'),
                        'genre': info.get('categories', ['Book'])[0],
                        'item_type': 'book',
                        'cover_image': info.get('imageLinks', {}).get('thumbnail'),
                        'release_year': info.get('publishedDate', '')[:4],
                        'creator': info.get('authors', ['Unknown Author'])[0],
                        'popularity': 60
                    })
                return results
        except Exception as e:
            print(f"Book Search Error: {e}")
        return []

    @staticmethod
    def _search_lastfm(query):
        # Use Last.fm track.search for music results
        api_key = MediaAPIService._get_config('LASTFM_API_KEY')
        if not api_key:
            return []

        url = 'https://ws.audioscrobbler.com/2.0/'
        params = {"method": "track.search", "track": query, "api_key": api_key, "format": "json", "limit": 12}
        try:
            resp = requests.get(url, params=params, timeout=6)
            if resp.status_code == 200:
                results = []
                tracks = resp.json().get('results', {}).get('trackmatches', {}).get('track', [])
                # Normalize single object to list
                if isinstance(tracks, dict):
                    tracks = [tracks]
                for t in tracks:
                    title = t.get('name')
                    artist = t.get('artist')
                    results.append({
                        'external_id': t.get('mbid') or f"lastfm_{urllib.parse.quote_plus(artist+'_'+title)}",
                        'title': title,
                        'creator': artist,
                        'album': '',
                        'genre': 'Music',
                        'item_type': 'music',
                        'cover_image': t.get('image', [{}])[-1].get('#text') if t.get('image') else '',
                        'release_year': '',
                        'popularity': 60
                    })
                return results
        except Exception as e:
            print(f"Last.fm Search Error: {e}")
        return []

    @staticmethod
    def _search_itunes_api(query):
        # Public iTunes Search API fallback (no API key required)
        if not query: return []

        url = 'https://itunes.apple.com/search'
        params = {"term": query, "media": "music", "limit": 12}
        try:
            resp = requests.get(url, params=params, timeout=6)
            if resp.status_code == 200:
                results = []
                for t in resp.json().get('results', []):
                    if not t.get('trackName') or not t.get('artistName'): continue
                    title = t.get('trackName')
                    artist = t.get('artistName')
                    track_id = t.get('trackId')
                    external_id = f"itunes_{track_id}" if track_id else f"itunes_{urllib.parse.quote_plus(artist+'_'+title)}"
                    artwork = t.get('artworkUrl100') or ''
                    # Try to provide a larger image when possible
                    if artwork:
                        artwork = artwork.replace('100x100bb', '500x500bb')

                    results.append({
                        'external_id': external_id,
                        'title': title,
                        'creator': artist,
                        'album': t.get('collectionName', ''),
                        'genre': t.get('primaryGenreName', 'Music'),
                        'item_type': 'music',
                        'cover_image': artwork,
                        'release_year': t.get('releaseDate', '')[:4] if t.get('releaseDate') else '',
                        'popularity': 60
                    })
                return results
        except Exception as e:
            print(f"iTunes Search Error: {e}")
        return []
