from app.utils.database import Database
from flask import Flask

app = Flask(__name__)
app.config['MONGO_URI'] = "mongodb+srv://eyuel:eyudb@cluster0.ihjnshd.mongodb.net/ethiopian_recommendations?appName=Cluster0"
Database.init_pool(app)
db = Database.get_connection()

print("ALL SITE SETTINGS:")
for doc in db.site_settings.find():
    print(doc)
