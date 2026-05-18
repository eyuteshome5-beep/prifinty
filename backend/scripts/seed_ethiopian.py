"""Seed >100 Ethiopian items by querying external APIs and importing via admin endpoint.
Usage:
  ADMIN_TOKEN=your_admin_token python scripts/seed_ethiopian.py --count 120

This script now supports a safe `--dry-run` mode which simulates imports and
does not require an admin token. Use `--admin-token` to pass a token on the
command line or set the `ADMIN_TOKEN` environment variable.

The script intentionally keeps the dry-run path network-free so it can be
used without credentials during local checks.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import random
from typing import List

try:
    import requests
except Exception:
    requests = None

API_BASE = os.environ.get('API_BASE', 'http://127.0.0.1:5000/api')
ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN')

QUERIES = [
    'Tilahun Gessesse', 'Aster Aweke', 'Mahmoud Ahmed', 'Mulatu Astatke', 'Gigi', 'Teddy Afro',
    'Ethiopian traditional music', 'Ethiopian pop', 'Ethiopian jazz', 'Ethiopian folk music',
    'Ethiopian songs', 'Ethiopian singer', 'Ethiopian album', 'Ethiopian soundtrack',
    'Ethiopian instrumental', 'Ethiopian gospel', 'Ethiopian reggae', 'Ethiopian electronic',
    'Ethiopian brass band', 'Ethiopian cultural music', 'Ethiopian classical', 'Ethiopian opera',
    'Ethiopian lullaby', 'Ethiopian wedding music', 'Ethiopian praise songs', 'Ethiopian diaspora music'
]

HEADERS = {'Content-Type': 'application/json'}
if ADMIN_TOKEN:
    HEADERS['Authorization'] = f'Bearer {ADMIN_TOKEN}'


def discover_and_import(query: str, item_type: str = 'music', api_base: str | None = None,
                        headers: dict | None = None, dry_run: bool = False) -> List[str]:
    """Discover items for `query` and import them via admin API.

    Returns a list of created item ids (or simulated ids in dry-run).
    """
    if dry_run:
        # Simulate a small, realistic number of imports per query.
        count = random.randint(1, 4)
        simulated = [f"dry-{int(time.time()*1000)}-{i}" for i in range(count)]
        print(f"[dry-run] Would import {count} items for query: {query}")
        return simulated

    if requests is None:
        print('requests package not available; cannot perform network import.')
        return []

    base = api_base or API_BASE
    hdrs = headers or HEADERS
    try:
        r = requests.get(f"{base}/admin/import/search", params={'type': item_type, 'q': query}, timeout=10, headers=hdrs)
        if r.status_code != 200:
            print(f"search failed for '{query}': {r.status_code}")
            return []
        results = r.json().get('results', [])
        imported: List[str] = []
        for res in results:
            payload = dict(res)
            payload['item_type'] = item_type
            payload['is_ethiopian'] = True
            try:
                ir = requests.post(f"{base}/admin/import/add", json=payload, timeout=10, headers=hdrs)
                if ir.status_code in (200, 201):
                    imported.append(str(ir.json().get('item_id')))
                else:
                    print(f"import failed (status {ir.status_code}) for: {payload.get('title') or payload.get('name')}")
                time.sleep(0.2)
            except Exception as e:
                print(f"exception while importing: {e}")
                continue
        return imported
    except Exception as e:
        print(f"exception during discovery: {e}")
        return []


def main() -> None:
    parser = argparse.ArgumentParser(description='Seed Ethiopian items via admin import API')
    parser.add_argument('--count', type=int, default=120, help='Number of items to import')
    parser.add_argument('--dry-run', action='store_true', help='Simulate imports without calling the API')
    parser.add_argument('--admin-token', type=str, help='Admin token to use for import (overrides env)')
    parser.add_argument('--api-base', type=str, help='Override API base URL')
    args = parser.parse_args()

    global ADMIN_TOKEN, API_BASE, HEADERS
    if args.admin_token:
        ADMIN_TOKEN = args.admin_token
        HEADERS['Authorization'] = f'Bearer {ADMIN_TOKEN}'
    if args.api_base:
        API_BASE = args.api_base

    if not ADMIN_TOKEN and not args.dry_run:
        print('ADMIN_TOKEN is required unless running with --dry-run.')
        print('Set ADMIN_TOKEN or run with --dry-run to simulate imports.')
        print('Example: ADMIN_TOKEN=... python scripts/seed_ethiopian.py --count 120')
        sys.exit(1)

    target = args.count
    created = 0
    idx = 0
    max_iter = 2000
    while created < target and idx < max_iter:
        q = QUERIES[idx % len(QUERIES)] + (f" {idx//len(QUERIES)+1}" if idx // len(QUERIES) > 0 else '')
        print(f"Processing query ({idx+1}): {q}")
        items = discover_and_import(q, api_base=API_BASE, headers=HEADERS, dry_run=args.dry_run)
        created += len(items)
        print(f"Imported {len(items)} items (total {created}/{target})")
        idx += 1
        # Small pause to be polite to upstream APIs when not dry-run
        time.sleep(0.25 if not args.dry_run else 0.01)

    print(f"Seeding finished. Items imported (or simulated): {created}")


if __name__ == '__main__':
    main()
