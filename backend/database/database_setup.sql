-- ============================================================================
-- PREFINITY - Ethiopian Personal Recommendation System
-- Complete MySQL Database Setup Script
-- ============================================================================
-- This script creates the full database schema with:
--   - All tables with proper constraints and indexes
--   - Triggers for automatic rating updates
--   - Default admin user (admin@example.com / admin123)
--   - Sample content data (Ethiopian + International)
-- ============================================================================

-- Create database
CREATE DATABASE IF NOT EXISTS `ethiopian_recommendations`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `ethiopian_recommendations`;

-- Disable checks for clean setup
SET FOREIGN_KEY_CHECKS = 0;
SET @OLD_SQL_MODE = @@SQL_MODE;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';


-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('guest', 'user', 'admin') NOT NULL DEFAULT 'user',
  `credits` INT NOT NULL DEFAULT 100,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `uq_email` (`email`),
  INDEX `idx_email` (`email`),
  INDEX `idx_username` (`username`),
  INDEX `idx_role` (`role`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 2. ITEMS TABLE (Central content table)
-- ============================================================================
DROP TABLE IF EXISTS `items`;
CREATE TABLE `items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `genre` VARCHAR(100) DEFAULT NULL,
  `item_type` ENUM('book', 'movie', 'music') NOT NULL,
  `cover_image` VARCHAR(500) DEFAULT NULL,
  `is_ethiopian` TINYINT(1) NOT NULL DEFAULT 0,
  `popularity_score` FLOAT NOT NULL DEFAULT 0,
  `avg_rating` FLOAT NOT NULL DEFAULT 0,
  `rating_count` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_item_type` (`item_type`),
  INDEX `idx_genre` (`genre`),
  INDEX `idx_is_ethiopian` (`is_ethiopian`),
  INDEX `idx_popularity` (`popularity_score` DESC),
  INDEX `idx_avg_rating` (`avg_rating` DESC),
  FULLTEXT INDEX `idx_search` (`title`, `description`, `genre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 3. BOOKS TABLE
-- ============================================================================
DROP TABLE IF EXISTS `books`;
CREATE TABLE `books` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `item_id` INT NOT NULL,
  `author` VARCHAR(255) NOT NULL,
  `isbn` VARCHAR(20) DEFAULT NULL,
  `publisher` VARCHAR(255) DEFAULT NULL,
  `publication_year` INT DEFAULT NULL,
  `page_count` INT DEFAULT NULL,
  `language` VARCHAR(50) NOT NULL DEFAULT 'English',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_book_item` (`item_id`),
  INDEX `idx_author` (`author`),
  INDEX `idx_publication_year` (`publication_year`),
  CONSTRAINT `fk_books_items` FOREIGN KEY (`item_id`)
    REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 4. MOVIES TABLE
-- ============================================================================
DROP TABLE IF EXISTS `movies`;
CREATE TABLE `movies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `item_id` INT NOT NULL,
  `director` VARCHAR(255) NOT NULL,
  `release_year` INT DEFAULT NULL,
  `duration_minutes` INT DEFAULT NULL,
  `language` VARCHAR(50) NOT NULL DEFAULT 'English',
  `country` VARCHAR(100) DEFAULT NULL,
  `cast_members` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_movie_item` (`item_id`),
  INDEX `idx_director` (`director`),
  INDEX `idx_release_year` (`release_year`),
  CONSTRAINT `fk_movies_items` FOREIGN KEY (`item_id`)
    REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 5. MUSIC TABLE
-- ============================================================================
DROP TABLE IF EXISTS `music`;
CREATE TABLE `music` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `item_id` INT NOT NULL,
  `artist` VARCHAR(255) NOT NULL,
  `album` VARCHAR(255) DEFAULT NULL,
  `release_year` INT DEFAULT NULL,
  `duration_seconds` INT DEFAULT NULL,
  `language` VARCHAR(50) NOT NULL DEFAULT 'English',
  `ethiopian_genre` ENUM('Tizita', 'Bati', 'Anchihoye', 'Ambassel', 'Other') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_music_item` (`item_id`),
  INDEX `idx_artist` (`artist`),
  INDEX `idx_ethiopian_genre` (`ethiopian_genre`),
  CONSTRAINT `fk_music_items` FOREIGN KEY (`item_id`)
    REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 6. ETHIOPIAN CONTENT METADATA TABLE
-- ============================================================================
DROP TABLE IF EXISTS `ethiopian_content_metadata`;
CREATE TABLE `ethiopian_content_metadata` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `item_id` INT NOT NULL,
  `amharic_title` VARCHAR(255) DEFAULT NULL,
  `cultural_significance` TEXT,
  `region` VARCHAR(100) DEFAULT NULL,
  `traditional_genre` VARCHAR(100) DEFAULT NULL,
  `historical_period` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ethiopian_item` (`item_id`),
  CONSTRAINT `fk_ethiopian_items` FOREIGN KEY (`item_id`)
    REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 7. RATINGS TABLE
-- ============================================================================
DROP TABLE IF EXISTS `ratings`;
CREATE TABLE `ratings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `rating` TINYINT NOT NULL,
  `review` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_item_rating` (`user_id`, `item_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_item_id` (`item_id`),
  INDEX `idx_rating` (`rating`),
  CONSTRAINT `fk_ratings_users` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ratings_items` FOREIGN KEY (`item_id`)
    REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_rating_range` CHECK (`rating` >= 1 AND `rating` <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 8. RECOMMENDATIONS TABLE
-- ============================================================================
DROP TABLE IF EXISTS `recommendations`;
CREATE TABLE `recommendations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `score` FLOAT NOT NULL,
  `algorithm_type` ENUM('collaborative', 'content_based', 'hybrid', 'cross_domain') NOT NULL,
  `explanation` TEXT,
  `is_viewed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_recommendations` (`user_id`, `score` DESC),
  INDEX `idx_item_id` (`item_id`),
  INDEX `idx_algorithm` (`algorithm_type`),
  INDEX `idx_created_at` (`created_at`),
  CONSTRAINT `fk_recommendations_users` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_recommendations_items` FOREIGN KEY (`item_id`)
    REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 9. PREFERENCES TABLE
-- ============================================================================
DROP TABLE IF EXISTS `preferences`;
CREATE TABLE `preferences` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `preferred_genres` JSON DEFAULT NULL,
  `preferred_languages` JSON DEFAULT NULL,
  `ethiopian_content_preference` TINYINT(1) NOT NULL DEFAULT 0,
  `notification_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_prefs` (`user_id`),
  CONSTRAINT `fk_preferences_users` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 10. CREDIT TRANSACTIONS TABLE
-- ============================================================================
DROP TABLE IF EXISTS `credit_transactions`;
CREATE TABLE `credit_transactions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `amount` INT NOT NULL,
  `transaction_type` ENUM('recommendation', 'search', 'rating', 'bonus', 'purchase', 'refund') NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `balance_after` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_transactions` (`user_id`, `created_at` DESC),
  INDEX `idx_transaction_type` (`transaction_type`),
  INDEX `idx_created_at` (`created_at`),
  CONSTRAINT `fk_credit_transactions_users` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 11. USER ACTIVITY TABLE
-- ============================================================================
DROP TABLE IF EXISTS `user_activity`;
CREATE TABLE `user_activity` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `activity_type` ENUM('view', 'search', 'rate', 'wishlist', 'recommendation') NOT NULL,
  `item_id` INT DEFAULT NULL,
  `details` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_activity` (`user_id`, `created_at` DESC),
  INDEX `idx_activity_type` (`activity_type`),
  INDEX `idx_item_id` (`item_id`),
  INDEX `idx_created_at` (`created_at`),
  CONSTRAINT `fk_user_activity_users` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_activity_items` FOREIGN KEY (`item_id`)
    REFERENCES `items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 12. WISHLIST TABLE
-- ============================================================================
DROP TABLE IF EXISTS `wishlist`;
CREATE TABLE `wishlist` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `added_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_wishlist_item` (`user_id`, `item_id`),
  INDEX `idx_user_wishlist` (`user_id`),
  INDEX `idx_item_id` (`item_id`),
  CONSTRAINT `fk_wishlist_users` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wishlist_items` FOREIGN KEY (`item_id`)
    REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Re-enable checks
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_MODE = @OLD_SQL_MODE;


-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update item avg_rating when a rating is inserted
DELIMITER //

CREATE TRIGGER `trg_rating_after_insert`
AFTER INSERT ON `ratings`
FOR EACH ROW
BEGIN
  UPDATE `items`
  SET `avg_rating` = (SELECT AVG(rating) FROM ratings WHERE item_id = NEW.item_id),
      `rating_count` = (SELECT COUNT(*) FROM ratings WHERE item_id = NEW.item_id)
  WHERE `id` = NEW.item_id;
END//

-- Auto-update item avg_rating when a rating is updated
CREATE TRIGGER `trg_rating_after_update`
AFTER UPDATE ON `ratings`
FOR EACH ROW
BEGIN
  UPDATE `items`
  SET `avg_rating` = (SELECT AVG(rating) FROM ratings WHERE item_id = NEW.item_id),
      `rating_count` = (SELECT COUNT(*) FROM ratings WHERE item_id = NEW.item_id)
  WHERE `id` = NEW.item_id;
END//

-- Auto-update item avg_rating when a rating is deleted
CREATE TRIGGER `trg_rating_after_delete`
AFTER DELETE ON `ratings`
FOR EACH ROW
BEGIN
  UPDATE `items`
  SET `avg_rating` = COALESCE((SELECT AVG(rating) FROM ratings WHERE item_id = OLD.item_id), 0),
      `rating_count` = (SELECT COUNT(*) FROM ratings WHERE item_id = OLD.item_id)
  WHERE `id` = OLD.item_id;
END//

DELIMITER ;


-- ============================================================================
-- DEFAULT ADMIN USER
-- ============================================================================
-- Username: admin
-- Email: admin@example.com
-- Password: admin123
-- (bcrypt hash of 'admin123')

INSERT INTO `users` (`username`, `email`, `password_hash`, `role`, `credits`, `is_active`)
VALUES ('admin', 'admin@example.com',
        '$2b$12$JlrFJujoSkn1R6AUA1Q.iO9BRDl8dUqLWxkIME0sKzSJC3B4T.t.q',
        'admin', 99999, 1);

-- Admin preferences
INSERT INTO `preferences` (`user_id`, `preferred_genres`, `preferred_languages`, `ethiopian_content_preference`)
VALUES (1, '[]', '["English", "Amharic"]', TRUE);


-- ============================================================================
-- SAMPLE CONTENT DATA
-- ============================================================================

-- ---------- ETHIOPIAN BOOKS ----------
INSERT INTO `items` (`title`, `description`, `genre`, `item_type`, `cover_image`, `is_ethiopian`, `popularity_score`) VALUES
('Oromay', 'A powerful Ethiopian novel about love and war during the Italian invasion. Written by Bealu Girma, it is a cornerstone of Amharic literature.', 'Historical Fiction', 'book', NULL, 1, 85),
('Fikir Eske Mekabir', 'Classic Ethiopian love story, one of the most celebrated Amharic novels ever written. By Haddis Alemayehu.', 'Romance', 'book', NULL, 1, 95),
('The Beautiful Ones Are Not Yet Born', 'A novel exploring post-colonial African identity by Ayi Kwei Armah.', 'Literary Fiction', 'book', NULL, 1, 78),
('Dertogada', 'A groundbreaking Amharic science fiction thriller exploring secret technology and national identity by Yismake Worku.', 'Sci-Fi', 'book', NULL, 1, 91),
('Sememen', 'A deep dive into the psychological and social fabric of Ethiopian society by Sisay Negusu.', 'Fiction', 'book', NULL, 1, 88);

-- ---------- INTERNATIONAL BOOKS ----------
INSERT INTO `items` (`title`, `description`, `genre`, `item_type`, `cover_image`, `is_ethiopian`, `popularity_score`) VALUES
('To Kill a Mockingbird', 'A classic novel about racial injustice in the American South by Harper Lee.', 'Literary Fiction', 'book', NULL, 0, 97),
('1984', 'A dystopian novel set in a totalitarian society by George Orwell.', 'Dystopian', 'book', NULL, 0, 94),
('The Alchemist', 'A fable about following your dream and listening to your heart by Paulo Coelho.', 'Adventure', 'book', NULL, 0, 95),
('Long Walk to Freedom', 'The inspiring autobiography of Nelson Mandela.', 'Biography', 'book', NULL, 0, 96),
('Wings of Fire', 'The autobiography of the Missile Man of India, APJ Abdul Kalam.', 'Biography', 'book', NULL, 0, 92);

-- ---------- ETHIOPIAN MOVIES ----------
INSERT INTO `items` (`title`, `description`, `genre`, `item_type`, `cover_image`, `is_ethiopian`, `popularity_score`) VALUES
('Lamb', 'An Ethiopian boy befriends a lamb in this touching drama directed by Yared Zeleke. Ethiopia''s first Cannes selection.', 'Drama', 'movie', NULL, 1, 88),
('Difret', 'Based on a true story of an Ethiopian girl who fights against abduction, directed by Zeresenay Mehari.', 'Drama', 'movie', NULL, 1, 92),
('Teza', 'A powerful film about an Ethiopian intellectual returning home, directed by Haile Gerima.', 'Drama', 'movie', NULL, 1, 85),
('Min Alesh?', 'A compelling Ethiopian drama about a young girl striving to become a marathon runner.', 'Drama/Sports', 'movie', NULL, 1, 89),
('Sost Maezen', 'An Ethiopian action-drama following the lives of three friends across different paths.', 'Action/Drama', 'movie', NULL, 1, 84);

-- ---------- INTERNATIONAL MOVIES ----------
INSERT INTO `items` (`title`, `description`, `genre`, `item_type`, `cover_image`, `is_ethiopian`, `popularity_score`) VALUES
('The Shawshank Redemption', 'Two imprisoned men bond over a number of years, finding solace and eventual redemption.', 'Drama', 'movie', NULL, 0, 98),
('Inception', 'A thief who steals corporate secrets through dreams. Directed by Christopher Nolan.', 'Sci-Fi', 'movie', NULL, 0, 95),
('The Godfather', 'The aging patriarch of an organized crime dynasty transfers control to his reluctant son.', 'Crime', 'movie', NULL, 0, 99),
('Parasite', 'Greed and class discrimination threaten the symbiotic relationship between the Park family and the Kim clan.', 'Thriller', 'movie', NULL, 0, 96),
('Interstellar', 'A team of explorers travel through a wormhole in space to ensure humanity''s survival.', 'Sci-Fi', 'movie', NULL, 0, 95);

-- ---------- ETHIOPIAN MUSIC ----------
INSERT INTO `items` (`title`, `description`, `genre`, `item_type`, `cover_image`, `is_ethiopian`, `popularity_score`) VALUES
('Tizita', 'Traditional Ethiopian melody expressing nostalgia and longing. Performed by the legendary Tilahun Gessesse.', 'Traditional', 'music', NULL, 1, 96),
('Bati', 'A pentatonic scale-based Ethiopian traditional music performed by Mahmoud Ahmed.', 'Traditional', 'music', NULL, 1, 90),
('Anchihoye Lene', 'Classic Ethiopian love song in Anchihoye scale by Aster Aweke.', 'Traditional', 'music', NULL, 1, 88),
('Ambassel', 'Soulful Ethiopian traditional melody from Wollo region by Mulatu Astatke.', 'Traditional', 'music', NULL, 1, 85),
('Guramayle', 'The iconic album that blended Ethiopian traditional sounds with jazz and pop by Gigi.', 'Ethio-Jazz', 'music', NULL, 1, 94),
('Tizita (Abebe)', 'A soul-stirring rendition of the classic Ethiopian mode of longing by Abebe Fekade.', 'Traditional', 'music', NULL, 1, 92),
('Ethiopia', 'A modern masterpiece celebrating Ethiopian heritage and unity by Teddy Afro.', 'Pop', 'music', NULL, 1, 96);

-- ---------- INTERNATIONAL MUSIC ----------
INSERT INTO `items` (`title`, `description`, `genre`, `item_type`, `cover_image`, `is_ethiopian`, `popularity_score`) VALUES
('Bohemian Rhapsody', 'Iconic rock song by Queen, a masterpiece of musical composition.', 'Rock', 'music', NULL, 0, 96),
('Shape of You', 'Popular pop song by Ed Sheeran that topped charts worldwide.', 'Pop', 'music', NULL, 0, 92),
('Thriller', 'The best-selling album of all time by Michael Jackson, redefining pop music.', 'Pop', 'music', NULL, 0, 98),
('One Love', 'The definitive reggae anthem of peace and unity by Bob Marley.', 'Reggae', 'music', NULL, 0, 97);


-- ============================================================================
-- BOOK DETAILS
-- ============================================================================
INSERT INTO `books` (`item_id`, `author`, `isbn`, `publisher`, `publication_year`, `page_count`, `language`) VALUES
-- Ethiopian Books
((SELECT id FROM items WHERE title = 'Oromay'), 'Bealu Girma', NULL, NULL, 1983, 320, 'Amharic'),
((SELECT id FROM items WHERE title = 'Fikir Eske Mekabir'), 'Haddis Alemayehu', NULL, NULL, 1968, 480, 'Amharic'),
((SELECT id FROM items WHERE title = 'The Beautiful Ones Are Not Yet Born'), 'Ayi Kwei Armah', NULL, NULL, 1968, 215, 'English'),
((SELECT id FROM items WHERE title = 'Dertogada'), 'Yismake Worku', NULL, NULL, 2012, 350, 'Amharic'),
((SELECT id FROM items WHERE title = 'Sememen'), 'Sisay Negusu', NULL, NULL, 2005, 280, 'Amharic'),
-- International Books
((SELECT id FROM items WHERE title = 'To Kill a Mockingbird'), 'Harper Lee', '978-0061120084', 'HarperCollins', 1960, 336, 'English'),
((SELECT id FROM items WHERE title = '1984'), 'George Orwell', '978-0451524935', 'Signet Classic', 1949, 328, 'English'),
((SELECT id FROM items WHERE title = 'The Alchemist'), 'Paulo Coelho', '978-0062315007', 'HarperOne', 1988, 208, 'English'),
((SELECT id FROM items WHERE title = 'Long Walk to Freedom'), 'Nelson Mandela', '978-0316548182', 'Back Bay Books', 1994, 656, 'English'),
((SELECT id FROM items WHERE title = 'Wings of Fire'), 'APJ Abdul Kalam', '978-8173711466', 'Universities Press', 1999, 180, 'English');


-- ============================================================================
-- MOVIE DETAILS
-- ============================================================================
INSERT INTO `movies` (`item_id`, `director`, `release_year`, `duration_minutes`, `language`, `country`, `cast_members`) VALUES
-- Ethiopian Movies
((SELECT id FROM items WHERE title = 'Lamb'), 'Yared Zeleke', 2015, 94, 'Amharic', 'Ethiopia', 'Rediat Amare, Kidist Siyum'),
((SELECT id FROM items WHERE title = 'Difret'), 'Zeresenay Mehari', 2014, 99, 'Amharic', 'Ethiopia', 'Meron Getnet, Tizita Hagere'),
((SELECT id FROM items WHERE title = 'Teza'), 'Haile Gerima', 2008, 140, 'Amharic', 'Ethiopia', 'Aaron Arefe, Abiye Tedla'),
((SELECT id FROM items WHERE title = 'Min Alesh?'), 'Abebe Kassa', 2018, 105, 'Amharic', 'Ethiopia', NULL),
((SELECT id FROM items WHERE title = 'Sost Maezen'), 'Various', 2016, 120, 'Amharic', 'Ethiopia', NULL),
-- International Movies
((SELECT id FROM items WHERE title = 'The Shawshank Redemption'), 'Frank Darabont', 1994, 142, 'English', 'USA', 'Tim Robbins, Morgan Freeman'),
((SELECT id FROM items WHERE title = 'Inception'), 'Christopher Nolan', 2010, 148, 'English', 'USA', 'Leonardo DiCaprio, Joseph Gordon-Levitt'),
((SELECT id FROM items WHERE title = 'The Godfather'), 'Francis Ford Coppola', 1972, 175, 'English', 'USA', 'Marlon Brando, Al Pacino'),
((SELECT id FROM items WHERE title = 'Parasite'), 'Bong Joon-ho', 2019, 132, 'Korean', 'South Korea', 'Song Kang-ho, Lee Sun-kyun'),
((SELECT id FROM items WHERE title = 'Interstellar'), 'Christopher Nolan', 2014, 169, 'English', 'USA', 'Matthew McConaughey, Anne Hathaway');


-- ============================================================================
-- MUSIC DETAILS
-- ============================================================================
INSERT INTO `music` (`item_id`, `artist`, `album`, `release_year`, `duration_seconds`, `language`, `ethiopian_genre`) VALUES
-- Ethiopian Music
((SELECT id FROM items WHERE title = 'Tizita'), 'Tilahun Gessesse', 'Greatest Hits', 1970, 300, 'Amharic', 'Tizita'),
((SELECT id FROM items WHERE title = 'Bati'), 'Mahmoud Ahmed', 'Ere Mela Mela', 1975, 360, 'Amharic', 'Bati'),
((SELECT id FROM items WHERE title = 'Anchihoye Lene'), 'Aster Aweke', 'Aster', 1985, 280, 'Amharic', 'Anchihoye'),
((SELECT id FROM items WHERE title = 'Ambassel'), 'Mulatu Astatke', 'Ethio Jazz', 1972, 320, 'Amharic', 'Ambassel'),
((SELECT id FROM items WHERE title = 'Guramayle'), 'Gigi', 'Guramayle', 2001, 290, 'Amharic', 'Other'),
((SELECT id FROM items WHERE title = 'Tizita (Abebe)'), 'Abebe Fekade', NULL, 1980, 310, 'Amharic', 'Tizita'),
((SELECT id FROM items WHERE title = 'Ethiopia'), 'Teddy Afro', 'Ethiopia', 2017, 260, 'Amharic', 'Other'),
-- International Music
((SELECT id FROM items WHERE title = 'Bohemian Rhapsody'), 'Queen', 'A Night at the Opera', 1975, 354, 'English', NULL),
((SELECT id FROM items WHERE title = 'Shape of You'), 'Ed Sheeran', 'Divide', 2017, 234, 'English', NULL),
((SELECT id FROM items WHERE title = 'Thriller'), 'Michael Jackson', 'Thriller', 1982, 357, 'English', NULL),
((SELECT id FROM items WHERE title = 'One Love'), 'Bob Marley', 'Exodus', 1977, 291, 'English', NULL);


-- ============================================================================
-- ETHIOPIAN CONTENT METADATA
-- ============================================================================
INSERT INTO `ethiopian_content_metadata` (`item_id`, `amharic_title`, `cultural_significance`, `region`, `traditional_genre`, `historical_period`) VALUES
-- Books
((SELECT id FROM items WHERE title = 'Oromay'), 'ኦሮማይ', 'Reflects Ethiopian resistance against colonialism and the Italian invasion', 'National', NULL, 'Italian Invasion Era'),
((SELECT id FROM items WHERE title = 'Fikir Eske Mekabir'), 'ፍቅር እስከ መቃብር', 'Considered the greatest Amharic novel ever written, exploring Ethiopian love and social values', 'National', NULL, 'Imperial Era'),
((SELECT id FROM items WHERE title = 'Dertogada'), 'ደርቶጋዳ', 'Pioneering Amharic science fiction that explores technology and national identity', 'National', NULL, 'Contemporary'),
((SELECT id FROM items WHERE title = 'Sememen'), 'ሰመመን', 'Deep exploration of Ethiopian psychological and social fabric', 'National', NULL, 'Contemporary'),
-- Movies
((SELECT id FROM items WHERE title = 'Lamb'), 'በግ', 'First Ethiopian film selected for Cannes Film Festival, representing Ethiopian cinema internationally', 'Simien', NULL, 'Contemporary'),
((SELECT id FROM items WHERE title = 'Difret'), 'ድፍረት', 'Based on true story, highlights the struggle against harmful traditional practices', 'National', NULL, 'Contemporary'),
((SELECT id FROM items WHERE title = 'Teza'), 'ጤዛ', 'Explores the Ethiopian intellectual diaspora experience and return during the Derg era', 'National', NULL, 'Derg Era'),
((SELECT id FROM items WHERE title = 'Min Alesh?'), 'ምን አለሽ?', 'Inspiring Ethiopian sports drama', 'Addis Ababa', NULL, 'Contemporary'),
-- Music
((SELECT id FROM items WHERE title = 'Tizita'), 'ትዝታ', 'The quintessential Ethiopian musical mode expressing longing and nostalgia', 'National', 'Tizita', 'Golden Age of Ethiopian Music'),
((SELECT id FROM items WHERE title = 'Bati'), 'ባቲ', 'Named after the town of Bati, represents Ethiopian pentatonic musical heritage', 'Wollo', 'Bati', 'Golden Age'),
((SELECT id FROM items WHERE title = 'Anchihoye Lene'), 'አንቺሆዬ ለኔ', 'Classic Ethiopian love song showcasing the Anchihoye scale', 'National', 'Anchihoye', NULL),
((SELECT id FROM items WHERE title = 'Ambassel'), 'አምባሰል', 'Soulful melody originating from the Wollo region, a foundation of Ethiopian music', 'Wollo', 'Ambassel', NULL),
((SELECT id FROM items WHERE title = 'Guramayle'), 'ጉራማይሌ', 'Pioneering fusion of Ethiopian traditional sounds with jazz and world music', 'National', NULL, 'Contemporary'),
((SELECT id FROM items WHERE title = 'Ethiopia'), 'ኢትዮጵያ', 'Modern anthem celebrating Ethiopian heritage, unity and pride', 'National', NULL, 'Contemporary');


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
SELECT '===== DATABASE SETUP COMPLETE =====' AS status;

SELECT 'Users' AS `Table`, COUNT(*) AS `Count` FROM users
UNION ALL
SELECT 'Items', COUNT(*) FROM items
UNION ALL
SELECT 'Books', COUNT(*) FROM books
UNION ALL
SELECT 'Movies', COUNT(*) FROM movies
UNION ALL
SELECT 'Music', COUNT(*) FROM music
UNION ALL
SELECT 'Ethiopian Metadata', COUNT(*) FROM ethiopian_content_metadata
UNION ALL
SELECT 'Preferences', COUNT(*) FROM preferences;

SELECT
  CONCAT('Total Items: ', COUNT(*)) AS summary,
  CONCAT('Ethiopian: ', SUM(is_ethiopian)) AS ethiopian,
  CONCAT('International: ', SUM(NOT is_ethiopian)) AS international
FROM items;

SELECT
  item_type,
  COUNT(*) AS count,
  SUM(is_ethiopian) AS ethiopian,
  SUM(NOT is_ethiopian) AS international
FROM items
GROUP BY item_type
ORDER BY item_type;

SELECT '===== Admin Login =====' AS info;
SELECT 'Email: admin@example.com' AS credentials
UNION ALL
SELECT 'Password: admin123';
