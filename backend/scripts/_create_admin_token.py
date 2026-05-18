#!/usr/bin/env python3
import os
import json
import sys
from urllib import request, error

API_BASE = os.environ.get('API_BASE', 'http://127.0.0.1:5000/api')
email = 'admin@example.com'
new_password = '12121212'

headers = {'Content-Type': 'application/json'}

def post(path, payload):
    url = f"{API_BASE}{path}"
    data = json.dumps(payload).encode('utf-8')
    req = request.Request(url, data=data, headers=headers, method='POST')
    try:
        with request.urlopen(req, timeout=10) as resp:
            return resp.read().decode('utf-8'), resp.status
    except error.HTTPError as e:
        return e.read().decode('utf-8'), e.code
    except Exception as e:
        return str(e), None

# Reset admin password
print('Resetting admin password...')
res, status = post('/auth/reset-password', {'email': email, 'new_password': new_password})
print('Reset response status:', status)
print(res)

# Login to get token
print('Logging in to retrieve token...')
res2, status2 = post('/auth/login', {'email': email, 'password': new_password})
print('Login response status:', status2)
print(res2)

try:
    data = json.loads(res2)
    token = data.get('token')
    if token:
        print('\nADMIN_TOKEN=' + token)
        sys.exit(0)
    else:
        print('\nFailed to retrieve token')
        sys.exit(2)
except Exception as e:
    print('\nError parsing login response:', e)
    sys.exit(3)
