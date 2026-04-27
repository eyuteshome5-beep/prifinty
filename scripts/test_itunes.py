import sys, json
sys.path.append('backend')

try:
    from app.services.media_api import MediaAPIService
    res = MediaAPIService._search_itunes_api('Ethiopian')
    print(json.dumps(res[:8], ensure_ascii=False))
except Exception as e:
    print('ERROR:', e)
