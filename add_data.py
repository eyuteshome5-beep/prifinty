import os
import mysql.connector
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

def add_new_content():
    try:
        db = mysql.connector.connect(
            host=os.getenv('MYSQL_HOST', 'localhost'),
            user=os.getenv('MYSQL_USER', 'root'),
            password=os.getenv('MYSQL_PASSWORD', 'root123'),
            database=os.getenv('MYSQL_DB', 'ethiopian_recommendations')
        )
        cursor = db.cursor()

        # New Items to add (title, description, genre, item_type, is_ethiopian, popularity_score)
        new_items = [
            # Movies
            ("Min Alesh?", "A compelling Ethiopian drama about a young girl striving to become a marathon runner.", "Drama/Sports", "movie", 1, 89),
            ("The Godfather", "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.", "Crime", "movie", 0, 99),
            ("Parasite", "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.", "Thriller", "movie", 0, 96),
            ("Sost Maezen", "An Ethiopian action-drama following the lives of three friends across different paths.", "Action/Drama", "movie", 1, 84),
            ("Interstellar", "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.", "Sci-Fi", "movie", 0, 95),
            
            # Music
            ("Guramayle", "The iconic album that blended Ethiopian traditional sounds with jazz and pop.", "Ethio-Jazz", "music", 1, 94),
            ("Tizita (Abebe)", "A soul-stirring rendition of the classic Ethiopian mode of longing.", "Traditional", "music", 1, 92),
            ("Thriller", "The best-selling album of all time, redefining pop music.", "Pop", "music", 0, 98),
            ("One Love", "The definitive reggae anthem of peace and unity.", "Reggae", "music", 0, 97),
            ("Ethiopia", "A modern masterpiece celebrating Ethiopian heritage and unity.", "Pop", "music", 1, 96),

            # Books
            ("Dertogada", "A groundbreaking Amharic science fiction thriller exploring secret technology and national identity.", "Sci-Fi", "book", 1, 91),
            ("Sememen", "A deep dive into the psychological and social fabric of Ethiopian society.", "Fiction", "book", 1, 88),
            ("The Alchemist", "A fable about following your dream and listening to your heart.", "Adventure", "book", 0, 95),
            ("Long Walk to Freedom", "The inspiring autobiography of the first black president of South Africa.", "Biography", "book", 0, 96),
            ("Wings of Fire", "The autobiography of the 'Missile Man' of India, APJ Abdul Kalam.", "Biography", "book", 0, 92)
        ]

        for title, desc, genre, i_type, is_eth, pop in new_items:
            # Check if exists
            cursor.execute("SELECT id FROM items WHERE title = %s", (title,))
            if cursor.fetchone():
                print(f"Skipping {title}, already exists.")
                continue

            # Insert into items
            cursor.execute(
                "INSERT INTO items (title, description, genre, item_type, is_ethiopian, popularity_score) VALUES (%s, %s, %s, %s, %s, %s)",
                (title, desc, genre, i_type, is_eth, pop)
            )
            item_id = cursor.lastrowid

            # Insert into type-specific tables
            if i_type == 'movie':
                director = "Various"
                if title == "Min Alesh?": director = "Abebe Kassa"
                elif title == "The Godfather": director = "Francis Ford Coppola"
                elif title == "Parasite": director = "Bong Joon-ho"
                elif title == "Interstellar": director = "Christopher Nolan"
                
                cursor.execute("INSERT INTO movies (item_id, director) VALUES (%s, %s)", (item_id, director))
            
            elif i_type == 'music':
                artist = "Various"
                eth_genre = "Other"
                if title == "Guramayle": artist = "Gigi"
                elif title == "Tizita (Abebe)": artist = "Abebe Fekade"; eth_genre = "Tizita"
                elif title == "Thriller": artist = "Michael Jackson"
                elif title == "One Love": artist = "Bob Marley"
                elif title == "Ethiopia": artist = "Teddy Afro"
                
                cursor.execute("INSERT INTO music (item_id, artist, ethiopian_genre) VALUES (%s, %s, %s)", (item_id, artist, eth_genre))
            
            elif i_type == 'book':
                author = "Various"
                if title == "Dertogada": author = "Yismake Worku"
                elif title == "Sememen": author = "Sisay Negusu"
                elif title == "The Alchemist": author = "Paulo Coelho"
                elif title == "Long Walk to Freedom": author = "Nelson Mandela"
                elif title == "Wings of Fire": author = "APJ Abdul Kalam"
                
                cursor.execute("INSERT INTO books (item_id, author) VALUES (%s, %s)", (item_id, author))

            # Add Ethiopian metadata if applicable
            if is_eth:
                cursor.execute("INSERT INTO ethiopian_content_metadata (item_id, amharic_title) VALUES (%s, %s)", (item_id, title))

        db.commit()
        print("Successfully added 15 new items to the database!")
        cursor.close()
        db.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_new_content()
