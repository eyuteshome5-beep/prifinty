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
            tmdb_results = MediaAPIService._search_tmdb(query) or []
            youtube_results = MediaAPIService._search_youtube(query) or []
            
            seen_ids = set()
            combined = []
            for r in tmdb_results + youtube_results:
                ext_id = r.get('external_id')
                if ext_id and ext_id not in seen_ids:
                    seen_ids.add(ext_id)
                    combined.append(r)
            return combined
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
        if not api_key: return MediaAPIService._search_tvmaze(query)
        
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
                        'popularity': m.get('popularity', 0),
                        'streaming_links': [
                            {'provider': 'tmdb', 'url': f"https://www.themoviedb.org/movie/{m['id']}"}
                        ]
                    })
                return results
        except Exception as e:
            print(f"TMDB Search Error: {e}")
        return MediaAPIService._search_tvmaze(query)

    @staticmethod
    def _search_tvmaze(query):
        url = "https://api.tvmaze.com/search/shows"
        params = {"q": query}
        try:
            resp = requests.get(url, params=params, timeout=6)
            if resp.status_code == 200:
                results = []
                for item in resp.json()[:20]:
                    show = item.get('show', {})
                    if not show.get('image') or not show['image'].get('original'): continue
                    
                    desc = show.get('summary', 'No description available.') or 'No description available.'
                    desc = desc.replace('<p>', '').replace('</p>', '').replace('<b>', '').replace('</b>', '')
                    
                    results.append({
                        'external_id': f"tvmaze_{show['id']}",
                        'title': show.get('name'),
                        'description': desc,
                        'genre': show.get('genres', ['Movie'])[0] if show.get('genres') else 'Movie',
                        'item_type': 'movie',
                        'cover_image': show['image']['original'],
                        'release_year': show.get('premiered', '')[:4] if show.get('premiered') else '',
                        'creator': 'Network: ' + show['network']['name'] if show.get('network') else 'Unknown',
                        'popularity': int(show.get('weight', 0)),
                        'streaming_links': [{'provider': 'tvmaze', 'url': show.get('url')}]
                    })
                return results
        except Exception as e:
            print(f"TVmaze Search Error: {e}")
        return []

    @staticmethod
    def _search_youtube(query):
        import datetime
        import urllib.parse
        import re
        import json
        
        debug_log_path = r"C:\Users\user\.gemini\antigravity\scratch\youtube_debug.log"
        def log_debug(msg):
            try:
                with open(debug_log_path, "a", encoding="utf-8") as f:
                    f.write(f"[{datetime.datetime.now().isoformat()}] {msg}\n")
            except:
                pass
                
        api_key = MediaAPIService._get_config('YOUTUBE_API_KEY')
        
        # Try API first if Key is present and looks valid
        if api_key and not api_key.startswith('your_') and len(api_key) > 10:
            masked_key = f"{api_key[:8]}..."
            log_debug(f"Searching via YouTube API with query: '{query}'. Key: '{masked_key}'")
            url = "https://www.googleapis.com/youtube/v3/search"
            params = {
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": 20,
                "key": api_key
            }
            try:
                resp = requests.get(url, params=params, timeout=5)
                log_debug(f"YouTube API response status code: {resp.status_code}")
                if resp.status_code == 200:
                    results = []
                    for item in resp.json().get('items', []):
                        snippet = item.get('snippet', {})
                        video_id = item.get('id', {}).get('videoId')
                        if not video_id: continue
                        
                        # Thumbnails
                        thumbnails = snippet.get('thumbnails', {})
                        cover = (thumbnails.get('high', {}).get('url') or 
                                 thumbnails.get('medium', {}).get('url') or 
                                 thumbnails.get('default', {}).get('url') or '')
                        
                        release_year = snippet.get('publishedAt', '')[:4]
                        
                        results.append({
                            'external_id': f"youtube_{video_id}",
                            'title': snippet.get('title'),
                            'description': snippet.get('description', 'No description available.'),
                            'genre': 'Movie',
                            'item_type': 'movie',
                            'cover_image': cover,
                            'release_year': release_year,
                            'creator': snippet.get('channelTitle', 'Unknown Creator'),
                            'popularity': 70,
                            'streaming_links': [
                                {'provider': 'youtube', 'url': f"https://www.youtube.com/watch?v={video_id}"}
                            ]
                        })
                    log_debug(f"YouTube API successfully returned {len(results)} items.")
                    return results
                else:
                    log_debug(f"YouTube API Error (falling back to scrape): {resp.status_code} - {resp.text}")
            except Exception as e:
                log_debug(f"YouTube API Exception (falling back to scrape): {str(e)}")
        else:
            log_debug(f"YouTube API key missing or invalid. Key: '{api_key[:8] if api_key else 'None'}'")
            
        # Scrape fallback (No API key, or API key failed/quota exceeded)
        log_debug(f"Searching via YouTube Scraper with query: '{query}'")
        scrape_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(query)}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9"
        }
        try:
            resp = requests.get(scrape_url, headers=headers, timeout=6)
            log_debug(f"YouTube Scraper response status code: {resp.status_code}")
            if resp.status_code == 200:
                html = resp.text
                
                # Match ytInitialData
                pattern = r'var ytInitialData\s*=\s*({.*?});'
                match = re.search(pattern, html)
                if not match:
                    pattern = r'window\["ytInitialData"\]\s*=\s*({.*?});'
                    match = re.search(pattern, html)
                
                if match:
                    data = json.loads(match.group(1))
                    contents = []
                    try:
                        section_list = data['contents']['twoColumnSearchResultsRenderer']['primaryContents']['sectionListRenderer']['contents']
                        for section in section_list:
                            item_section = section.get('itemSectionRenderer', {})
                            for item in item_section.get('contents', []):
                                if 'videoRenderer' in item:
                                    contents.append(item['videoRenderer'])
                    except Exception as ex:
                        log_debug(f"JSON path navigation error: {ex}")
                    
                    results = []
                    for video in contents:
                        video_id = video.get('videoId')
                        if not video_id: continue
                        
                        # Title
                        title = ""
                        try:
                            title = video['title']['runs'][0]['text']
                        except:
                            try: title = video['title']['simpleText']
                            except: pass
                        
                        # Description
                        desc = "No description available."
                        try:
                            desc = "".join([r.get('text', '') for r in video.get('descriptionSnippet', {}).get('runs', [])])
                        except:
                            pass
                        
                        # Thumbnail
                        cover = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
                        
                        # Channel / Creator
                        creator = "Unknown Creator"
                        try:
                            creator = video['ownerText']['runs'][0]['text']
                        except:
                            try: creator = video['shortBylineText']['runs'][0]['text']
                            except: pass
                            
                        # Release Year
                        release_year = ""
                        try:
                            time_text = video['publishedTimeText']['simpleText']
                            current_year = datetime.datetime.now().year
                            match_year = re.search(r'(\d+)\s+year', time_text)
                            if match_year:
                                release_year = str(current_year - int(match_year.group(1)))
                            else:
                                if "month" in time_text or "week" in time_text or "day" in time_text or "hour" in time_text:
                                    release_year = str(current_year)
                        except:
                            pass
                        
                        results.append({
                            'external_id': f"youtube_{video_id}",
                            'title': title,
                            'description': desc,
                            'genre': 'Movie',
                            'item_type': 'movie',
                            'cover_image': cover,
                            'release_year': release_year,
                            'creator': creator,
                            'popularity': 75,
                            'streaming_links': [
                                {'provider': 'youtube', 'url': f"https://www.youtube.com/watch?v={video_id}"}
                            ]
                        })
                    log_debug(f"YouTube Scraper successfully parsed {len(results)} items.")
                    return results
                else:
                    log_debug("Could not find ytInitialData in YouTube response HTML.")
            else:
                log_debug(f"YouTube Scraper HTTP Error: {resp.status_code}")
        except Exception as e:
            log_debug(f"YouTube Scraper Exception: {str(e)}")
            
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
                    
                    links = []
                    if info.get('previewLink'):
                        links.append({'provider': 'google_books_preview', 'url': info.get('previewLink')})
                    if info.get('infoLink'):
                        links.append({'provider': 'google_books_info', 'url': info.get('infoLink')})

                    results.append({
                        'external_id': f"gb_{b['id']}",
                        'title': info.get('title'),
                        'description': info.get('description', 'No description available.'),
                        'genre': info.get('categories', ['Book'])[0],
                        'item_type': 'book',
                        'cover_image': info.get('imageLinks', {}).get('thumbnail'),
                        'release_year': info.get('publishedDate', '')[:4],
                        'creator': info.get('authors', ['Unknown Author'])[0],
                        'popularity': 60,
                        'streaming_links': links
                    })
                return results
        except Exception as e:
            print(f"Book Search Error: {e}")
        return MediaAPIService._search_openlibrary(query)

    @staticmethod
    def _search_openlibrary(query):
        url = "https://openlibrary.org/search.json"
        params = {"q": query, "limit": 20}
        try:
            resp = requests.get(url, params=params, timeout=6)
            if resp.status_code == 200:
                results = []
                for b in resp.json().get('docs', []):
                    if not b.get('cover_i'): continue
                    
                    creator = b.get('author_name', ['Unknown'])[0] if b.get('author_name') else 'Unknown'
                    
                    results.append({
                        'external_id': f"ol_{str(b.get('key', '')).replace('/', '_')}",
                        'title': b.get('title'),
                        'description': 'No description available.',
                        'genre': 'Book',
                        'item_type': 'book',
                        'cover_image': f"https://covers.openlibrary.org/b/id/{b['cover_i']}-L.jpg",
                        'release_year': str(b.get('first_publish_year', ''))[:4],
                        'creator': creator,
                        'popularity': 60,
                        'streaming_links': [{'provider': 'openlibrary', 'url': f"https://openlibrary.org{b.get('key', '')}"}]
                    })
                return results
        except Exception as e:
            print(f"OpenLibrary Search Error: {e}")
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
                    links = []
                    if t.get('url'):
                        links.append({'provider': 'lastfm', 'url': t.get('url')})

                    results.append({
                        'external_id': t.get('mbid') or f"lastfm_{urllib.parse.quote_plus(artist+'_'+title)}",
                        'title': title,
                        'creator': artist,
                        'album': '',
                        'genre': 'Music',
                        'item_type': 'music',
                        'cover_image': t.get('image', [{}])[-1].get('#text') if t.get('image') else '',
                        'release_year': '',
                        'popularity': 60,
                        'streaming_links': links,
                        'description': ''
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

                    links = []
                    if t.get('previewUrl'):
                        links.append({'provider': 'itunes_preview', 'url': t.get('previewUrl')})
                    if t.get('trackViewUrl'):
                        links.append({'provider': 'itunes_track', 'url': t.get('trackViewUrl')})
                    if t.get('artistViewUrl'):
                        links.append({'provider': 'itunes_artist', 'url': t.get('artistViewUrl')})

                    results.append({
                        'external_id': external_id,
                        'title': title,
                        'creator': artist,
                        'album': t.get('collectionName', ''),
                        'genre': t.get('primaryGenreName', 'Music'),
                        'item_type': 'music',
                        'cover_image': artwork,
                        'release_year': t.get('releaseDate', '')[:4] if t.get('releaseDate') else '',
                        'popularity': 60,
                        'streaming_links': links,
                        'description': t.get('longDescription') or t.get('shortDescription') or ''
                    })
                return results
        except Exception as e:
            print(f"iTunes Search Error: {e}")
        return []
