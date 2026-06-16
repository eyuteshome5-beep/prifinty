"""
AI Recommendation Engine
Implements Collaborative Filtering, Content-Based Filtering, and Hybrid approaches
"""
import time
from collections import defaultdict
from app.utils.database import execute_query
from flask import current_app


class RecommendationEngine:
    """
    Multi-algorithm recommendation engine supporting:
    - Collaborative Filtering (User-User similarity)
    - Content-Based Filtering (TF-IDF on genres/descriptions)
    - Hybrid System (Combines both approaches)
    - Cross-Domain Recommendations
    - Ethiopian Content Boosting
    """
    
    # Class-level cache to O(1) persist TF-IDF objects across requests
    _tfidf_cache = None
    
    def __init__(self):
        self.ethiopian_boost_factor = 1.3  # 30% boost for Ethiopian content
    
    def collaborative_filtering(self, user_id, item_type=None, limit=20):
        """
        User-User Collaborative Filtering with Popularity Fallback
        """
        # Limit the number of rating rows pulled into memory to avoid large RAM/CPU usage
        max_ratings = current_app.config.get('RECOMMENDATION_MAX_RATINGS', 5000)
        ratings_query = """
            SELECT r.user_id, r.item_id, r.rating, i.item_type
            FROM ratings r
            JOIN items i ON r.item_id = i.id
        """
        params = []
        if item_type:
            ratings_query += " WHERE i.item_type = %s"
            params.append(item_type)

        ratings_query += " ORDER BY r.created_at DESC LIMIT %s"
        params.append(max_ratings)

        all_ratings = execute_query(ratings_query, tuple(params))
        
        if not all_ratings or len(set(r['user_id'] for r in all_ratings)) < 2:
            return self.cold_start_recommendations(item_type, limit, user_id)
        
        # Build user-item rating matrix from the recent sample
        users = list({r['user_id'] for r in all_ratings})
        items = list({r['item_id'] for r in all_ratings})
        
        if user_id not in users:
            return self.cold_start_recommendations(item_type, limit, user_id)
        
        user_idx = {u: i for i, u in enumerate(users)}
        item_idx = {it: i for i, it in enumerate(items)}
        
        try:
            import numpy as np
            from sklearn.metrics.pairwise import cosine_similarity

            matrix = np.zeros((len(users), len(items)))
            for r in all_ratings:
                matrix[user_idx[r['user_id']], item_idx[r['item_id']]] = r['rating']

            user_similarity = cosine_similarity(matrix)
        except Exception:
            # Fallback to cold start if numeric or ML libs unavailable or error occurs
            return self.cold_start_recommendations(item_type, limit, user_id)
        target_idx = user_idx[user_id]
        
        # Get similar users (excluding self)
        similar_score_indices = np.argsort(user_similarity[target_idx])[::-1]
        similar_users = [idx for idx in similar_score_indices if idx != target_idx][:10]
        
        user_rated = set(r['item_id'] for r in all_ratings if r['user_id'] == user_id)
        
        item_scores = defaultdict(float)
        for sim_idx in similar_users:
            similarity = user_similarity[target_idx, sim_idx]
            if similarity > 0:
                for r in all_ratings:
                    if r['user_id'] == users[sim_idx] and r['item_id'] not in user_rated:
                        item_scores[r['item_id']] += similarity * r['rating']
        
        recommended_ids = sorted(item_scores.keys(), key=lambda x: item_scores[x], reverse=True)[:limit]
        
        if not recommended_ids:
            return self.cold_start_recommendations(item_type, limit, user_id)
        
        return self._fetch_items_with_scores(recommended_ids, item_scores, 'collaborative')
    
    def content_based_filtering(self, user_id, item_type=None, limit=20):
        """
        Content-Based Filtering with expanded search
        """
        user_ratings = execute_query(
            """SELECT i.id, i.genre, i.description, r.rating
               FROM ratings r
               JOIN items i ON r.item_id = i.id
               WHERE r.user_id = %s AND r.rating >= 3
               ORDER BY r.rating DESC""",
            (user_id,)
        )
        
        if not user_ratings:
            return self.cold_start_recommendations(item_type, limit, user_id)
        
        items_query = "SELECT id, title, genre, description, item_type, is_ethiopian, avg_rating FROM items"
        items_params = []
        if item_type:
            items_query += " WHERE item_type = %s"
            items_params.append(item_type)
        
        all_items = execute_query(items_query, tuple(items_params) if items_params else None)
        if len(all_items) < 2:
            return self.cold_start_recommendations(item_type, limit, user_id)
        
        liked_ids = set(r['id'] for r in user_ratings)
        
        try:
            def create_features(item):
                return f"{item.get('genre', 'Other')} {item.get('description', '')[:200]}"

            all_features = [create_features(item) for item in all_items]
            # Lazy import sklearn to reduce cold-start overhead
            import numpy as np
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity

            now = time.time()
            cached = RecommendationEngine._tfidf_cache
            
            # If TF-IDF cache is valid (less than 10 minutes old) and has same number of items
            if cached and (now - cached['timestamp'] < 600) and (len(cached['items']) == len(all_items)):
                vectorizer = cached['vectorizer']
                tfidf_matrix = cached['matrix']
                item_id_to_idx = cached['item_id_to_idx']
            else:
                vectorizer = TfidfVectorizer(stop_words='english', max_features=500)
                tfidf_matrix = vectorizer.fit_transform(all_features)
                item_id_to_idx = {item['id']: idx for idx, item in enumerate(all_items)}
                
                # Persist in O(1) class-level cache
                RecommendationEngine._tfidf_cache = {
                    'matrix': tfidf_matrix,
                    'vectorizer': vectorizer,
                    'item_id_to_idx': item_id_to_idx,
                    'items': all_items,
                    'timestamp': now
                }
            
            liked_indices = [item_id_to_idx[id] for id in liked_ids if id in item_id_to_idx]
            
            if not liked_indices:
                return self.cold_start_recommendations(item_type, limit, user_id)
                
            user_profile = np.asarray(tfidf_matrix[liked_indices].mean(axis=0)).flatten()
            similarities = cosine_similarity([user_profile], tfidf_matrix)[0]
            
            item_scores = {all_items[idx]['id']: similarities[idx] for idx in range(len(all_items)) if all_items[idx]['id'] not in liked_ids}
            recommended_ids = sorted(item_scores.keys(), key=lambda x: item_scores[x], reverse=True)[:limit]
            
            if not recommended_ids:
                return self.cold_start_recommendations(item_type, limit, user_id)
            return self._fetch_items_with_scores(recommended_ids, item_scores, 'content_based')
        except Exception as e:
            print(f"CONTENT FILTERING EXCEPTION: {e}")
            return self.cold_start_recommendations(item_type, limit, user_id)

    def hybrid_recommendations(self, user_id, item_type=None, limit=20, ethiopian_boost=False):
        """
        Hybrid approach with Guarantee of Results
        """
        collab_recs = self.collaborative_filtering(user_id, item_type, limit)
        content_recs = self.content_based_filtering(user_id, item_type, limit)
        
        combined_scores = {}
        for rec in collab_recs: combined_scores[rec['id']] = rec['score'] * 0.5
        for rec in content_recs:
            if rec['id'] in combined_scores: combined_scores[rec['id']] += rec['score'] * 0.5
            else: combined_scores[rec['id']] = rec['score'] * 0.5
        
        # Ethiopian boost
        if ethiopian_boost:
            for item_id in combined_scores:
                # Optimized: We already have the items in the recs lists
                is_eth = any(r['id'] == item_id and r.get('is_ethiopian') for r in collab_recs + content_recs)
                if is_eth: combined_scores[item_id] *= self.ethiopian_boost_factor
        
        sorted_ids = sorted(combined_scores.keys(), key=lambda x: combined_scores[x], reverse=True)[:limit]
        
        # FINAL GUARANTEE: If empty or too short, fill with popular items the user hasn't rated
        if len(sorted_ids) < limit:
            extras = self.cold_start_recommendations(item_type, limit, user_id)
            user_rated = set(r['item_id'] for r in execute_query("SELECT item_id FROM ratings WHERE user_id=%s", (user_id,)))
            for ex in extras:
                if ex['id'] not in combined_scores and ex['id'] not in user_rated:
                    combined_scores[ex['id']] = 0.1 # Low priority
                    sorted_ids.append(ex['id'])
                    if len(sorted_ids) >= limit: break

        return self._fetch_items_with_scores(sorted_ids[:limit], combined_scores, 'hybrid')
    
    def cross_domain_recommendations(self, user_id, limit=20):
        """
        Cross-domain recommendations
        If user likes romance books, recommend romance movies, etc.
        """
        # Get user's genre preferences by item type
        genre_prefs = execute_query(
            """SELECT i.genre, i.item_type, AVG(r.rating) as avg_rating, COUNT(*) as count
               FROM ratings r
               JOIN items i ON r.item_id = i.id
               WHERE r.user_id = %s
               GROUP BY i.genre, i.item_type
               HAVING AVG(r.rating) >= 4
               ORDER BY avg_rating DESC""",
            (user_id,)
        )
        
        if not genre_prefs:
            return self.cold_start_recommendations(None, limit, user_id)
        
        # Find cross-domain matches
        recommendations = []
        user_item_types = set(p['item_type'] for p in genre_prefs)
        all_types = {'book', 'movie', 'music'}
        other_types = all_types - user_item_types
        
        for pref in genre_prefs[:5]:  # Top 5 genre preferences
            genre = pref['genre']
            
            # Find items in other domains with same genre
            for other_type in other_types:
                cross_items = execute_query(
                    """SELECT i.*, 
                           CASE 
                               WHEN i.item_type = 'book' THEN b.author
                               WHEN i.item_type = 'movie' THEN m.director
                               WHEN i.item_type = 'music' THEN mu.artist
                           END as creator
                       FROM items i
                       LEFT JOIN books b ON i.id = b.item_id
                       LEFT JOIN movies m ON i.id = m.item_id
                       LEFT JOIN music mu ON i.id = mu.item_id
                       WHERE i.genre LIKE %s AND i.item_type = %s
                       ORDER BY i.avg_rating DESC
                       LIMIT 5""",
                    (f'%{genre}%', other_type)
                )
                
                for item in cross_items:
                    item['score'] = pref['avg_rating'] * 0.8  # Slight penalty for cross-domain
                    item['explanation'] = f"Because you enjoyed {genre} {pref['item_type']}s"
                    recommendations.append(item)
        
        # Remove duplicates and sort
        seen = set()
        unique_recs = []
        for rec in recommendations:
            if rec['id'] not in seen:
                seen.add(rec['id'])
                unique_recs.append(rec)
        
        unique_recs.sort(key=lambda x: x['score'], reverse=True)
        return unique_recs[:limit]
    
    def ethiopian_content_recommendations(self, user_id, item_type=None, limit=20):
        """
        Recommendations focused on Ethiopian content
        """
        # Get Ethiopian items
        query = """
            SELECT i.*, e.amharic_title, e.cultural_significance,
                   CASE 
                       WHEN i.item_type = 'book' THEN b.author
                       WHEN i.item_type = 'movie' THEN m.director
                       WHEN i.item_type = 'music' THEN mu.artist
                   END as creator
            FROM items i
            LEFT JOIN ethiopian_content_metadata e ON i.id = e.item_id
            LEFT JOIN books b ON i.id = b.item_id
            LEFT JOIN movies m ON i.id = m.item_id
            LEFT JOIN music mu ON i.id = mu.item_id
            WHERE i.is_ethiopian = TRUE
        """
        params = []
        
        if item_type:
            query += " AND i.item_type = %s"
            params.append(item_type)
        
        # Exclude already rated items
        query += """ AND i.id NOT IN (
            SELECT item_id FROM ratings WHERE user_id = %s
        )"""
        params.append(user_id)
        
        query += " ORDER BY i.popularity_score DESC, i.avg_rating DESC LIMIT %s"
        params.append(limit)
        
        items = execute_query(query, tuple(params))
        
        for item in items:
            item['score'] = item['popularity_score'] / 100
            item['explanation'] = 'Featured Ethiopian content'
        
        return items
    
    def cold_start_recommendations(self, item_type=None, limit=10, user_id=None):
        """
        Recommendations for new users or when other algorithms fail
        Returns popular and highly rated items (excludes user-rated items if user_id is provided)
        """
        query = """
            SELECT i.*, 
                   CASE 
                       WHEN i.item_type = 'book' THEN b.author
                       WHEN i.item_type = 'movie' THEN m.director
                       WHEN i.item_type = 'music' THEN mu.artist
                   END as creator
            FROM items i
            LEFT JOIN books b ON i.id = b.item_id
            LEFT JOIN movies m ON i.id = m.item_id
            LEFT JOIN music mu ON i.id = mu.item_id
            WHERE 1=1
        """
        params = []
        
        if item_type:
            query += " AND i.item_type = %s"
            params.append(item_type)
        elif user_id:
            # If no specific type is requested but we have a user_id, restrict to their preferred media types
            prefs = execute_query("SELECT favorite_media_types FROM preferences WHERE user_id = %s", (user_id,), fetch_one=True)
            if prefs:
                try:
                    import json
                    media_types = json.loads(prefs.get('favorite_media_types') or '[]')
                    if media_types:
                        placeholders = ','.join(['%s'] * len(media_types))
                        query += f" AND i.item_type IN ({placeholders})"
                        params.extend(media_types)
                except Exception:
                    pass
            
        if user_id:
            query += " AND i.id NOT IN (SELECT item_id FROM ratings WHERE user_id = %s)"
            params.append(user_id)
        
        query += f" ORDER BY i.popularity_score DESC, i.avg_rating DESC LIMIT {limit}"
        
        items = execute_query(query, tuple(params))
        
        for item in items:
            pop = item.get('popularity_score') or 0
            avg = item.get('avg_rating') or 0
            item['score'] = (pop + avg * 20) / 120
            item['explanation'] = 'Popular and highly rated'
        
        return items

    def fast_personalized_recommendations(self, user_id, item_type=None, limit=10):
        """
        Lightweight SQL-based personalized recommendations that use user's top-rated genres.
        This is a fast fallback that does not require heavy ML libraries and works well
        when scikit-learn / numpy are unavailable or the heavy engine is slow.
        """
        # Determine user's top genres by average rating weighted by count
        genre_stats = execute_query(
            """SELECT i.genre, AVG(r.rating) as avg_rating, COUNT(*) as cnt
               FROM ratings r
               JOIN items i ON r.item_id = i.id
               WHERE r.user_id = %s
               GROUP BY i.genre
               HAVING COUNT(*) >= 1
               ORDER BY avg_rating DESC, cnt DESC
               LIMIT 5""",
            (user_id,)
        )

        if not genre_stats:
            return []

        # Build prioritized list of genres
        top_genres = [g['genre'] for g in genre_stats if g.get('genre')]

        # Exclude items the user already rated
        rated_rows = execute_query("SELECT item_id FROM ratings WHERE user_id = %s", (user_id,)) or []
        rated_ids = {r['item_id'] for r in rated_rows}

        recommendations = []
        for genre in top_genres:
            params = [f'%{genre}%']
            query = """SELECT i.*, 
                       CASE WHEN i.item_type = 'book' THEN b.author
                            WHEN i.item_type = 'movie' THEN m.director
                            WHEN i.item_type = 'music' THEN mu.artist END as creator
                       FROM items i
                       LEFT JOIN books b ON i.id = b.item_id
                       LEFT JOIN movies m ON i.id = m.item_id
                       LEFT JOIN music mu ON i.id = mu.item_id
                       WHERE i.genre LIKE %s
                       """
            if item_type:
                query += " AND i.item_type = %s"
                params.append(item_type)

            query += " ORDER BY i.avg_rating DESC, i.popularity_score DESC LIMIT %s"
            params.append(limit)

            rows = execute_query(query, tuple(params)) or []
            for r in rows:
                if r['id'] in rated_ids:
                    continue
                r['score'] = (r.get('avg_rating') or 0) / 5.0 + (r.get('popularity_score') or 0) / 200.0
                r['explanation'] = f"Because you liked {genre} content"
                recommendations.append(r)
                if len(recommendations) >= limit:
                    break
            if len(recommendations) >= limit:
                break

        # Remove duplicates and sort by computed score
        seen = set()
        unique = []
        for rec in recommendations:
            if rec['id'] in seen:
                continue
            seen.add(rec['id'])
            unique.append(rec)

        unique.sort(key=lambda x: x.get('score', 0), reverse=True)
        return unique[:limit]

    def _sync_external_items(self, item_type, search_query):
        """
        Queries external API via MediaAPIService and syncs matching items to DB on the fly.
        """
        try:
            from app.services.media_api import MediaAPIService
            results = MediaAPIService.search(item_type, search_query)
            if not results:
                return
            
            for data in results:
                ext_id = data.get('external_id')
                if not ext_id:
                    continue
                # Check if exists
                item = execute_query("SELECT id FROM items WHERE external_id = %s", (ext_id,), fetch_one=True)
                if item:
                    continue # Already synced
                
                # Insert item
                item_id = execute_query(
                    """INSERT INTO items (title, description, genre, item_type, cover_image, popularity_score, external_id)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (data['title'], data.get('description', ''), data.get('genre', 'Other'), 
                     item_type, data.get('cover_image'), data.get('popularity', 0), ext_id),
                    fetch_all=False
                )
                
                year = None
                if data.get('release_year'):
                    try: year = int(str(data['release_year'])[:4])
                    except: pass
                
                # Type-specific insertion
                if item_type == 'movie':
                    execute_query(
                        "INSERT INTO movies (item_id, director, release_year) VALUES (%s, %s, %s)",
                        (item_id, data.get('creator', 'Director'), year),
                        fetch_all=False
                    )
                elif item_type == 'book':
                    execute_query(
                        "INSERT INTO books (item_id, author, publication_year) VALUES (%s, %s, %s)",
                        (item_id, data.get('creator', 'Author'), year),
                        fetch_all=False
                    )
                elif item_type == 'music':
                    execute_query(
                        "INSERT INTO music (item_id, artist, ethiopian_genre) VALUES (%s, %s, 'Other')",
                        (item_id, data.get('creator', 'Artist')),
                        fetch_all=False
                    )
        except Exception as e:
            print(f"Error syncing external items for {item_type} search '{search_query}': {e}")
    
    def survey_based_recommendations(self, user_id, item_type=None, limit=20):
        """
        Complex cold-start recommendations generated strictly from the mandatory
        onboarding survey preferences, perfectly separated by media type.
        """
        import json
        
        # Get complex preferences
        prefs = execute_query("SELECT * FROM preferences WHERE user_id = %s", (user_id,), fetch_one=True)
        if not prefs:
            return self.cold_start_recommendations(item_type, limit, user_id)
            
        try: movie_genres = json.loads(prefs.get('preferred_genres') or '[]')
        except: movie_genres = []
            
        try: media_types = json.loads(prefs.get('favorite_media_types') or '[]')
        except: media_types = []
            
        try: movie_countries = json.loads(prefs.get('favorite_countries') or '[]')
        except: movie_countries = []
            
        try: book_authors = json.loads(prefs.get('favorite_authors') or '[]')
        except: book_authors = []
            
        try: music_artists = json.loads(prefs.get('favorite_artists') or '[]')
        except: music_artists = []

        try: book_types = json.loads(prefs.get('favorite_book_types') or '[]')
        except: book_types = []
        
        try: music_decades = json.loads(prefs.get('favorite_decades') or '[]')
        except: music_decades = []
        
        try: music_genres = json.loads(prefs.get('favorite_music_genres') or '[]')
        except: music_genres = []
            
        # Dynamically fetch from external API and sync to database if local count is low
        # 1. Sync Movies
        if 'movie' in media_types or not media_types or item_type == 'movie':
            for g in movie_genres:
                try:
                    cnt = execute_query("SELECT COUNT(*) as c FROM items WHERE item_type='movie' AND genre LIKE %s", (f"%{g}%",), fetch_one=True)
                    if not cnt or cnt['c'] < 3:
                        self._sync_external_items('movie', g)
                except Exception:
                    pass
                    
        # 2. Sync Books
        if 'book' in media_types or not media_types or item_type == 'book':
            for bt in book_types:
                try:
                    cnt = execute_query("SELECT COUNT(*) as c FROM items WHERE item_type='book' AND genre LIKE %s", (f"%{bt}%",), fetch_one=True)
                    if not cnt or cnt['c'] < 3:
                        self._sync_external_items('book', bt)
                except Exception:
                    pass
            for author in book_authors:
                try:
                    cnt = execute_query("SELECT COUNT(*) as c FROM books WHERE author LIKE %s", (f"%{author}%",), fetch_one=True)
                    if not cnt or cnt['c'] < 3:
                        self._sync_external_items('book', author)
                except Exception:
                    pass
                    
        # 3. Sync Music
        if 'music' in media_types or not media_types or item_type == 'music':
            for mg in music_genres:
                try:
                    cnt = execute_query("SELECT COUNT(*) as c FROM items WHERE item_type='music' AND genre LIKE %s", (f"%{mg}%",), fetch_one=True)
                    if not cnt or cnt['c'] < 3:
                        self._sync_external_items('music', mg)
                except Exception:
                    pass
            for artist in music_artists:
                try:
                    cnt = execute_query("SELECT COUNT(*) as c FROM music WHERE artist LIKE %s", (f"%{artist}%",), fetch_one=True)
                    if not cnt or cnt['c'] < 3:
                        self._sync_external_items('music', artist)
                except Exception:
                    pass
            
        eth_pref = bool(prefs.get('ethiopian_content_preference', False))
        
        query = """SELECT i.*, 
                   CASE WHEN i.item_type = 'book' THEN b.author
                        WHEN i.item_type = 'movie' THEN m.director
                        WHEN i.item_type = 'music' THEN mu.artist END as creator
                   FROM items i
                   LEFT JOIN books b ON i.id = b.item_id
                   LEFT JOIN movies m ON i.id = m.item_id
                   LEFT JOIN music mu ON i.id = mu.item_id
                   WHERE 1=1"""
        
        params = []
        
        # Filter by media type
        if item_type:
            query += " AND i.item_type = %s"
            params.append(item_type)
        elif media_types:
            placeholders = ','.join(['%s'] * len(media_types))
            query += f" AND i.item_type IN ({placeholders})"
            params.extend(media_types)
            
        # PERFECT SEPARATION: Match conditions ONLY for their respective media types
        
        media_conditions = []
        
        # 1. Movie Conditions
        if 'movie' in media_types or not media_types or item_type == 'movie':
            m_conds = []
            if movie_genres:
                g_conds = []
                for g in movie_genres:
                    g_conds.append("i.genre LIKE %s")
                    params.append(f"%{g}%")
                m_conds.append("(" + " OR ".join(g_conds) + ")")
            if movie_countries:
                c_conds = []
                for c in movie_countries:
                    c_conds.append("m.country LIKE %s")
                    params.append(f"%{c}%")
                m_conds.append("(" + " OR ".join(c_conds) + ")")
                
            if m_conds:
                media_conditions.append("(i.item_type = 'movie' AND " + " AND ".join(m_conds) + ")")
            else:
                media_conditions.append("(i.item_type = 'movie')")
                
        # 2. Book Conditions
        if 'book' in media_types or not media_types or item_type == 'book':
            b_conds = []
            if book_types:
                t_conds = []
                for t in book_types:
                    t_conds.append("i.genre LIKE %s")
                    params.append(f"%{t}%")
                b_conds.append("(" + " OR ".join(t_conds) + ")")
            if book_authors:
                a_conds = []
                for a in book_authors:
                    a_conds.append("b.author LIKE %s")
                    params.append(f"%{a}%")
                b_conds.append("(" + " OR ".join(a_conds) + ")")
                
            if b_conds:
                media_conditions.append("(i.item_type = 'book' AND " + " AND ".join(b_conds) + ")")
            else:
                media_conditions.append("(i.item_type = 'book')")
                
        # 3. Music Conditions
        if 'music' in media_types or not media_types or item_type == 'music':
            mu_conds = []
            # Combine music genres and decades into genre search (since decades are often stored in genre or description)
            all_mu_genres = music_genres + music_decades
            if all_mu_genres:
                mg_conds = []
                for mg in all_mu_genres:
                    mg_conds.append("i.genre LIKE %s")
                    params.append(f"%{mg}%")
                mu_conds.append("(" + " OR ".join(mg_conds) + ")")
            if music_artists:
                ma_conds = []
                for ma in music_artists:
                    ma_conds.append("mu.artist LIKE %s")
                    params.append(f"%{ma}%")
                mu_conds.append("(" + " OR ".join(ma_conds) + ")")
                
            if mu_conds:
                media_conditions.append("(i.item_type = 'music' AND " + " AND ".join(mu_conds) + ")")
            else:
                media_conditions.append("(i.item_type = 'music')")
                
        if media_conditions:
            query += " AND (" + " OR ".join(media_conditions) + ")"
            
        # Exclude rated items
        query += " AND i.id NOT IN (SELECT item_id FROM ratings WHERE user_id = %s)"
        params.append(user_id)
        
        query += " ORDER BY i.popularity_score DESC, i.avg_rating DESC LIMIT %s"
        params.append(limit * 2) # Fetch extra for boosting
        
        items = execute_query(query, tuple(params)) or []
        
        if not items:
            # Fallback if strict filters return nothing
            return self.cold_start_recommendations(item_type, limit, user_id)
            
        # Apply score and Ethiopian boost
        for r in items:
            pop = r.get('popularity_score') or 0
            avg = r.get('avg_rating') or 0
            r['score'] = (pop + avg * 20) / 120
            r['explanation'] = "A perfect match for your onboarding preferences"
            
            if eth_pref and r.get('is_ethiopian'):
                r['score'] *= self.ethiopian_boost_factor
                r['explanation'] += " (Ethiopian Match)"
                
        items.sort(key=lambda x: x.get('score', 0), reverse=True)
        return items[:limit]
    
    def trend_ai_recommendations(self, user_id, item_type=None, limit=20):
        """
        AI Trend recommendations: returns trending items that are NOT related
        to the user's preferred onboarding genres/authors/artists.
        """
        import json
        
        # Get complex preferences
        prefs = execute_query("SELECT * FROM preferences WHERE user_id = %s", (user_id,), fetch_one=True)
        if not prefs:
            return self.cold_start_recommendations(item_type, limit, user_id)
            
        try: movie_genres = json.loads(prefs.get('preferred_genres') or '[]')
        except: movie_genres = []
            
        try: media_types = json.loads(prefs.get('favorite_media_types') or '[]')
        except: media_types = []
            
        try: movie_countries = json.loads(prefs.get('favorite_countries') or '[]')
        except: movie_countries = []
            
        try: book_authors = json.loads(prefs.get('favorite_authors') or '[]')
        except: book_authors = []
            
        try: music_artists = json.loads(prefs.get('favorite_artists') or '[]')
        except: music_artists = []

        try: book_types = json.loads(prefs.get('favorite_book_types') or '[]')
        except: book_types = []
        
        try: music_decades = json.loads(prefs.get('favorite_decades') or '[]')
        except: music_decades = []
        
        try: music_genres = json.loads(prefs.get('favorite_music_genres') or '[]')
        except: music_genres = []
            
        eth_pref = bool(prefs.get('ethiopian_content_preference', False))
        
        query = """SELECT i.*, 
                   CASE WHEN i.item_type = 'book' THEN b.author
                        WHEN i.item_type = 'movie' THEN m.director
                        WHEN i.item_type = 'music' THEN mu.artist END as creator
                   FROM items i
                   LEFT JOIN books b ON i.id = b.item_id
                   LEFT JOIN movies m ON i.id = m.item_id
                   LEFT JOIN music mu ON i.id = mu.item_id
                   WHERE 1=1"""
        
        params = []
        
        # Filter by media type
        if item_type:
            query += " AND i.item_type = %s"
            params.append(item_type)
        elif media_types:
            placeholders = ','.join(['%s'] * len(media_types))
            query += f" AND i.item_type IN ({placeholders})"
            params.extend(media_types)
            
        media_conditions = []
        
        # 1. Movie Conditions
        if 'movie' in media_types or not media_types or item_type == 'movie':
            m_conds = []
            if movie_genres:
                g_conds = []
                for g in movie_genres:
                    g_conds.append("i.genre NOT LIKE %s")
                    params.append(f"%{g}%")
                m_conds.append("(" + " AND ".join(g_conds) + ")")
            if movie_countries:
                c_conds = []
                for c in movie_countries:
                    c_conds.append("m.country NOT LIKE %s")
                    params.append(f"%{c}%")
                m_conds.append("(" + " AND ".join(c_conds) + ")")
                
            if m_conds:
                media_conditions.append("(i.item_type = 'movie' AND " + " AND ".join(m_conds) + ")")
            else:
                media_conditions.append("(i.item_type = 'movie')")
                
        # 2. Book Conditions
        if 'book' in media_types or not media_types or item_type == 'book':
            b_conds = []
            if book_types:
                t_conds = []
                for t in book_types:
                    t_conds.append("i.genre NOT LIKE %s")
                    params.append(f"%{t}%")
                b_conds.append("(" + " AND ".join(t_conds) + ")")
            if book_authors:
                a_conds = []
                for a in book_authors:
                    a_conds.append("b.author NOT LIKE %s")
                    params.append(f"%{a}%")
                b_conds.append("(" + " AND ".join(a_conds) + ")")
                
            if b_conds:
                media_conditions.append("(i.item_type = 'book' AND " + " AND ".join(b_conds) + ")")
            else:
                media_conditions.append("(i.item_type = 'book')")
                
        # 3. Music Conditions
        if 'music' in media_types or not media_types or item_type == 'music':
            mu_conds = []
            all_mu_genres = music_genres + music_decades
            if all_mu_genres:
                mg_conds = []
                for mg in all_mu_genres:
                    mg_conds.append("i.genre NOT LIKE %s")
                    params.append(f"%{mg}%")
                mu_conds.append("(" + " AND ".join(mg_conds) + ")")
            if music_artists:
                ma_conds = []
                for ma in music_artists:
                    ma_conds.append("mu.artist NOT LIKE %s")
                    params.append(f"%{ma}%")
                mu_conds.append("(" + " AND ".join(ma_conds) + ")")
                
            if mu_conds:
                media_conditions.append("(i.item_type = 'music' AND " + " AND ".join(mu_conds) + ")")
            else:
                media_conditions.append("(i.item_type = 'music')")
                
        if media_conditions:
            query += " AND (" + " OR ".join(media_conditions) + ")"
            
        # Exclude rated items
        query += " AND i.id NOT IN (SELECT item_id FROM ratings WHERE user_id = %s)"
        params.append(user_id)
        
        query += " ORDER BY i.popularity_score DESC, i.avg_rating DESC LIMIT %s"
        params.append(limit * 2) # Fetch extra for boosting
        
        items = execute_query(query, tuple(params)) or []
        
        if not items:
            return self.cold_start_recommendations(item_type, limit, user_id)
            
        # Apply score and Ethiopian boost
        for r in items:
            pop = r.get('popularity_score') or 0
            avg = r.get('avg_rating') or 0
            r['score'] = (pop + avg * 20) / 120
            r['explanation'] = "Trending AI recommendation (discover something new outside preferences)"
            
            if eth_pref and r.get('is_ethiopian'):
                r['score'] *= self.ethiopian_boost_factor
                r['explanation'] += " (Ethiopian Match)"
                
        items.sort(key=lambda x: x.get('score', 0), reverse=True)
        return items[:limit]

    
    def find_similar_items(self, item_id, limit=10):
        """
        Find items similar to a specific item using content similarity
        """
        # Get the target item
        target = execute_query(
            "SELECT * FROM items WHERE id = %s",
            (item_id,),
            fetch_one=True
        )
        
        if not target:
            return []
        
        # Get items of same type
        items = execute_query(
            """SELECT i.*, 
                   CASE 
                       WHEN i.item_type = 'book' THEN b.author
                       WHEN i.item_type = 'movie' THEN m.director
                       WHEN i.item_type = 'music' THEN mu.artist
                   END as creator
               FROM items i
               LEFT JOIN books b ON i.id = b.item_id
               LEFT JOIN movies m ON i.id = m.item_id
               LEFT JOIN music mu ON i.id = mu.item_id
               WHERE i.item_type = %s AND i.id != %s""",
            (target['item_type'], item_id)
        )
        
        if not items:
            return []
        
        # Create content features
        def create_features(item):
            return f"{item.get('genre', '')} {item.get('description', '')}"
        
        target_features = create_features(target)
        all_features = [create_features(item) for item in items]
        all_features.insert(0, target_features)
        
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity

            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(all_features)
            similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
        except:
            return items[:limit]
        
        # Add similarity scores
        for idx, item in enumerate(items):
            item['score'] = float(similarities[idx])
            item['explanation'] = f'Similar to "{target["title"]}"'
        
        # Sort by similarity
        items.sort(key=lambda x: x['score'], reverse=True)
        return items[:limit]
    
    def boost_ethiopian_content(self, recommendations):
        """
        Apply boost factor to Ethiopian content in recommendations
        """
        for rec in recommendations:
            if rec.get('is_ethiopian'):
                rec['score'] *= self.ethiopian_boost_factor
                rec['explanation'] = rec.get('explanation', '') + ' (Ethiopian content boost)'
        
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations
    
    def generate_explanation(self, user_id, item_id):
        """
        Generate detailed explanation for a recommendation
        """
        # Get the item
        item = execute_query(
            "SELECT * FROM items WHERE id = %s",
            (item_id,),
            fetch_one=True
        )
        
        if not item:
            return "Item not found"
        
        explanations = []
        
        # Check if similar users liked it
        similar_users_rating = execute_query(
            """SELECT AVG(r.rating) as avg_rating, COUNT(*) as count
               FROM ratings r
               WHERE r.item_id = %s AND r.user_id != %s AND r.rating >= 4""",
            (item_id, user_id),
            fetch_one=True
        )
        
        if similar_users_rating and similar_users_rating['count'] > 0:
            explanations.append(
                f"Users with similar taste gave it an average of {similar_users_rating['avg_rating']:.1f} stars"
            )
        
        # Check genre match
        user_genre_pref = execute_query(
            """SELECT i.genre, AVG(r.rating) as avg_rating
               FROM ratings r
               JOIN items i ON r.item_id = i.id
               WHERE r.user_id = %s AND i.genre = %s
               GROUP BY i.genre""",
            (user_id, item['genre']),
            fetch_one=True
        )
        
        if user_genre_pref:
            explanations.append(
                f"You enjoy {item['genre']} content (avg rating: {user_genre_pref['avg_rating']:.1f})"
            )
        
        # Ethiopian content
        if item.get('is_ethiopian'):
            explanations.append("Features Ethiopian cultural content")
        
        # Popularity
        if item.get('popularity_score', 0) > 80:
            explanations.append("Highly popular among all users")
        
        if not explanations:
            explanations.append("Recommended based on your preferences and viewing history")
        
        return " | ".join(explanations)
    
    def _fetch_items_with_scores(self, item_ids, scores, algorithm_type):
        """
        Fetch full item details for recommended item IDs
        """
        if not item_ids:
            return []
        
        placeholders = ','.join(['%s'] * len(item_ids))
        items = execute_query(
            f"""SELECT i.*, 
                   CASE 
                       WHEN i.item_type = 'book' THEN b.author
                       WHEN i.item_type = 'movie' THEN m.director
                       WHEN i.item_type = 'music' THEN mu.artist
                   END as creator
               FROM items i
               LEFT JOIN books b ON i.id = b.item_id
               LEFT JOIN movies m ON i.id = m.item_id
               LEFT JOIN music mu ON i.id = mu.item_id
               WHERE i.id IN ({placeholders})""",
            tuple(item_ids)
        )
        
        # Add scores and explanations
        item_dict = {item['id']: item for item in items}
        result = []
        
        for item_id in item_ids:
            if item_id in item_dict:
                item = item_dict[item_id]
                item['score'] = min(1.0, scores.get(item_id, 0))
                item['explanation'] = self._generate_quick_explanation(item, algorithm_type)
                result.append(item)
        
        return result
    
    def _generate_quick_explanation(self, item, algorithm_type):
        """
        Generate a quick explanation based on algorithm type
        """
        if algorithm_type == 'collaborative':
            return "Users with similar taste enjoyed this"
        elif algorithm_type == 'content_based':
            return f"Similar to other {item['genre']} {item['item_type']}s you liked"
        elif algorithm_type == 'hybrid':
            return "Recommended based on your preferences"
        else:
            return "You might enjoy this"
