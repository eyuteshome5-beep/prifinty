import sys
import os

# Add parent directory of this script (backend) to the sys.path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.abspath(os.path.join(script_dir, '..')))

from app.services.media_api import MediaAPIService
from app.utils.database import execute_query

def test():
    print("Testing Spotify...")
    # I can't test because I don't have their keys
    pass

if __name__ == "__main__":
    test()
