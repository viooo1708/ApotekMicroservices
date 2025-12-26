const express = require("express");
const mysql = require("mysql2");
const app = express();
app.use(express.json());

const db = mysql.createConnection({
  host: "order-db",
  user: "root",
  password: "root",
  database: "order_db"
});

app.get("/orders", (req, res) => {
  db.query("SELECT * FROM orders", (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(results);
    }
  });
});

app.listen(3004, () => {
  console.log("Order service running on port 3004");
});