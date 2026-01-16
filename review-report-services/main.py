from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from database import reviews_collection  # import collection dari database.py

# ===================== APP & CORS =====================
app = FastAPI(title="Review Report Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== MODELS =====================
class Review(BaseModel):
    product_id: int = Field(..., gt=0)
    user_id: int = Field(..., gt=0)
    review: str = Field(..., min_length=1)
    rating: int = Field(..., ge=1, le=5)

class UpdateReview(BaseModel):
    review: str = Field(..., min_length=1)
    rating: int = Field(..., ge=1, le=5)

# ===================== HELPER =====================
def serialize_review(r):
    """Convert MongoDB document to JSON-friendly dict"""
    return {
        "_id": str(r.get("_id")),
        "product_id": r.get("product_id"),
        "user_id": r.get("user_id"),
        "review": r.get("review"),
        "rating": r.get("rating"),
        "created_at": r.get("created_at", datetime.utcnow()).isoformat()
    }

# ===================== CREATE REVIEW =====================
@app.post("/reviews")
def create_review(review: Review):
    try:
        data = review.dict()
        data["created_at"] = datetime.utcnow()
        result = reviews_collection.insert_one(data)
        data["_id"] = str(result.inserted_id)
        data["created_at"] = data["created_at"].isoformat()
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create review: {e}")

# ===================== GET ALL REVIEWS =====================
@app.get("/reviews")
def get_reviews():
    try:
        reviews = reviews_collection.find({}).sort("created_at", -1)
        return {"success": True, "data": [serialize_review(r) for r in reviews]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reviews: {e}")

# ===================== GET REVIEWS BY PRODUCT =====================
@app.get("/reviews/product/{product_id}")
def get_reviews_by_product(product_id: int):
    try:
        reviews = reviews_collection.find({"product_id": product_id}).sort("created_at", -1)
        return {"success": True, "data": [serialize_review(r) for r in reviews]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reviews: {e}")

# ===================== UPDATE REVIEW =====================
@app.put("/reviews/{review_id}")
def update_review(review_id: str, review: UpdateReview):
    try:
        obj_id = ObjectId(review_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid review ID")

    result = reviews_collection.update_one(
        {"_id": obj_id},
        {"$set": review.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"success": True, "message": "Review updated"}

# ===================== DELETE REVIEW =====================
@app.delete("/reviews/{review_id}")
def delete_review(review_id: str):
    try:
        obj_id = ObjectId(review_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid review ID")

    result = reviews_collection.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"success": True, "message": "Review deleted"}
