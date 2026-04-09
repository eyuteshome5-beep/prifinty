-- ================================================
-- Personal Movie, Music, and Book Recommendation System
-- MySQL Database Schema
-- ================================================

-- Create the database
CREATE DATABASE IF NOT EXISTS ethiopian_recommendations;
USE ethiopian_recommendations;

-- ================================================
-- Users Table
-- ================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('guest', 'user', 'admin') DEFAULT 'user',
    credits INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_username (username)
);

-- ================================================
-- Items Table (Base table for all content)
-- ================================================
CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    item_type ENUM('book', 'movie', 'music') NOT NULL,
    cover_image VARCHAR(500),
    is_ethiopian BOOLEAN DEFAULT FALSE,
    popularity_score FLOAT DEFAULT 0,
    avg_rating FLOAT DEFAULT 0,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_item_type (item_type),
    INDEX idx_genre (genre),
    INDEX idx_is_ethiopian (is_ethiopian),
    FULLTEXT INDEX idx_search (title, description, genre)
);

-- ================================================
-- Books Table (Extended attributes)
-- ================================================
CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL UNIQUE,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20),
    publisher VARCHAR(255),
    publication_year INT,
    page_count INT,
    language VARCHAR(50) DEFAULT 'English',
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    INDEX idx_author (author)
);

-- ================================================
-- Movies Table (Extended attributes)
-- ================================================
CREATE TABLE movies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL UNIQUE,
    director VARCHAR(255) NOT NULL,
    release_year INT,
    duration_minutes INT,
    language VARCHAR(50) DEFAULT 'English',
    country VARCHAR(100),
    cast_members TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    INDEX idx_director (director),
    INDEX idx_release_year (release_year)
);

-- ================================================
-- Music Table (Extended attributes)
-- ================================================
CREATE TABLE music (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL UNIQUE,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    release_year INT,
    duration_seconds INT,
    language VARCHAR(50) DEFAULT 'English',
    ethiopian_genre ENUM('Tizita', 'Bati', 'Anchihoye', 'Ambassel', 'Other') NULL,
    spotify_id VARCHAR(255) DEFAULT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    INDEX idx_artist (artist),
    INDEX idx_ethiopian_genre (ethiopian_genre)
);

-- ================================================
-- Ratings Table
-- ================================================
CREATE TABLE ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_item (user_id, item_id),
    INDEX idx_user_id (user_id),
    INDEX idx_item_id (item_id)
);

-- ================================================
-- User Preferences Table
-- ================================================
CREATE TABLE preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    preferred_genres JSON,
    preferred_languages JSON,
    ethiopian_content_preference BOOLEAN DEFAULT FALSE,
    notification_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_prefs (user_id)
);

-- ================================================
-- Recommendations Table
-- ================================================
CREATE TABLE recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    score FLOAT NOT NULL,
    algorithm_type ENUM('collaborative', 'content_based', 'hybrid', 'cross_domain') NOT NULL,
    explanation TEXT,
    is_viewed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    INDEX idx_user_recommendations (user_id, score DESC)
);

-- ================================================
-- Wishlist Table
-- ================================================
CREATE TABLE wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_wishlist (user_id, item_id),
    INDEX idx_user_wishlist (user_id)
);

-- ================================================
-- Ethiopian Content Metadata Table
-- ================================================
CREATE TABLE ethiopian_content_metadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL UNIQUE,
    amharic_title VARCHAR(255),
    cultural_significance TEXT,
    region VARCHAR(100),
    traditional_genre VARCHAR(100),
    historical_period VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- ================================================
-- Credit Transactions Table (For credit management)
-- ================================================
CREATE TABLE credit_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount INT NOT NULL,
    transaction_type ENUM('recommendation', 'search', 'rating', 'bonus', 'purchase', 'refund') NOT NULL,
    description VARCHAR(255),
    balance_after INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_transactions (user_id, created_at DESC)
);

-- ================================================
-- User Activity Log Table
-- ================================================
CREATE TABLE user_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type ENUM('view', 'search', 'rate', 'wishlist', 'recommendation') NOT NULL,
    item_id INT,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
    INDEX idx_user_activity (user_id, created_at DESC)
);

-- ================================================
-- Verification Codes Table (For Forgot Password)
-- ================================================
CREATE TABLE verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_code (email, code)
);

-- ================================================
-- Sample Data: Ethiopian Content
-- ================================================

-- Insert sample Ethiopian Books
INSERT INTO items (title, description, genre, item_type, is_ethiopian, popularity_score) VALUES
('Oromay', 'A powerful Ethiopian novel about love and war during the Italian invasion.', 'Historical Fiction', 'book', TRUE, 85),
('Fikir Eske Mekabir', 'Classic Ethiopian love story, one of the most celebrated Amharic novels.', 'Romance', 'book', TRUE, 95),
('The Beautiful Ones Are Not Yet Born', 'A novel exploring post-colonial African identity.', 'Literary Fiction', 'book', TRUE, 78);

INSERT INTO books (item_id, author, publication_year, language) VALUES
(1, 'Bealu Girma', 1983, 'Amharic'),
(2, 'Haddis Alemayehu', 1968, 'Amharic'),
(3, 'Ayi Kwei Armah', 1968, 'English');

-- Insert sample Ethiopian Movies
INSERT INTO items (title, description, genre, item_type, is_ethiopian, popularity_score) VALUES
('Lamb', 'An Ethiopian boy befriends a lamb in this touching drama.', 'Drama', 'movie', TRUE, 88),
('Difret', 'Based on a true story of an Ethiopian girl who fights against abduction.', 'Drama', 'movie', TRUE, 92),
('Teza', 'A powerful film about an Ethiopian intellectual returning home.', 'Drama', 'movie', TRUE, 85);

INSERT INTO movies (item_id, director, release_year, language, country) VALUES
(4, 'Yared Zeleke', 2015, 'Amharic', 'Ethiopia'),
(5, 'Zeresenay Mehari', 2014, 'Amharic', 'Ethiopia'),
(6, 'Haile Gerima', 2008, 'Amharic', 'Ethiopia');

-- Insert sample Ethiopian Music
INSERT INTO items (title, description, genre, item_type, is_ethiopian, popularity_score) VALUES
('Tizita', 'Traditional Ethiopian melody expressing nostalgia and longing.', 'Traditional', 'music', TRUE, 96),
('Bati', 'A pentatonic scale-based Ethiopian traditional music.', 'Traditional', 'music', TRUE, 90),
('Anchihoye Lene', 'Classic Ethiopian love song in Anchihoye scale.', 'Traditional', 'music', TRUE, 88),
('Ambassel', 'Soulful Ethiopian traditional melody from Wollo region.', 'Traditional', 'music', TRUE, 85);

INSERT INTO music (item_id, artist, release_year, language, ethiopian_genre) VALUES
(7, 'Tilahun Gessesse', 1970, 'Amharic', 'Tizita'),
(8, 'Mahmoud Ahmed', 1975, 'Amharic', 'Bati'),
(9, 'Aster Aweke', 1985, 'Amharic', 'Anchihoye'),
(10, 'Mulatu Astatke', 1972, 'Amharic', 'Ambassel');

-- Insert Ethiopian metadata
INSERT INTO ethiopian_content_metadata (item_id, amharic_title, cultural_significance, region, traditional_genre) VALUES
(1, 'ኦሮማይ', 'Reflects Ethiopian resistance against colonialism', 'National', NULL),
(2, 'ፍቅር እስከ መቃብር', 'Considered the greatest Amharic novel ever written', 'National', NULL),
(7, 'ትዝታ', 'The quintessential Ethiopian musical mode expressing longing', 'National', 'Tizita'),
(8, 'ባቲ', 'Named after the town of Bati, represents Ethiopian musical heritage', 'Wollo', 'Bati');

-- Sample International Content
INSERT INTO items (title, description, genre, item_type, is_ethiopian, popularity_score) VALUES
('The Shawshank Redemption', 'Two imprisoned men bond over a number of years.', 'Drama', 'movie', FALSE, 98),
('Inception', 'A thief who steals corporate secrets through dreams.', 'Sci-Fi', 'movie', FALSE, 95),
('To Kill a Mockingbird', 'A classic novel about racial injustice in the American South.', 'Literary Fiction', 'book', FALSE, 97),
('1984', 'A dystopian novel set in a totalitarian society.', 'Dystopian', 'book', FALSE, 94),
('Bohemian Rhapsody', 'Iconic rock song by Queen.', 'Rock', 'music', FALSE, 96),
('Shape of You', 'Popular pop song by Ed Sheeran.', 'Pop', 'music', FALSE, 92);

INSERT INTO movies (item_id, director, release_year, language, country) VALUES
(11, 'Frank Darabont', 1994, 'English', 'USA'),
(12, 'Christopher Nolan', 2010, 'English', 'USA');

INSERT INTO books (item_id, author, publication_year, language) VALUES
(13, 'Harper Lee', 1960, 'English'),
(14, 'George Orwell', 1949, 'English');

INSERT INTO music (item_id, artist, release_year, language) VALUES
(15, 'Queen', 1975, 'English'),
(16, 'Ed Sheeran', 2017, 'English');

-- Create admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, credits) VALUES
('admin', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4pLLnKKnLYFHvPWy', 'admin', 9999);
