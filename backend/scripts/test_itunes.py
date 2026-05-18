import sys, os, json
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.abspath(os.path.join(script_dir, '..')))

try:
    from app.services.media_api import MediaAPIService
    res = MediaAPIService._search_itunes_api('Ethiopian')
    print(json.dumps(res[:8], ensure_ascii=False))
except Exception as e:
    print('ERROR:', e)
