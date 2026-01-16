const express = require("express");
const redis = require("redis");
const cors = require("cors");

const app = express();

/**
 * ===================
 * MIDDLEWARE
 * ===================
 */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(express.json());

console.log("✅ TRANSACTION SERVICE FILE LOADED");

/**
 * ===================
 * REDIS CONNECTION
 * ===================
 */
const client = redis.createClient({
  url: "redis://redis-db:6379",
});

client.on("error", (err) => console.error("❌ Redis Error:", err));

(async () => {
  try {
    await client.connect();
    console.log("✅ Connected to Redis");
  } catch (err) {
    console.error("❌ Redis connection failed", err);
  }
})();

/**
 * ===================
 * GET ALL TRANSACTIONS
 * ===================
 */
app.get("/transactions", async (req, res) => {
  try {
    const keys = [];

    for await (const key of client.scanIterator({
      MATCH: "transaction:*",
      COUNT: 100,
    })) {
      keys.push(key);
    }

    if (keys.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const values = await client.mGet(keys);

    const transactions = values
      .map((val) => {
        try {
          return JSON.parse(val);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    res.json({
      success: true,
      data: transactions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ===================
 * REPORT TRANSACTIONS (FIXED)
 * ===================
 */
app.get("/reports/transactions", async (req, res) => {
  try {
    let cursor = 0;
    let keys = [];

    do {
      const reply = await client.scan(cursor, {
        MATCH: "transaction:*",
        COUNT: 100,
      });
      cursor = Number(reply.cursor);
      keys = keys.concat(reply.keys);
    } while (cursor !== 0);

    if (keys.length === 0) {
      return res.json({
        success: true,
        summary: {
          total_transaksi: 0,
          total_pendapatan: 0,
        },
        data: [],
      });
    }

    const pipeline = client.multi();
    keys.forEach((key) => pipeline.get(key));
    const results = await pipeline.exec(); // ← node-redis v4

    let totalPendapatan = 0;
    let transactions = [];

    // ✅ FIX: results langsung berupa value, BUKAN [err, value]
    results.forEach((value) => {
      if (!value) return;

      const trx = JSON.parse(value);
      const items = Array.isArray(trx.items) ? trx.items : [];

      items.forEach((item) => {
        const subtotal =
          item.subtotal ??
          Number(item.qty ?? 0) * Number(item.price ?? 0);

        totalPendapatan += Number(subtotal);
      });

      transactions.push(trx);
    });

    res.json({
      success: true,
      summary: {
        total_transaksi: transactions.length,
        total_pendapatan: totalPendapatan,
      },
      data: transactions,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * ===================
 * CREATE TRANSACTION
 * ===================
 */
app.post("/transactions", async (req, res) => {
  try {
    const { trx, items, payment_method, note } = req.body;

    if (!trx || !items || !Array.isArray(items) || !payment_method) {
      return res.status(400).json({
        success: false,
        message: "trx, items, and payment_method are required",
      });
    }

    const itemsWithSubtotal = items.map((item) => ({
      ...item,
      subtotal:
        item.subtotal ??
        Number(item.qty ?? 0) * Number(item.price ?? 0),
    }));

    const transactionData = {
      trx,
      items: itemsWithSubtotal,
      payment_method,
      note: note || "",
      created_at: new Date().toISOString(),
    };

    await client.set(
      `transaction:${trx}`,
      JSON.stringify(transactionData)
    );

    res.json({
      success: true,
      message: "Transaction saved",
      data: transactionData,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ===================
 * GET SINGLE TRANSACTION
 * ===================
 */
app.get("/transactions/:trx", async (req, res) => {
  try {
    const { trx } = req.params;
    const data = await client.get(`transaction:${trx}`);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.json({
      success: true,
      data: JSON.parse(data),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ===================
 * UPDATE TRANSACTION
 * ===================
 */
app.put("/transactions/:trx", async (req, res) => {
  try {
    const { trx } = req.params;
    const { items, payment_method, note } = req.body;

    const existing = await client.get(`transaction:${trx}`);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const oldData = JSON.parse(existing);

    const updatedItems = items
      ? items.map((item) => ({
          ...item,
          subtotal:
            item.subtotal ??
            Number(item.qty ?? 0) * Number(item.price ?? 0),
        }))
      : oldData.items;

    const updatedData = {
      ...oldData,
      items: updatedItems,
      payment_method: payment_method || oldData.payment_method,
      note: note !== undefined ? note : oldData.note,
    };

    await client.set(
      `transaction:${trx}`,
      JSON.stringify(updatedData)
    );

    res.json({
      success: true,
      message: "Transaction updated",
      data: updatedData,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ===================
 * DELETE TRANSACTION
 * ===================
 */
app.delete("/transactions/:trx", async (req, res) => {
  try {
    const { trx } = req.params;
    const deleted = await client.del(`transaction:${trx}`);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.json({
      success: true,
      message: "Transaction deleted",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ===================
 * START SERVER
 * ===================
 */
app.listen(5001, "0.0.0.0", () => {
  console.log("🚀 Transaction service running on port 5001");
});
