const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");

app.use(cors());

app.use(express.json());

// Koneksi ke PostgreSQL
const pool = new Pool({
  host: "postgres-db",
  user: "useradmin",
  password: "admin123",
  database: "apotek_user",
});

// ================= REGISTER =================
app.post("/register", async (req, res) => {
  try {
    const { name, role, email, phone, shift, password } = req.body;

    if (!name || !role || !email || !phone || !shift || !password) {
      return res.status(400).json({
        success: false,
        message: "name, role, email, phone, shift, and password are required",
      });
    }

    // Cek email duplicate
    const check = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (check.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const inserted = await pool.query(
      `INSERT INTO users(name, role, email, phone, shift, password)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id, name, role, email, phone, shift`,
      [name, role, email, phone, shift, hashed]
    );

    res.json({
      success: true,
      message: "User registered",
      data: inserted.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const r = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

    if (r.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const user = r.rows[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      "SECRETKEYJWT",
      { expiresIn: "1d" }
    );

    // hapus password dari response
    delete user.password;

    res.json({
      success: true,
      message: "Login successful",
      token,
      data: user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= GET Semua User =================
app.get("/users", async (_, res) => {
  try {
    const r = await pool.query("SELECT * FROM users ORDER BY id ASC");
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= GET User By ID =================
app.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query("SELECT * FROM users WHERE id=$1", [id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= CREATE User =================
app.post("/users", async (req, res) => {
  try {
    const { name, role, email, phone, shift, password } = req.body;

    if (!name || !role || !email || !phone || !shift || !password) {
      return res.status(400).json({
        success: false,
        message: "name, role, email, phone, shift, and password are required",
      });
    }

    // Hash password sebelum simpan
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users(name, role, email, phone, shift, password)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [name, role, email, phone, shift, hashedPassword]
    );

    res.json({ success: true, message: "User created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= UPDATE User =================
app.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, email, phone, shift, password } = req.body;

    if (!name || !role || !email || !phone || !shift) {
      return res.status(400).json({
        success: false,
        message: "name, role, email, phone, and shift are required",
      });
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `UPDATE users
       SET name=$1, role=$2, email=$3, phone=$4, shift=$5
       ${hashedPassword ? ", password=$6" : ""}
       WHERE id=$7`,
      hashedPassword
        ? [name, role, email, phone, shift, hashedPassword, id]
        : [name, role, email, phone, shift, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= DELETE User =================
app.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("DELETE FROM users WHERE id=$1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= SERVER =================
app.listen(4000, "0.0.0.0", () => {
  console.log("User service running on port 4000");
});
