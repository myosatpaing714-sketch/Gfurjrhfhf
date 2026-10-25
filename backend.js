// BACKEND (Node.js, no packages needed)
// Run:  node backend.js     then open http://localhost:3000
// Keep this file in the same folder as frontend.html
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ORDERS_FILE = path.join(__dirname, "orders.json");

// Edit this list to change your products
const products = [
  { id: 1, name: "Ceramic Mug", price: 14.5, emoji: "☕", desc: "Handmade 350ml mug, dishwasher safe." },
  { id: 2, name: "Canvas Tote Bag", price: 18, emoji: "👜", desc: "Sturdy cotton tote for everyday use." },
  { id: 3, name: "Soy Candle", price: 12, emoji: "🕯️", desc: "Vanilla and cedar, 40 hours burn time." },
  { id: 4, name: "Notebook Set", price: 9.9, emoji: "📓", desc: "Set of 3 dotted A5 notebooks." },
  { id: 5, name: "Desk Plant", price: 22, emoji: "🪴", desc: "Low-maintenance succulent in a clay pot." },
  { id: 6, name: "Wireless Earbuds", price: 39, emoji: "🎧", desc: "Bluetooth 5.3, 20h battery with case." },
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e5) { reject(new Error("Body too large")); req.destroy(); }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); } catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function loadOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8")); } catch { return []; }
}

async function createOrder(req, res) {
  let data;
  try { data = await readBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }

  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return sendJson(res, 400, { error: "Please enter a name and a valid email." });
  }
  if (!Array.isArray(data.items) || data.items.length === 0) {
    return sendJson(res, 400, { error: "Your cart is empty." });
  }

  // Prices are taken from the server list, never from the browser
  const lines = [];
  for (const item of data.items) {
    const p = products.find((x) => x.id === Number(item.id));
    const qty = Math.floor(Number(item.qty));
    if (!p || !(qty >= 1 && qty <= 20)) return sendJson(res, 400, { error: "Invalid item in cart." });
    lines.push({ id: p.id, name: p.name, price: p.price, qty, subtotal: Math.round(p.price * qty * 100) / 100 });
  }
  const total = Math.round(lines.reduce((sum, l) => sum + l.subtotal, 0) * 100) / 100;

  const orders = loadOrders();
  const order = { id: orders.length + 1, name, email, items: lines, total, createdAt: new Date().toISOString() };
  orders.push(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  sendJson(res, 201, order);
}

http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  if (req.method === "GET" && req.url === "/api/products") return sendJson(res, 200, products);
  if (req.method === "POST" && req.url === "/api/orders") return createOrder(req, res);

  // Serve the frontend page
  if (req.method === "GET" && (req.url === "/" || req.url.startsWith("/?"))) {
    return fs.readFile(path.join(__dirname, "frontend.html"), (err, html) => {
      if (err) { res.writeHead(404); return res.end("frontend.html not found next to backend.js"); }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });
  }
  res.writeHead(404); res.end("Not found");
}).listen(PORT, () => console.log("Shop running at http://localhost:" + PORT));
