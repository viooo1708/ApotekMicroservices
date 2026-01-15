from fastapi import FastAPI, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId

app = FastAPI(title="Review Report Service")

# ===================== CORS =====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= MODELS =================
class Review(BaseModel):
    product_id: int
    user_id: int
    review: str
    rating: int

class UpdateReview(BaseModel):
    review: str
    rating: int

# ================= CREATE REVIEW =================
@app.post("/reviews")
def create_review(review: Review):
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")

    data = review.dict()
    data["created_at"] = datetime.utcnow()

    result = reviews_collection.insert_one(data)
    data["_id"] = str(result.inserted_id)

    return {"success": True, "data": data}

# ================= GET ALL REVIEWS =================
@app.get("/reviews")
def get_reviews():
    data = []
    for r in reviews_collection.find({}):
        r["_id"] = str(r["_id"])
        if "created_at" not in r:
            r["created_at"] = datetime.utcnow()
        data.append(r)
    return {"success": True, "data": data}

# ================= GET BY PRODUCT =================
@app.get("/reviews/product/{product_id}")
def get_reviews_by_product(product_id: int):
    data = []
    for r in reviews_collection.find({"product_id": product_id}):
        r["_id"] = str(r["_id"])
        data.append(r)
    return {"success": True, "data": data}

# ================= UPDATE =================
@app.put("/reviews/{review_id}")
def update_review(review_id: str, review: UpdateReview):
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")

    result = reviews_collection.update_one(
        {"_id": ObjectId(review_id)},
        {"$set": review.dict()}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")

    return {"success": True, "message": "Review updated"}

# ================= DELETE =================
@app.delete("/reviews/{review_id}")
def delete_review(review_id: str):
    result = reviews_collection.delete_one({"_id": ObjectId(review_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")

    return {"success": True, "message": "Review deleted"}
