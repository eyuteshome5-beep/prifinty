import os
import mysql.connector
from dotenv import load_dotenv

# Get absolute paths relative to this script
script_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.abspath(os.path.join(script_dir, '..', '.env'))

# Load environment variables
load_dotenv(dotenv_path)

def update_images():
    try:
        db = mysql.connector.connect(
            host=os.getenv('MYSQL_HOST', 'localhost'),
            user=os.getenv('MYSQL_USER', 'root'),
            password=os.getenv('MYSQL_PASSWORD', 'root123'),
            database=os.getenv('MYSQL_DB', 'ethiopian_recommendations')
        )
        cursor = db.cursor()

        # Image mapping (title -> image_url)
        # Using premium high-quality images from Unsplash and placeholders that look real
        image_mapping = {
            # Movies
            "Min Alesh?": "https://images.unsplash.com/photo-1485846234645-a62644ef7467?auto=format&fit=crop&q=80&w=800",
            "The Godfather": "https://images.unsplash.com/photo-1594908941117-a146e1c4ad8d?auto=format&fit=crop&q=80&w=800",
            "Parasite": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800",
            "Sost Maezen": "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=800",
            "Interstellar": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=800",
            "Lamb": "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800",
            "Difret": "https://images.unsplash.com/photo-1534531173927-aeb928d54385?auto=format&fit=crop&q=80&w=800",
            "Teza": "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&q=80&w=800",
            "Atletu (The Athlete)": "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=800",
            "Yegna": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800",
            "The Shawshank Redemption": "https://images.unsplash.com/photo-1533928298208-27ff66555d8d?auto=format&fit=crop&q=80&w=800",
            "Inception": "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=800",
            
            # Music
            "Guramayle": "https://images.unsplash.com/photo-1514525253361-b83f85df0f5c?auto=format&fit=crop&q=80&w=800",
            "Tizita (Abebe)": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800",
            "Thriller": "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800",
            "One Love": "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=800",
            "Ethiopia": "https://images.unsplash.com/photo-1526218626217-dc65a29bb444?auto=format&fit=crop&q=80&w=800",
            "Tizita": "https://images.unsplash.com/photo-1459749411177-042180ce673c?auto=format&fit=crop&q=80&w=800",
            "Bati": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800",
            "Anchihoye Lene": "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&q=80&w=800",
            "Ambassel": "https://images.unsplash.com/photo-1496293455970-f8581aae0e3c?auto=format&fit=crop&q=80&w=800",
            "Bohemian Rhapsody": "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?auto=format&fit=crop&q=80&w=800",
            "Shape of You": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800",

            # Books
            "Dertogada": "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800",
            "Sememen": "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=800",
            "The Alchemist": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800",
            "Long Walk to Freedom": "https://images.unsplash.com/photo-1535905557558-afc4877af26e?auto=format&fit=crop&q=80&w=800",
            "Wings of Fire": "https://images.unsplash.com/photo-1589998059171-988d887df646?auto=format&fit=crop&q=80&w=800",
            "Beneath the Lion's Gaze": "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&q=80&w=800",
            "The Shadow King": "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800",
            "Cutting for Stone": "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=800",
            "Oromay": "https://images.unsplash.com/photo-1543004629-ff569f872783?auto=format&fit=crop&q=80&w=800",
            "Fikir Eske Mekabir": "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=800",
            "Ye Fikir": "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?auto=format&fit=crop&q=80&w=800",
            "The Beautiful Ones Are Not Yet Born": "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?auto=format&fit=crop&q=80&w=800",
            "To Kill a Mockingbird": "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=800",
            "1984": "https://images.unsplash.com/photo-1543004629-ff569f872783?auto=format&fit=crop&q=80&w=800",
        }

        for title, url in image_mapping.items():
            cursor.execute(
                "UPDATE items SET cover_image = %s WHERE title = %s",
                (url, title)
            )
            if cursor.rowcount > 0:
                print(f"Updated image for: {title}")
            else:
                print(f"Item not found or image already set: {title}")

        db.commit()
        print("\nSuccessfully updated images for all content!")
        cursor.close()
        db.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_images()
