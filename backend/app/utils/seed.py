"""
Seeding utilities for adding Ethiopian-focused sample content.

This module is intentionally lightweight and uses the application's
`execute_query` helpers so it runs inside the running Flask app and
leverages the configured DB connection pool.
"""
from flask import current_app
from app.utils.database import execute_query


CURATED_COVERS = {
    # Movies
    "Min Alesh?": "https://m.media-amazon.com/images/M/MV5BZGY5OWU1YzAtNWRjOC00NzZmLTgwNmItMDcyMGM0Yzk2NjJmXkEyXkFqcGdeQXVyMTAwMDI3MTc3._V1_FMjpg_UX1000_.jpg",
    "Sost Maezen": "https://m.media-amazon.com/images/M/MV5BMTQ4NzA2NDM0MF5BMl5BanBnXkFtZTcwNTI3NDU5OQ@@._V1_FMjpg_UX1000_.jpg",
    "Lamb": "https://m.media-amazon.com/images/M/MV5BNGQ0MWNjZjMtYjgxMC00NTA1LTk5MGYtOTUzMmFlNWE5YTUzXkEyXkFqcGdeQXVyMjA0MzYwMDY@._V1_FMjpg_UX1000_.jpg",
    "Teza": "https://m.media-amazon.com/images/M/MV5BMTM3MTQ0NzU3N15BMl5BanBnXkFtZTcwMzg5ODg5Mg@@._V1_FMjpg_UX1000_.jpg",
    "Difret": "https://m.media-amazon.com/images/M/MV5BMTY3NTYwMjk3Nl5BMl5BanBnXkFtZTgwNjkyMjQzMjE@._V1_FMjpg_UX1000_.jpg",
    "Atletu (The Athlete)": "https://m.media-amazon.com/images/M/MV5BMTQwMDMwNzk3M15BMl5BanBnXkFtZTcwNzU2MjcyNA@@._V1_FMjpg_UX1000_.jpg",
    
    # Music
    "Guramayle": "https://m.media-amazon.com/images/I/51HkE6X3ZqL._SS500_.jpg",
    "Tizita (Abebe)": "https://m.media-amazon.com/images/I/51H-k-z1aOL._SS500_.jpg",
    "Ethiopia": "https://i.ytimg.com/vi/K7kXlhvcfbE/maxresdefault.jpg",
    
    # Books
    "Dertogada": "https://books.google.com/books/content?id=V2NFEAAAQBAJ&printsec=frontcover&img=1&zoom=1",
    "Sememen": "https://books.google.com/books/content?id=O2NFEAAAQBAJ&printsec=frontcover&img=1&zoom=1",
    "Fikir Eske Mekaber": "https://books.google.com/books/content?id=O2NFEAAAQBAJ&printsec=frontcover&img=1&zoom=1",
    "The Beautiful Things That Heaven Bears": "https://books.google.com/books/content?id=qY94DwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    "Beneath the Lion's Gaze": "https://books.google.com/books/content?id=a613AwAAQBAJ&printsec=frontcover&img=1&zoom=1",
    "Cutting for Stone": "https://books.google.com/books/content?id=y9PqDAAAQBAJ&printsec=frontcover&img=1&zoom=1"
}

def run_seed_items():
    """Insert seed items if they do not already exist.

    Returns the number of items actually inserted.
    """
    items = [
        # Movies
        ("Min Alesh?", "A compelling Ethiopian drama about a young girl striving to become a marathon runner.", "Drama/Sports", "movie", 1, 89),
        ("Sost Maezen", "An Ethiopian action-drama following the lives of three friends across different paths.", "Action/Drama", "movie", 1, 84),
        ("Lamb", "A moving story of a young Ethiopian boy and his lamb, exploring tradition and change.", "Drama", "movie", 1, 90),
        ("Teza", "A haunting film about diaspora, memory, and the political upheavals of Ethiopia.", "Drama", "movie", 1, 91),
        ("Difret", "True-story legal drama about a young Ethiopian girl and the lawyer who defends her.", "Drama", "movie", 1, 89),
        ("Atletu (The Athlete)", "A biographical film chronicling the life and triumphs of Ethiopian marathoners.", "Biography/Documentary", "movie", 1, 88),

        # Music
        ("Guramayle", "The iconic album that blended Ethiopian traditional sounds with jazz and pop.", "Ethio-Jazz", "music", 1, 94),
        ("Tizita (Abebe)", "A soul-stirring rendition of the classic Ethiopian mode of longing.", "Traditional", "music", 1, 92),
        ("Ethiopia", "A modern masterpiece celebrating Ethiopian heritage and unity.", "Pop", "music", 1, 96),

        # Books
        ("Dertogada", "A groundbreaking Amharic science fiction thriller exploring secret technology and national identity.", "Sci-Fi", "book", 1, 91),
        ("Sememen", "A deep dive into the psychological and social fabric of Ethiopian society.", "Fiction", "book", 1, 88),
        ("Fikir Eske Mekaber", "A classic Amharic novel exploring love, faith, and social change in Ethiopia.", "Classic", "book", 1, 93),
        ("The Beautiful Things That Heaven Bears", "A novel about Ethiopian immigrants navigating life in Washington, D.C.", "Fiction", "book", 1, 90),
        ("Beneath the Lion's Gaze", "A powerful family drama set during the Ethiopian revolution.", "Historical Fiction", "book", 1, 92),
        ("Cutting for Stone", "A sweeping novel set partly in Ethiopia about twin brothers raised in a mission hospital.", "Fiction", "book", 1, 94),
    ]

    inserted = 0

    for title, desc, genre, i_type, is_eth, pop in items:
        try:
            # 1. Determine cover image URL
            cover = CURATED_COVERS.get(title, '')
            if not cover:
                try:
                    from app.services.media_api import MediaAPIService
                    candidates = MediaAPIService.search(i_type, title)
                    if candidates:
                        cover = candidates[0].get('cover_image') or ''
                except Exception as e:
                    current_app.logger.warning(f"Seed: failed to fetch cover dynamically for {title}: {e}")

            existing = execute_query("SELECT id, cover_image FROM items WHERE title = %s", (title,), fetch_one=True)
            if existing:
                # If cover_image is empty/missing, update it in the database
                if (not existing.get('cover_image') or existing.get('cover_image') == '') and cover:
                    execute_query(
                        "UPDATE items SET cover_image = %s WHERE id = %s",
                        (cover, existing['id']),
                        fetch_all=False
                    )
                    current_app.logger.info(f"Seed: Updated cover image for existing item: {title}")
                else:
                    current_app.logger.info(f"Seed: Skipping existing item: {title}")
                continue

            item_id = execute_query(
                """INSERT INTO items (title, description, genre, item_type, cover_image, is_ethiopian, popularity_score)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (title, desc, genre, i_type, cover, bool(is_eth), pop),
                fetch_all=False
            )

            if i_type == 'movie':
                director = 'Various'
                if title == 'Min Alesh?':
                    director = 'Abebe Kassa'
                elif title == 'Sost Maezen':
                    director = 'Various'
                elif title == 'Lamb':
                    director = 'Yared Zeleke'
                elif title == 'Teza':
                    director = 'Haile Gerima'
                elif title == 'Difret':
                    director = 'Zeresenay Berhane Mehari'
                elif title == 'Atletu (The Athlete)':
                    director = 'Various'

                execute_query("INSERT INTO movies (item_id, director) VALUES (%s, %s)", (item_id, director), fetch_all=False)

            elif i_type == 'music':
                artist = 'Various'
                eth_genre = None
                if title == 'Guramayle':
                    artist = 'Gigi'
                elif title == 'Tizita (Abebe)':
                    artist = 'Abebe Fekade'
                    eth_genre = 'Tizita'
                elif title == 'Ethiopia':
                    artist = 'Teddy Afro'

                execute_query(
                    "INSERT INTO music (item_id, artist, ethiopian_genre) VALUES (%s, %s, %s)",
                    (item_id, artist, eth_genre),
                    fetch_all=False
                )

            elif i_type == 'book':
                author = 'Various'
                if title == 'Dertogada':
                    author = 'Yismake Worku'
                elif title == 'Sememen':
                    author = 'Sisay Negusu'
                elif title == 'Fikir Eske Mekaber':
                    author = 'Haddis Alemayehu'
                elif title == 'The Beautiful Things That Heaven Bears':
                    author = 'Dinaw Mengestu'
                elif title == "Beneath the Lion's Gaze":
                    author = 'Maaza Mengiste'
                elif title == 'Cutting for Stone':
                    author = 'Abraham Verghese'

                execute_query("INSERT INTO books (item_id, author) VALUES (%s, %s)", (item_id, author), fetch_all=False)

            if is_eth:
                try:
                    execute_query("INSERT INTO ethiopian_content_metadata (item_id, amharic_title) VALUES (%s, %s)", (item_id, title), fetch_all=False)
                except Exception as e:
                    current_app.logger.warning(f"Seed: could not insert ethiopian metadata for {title}: {e}")

            inserted += 1

        except Exception as e:
            current_app.logger.error(f"Seed error for {title}: {e}")
            # Continue seeding other items even if one fails
            continue

    current_app.logger.info(f"Seed completed. Inserted: {inserted}")
    return inserted

