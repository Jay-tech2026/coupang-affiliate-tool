import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(ROOT, ".env"));

const MARKET = (process.env.COUPANG_MARKET || "TW").toUpperCase();
const HOST = process.env.COUPANG_API_HOST || (MARKET === "TW"
  ? "https://api-gateway.tw.coupang.com"
  : "https://api-gateway.coupang.com");
const DEEP_LINK_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";
const PORT = Number(process.env.PORT || 8787);

function loadEnv(filename) {
  if (!fs.existsSync(filename)) return;
  for (const rawLine of fs.readFileSync(filename, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals < 1) continue;
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function signedDate(now = new Date()) {
  const p = (value) => String(value).padStart(2, "0");
  return `${String(now.getUTCFullYear()).slice(-2)}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}Z`;
}

export function authorization(method, requestPath, query = "", now = new Date()) {
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;
  if (!accessKey || !secretKey) throw new Error("尚未設定 COUPANG_ACCESS_KEY 或 COUPANG_SECRET_KEY");
  const datetime = signedDate(now);
  const message = `${datetime}${method.toUpperCase()}${requestPath}${query}`;
  const signature = crypto.createHmac("sha256", secretKey).update(message).digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

async function coupangRequest(method, requestPath, { query = "", body } = {}) {
  const response = await fetch(`${HOST}${requestPath}${query ? `?${query}` : ""}`, {
    method,
    headers: {
      Authorization: authorization(method, requestPath, query),
      "Content-Type": "application/json;charset=UTF-8",
      "X-MARKET": MARKET,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (!response.ok || data?.rCode && data.rCode !== "0") {
    const error = new Error(data?.rMessage || data?.message || `Coupang API 回傳 ${response.status}`);
    error.status = response.status || 502;
    error.details = data;
    throw error;
  }
  return data;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const port = socket.address().port;
      socket.close(() => resolve(port));
    });
  });
}

async function waitForJson(url, attempts = 60) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try { return await (await fetch(url)).json(); } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError || new Error("無法啟動搜尋瀏覽器");
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("搜尋瀏覽器連線失敗")), { once: true });
  });
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const handler = pending.get(message.id);
    pending.delete(message.id);
    message.error ? handler.reject(new Error(message.error.message)) : handler.resolve(message.result);
  });
  return {
    async send(method, params = {}) {
      await ready;
      const messageId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(messageId, { resolve, reject });
        ws.send(JSON.stringify({ id: messageId, method, params }));
      });
    },
    close() { ws.close(); },
  };
}

async function scrapeDeals({ minDiscount = 60, keywords = ["特價", "折扣", "出清", "3折"] } = {}) {
  const chrome = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].find(fs.existsSync);
  if (!chrome) throw new Error("找不到 Chrome 或 Edge，無法讀取酷澎搜尋頁");
  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "coupang-search-"));
  const browser = spawn(chrome, [
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--headless=new",
    "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    "--disable-background-networking", "--disable-features=Translate,MediaRouter", "about:blank",
  ], { windowsHide: true, detached: true, stdio: "ignore" });
  const found = new Map();
  try {
    const tabs = await waitForJson(`http://127.0.0.1:${port}/json/list`);
    const page = tabs.find((tab) => tab.type === "page");
    if (!page?.webSocketDebuggerUrl) throw new Error("無法建立搜尋分頁");
    const client = cdp(page.webSocketDebuggerUrl);
    await client.send("Page.enable");
    for (const keyword of keywords.slice(0, 8)) {
      await client.send("Page.navigate", { url: `https://www.tw.coupang.com/search?q=${encodeURIComponent(keyword)}` });
      await new Promise((resolve) => setTimeout(resolve, 3500));
      const expression = `(() => [...document.querySelectorAll('a[href*="/products/"]')].map(a => {
        const text=(a.innerText||a.textContent||'').replace(/\\s+/g,' ').trim();
        const priceArea=a.querySelector('[class*="PriceArea_priceArea"]');
        const priceText=(priceArea?.innerText||priceArea?.textContent||'').replace(/\\s+/g,' ').trim();
        const match=priceText.match(/(?:^|\\s)(\\d{1,2})%(?:\\s|$)/); if(!match) return null;
        const discount=Number(match[1]); if(discount<${Number(minDiscount)}) return null;
        const prices=[...priceText.matchAll(/\\$([\\d,]+)/g)].map(x=>Number(x[1].replaceAll(',','')));
        const img=a.querySelector('img');
        const name=(img?.alt||text.split(/(?:首購折扣價|折扣後價格|\\$)/)[0]).trim();
        return {name,discount,originalPrice:prices[0]||null,price:prices[1]||prices[0]||null,image:img?.currentSrc||img?.src||'',url:a.href};
      }).filter(Boolean))()`;
      const result = await client.send("Runtime.evaluate", { expression, returnByValue: true });
      for (const item of result?.result?.value || []) {
        const cleanUrl = new URL(item.url);
        for (const key of ["q", "searchId", "sourceType", "itemsCount", "searchRank", "rank"]) cleanUrl.searchParams.delete(key);
        item.url = cleanUrl.toString();
        found.set(item.url, item);
      }
    }
    client.close();
  } finally {
    browser.kill();
    fs.rmSync(profile, { recursive: true, force: true });
  }
  return [...found.values()].sort((a, b) => b.discount - a.discount).slice(0, 100);
}

export function isAffiliateUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "coupang.onelink.me" || hostname === "link.tw.coupang.com" || hostname === "coupa.ng";
  } catch {
    return false;
  }
}

async function createLinks(urls, subId) {
  if (!Array.isArray(urls) || urls.length === 0) throw new Error("請至少選擇一個商品");
  if (urls.length > 100) throw new Error("單次最多處理 100 個網址");
  const pending = urls.filter((url) => !isAffiliateUrl(url));
  let converted = [];
  if (pending.length) {
    const payload = await coupangRequest("POST", DEEP_LINK_PATH, {
      body: { coupangUrls: pending, ...(subId ? { subId } : {}) },
    });
    const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.data?.data) ? payload.data.data : [];
    converted = rows.map((row, index) => ({
      originalUrl: row.originalUrl ?? row.coupangUrl ?? pending[index] ?? "",
      affiliateUrl: row.shortenUrl ?? row.landingUrl ?? row.affiliateUrl ?? row.url ?? "",
    }));
  }
  const byOriginal = new Map(converted.map((row) => [row.originalUrl, row.affiliateUrl]));
  return urls.map((url) => ({
    originalUrl: url,
    affiliateUrl: isAffiliateUrl(url) ? url : byOriginal.get(url) || "",
  }));
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error("請求內容過大");
  }
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const origin = req.headers.origin || "";
    if (origin.startsWith("chrome-extension://")) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    if (req.method === "GET" && url.pathname === "/api/status") {
      return json(res, 200, { configured: Boolean(process.env.COUPANG_ACCESS_KEY && process.env.COUPANG_SECRET_KEY), market: MARKET });
    }
    if (req.method === "GET" && url.pathname === "/api/deals") {
      return json(res, 409, {
        error: "酷澎會阻擋本機伺服器搜尋。請改用 Chrome 工具列上的「酷澎高折扣聯盟工具」擴充功能。"
      });
    }
    if (req.method === "POST" && url.pathname === "/api/deeplinks") {
      const input = await readBody(req);
      return json(res, 200, { links: await createLinks(input.urls, input.subId || process.env.COUPANG_SUB_ID) });
    }
    if (req.method !== "GET") return json(res, 405, { error: "不支援的請求方式" });

    const relative = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const filename = path.resolve(ROOT, "public", relative);
    const publicRoot = path.resolve(ROOT, "public");
    if (!filename.startsWith(publicRoot) || !fs.existsSync(filename)) return json(res, 404, { error: "找不到頁面" });
    const ext = path.extname(filename);
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(filename).pipe(res);
  } catch (error) {
    console.error(error);
    json(res, error.status && error.status >= 400 ? error.status : 500, {
      error: error.message || "發生未知錯誤",
      details: error.details,
    });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`酷澎當日特價工具：http://127.0.0.1:${PORT}`);
  });
}

export { createLinks, scrapeDeals };
