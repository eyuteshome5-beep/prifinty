import requests, time, sys
urls = [
    'https://prifinity-alpha.vercel.app',
    'https://prifinity-alpha.vercel.app/item/19',
    'https://prifinity-alpha.vercel.app/robots.txt',
    'https://prifinity-alpha.vercel.app/sitemap.xml'
]
print('Starting polling of frontend endpoints (max 5 minutes, 15s interval)')
results = {}
for i in range(20):
    results = {}
    for u in urls:
        try:
            r = requests.head(u, timeout=10, allow_redirects=True)
            code = r.status_code
            if code == 405 or code == 0:
                r = requests.get(u, timeout=10)
                code = r.status_code
        except Exception as e:
            code = f'ERR:{type(e).__name__}'
        results[u] = code
    print(f'Attempt {i+1}:', results)
    if results.get('https://prifinity-alpha.vercel.app/robots.txt') == 200 and results.get('https://prifinity-alpha.vercel.app/sitemap.xml') == 200:
        print('SEO files are live now')
        sys.exit(0)
    time.sleep(15)
print('Timeout reached. Final statuses:')
print(results)
sys.exit(1)
