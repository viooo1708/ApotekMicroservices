from pymongo import MongoClient
import time

for i in range(10):
    try:
        client = MongoClient("mongodb://mongo-db:27017", serverSelectionTimeoutMS=2000)
        client.server_info()
        break
    except Exception as e:
        print("MongoDB not ready, retrying...")
        time.sleep(2)

db = client.apotek
reviews_collection = db.reviews
