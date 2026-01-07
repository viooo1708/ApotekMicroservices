from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import reviews_collection

app = FastAPI(title="Review Report Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/reviews")
def create_review(
    product_id: int = Form(...),
    review: str = Form(...),
    rating: int = Form(...)
):
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")

    data = {
        "product_id": product_id,
        "review": review,
        "rating": rating
    }

    result = reviews_collection.insert_one(data)
    data["_id"] = str(result.inserted_id)  # Convert ObjectId to string
    return {"success": True, "data": data}

@app.get("/reviews")
def get_reviews():
    return {
        "success": True,
        "data": list(reviews_collection.find({}, {"_id": 0}))
    }

@app.get("/reviews/{product_id}")
def get_reviews_by_product(product_id: int):
    reviews = list(reviews_collection.find({"product_id": product_id}, {"_id": 0}))
    return {
        "success": True,
        "data": reviews
    }

@app.put("/review/{review_id}")
def update_review(
    review_id: str,
    review: str = Form(...),
    rating: int = Form(...)
):
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")

    from bson import ObjectId
    result = reviews_collection.update_one(
        {"_id": ObjectId(review_id)},
        {"$set": {"review": review, "rating": rating}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"success": True, "message": "Review updated"}

@app.delete("/review/{review_id}")
def delete_review(review_id: str):
    from bson import ObjectId
    result = reviews_collection.delete_one({"_id": ObjectId(review_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"success": True, "message": "Review deleted"}
