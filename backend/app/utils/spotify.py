import os
import requests
import base64
import time

# Cache the token so we don't request a new one for every search
_token_cache = {
    'token': None,
    'expires_at': 0
}

def get_spotify_token():
    """Get a Client Credentials token from Spotify"""
    client_id = os.environ.get('SPOTIFY_CLIENT_ID')
    client_secret = os.environ.get('SPOTIFY_CLIENT_SECRET')
    
    if not client_id or not client_secret:
        return None
        
    # Checking cache
    if _token_cache['token'] and time.time() < _token_cache['expires_at']:
        return _token_cache['token']
        
    auth_string = f"{client_id}:{client_secret}"
    auth_bytes = auth_string.encode('utf-8')
    auth_base64 = str(base64.b64encode(auth_bytes), 'utf-8')
    
    url = "https://accounts.spotify.com/api/token"
    headers = {
        "Authorization": "Basic " + auth_base64,
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}
    
    try:
        response = requests.post(url, headers=headers, data=data)
        response.raise_for_status()
        
        json_result = response.json()
        token = json_result.get("access_token")
        
        # Cache token for slightly less than its actual expiration (usually 3600 seconds)
        expires_in = json_result.get("expires_in", 3600)
        _token_cache['token'] = token
        _token_cache['expires_at'] = time.time() + expires_in - 60
        
        return token
    except Exception as e:
        print(f"Spotify authentication error: {e}")
        return None

def search_spotify_track(title, artist=""):
    """Search for a track on Spotify and return its ID"""
    token = get_spotify_token()
    if not token:
        return None
        
    url = "https://api.spotify.com/v1/search"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # Clean up the search query for better matches
    # Sometimes artist is "Various" or empty.
    query = f"track:{title}"
    if artist and artist.lower() != "various":
        query += f" artist:{artist}"
        
    params = {
        "q": query,
        "type": "track",
        "limit": 1
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        
        tracks = data.get('tracks', {}).get('items', [])
        if tracks:
            # Return the Spotify Track ID of the first result
            return tracks[0]['id']
            
        # If no result with artist, try just title as a fallback
        if artist and artist.lower() != "various":
            fallback_params = {"q": f"track:{title}", "type": "track", "limit": 1}
            fb_res = requests.get(url, headers=headers, params=fallback_params)
            fb_data = fb_res.json()
            fb_tracks = fb_data.get('tracks', {}).get('items', [])
            if fb_tracks:
                return fb_tracks[0]['id']
                
        return None
    except Exception as e:
        print(f"Spotify search error: {e}")
        return None
