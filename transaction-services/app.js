const express = require("express");
const redis = require("redis");

const app = express();
app.use(express.json());

const client = redis.createClient({ url: "redis://redis-db:6379" });
client.connect();

app.post("/cart/add", async (req, res) => {
  try {
    const { trx, product_id, qty } = req.body;
    if (!trx || !product_id || !qty) {
      return res.status(400).json({ success: false, message: "trx, product_id, and qty are required" });
    }
    await client.rPush(`cart:${trx}`, JSON.stringify({ product_id, qty }));
    res.json({ success: true, message: "Item added to cart" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/cart/:trx", async (req, res) => {
  try {
    const { trx } = req.params;
    const items = await client.lRange(`cart:${trx}`, 0, -1);
    const parsedItems = items.map(item => JSON.parse(item));
    res.json({ success: true, data: parsedItems });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put("/cart/update", async (req, res) => {
  try {
    const { trx, index, product_id, qty } = req.body;
    if (!trx || index === undefined || !product_id || !qty) {
      return res.status(400).json({ success: false, message: "trx, index, product_id, and qty are required" });
    }
    await client.lSet(`cart:${trx}`, index, JSON.stringify({ product_id, qty }));
    res.json({ success: true, message: "Item updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/cart/:trx/:index", async (req, res) => {
  try {
    const { trx, index } = req.params;
    await client.lRem(`cart:${trx}`, 1, await client.lIndex(`cart:${trx}`, index));
    res.json({ success: true, message: "Item removed from cart" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/cart/checkout", async (req, res) => {
  try {
    const { trx, payment_method, note } = req.body;
    if (!trx || !payment_method) {
      return res.status(400).json({ success: false, message: "trx and payment_method are required" });
    }
    const items = await client.lRange(`cart:${trx}`, 0, -1);
    const parsedItems = items.map(item => JSON.parse(item));
    // Here you might want to save to a database or process payment
    res.json({ success: true, trx, items: parsedItems, payment_method, note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(5001, "0.0.0.0");
