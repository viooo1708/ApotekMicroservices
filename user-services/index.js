const express = require("express");
const { Pool } = require("pg");
const app = express();

app.use(express.json());

const pool = new Pool({
  host: "postgres-db",
  user: "useradmin",
  password: "admin123",
  database: "apotek_user"
});

// GET semua user
app.get("/users", async (_, res) => {
  try {
    const r = await pool.query("SELECT * FROM users ORDER BY id ASC");
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET user by id
app.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// CREATE user
app.post("/users", async (req, res) => {
  try {
    const { name, role, email, phone, shift } = req.body;

    if (!name || !role || !email || !phone || !shift) {
      return res.status(400).json({
        success: false,
        message: "name, role, email, phone, and shift are required"
      });
    }

    await pool.query(
      `INSERT INTO users(name, role, email, phone, shift)
       VALUES($1,$2,$3,$4,$5)`,
      [name, role, email, phone, shift]
    );

    res.json({ success: true, message: "User created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE user
app.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, email, phone, shift } = req.body;

    if (!name || !role || !email || !phone || !shift) {
      return res.status(400).json({
        success: false,
        message: "name, role, email, phone, and shift are required"
      });
    }

    const result = await pool.query(
      `UPDATE users 
       SET name = $1, role = $2, email = $3, phone = $4, shift = $5
       WHERE id = $6`,
      [name, role, email, phone, shift, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE user
app.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(4000, "0.0.0.0");
