import WebSocket from "ws";
import net from "net";

const SYMBOL = process.env.SYMBOL || "btcusdt";
const SFS_HOST = process.env.SFS_HOST || "127.0.0.1";
const SFS_PORT = Number(process.env.SFS_PORT || 9933);
const THROTTLE_MS = Number(process.env.THROTTLE_MS || 50);

let lastSent = 0;
let sfsClient;

/* ------------------ SmartFox TCP ------------------ */

function connectToSFS() {
  sfsClient = new net.Socket();

  sfsClient.connect(SFS_PORT, SFS_HOST, () => {
    console.log("Connected to SmartFoxServer");
  });

  sfsClient.on("close", () => {
    console.log("SFS disconnected. Reconnecting...");
    setTimeout(connectToSFS, 2000);
  });

  sfsClient.on("error", err => {
    console.error("SFS error:", err.message);
  });
}

/* ------------------ Binance WS ------------------ */

function connectToExchange() {
  const url = `wss://ws-feed.exchange.coinbase.com`;
  const ws = new WebSocket(url);

  ws.on("open", () => {
    console.log("Connected to Binance:", SYMBOL);
  });

  ws.on("message", data => {
    const t = JSON.parse(data);
    const now = Date.now();

    if (now - lastSent < THROTTLE_MS || !sfsClient?.writable) return;

    const payload = {
      symbol: SYMBOL.toUpperCase(),
      price: Number(t.p),
      volume: Number(t.q),
      ts: t.T
    };

    sfsClient.write(JSON.stringify(payload) + "\n");
    console.log(JSON.stringify(payload) + "\n");
    lastSent = now;
  });

  ws.on("close", () => {
    console.log("Exchange disconnected. Reconnecting...");
    setTimeout(connectToExchange, 2000);
  });

  ws.on("error", err => {
    console.error("Exchange error:", err.message);
  });
}

/* ------------------ Startup ------------------ */

//connectToSFS();
connectToExchange();
