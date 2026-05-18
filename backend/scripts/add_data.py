import os
import mysql.connector
from dotenv import load_dotenv

# Get absolute paths relative to this script
script_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.abspath(os.path.join(script_dir, '..', '.env'))

# Load environment variables
load_dotenv(dotenv_path)

def add_new_content():
    try:
        db = mysql.connector.connect(
            host=os.getenv('MYSQL_HOST', 'localhost'),
            user=os.getenv('MYSQL_USER', 'root'),
            password=os.getenv('MYSQL_PASSWORD', 'root123'),
            database=os.getenv('MYSQL_DB', 'ethiopian_recommendations'),
            port=int(os.getenv('MYSQL_PORT', 3306))
        )
        cursor = db.cursor()

        # New Items to add (title, description, genre, item_type, is_ethiopian, popularity_score)
        new_items = [
            # Movies (Ethiopian + international examples)
            ("Min Alesh?", "A compelling Ethiopian drama about a young girl striving to become a marathon runner.", "Drama/Sports", "movie", 1, 89),
            ("Sost Maezen", "An Ethiopian action-drama following the lives of three friends across different paths.", "Action/Drama", "movie", 1, 84),
            ("Lamb", "A moving story of a young Ethiopian boy and his lamb, exploring tradition and change.", "Drama", "movie", 1, 90),
            ("Teza", "A haunting film about diaspora, memory, and the political upheavals of Ethiopia.", "Drama", "movie", 1, 91),
            ("Difret", "True-story legal drama about a young Ethiopian girl and the lawyer who defends her.", "Drama", "movie", 1, 89),
            ("Atletu (The Athlete)", "A biographical film chronicling the life and triumphs of Ethiopian marathoners.", "Biography/Documentary", "movie", 1, 88),
            ("The Godfather", "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.", "Crime", "movie", 0, 99),
            ("Parasite", "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.", "Thriller", "movie", 0, 96),
            ("Interstellar", "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.", "Sci-Fi", "movie", 0, 95),

            # Music
            ("Guramayle", "The iconic album that blended Ethiopian traditional sounds with jazz and pop.", "Ethio-Jazz", "music", 1, 94),
            ("Tizita (Abebe)", "A soul-stirring rendition of the classic Ethiopian mode of longing.", "Traditional", "music", 1, 92),
            ("Ethiopia", "A modern masterpiece celebrating Ethiopian heritage and unity.", "Pop", "music", 1, 96),
            ("Thriller", "The best-selling album of all time, redefining pop music.", "Pop", "music", 0, 98),
            ("One Love", "The definitive reggae anthem of peace and unity.", "Reggae", "music", 0, 97),

            # Books (Ethiopian authors and Ethiopia-centered works)
            ("Dertogada", "A groundbreaking Amharic science fiction thriller exploring secret technology and national identity.", "Sci-Fi", "book", 1, 91),
            ("Sememen", "A deep dive into the psychological and social fabric of Ethiopian society.", "Fiction", "book", 1, 88),
            ("Fikir Eske Mekaber", "A classic Amharic novel exploring love, faith, and social change in Ethiopia.", "Classic", "book", 1, 93),
            ("The Beautiful Things That Heaven Bears", "A novel about Ethiopian immigrants navigating life in Washington, D.C.", "Fiction", "book", 1, 90),
            ("Beneath the Lion's Gaze", "A powerful family drama set during the Ethiopian revolution.", "Historical Fiction", "book", 1, 92),
            ("Cutting for Stone", "A sweeping novel set partly in Ethiopia about twin brothers raised in a mission hospital.", "Fiction", "book", 1, 94),
            ("The Alchemist", "A fable about following your dream and listening to your heart.", "Adventure", "book", 0, 95),
            ("Long Walk to Freedom", "The inspiring autobiography of the first black president of South Africa.", "Biography", "book", 0, 96),
            ("Wings of Fire", "The autobiography of the 'Missile Man' of India, APJ Abdul Kalam.", "Biography", "book", 0, 92)
        ]

        # Extra Ethiopian content to expand the Ethiopian section
        extra_items = [
            ("Lamb", "A haunting Ethiopian film that explores family, tradition and the emotional ties between a boy and his lamb.", "Drama", "movie", 1, 86),
            ("Difret", "Based on true events, an Ethiopian girl's prosecution of societal norms sparks a national dialogue.", "Drama", "movie", 1, 88),
            ("Teza", "A lyrical Ethiopian film dealing with memory, diaspora and political trauma.", "Drama", "movie", 1, 90),
            ("Beneath the Lion's Gaze", "A moving novel set in Ethiopia during political upheaval.", "Historical Fiction", "book", 1, 90),
            ("The Shadow King", "A powerful novel by an Ethiopian author exploring war and identity.", "Historical Fiction", "book", 1, 89),
            ("Fikir Eske Mekabir", "A classic Amharic novel exploring love, loss and society.", "Fiction", "book", 1, 88),
            ("Cutting for Stone", "A sweeping novel connected to Ethiopia's medical history and culture.", "Fiction", "book", 0, 92)
        ]

        new_items.extend(extra_items)

        # Additional Ethiopian titles requested by user
        more_ethiopian = [
            ("Atletu (The Athlete)", "Documentary about Ethiopian runners and their legacy.", "Documentary", "movie", 1, 85),
            ("Yegna", "A drama-musical following a girl group's rise and social impact in Ethiopia.", "Drama/Musical", "movie", 1, 82),
            ("Oromay", "A notable Amharic novel exploring modern themes and society.", "Fiction", "book", 1, 87),
            ("The Beautiful Ones Are Not Yet Born", "A regionally important novel included for cultural breadth.", "Fiction", "book", 1, 86),
            ("Ye Fikir", "A classic-style tale of love and society in Ethiopia.", "Fiction", "book", 1, 85)
        ]

        new_items.extend(more_ethiopian)

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
                elif title == "Sost Maezen": director = "Various"
                elif title == "Lamb": director = "Yared Zeleke"
                elif title == "Teza": director = "Haile Gerima"
                elif title == "Difret": director = "Zeresenay Berhane Mehari"
                elif title == "Atletu (The Athlete)": director = "Various"
                elif title == "The Godfather": director = "Francis Ford Coppola"
                elif title == "Parasite": director = "Bong Joon-ho"
                elif title == "Interstellar": director = "Christopher Nolan"
                elif title == "Lamb": director = "Yared Zeleke"
                elif title == "Difret": director = "Zeresenay Mehari"
                elif title == "Teza": director = "Haile Gerima"
                elif title == "Atletu (The Athlete)": director = "Various"
                elif title == "Yegna": director = "Various"
                
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
                elif title == "Fikir Eske Mekaber": author = "Haddis Alemayehu"
                elif title == "The Beautiful Things That Heaven Bears": author = "Dinaw Mengestu"
                elif title == "Beneath the Lion's Gaze": author = "Maaza Mengiste"
                elif title == "Cutting for Stone": author = "Abraham Verghese"
                elif title == "The Alchemist": author = "Paulo Coelho"
                elif title == "Long Walk to Freedom": author = "Nelson Mandela"
                elif title == "Wings of Fire": author = "APJ Abdul Kalam"
                elif title == "Beneath the Lion's Gaze": author = "Maaza Mengiste"
                elif title == "The Shadow King": author = "Maaza Mengiste"
                elif title == "Fikir Eske Mekabir": author = "Haddis Alemayehu"
                elif title == "Cutting for Stone": author = "Abraham Verghese"
                elif title == "Oromay": author = "Bealu Girma"
                elif title == "The Beautiful Ones Are Not Yet Born": author = "Ayi Kwei Armah"
                elif title == "Ye Fikir": author = "Various"
                
                cursor.execute("INSERT INTO books (item_id, author) VALUES (%s, %s)", (item_id, author))

            # Add Ethiopian metadata if applicable
            if is_eth:
                cursor.execute("INSERT INTO ethiopian_content_metadata (item_id, amharic_title) VALUES (%s, %s)", (item_id, title))

        db.commit()
        print("Successfully added new items to the database!")
        cursor.close()
        db.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_new_content()
