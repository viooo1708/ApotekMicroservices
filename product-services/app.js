const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.json());

// ================= DB CONNECTION =================
const db = mysql.createPool({
  host: "mysql-db",          // nama service MySQL di docker-compose
  user: "root",
  password: "root",
  database: "productdb",
  waitForConnections: true,
  connectionLimit: 10,
});

// ================= TEST DB CONNECTION =================
(async () => {
  try {
    await db.query("SELECT 1");
    console.log("✅ MySQL connected");
  } catch (e) {
    console.error("❌ DB connection failed:", e.message);
  }
})();

// ================= ROOT TEST =================
app.get("/", (req, res) => {
  res.json({
    service: "Product Service",
    status: "running",
  });
});

// ================= GET ALL / BY ID =================
app.get("/products", async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      const [rows] = await db.query(
        "SELECT * FROM products WHERE id = ?",
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      return res.json({
        success: true,
        data: rows[0],
      });
    }

    const [rows] = await db.query("SELECT * FROM products");

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ================= CREATE PRODUCT =================
app.post("/products", async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;

    if (!name || !category || price == null || stock == null) {
      return res.status(400).json({
        success: false,
        message: "Invalid input data",
      });
    }

    const [result] = await db.query(
      "INSERT INTO products (name, category, price, stock) VALUES (?,?,?,?)",
      [name, category, price, stock]
    );

    res.status(201).json({
      success: true,
      message: "Product created",
      id: result.insertId,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ================= UPDATE PRODUCT =================
app.put("/products", async (req, res) => {
  try {
    const { id, name, category, price, stock } = req.body;

    if (!id || !name || !category || price == null || stock == null) {
      return res.status(400).json({
        success: false,
        message: "Invalid input data",
      });
    }

    await db.query(
      "UPDATE products SET name=?, category=?, price=?, stock=? WHERE id=?",
      [name, category, price, stock, id]
    );

    res.json({
      success: true,
      message: "Product updated",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ================= DELETE PRODUCT =================
app.delete("/products", async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID required",
      });
    }

    await db.query("DELETE FROM products WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Product deleted",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ================= START SERVER =================
app.listen(8001, "0.0.0.0", () => {
  console.log("✅ Product service running on port 8001");
});
