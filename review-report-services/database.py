from pymongo import MongoClient

client = MongoClient(
    "mongodb://root:root123@mongo-db:27017/?authSource=admin"
)

db = client["reviewdb"]
reviews_collection = db["review"]
