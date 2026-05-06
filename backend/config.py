"""
Flask Application Configuration
"""
import os
from datetime import timedelta

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # MySQL Database Configuration
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or 'localhost'
    MYSQL_USER = os.environ.get('MYSQL_USER') or 'root'
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD') or ''
    MYSQL_DB = os.environ.get('MYSQL_DB') or 'ethiopian_recommendations'
    MYSQL_PORT = int(os.environ.get('MYSQL_PORT') or 3306)
    
    # Credit System Configuration
    INITIAL_CREDITS = 100
    CREDIT_COSTS = {
        'recommendation': 1,
        'search': 1,
        'rating': 0,  # Free
        'view_item': 0,  # Free
    }
    CREDIT_REWARDS = {
        'rating': 2,  # Reward for rating
        'daily_login': 5,
        'referral': 20,
    }
    
    # Recommendation Engine Configuration
    RECOMMENDATION_LIMIT = 20
    ETHIOPIAN_BOOST_FACTOR = 1.3  # 30% boost for Ethiopian content
    # Popularity boost applied to items imported as Ethiopian so they surface first
    ETHIOPIAN_IMPORT_POPULARITY_BOOST = int(os.environ.get('ETHIOPIAN_IMPORT_POPULARITY_BOOST', 1000))
    COLD_START_POPULAR_LIMIT = 10
    
    # Pagination
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    # Database pool size (increase if you see 'pool exhausted' errors)
    DB_POOL_SIZE = int(os.environ.get('DB_POOL_SIZE', 10))


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or 'localhost'


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    MYSQL_DB = 'recommendation_system_test'


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
