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

app.get("/users", async (_, res) => {
try {
const r = await pool.query("SELECT * FROM users");
res.json({ success: true, data: r.rows });
} catch (err) {
res.status(500).json({ success: false, message: err.message });
}
});

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

app.post("/users", async (req, res) => {
try {
const { name, role } = req.body;
if (!name || !role) {
return res.status(400).json({ success: false, message: "Name and role are required" });
}
await pool.query(
"INSERT INTO users(name, role) VALUES($1,$2)",
[name, role]
);
res.json({ success: true, message: "User created" });
} catch (err) {
res.status(500).json({ success: false, message: err.message });
}
});

app.put("/users/:id", async (req, res) => {
try {
const { id } = req.params;
const { name, role } = req.body;
if (!name || !role) {
return res.status(400).json({ success: false, message: "Name and role are required" });
}
const result = await pool.query(
"UPDATE users SET name = $1, role = $2 WHERE id = $3",
[name, role, id]
);
if (result.rowCount === 0) {
return res.status(404).json({ success: false, message: "User not found" });
}
res.json({ success: true, message: "User updated" });
} catch (err) {
res.status(500).json({ success: false, message: err.message });
}
});

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