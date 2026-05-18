# Setting up Last.fm API key for Prefinity

Prefinity uses Last.fm for music discovery when available. To enable richer music search results in production, add your Last.fm API key.

Options:

1) Add to `site_settings` table (recommended for shared deployments)

   INSERT INTO site_settings (config_key, config_value) VALUES ('LASTFM_API_KEY', '<your_key>');

   - The backend reads `site_settings` at runtime. After inserting, restart the backend process.

2) Use environment variables / host settings (Render, Heroku, etc.)

   - Set an environment variable `LASTFM_API_KEY` in your hosting provider and update startup code to write it into `site_settings` or modify `backend/app/services/media_api.py` to read `os.environ['LASTFM_API_KEY']`.

Notes:
- If the key is missing, the app falls back to the public iTunes search API automatically.
- After adding the key, re-run discovery searches or restart the app if necessary.

Troubleshooting:
- If search returns empty results after adding the key, confirm the key is valid and that the backend can reach `ws.audioscrobbler.com`.
- For Render/AWS, ensure the key is added to the service environment and redeploy so the process picks up the change.
