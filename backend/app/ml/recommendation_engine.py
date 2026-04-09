"""
AI Recommendation Engine
Implements Collaborative Filtering, Content-Based Filtering, and Hybrid approaches
"""
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
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
    
    def __init__(self):
        self.ethiopian_boost_factor = 1.3  # 30% boost for Ethiopian content
    
    def collaborative_filtering(self, user_id, item_type=None, limit=20):
        """
        User-User Collaborative Filtering using cosine similarity
        Recommends items based on similar users' preferences
        """
        # Get all users' ratings
        ratings_query = """
            SELECT r.user_id, r.item_id, r.rating, i.item_type
            FROM ratings r
            JOIN items i ON r.item_id = i.id
        """
        if item_type:
            ratings_query += f" WHERE i.item_type = '{item_type}'"
        
        all_ratings = execute_query(ratings_query)
        
        if not all_ratings:
            return self.cold_start_recommendations(item_type, limit)
        
        # Build user-item rating matrix
        users = list(set(r['user_id'] for r in all_ratings))
        items = list(set(r['item_id'] for r in all_ratings))
        
        if user_id not in users:
            return self.cold_start_recommendations(item_type, limit)
        
        user_idx = {u: i for i, u in enumerate(users)}
        item_idx = {it: i for i, it in enumerate(items)}
        
        # Create rating matrix
        matrix = np.zeros((len(users), len(items)))
        for r in all_ratings:
            matrix[user_idx[r['user_id']], item_idx[r['item_id']]] = r['rating']
        
        # Calculate user similarity
        user_similarity = cosine_similarity(matrix)
        
        # Get similar users
        target_idx = user_idx[user_id]
        similar_users = np.argsort(user_similarity[target_idx])[::-1][1:11]  # Top 10 similar users
        
        # Get items rated by current user
        user_rated = set(r['item_id'] for r in all_ratings if r['user_id'] == user_id)
        
        # Calculate weighted recommendations
        item_scores = defaultdict(float)
        for sim_idx in similar_users:
            similarity = user_similarity[target_idx, sim_idx]
            if similarity > 0:
                for r in all_ratings:
                    if r['user_id'] == users[sim_idx] and r['item_id'] not in user_rated:
                        item_scores[r['item_id']] += similarity * r['rating']
        
        # Sort and get top recommendations
        recommended_ids = sorted(item_scores.keys(), key=lambda x: item_scores[x], reverse=True)[:limit]
        
        if not recommended_ids:
            return self.cold_start_recommendations(item_type, limit)
        
        # Fetch item details
        return self._fetch_items_with_scores(recommended_ids, item_scores, 'collaborative')
    
    def content_based_filtering(self, user_id, item_type=None, limit=20):
        """
        Content-Based Filtering using TF-IDF on genres and descriptions
        Recommends items similar to what user has liked
        """
        # Get user's highly rated items (4+ stars)
        user_ratings = execute_query(
            """SELECT i.id, i.title, i.genre, i.description, i.item_type, r.rating
               FROM ratings r
               JOIN items i ON r.item_id = i.id
               WHERE r.user_id = %s AND r.rating >= 4
               ORDER BY r.rating DESC""",
            (user_id,)
        )
        
        if not user_ratings:
            return self.cold_start_recommendations(item_type, limit)
        
        # Get all items
        items_query = "SELECT id, title, genre, description, item_type, is_ethiopian, avg_rating FROM items"
        if item_type:
            items_query += f" WHERE item_type = '{item_type}'"
        
        all_items = execute_query(items_query)
        
        if not all_items:
            return []
        
        # Create content features (genre + description)
        def create_features(item):
            return f"{item.get('genre', '')} {item.get('description', '')}"
        
        # Build TF-IDF matrix
        all_features = [create_features(item) for item in all_items]
        
        try:
            vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
            tfidf_matrix = vectorizer.fit_transform(all_features)
        except:
            return self.cold_start_recommendations(item_type, limit)
        
        # Calculate similarity for user's liked items
        liked_ids = set(r['id'] for r in user_ratings)
        item_id_to_idx = {item['id']: idx for idx, item in enumerate(all_items)}
        
        # Get indices of liked items
        liked_indices = [item_id_to_idx[id] for id in liked_ids if id in item_id_to_idx]
        
        if not liked_indices:
            return self.cold_start_recommendations(item_type, limit)
        
        # Calculate average profile of liked items
        liked_vectors = tfidf_matrix[liked_indices]
        user_profile = np.asarray(liked_vectors.mean(axis=0)).flatten()
        
        # Calculate similarity to all items
        similarities = cosine_similarity([user_profile], tfidf_matrix)[0]
        
        # Score items
        item_scores = {}
        for idx, item in enumerate(all_items):
            if item['id'] not in liked_ids:
                item_scores[item['id']] = similarities[idx]
        
        # Sort and get top recommendations
        recommended_ids = sorted(item_scores.keys(), key=lambda x: item_scores[x], reverse=True)[:limit]
        
        if not recommended_ids:
            return self.cold_start_recommendations(item_type, limit)
        
        return self._fetch_items_with_scores(recommended_ids, item_scores, 'content_based')
    
    def hybrid_recommendations(self, user_id, item_type=None, limit=20, ethiopian_boost=False):
        """
        Hybrid approach combining collaborative and content-based filtering
        Uses weighted combination of both algorithms
        """
        # Get recommendations from both algorithms
        collab_recs = self.collaborative_filtering(user_id, item_type, limit * 2)
        content_recs = self.content_based_filtering(user_id, item_type, limit * 2)
        
        # Combine scores with weights
        combined_scores = {}
        collab_weight = 0.6
        content_weight = 0.4
        
        for rec in collab_recs:
            combined_scores[rec['id']] = rec['score'] * collab_weight
        
        for rec in content_recs:
            if rec['id'] in combined_scores:
                combined_scores[rec['id']] += rec['score'] * content_weight
            else:
                combined_scores[rec['id']] = rec['score'] * content_weight
        
        # Apply Ethiopian boost if enabled
        if ethiopian_boost:
            ethiopian_items = execute_query(
                "SELECT id FROM items WHERE is_ethiopian = TRUE"
            )
            ethiopian_ids = set(item['id'] for item in ethiopian_items)
            
            for item_id in combined_scores:
                if item_id in ethiopian_ids:
                    combined_scores[item_id] *= self.ethiopian_boost_factor
        
        # Sort and limit
        sorted_ids = sorted(combined_scores.keys(), key=lambda x: combined_scores[x], reverse=True)[:limit]
        
        if not sorted_ids:
            return self.cold_start_recommendations(item_type, limit)
        
        return self._fetch_items_with_scores(sorted_ids, combined_scores, 'hybrid')
    
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
            return self.cold_start_recommendations(None, limit)
        
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
    
    def cold_start_recommendations(self, item_type=None, limit=10):
        """
        Recommendations for new users or when other algorithms fail
        Returns popular and highly rated items
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
        
        query += f" ORDER BY i.popularity_score DESC, i.avg_rating DESC LIMIT {limit}"
        
        items = execute_query(query, tuple(params))
        
        for item in items:
            item['score'] = (item['popularity_score'] + item['avg_rating'] * 20) / 120
            item['explanation'] = 'Popular and highly rated'
        
        return items
    
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
                item['score'] = scores.get(item_id, 0)
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
