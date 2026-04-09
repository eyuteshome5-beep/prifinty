-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: ethiopian_recommendations
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `books`
--

DROP TABLE IF EXISTS `books`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `books` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `author` varchar(255) NOT NULL,
  `isbn` varchar(20) DEFAULT NULL,
  `publisher` varchar(255) DEFAULT NULL,
  `publication_year` int DEFAULT NULL,
  `page_count` int DEFAULT NULL,
  `language` varchar(50) DEFAULT 'English',
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_id` (`item_id`),
  KEY `idx_author` (`author`),
  CONSTRAINT `books_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `books`
--

LOCK TABLES `books` WRITE;
/*!40000 ALTER TABLE `books` DISABLE KEYS */;
INSERT INTO `books` VALUES (1,1,'Bealu Girma',NULL,NULL,1983,NULL,'Amharic'),(2,2,'Haddis Alemayehu',NULL,NULL,1968,NULL,'Amharic'),(3,3,'Ayi Kwei Armah',NULL,NULL,1968,NULL,'English'),(4,13,'Harper Lee',NULL,NULL,1960,NULL,'English'),(5,14,'George Orwell',NULL,NULL,1949,NULL,'English');
/*!40000 ALTER TABLE `books` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `credit_transactions`
--

DROP TABLE IF EXISTS `credit_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `credit_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `amount` int NOT NULL,
  `transaction_type` enum('recommendation','search','rating','bonus','purchase','refund') NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `balance_after` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_transactions` (`user_id`,`created_at` DESC),
  CONSTRAINT `credit_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `credit_transactions`
--

LOCK TABLES `credit_transactions` WRITE;
/*!40000 ALTER TABLE `credit_transactions` DISABLE KEYS */;
INSERT INTO `credit_transactions` VALUES (1,1,5,'bonus','Daily login bonus',10004,'2026-04-04 14:27:13'),(2,1,-5,'recommendation','Get all recommendations',9999,'2026-04-04 14:27:16'),(3,1,-5,'recommendation','Get all recommendations',9994,'2026-04-04 14:27:16'),(4,1,-5,'recommendation','Get all recommendations',9989,'2026-04-04 14:28:36'),(5,1,-5,'recommendation','Get all recommendations',9984,'2026-04-04 14:28:37'),(6,1,-5,'recommendation','Get all recommendations',9979,'2026-04-04 14:29:09'),(7,1,-5,'recommendation','Get all recommendations',9974,'2026-04-04 14:29:09'),(8,1,2,'rating','Rating reward for Teza',9976,'2026-04-04 14:32:47'),(9,1,2,'rating','Rating reward for Tizita',9978,'2026-04-04 14:33:06'),(10,1,-1,'search','Search: fkreske mekabr',9977,'2026-04-04 14:33:38');
/*!40000 ALTER TABLE `credit_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ethiopian_content_metadata`
--

DROP TABLE IF EXISTS `ethiopian_content_metadata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ethiopian_content_metadata` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `amharic_title` varchar(255) DEFAULT NULL,
  `cultural_significance` text,
  `region` varchar(100) DEFAULT NULL,
  `traditional_genre` varchar(100) DEFAULT NULL,
  `historical_period` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_id` (`item_id`),
  CONSTRAINT `ethiopian_content_metadata_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ethiopian_content_metadata`
--

LOCK TABLES `ethiopian_content_metadata` WRITE;
/*!40000 ALTER TABLE `ethiopian_content_metadata` DISABLE KEYS */;
INSERT INTO `ethiopian_content_metadata` VALUES (1,1,'ßèªßê«ßêøßï¡','Reflects Ethiopian resistance against colonialism','National',NULL,NULL,'2026-04-04 14:09:52'),(2,2,'ßììßëàßê¡ ßèÑßêÁßè¿ ßêÿßëâßëÑßê¡','Considered the greatest Amharic novel ever written','National',NULL,NULL,'2026-04-04 14:09:52'),(3,7,'ßëÁßïØßë│','The quintessential Ethiopian musical mode expressing longing','National','Tizita',NULL,'2026-04-04 14:09:52'),(4,8,'ßëúßë▓','Named after the town of Bati, represents Ethiopian musical heritage','Wollo','Bati',NULL,'2026-04-04 14:09:52');
/*!40000 ALTER TABLE `ethiopian_content_metadata` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `genre` varchar(100) DEFAULT NULL,
  `item_type` enum('book','movie','music') NOT NULL,
  `cover_image` varchar(500) DEFAULT NULL,
  `is_ethiopian` tinyint(1) DEFAULT '0',
  `popularity_score` float DEFAULT '0',
  `avg_rating` float DEFAULT '0',
  `rating_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_item_type` (`item_type`),
  KEY `idx_genre` (`genre`),
  KEY `idx_is_ethiopian` (`is_ethiopian`),
  FULLTEXT KEY `idx_search` (`title`,`description`,`genre`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
INSERT INTO `items` VALUES (1,'Oromay','A powerful Ethiopian novel about love and war during the Italian invasion.','Historical Fiction','book',NULL,1,85,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52'),(2,'Fikir Eske Mekabir','Classic Ethiopian love story, one of the most celebrated Amharic novels.','Romance','book',NULL,1,95,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52'),(3,'The Beautiful Ones Are Not Yet Born','A novel exploring post-colonial African identity.','Literary Fiction','book',NULL,1,78,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52'),(4,'Lamb','An Ethiopian boy befriends a lamb in this touching drama.','Drama','movie',NULL,1,88,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52'),(5,'Difret','Based on a true story of an Ethiopian girl who fights against abduction.','Drama','movie',NULL,1,92,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52'),(6,'Teza','A powerful film about an Ethiopian intellectual returning home.','Drama','movie',NULL,1,85,5,1,'2026-04-04 14:09:52','2026-04-04 14:32:47'),(7,'Tizita','Traditional Ethiopian melody expressing nostalgia and longing.','Traditional','music',NULL,1,96,2,1,'2026-04-04 14:09:52','2026-04-04 14:33:06'),(8,'Bati','A pentatonic scale-based Ethiopian traditional music.','Traditional','music',NULL,1,90,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52'),(9,'Anchihoye Lene','Classic Ethiopian love song in Anchihoye scale.','Traditional','music',NULL,1,88,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52'),(10,'Ambassel','Soulful Ethiopian traditional melody from Wollo region.','Traditional','music',NULL,1,85,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52'),(11,'The Shawshank Redemption','Two imprisoned men bond over a number of years.','Drama','movie',NULL,0,98,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52'),(12,'Inception','A thief who steals corporate secrets through dreams.','Sci-Fi','movie',NULL,0,95,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52'),(13,'To Kill a Mockingbird','A classic novel about racial injustice in the American South.','Literary Fiction','book',NULL,0,97,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52'),(14,'1984','A dystopian novel set in a totalitarian society.','Dystopian','book',NULL,0,94,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52'),(15,'Bohemian Rhapsody','Iconic rock song by Queen.','Rock','music',NULL,0,96,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52'),(16,'Shape of You','Popular pop song by Ed Sheeran.','Pop','music',NULL,0,92,0,0,'2026-04-04 14:09:52','2026-04-04 14:09:52');
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movies`
--

DROP TABLE IF EXISTS `movies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `director` varchar(255) NOT NULL,
  `release_year` int DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `language` varchar(50) DEFAULT 'English',
  `country` varchar(100) DEFAULT NULL,
  `cast_members` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_id` (`item_id`),
  KEY `idx_director` (`director`),
  KEY `idx_release_year` (`release_year`),
  CONSTRAINT `movies_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movies`
--

LOCK TABLES `movies` WRITE;
/*!40000 ALTER TABLE `movies` DISABLE KEYS */;
INSERT INTO `movies` VALUES (1,4,'Yared Zeleke',2015,NULL,'Amharic','Ethiopia',NULL),(2,5,'Zeresenay Mehari',2014,NULL,'Amharic','Ethiopia',NULL),(3,6,'Haile Gerima',2008,NULL,'Amharic','Ethiopia',NULL),(4,11,'Frank Darabont',1994,NULL,'English','USA',NULL),(5,12,'Christopher Nolan',2010,NULL,'English','USA',NULL);
/*!40000 ALTER TABLE `movies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `music`
--

DROP TABLE IF EXISTS `music`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `music` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `artist` varchar(255) NOT NULL,
  `album` varchar(255) DEFAULT NULL,
  `release_year` int DEFAULT NULL,
  `duration_seconds` int DEFAULT NULL,
  `language` varchar(50) DEFAULT 'English',
  `ethiopian_genre` enum('Tizita','Bati','Anchihoye','Ambassel','Other') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_id` (`item_id`),
  KEY `idx_artist` (`artist`),
  KEY `idx_ethiopian_genre` (`ethiopian_genre`),
  CONSTRAINT `music_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `music`
--

LOCK TABLES `music` WRITE;
/*!40000 ALTER TABLE `music` DISABLE KEYS */;
INSERT INTO `music` VALUES (1,7,'Tilahun Gessesse',NULL,1970,NULL,'Amharic','Tizita'),(2,8,'Mahmoud Ahmed',NULL,1975,NULL,'Amharic','Bati'),(3,9,'Aster Aweke',NULL,1985,NULL,'Amharic','Anchihoye'),(4,10,'Mulatu Astatke',NULL,1972,NULL,'Amharic','Ambassel'),(5,15,'Queen',NULL,1975,NULL,'English',NULL),(6,16,'Ed Sheeran',NULL,2017,NULL,'English',NULL);
/*!40000 ALTER TABLE `music` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `preferences`
--

DROP TABLE IF EXISTS `preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `preferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `preferred_genres` json DEFAULT NULL,
  `preferred_languages` json DEFAULT NULL,
  `ethiopian_content_preference` tinyint(1) DEFAULT '0',
  `notification_enabled` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_prefs` (`user_id`),
  CONSTRAINT `preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `preferences`
--

LOCK TABLES `preferences` WRITE;
/*!40000 ALTER TABLE `preferences` DISABLE KEYS */;
/*!40000 ALTER TABLE `preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ratings`
--

DROP TABLE IF EXISTS `ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ratings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `rating` tinyint NOT NULL,
  `review` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_item` (`user_id`,`item_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_item_id` (`item_id`),
  CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_chk_1` CHECK (((`rating` >= 1) and (`rating` <= 5)))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ratings`
--

LOCK TABLES `ratings` WRITE;
/*!40000 ALTER TABLE `ratings` DISABLE KEYS */;
INSERT INTO `ratings` VALUES (1,1,6,5,'','2026-04-04 14:32:47','2026-04-04 14:32:47'),(2,1,7,2,'','2026-04-04 14:33:06','2026-04-04 14:33:06');
/*!40000 ALTER TABLE `ratings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recommendations`
--

DROP TABLE IF EXISTS `recommendations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recommendations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `score` float NOT NULL,
  `algorithm_type` enum('collaborative','content_based','hybrid','cross_domain') NOT NULL,
  `explanation` text,
  `is_viewed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `idx_user_recommendations` (`user_id`,`score` DESC),
  CONSTRAINT `recommendations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recommendations_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recommendations`
--

LOCK TABLES `recommendations` WRITE;
/*!40000 ALTER TABLE `recommendations` DISABLE KEYS */;
INSERT INTO `recommendations` VALUES (1,1,11,0.816667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:16'),(2,1,13,0.808333,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:16'),(3,1,7,0.8,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:16'),(4,1,15,0.8,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:16'),(5,1,2,0.791667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:16'),(6,1,12,0.791667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:16'),(7,1,14,0.783333,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:16'),(8,1,5,0.766667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:16'),(9,1,11,0.816667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:16'),(10,1,13,0.808333,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:16'),(11,1,7,0.8,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:16'),(12,1,15,0.8,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:16'),(13,1,2,0.791667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:17'),(14,1,12,0.791667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:17'),(15,1,14,0.783333,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:17'),(16,1,5,0.766667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:27:17'),(17,1,11,0.816667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:36'),(18,1,13,0.808333,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:36'),(19,1,7,0.8,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:36'),(20,1,15,0.8,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:36'),(21,1,2,0.791667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:36'),(22,1,12,0.791667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:36'),(23,1,14,0.783333,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:36'),(24,1,5,0.766667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:36'),(25,1,11,0.816667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:37'),(26,1,13,0.808333,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:37'),(27,1,7,0.8,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:37'),(28,1,15,0.8,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:37'),(29,1,2,0.791667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:37'),(30,1,12,0.791667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:37'),(31,1,14,0.783333,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:37'),(32,1,5,0.766667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:28:37'),(33,1,11,0.816667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(34,1,13,0.808333,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(35,1,7,0.8,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(36,1,15,0.8,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(37,1,2,0.791667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(38,1,12,0.791667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(39,1,14,0.783333,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(40,1,5,0.766667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(41,1,11,0.816667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(42,1,13,0.808333,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(43,1,7,0.8,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(44,1,15,0.8,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(45,1,2,0.791667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(46,1,12,0.791667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(47,1,14,0.783333,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09'),(48,1,5,0.766667,'hybrid','Recommended based on your preferences',0,'2026-04-04 14:29:09');
/*!40000 ALTER TABLE `recommendations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_activity`
--

DROP TABLE IF EXISTS `user_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_activity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `activity_type` enum('view','search','rate','wishlist','recommendation') NOT NULL,
  `item_id` int DEFAULT NULL,
  `details` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `idx_user_activity` (`user_id`,`created_at` DESC),
  CONSTRAINT `user_activity_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_activity_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_activity`
--

LOCK TABLES `user_activity` WRITE;
/*!40000 ALTER TABLE `user_activity` DISABLE KEYS */;
INSERT INTO `user_activity` VALUES (1,1,'recommendation',NULL,'{\"type\": null, \"count\": 8, \"algorithm\": \"hybrid\"}','2026-04-04 14:27:16'),(2,1,'recommendation',NULL,'{\"type\": null, \"count\": 8, \"algorithm\": \"hybrid\"}','2026-04-04 14:27:17'),(3,1,'recommendation',NULL,'{\"type\": null, \"count\": 8, \"algorithm\": \"hybrid\"}','2026-04-04 14:28:36'),(4,1,'recommendation',NULL,'{\"type\": null, \"count\": 8, \"algorithm\": \"hybrid\"}','2026-04-04 14:28:37'),(5,1,'recommendation',NULL,'{\"type\": null, \"count\": 8, \"algorithm\": \"hybrid\"}','2026-04-04 14:29:09'),(6,1,'recommendation',NULL,'{\"type\": null, \"count\": 8, \"algorithm\": \"hybrid\"}','2026-04-04 14:29:09'),(7,1,'rate',6,'{\"rating\": 5}','2026-04-04 14:32:47'),(8,1,'rate',7,'{\"rating\": 2}','2026-04-04 14:33:06'),(9,1,'search',NULL,'{\"query\": \"fkreske mekabr\", \"results\": 0}','2026-04-04 14:33:38');
/*!40000 ALTER TABLE `user_activity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('guest','user','admin') DEFAULT 'user',
  `credits` int DEFAULT '100',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','admin@example.com','$2b$12$SGW.VbAnYaJwiX2WDJGcDOHGbijDs3XqvVrTMpzjMAK9b3x2KC7c2','admin',9977,'2026-04-04 14:09:52','2026-04-04 14:33:38','2026-04-04 11:27:13',1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wishlist`
--

DROP TABLE IF EXISTS `wishlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wishlist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_wishlist` (`user_id`,`item_id`),
  KEY `item_id` (`item_id`),
  KEY `idx_user_wishlist` (`user_id`),
  CONSTRAINT `wishlist_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wishlist_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wishlist`
--

LOCK TABLES `wishlist` WRITE;
/*!40000 ALTER TABLE `wishlist` DISABLE KEYS */;
/*!40000 ALTER TABLE `wishlist` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-04 21:26:25
