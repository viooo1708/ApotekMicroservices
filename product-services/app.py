from flask import Flask, jsonify
import mysql.connector

app = Flask(__name__)
db = mysql.connector.connect(
    host="product-db",
    user="root",
    password="root",
    database="product_db"
)

@app.route("/products")
def products():
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM products")
    return jsonify(cur.fetchall())

app.run(host="0.0.0.0", port=3002)
