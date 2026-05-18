-- Additional Ethiopian seeds (safe to run multiple times)
-- Inserts items only if a matching title does not already exist, then inserts type-specific rows and Ethiopian metadata if missing.

-- Atletu (movie)
INSERT INTO items (title, description, genre, item_type, cover_image, is_ethiopian, popularity_score)
SELECT 'Atletu (The Athlete)', 'Documentary about Ethiopian runners and their legacy.', 'Documentary', 'movie', NULL, 1, 85
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM items WHERE title = 'Atletu (The Athlete)');

INSERT INTO movies (item_id, director)
SELECT i.id, 'Various' FROM items i
LEFT JOIN movies m ON m.item_id = i.id
WHERE i.title = 'Atletu (The Athlete)' AND m.item_id IS NULL;

INSERT INTO ethiopian_content_metadata (item_id, amharic_title)
SELECT i.id, 'አትለቱ' FROM items i
LEFT JOIN ethiopian_content_metadata e ON e.item_id = i.id
WHERE i.title = 'Atletu (The Athlete)' AND e.item_id IS NULL;

-- Yegna (movie)
INSERT INTO items (title, description, genre, item_type, cover_image, is_ethiopian, popularity_score)
SELECT 'Yegna', 'A drama-musical following a girl group''s rise and social impact in Ethiopia.', 'Drama/Musical', 'movie', NULL, 1, 82
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM items WHERE title = 'Yegna');

INSERT INTO movies (item_id, director)
SELECT i.id, 'Various' FROM items i
LEFT JOIN movies m ON m.item_id = i.id
WHERE i.title = 'Yegna' AND m.item_id IS NULL;

INSERT INTO ethiopian_content_metadata (item_id, amharic_title)
SELECT i.id, 'የኛ' FROM items i
LEFT JOIN ethiopian_content_metadata e ON e.item_id = i.id
WHERE i.title = 'Yegna' AND e.item_id IS NULL;

-- Oromay (book)
INSERT INTO items (title, description, genre, item_type, cover_image, is_ethiopian, popularity_score)
SELECT 'Oromay', 'A powerful Amharic novel about love and war during the Italian invasion. Written by Bealu Girma.', 'Historical Fiction', 'book', NULL, 1, 87
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM items WHERE title = 'Oromay');

INSERT INTO books (item_id, author)
SELECT i.id, 'Bealu Girma' FROM items i
LEFT JOIN books b ON b.item_id = i.id
WHERE i.title = 'Oromay' AND b.item_id IS NULL;

INSERT INTO ethiopian_content_metadata (item_id, amharic_title)
SELECT i.id, 'ኦሮማይ' FROM items i
LEFT JOIN ethiopian_content_metadata e ON e.item_id = i.id
WHERE i.title = 'Oromay' AND e.item_id IS NULL;

-- The Beautiful Ones Are Not Yet Born (book)
INSERT INTO items (title, description, genre, item_type, cover_image, is_ethiopian, popularity_score)
SELECT 'The Beautiful Ones Are Not Yet Born', 'A novel exploring post-colonial African identity by Ayi Kwei Armah.', 'Literary Fiction', 'book', NULL, 1, 86
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM items WHERE title = 'The Beautiful Ones Are Not Yet Born');

INSERT INTO books (item_id, author)
SELECT i.id, 'Ayi Kwei Armah' FROM items i
LEFT JOIN books b ON b.item_id = i.id
WHERE i.title = 'The Beautiful Ones Are Not Yet Born' AND b.item_id IS NULL;

INSERT INTO ethiopian_content_metadata (item_id, amharic_title)
SELECT i.id, NULL FROM items i
LEFT JOIN ethiopian_content_metadata e ON e.item_id = i.id
WHERE i.title = 'The Beautiful Ones Are Not Yet Born' AND e.item_id IS NULL;

-- Ye Fikir (book)
INSERT INTO items (title, description, genre, item_type, cover_image, is_ethiopian, popularity_score)
SELECT 'Ye Fikir', 'A classic-style tale of love and society in Ethiopia.', 'Fiction', 'book', NULL, 1, 85
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM items WHERE title = 'Ye Fikir');

INSERT INTO books (item_id, author)
SELECT i.id, 'Various' FROM items i
LEFT JOIN books b ON b.item_id = i.id
WHERE i.title = 'Ye Fikir' AND b.item_id IS NULL;

INSERT INTO ethiopian_content_metadata (item_id, amharic_title)
SELECT i.id, NULL FROM items i
LEFT JOIN ethiopian_content_metadata e ON e.item_id = i.id
WHERE i.title = 'Ye Fikir' AND e.item_id IS NULL;

-- End of additional seeds
