const waitForTab = (tabId) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); reject(new Error("搜尋頁載入逾時")); }, 20000);
  function finish() { clearTimeout(timer); chrome.tabs.onUpdated.removeListener(listener); resolve(); }
  function listener(id, info) {
    if (id === tabId && info.status === "complete") {
      finish();
    }
  }
  chrome.tabs.onUpdated.addListener(listener);
  chrome.tabs.get(tabId).then((tab) => { if (tab.status === "complete") finish(); }).catch(reject);
});

chrome.action.onClicked.addListener(async () => {
  const toolUrl = chrome.runtime.getURL("popup.html");
  const existing = (await chrome.tabs.query({})).find((tab) => tab.url === toolUrl);
  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId) await chrome.windows.update(existing.windowId, { focused: true });
    return;
  }
  await chrome.tabs.create({ url: toolUrl, active: true });
});

const waitForNavigation = (tabId) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); reject(new Error("下一頁載入逾時")); }, 20000);
  function listener(id, info) {
    if (id === tabId && info.status === "complete") {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }
  }
  chrome.tabs.onUpdated.addListener(listener);
});

async function scanPage(tabId, minDiscount, minReviews) {
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, args: [minDiscount, minReviews], func: async (minimum, minimumReviews) => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      for (let attempt = 0; attempt < 20; attempt++) {
        const cards = [...document.querySelectorAll('a[href*="/products/"]')];
        if (cards.length && cards.some((a) => /\d{1,2}%/.test(a.querySelector('[class*="PriceArea_priceArea"]')?.innerText || ""))) break;
        window.scrollTo(0, Math.min(document.body.scrollHeight, attempt * 500));
        await sleep(600);
      }
      window.scrollTo(0, 0);
      const items = [...document.querySelectorAll('a[href*="/products/"]')].map((a) => {
        const text = (a.innerText || a.textContent || "").replace(/\s+/g, " ").trim();
        const priceArea = a.querySelector('[class*="PriceArea_priceArea"]');
        const priceText = (priceArea?.innerText || priceArea?.textContent || "").replace(/\s+/g, " ").trim();
        const match = priceText.match(/(?:^|\s)(\d{1,2})%(?:\s|$)/);
        if (!match || Number(match[1]) < minimum) return null;
        const ratingElement = a.querySelector('[class*="ProductRating_productRating"]');
        const ratingText = ratingElement?.innerText || "";
        const reviewMatch = ratingText.match(/\(([\d,]+)\)/);
        const reviewCount = reviewMatch ? Number(reviewMatch[1].replaceAll(",", "")) : 0;
        // Coupang keeps the score on the inner star group's aria-label; the
        // visible text contains only the review count.
        let rating = [...(ratingElement?.querySelectorAll("[aria-label]") || [])]
          .map((element) => Number.parseFloat(element.getAttribute("aria-label")?.trim() || ""))
          .find((value) => Number.isFinite(value) && value >= 0 && value <= 5) ?? null;
        if (rating === null && ratingElement) {
          const widthElement = [...ratingElement.querySelectorAll("[style]")].find((element) => /width:\s*\d+(?:\.\d+)?%/i.test(element.getAttribute("style") || ""));
          const widthMatch = widthElement?.getAttribute("style")?.match(/width:\s*(\d+(?:\.\d+)?)%/i);
          if (widthMatch) rating = Math.round((Number(widthMatch[1]) / 20) * 10) / 10;
        }
        if (reviewCount <= minimumReviews) return null;
        const img = a.querySelector("img");
        const name = (img?.alt || text.split(/(?:首購折扣價|折扣後價格|\$)/)[0]).trim();
        const url = new URL(a.href);
        for (const key of ["q", "searchId", "sourceType", "itemsCount", "searchRank", "rank", "sorter", "page"]) url.searchParams.delete(key);
        const beforeDiscount = priceText.slice(0, match.index);
        const afterDiscount = priceText.slice(match.index + match[0].length);
        const originalMatches = [...beforeDiscount.matchAll(/\$\s*([\d,]+)/g)];
        const saleMatch = afterDiscount.match(/\$\s*([\d,]+)/);
        const originalPrice = originalMatches.length ? Number(originalMatches.at(-1)[1].replaceAll(",", "")) : null;
        const salePrice = saleMatch ? Number(saleMatch[1].replaceAll(",", "")) : null;
        if (!originalPrice || !salePrice || originalPrice <= salePrice) return null;
        const calculatedDiscount = Math.floor((1 - salePrice / originalPrice) * 100);
        if (Math.abs(calculatedDiscount - Number(match[1])) > 2) return null;
        return { name, discount: Number(match[1]), rating, reviewCount, originalPrice, price: salePrice, image: img?.currentSrc || img?.src || "", url: url.toString() };
      }).filter(Boolean);
      const pageNumbers = [...document.querySelectorAll('a[href*="page="]')].map((a) => Number(new URL(a.href, location.href).searchParams.get("page"))).filter(Number.isFinite);
      return { items, maxPage: Math.max(1, ...pageNumbers) };
    }});
  return result || { items: [], maxPage: 1 };
}

async function scanKeyword(keyword, minDiscount, minReviews, sorter, rankingLabel) {
  const baseUrl = `https://www.tw.coupang.com/search?q=${encodeURIComponent(keyword)}&sorter=${encodeURIComponent(sorter)}`;
  const tab = await chrome.tabs.create({ active: false, url: baseUrl });
  const found = new Map();
  try {
    await waitForTab(tab.id);
    let totalPages = 1;
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      if (pageNumber > 1) {
        const navigation = waitForNavigation(tab.id);
        await chrome.tabs.update(tab.id, { url: `${baseUrl}&page=${pageNumber}` });
        await navigation;
      }
      const page = await scanPage(tab.id, minDiscount, minReviews);
      // Coupang may reveal later pagination groups only after moving forward.
      // Expanding the upper bound on every page makes the scan cover them all.
      totalPages = Math.max(totalPages, page.maxPage);
      for (const item of page.items) found.set(item.url, { ...item, rankings: [rankingLabel] });
      chrome.runtime.sendMessage({ type: "searchProgress", keyword, rankingLabel, page: pageNumber, totalPages }).catch(() => {});
    }
    return [...found.values()];
  } finally {
    await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "deeplinks") {
    createShortLinks(message.urls || [])
      .then((links) => sendResponse({ ok: true, links }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type !== "search") return false;
  (async () => {
    const map = new Map();
    const allowedSorters = {
      scoreDesc: "酷澎綜合評分",
      saleCountDesc: "最熱銷",
    };
    const requestedSorters = (message.sorters || ["scoreDesc", "saleCountDesc"]).filter((sorter) => allowedSorters[sorter]);
    if (!requestedSorters.length) throw new Error("請至少選擇一種商品排序");
    const sourceUrls = Object.fromEntries(requestedSorters.map((sorter) => [sorter, new Set()]));
    for (const keyword of message.keywords.slice(0, 8)) {
      for (const sorter of requestedSorters) {
        const sourceItems = await scanKeyword(keyword, message.minDiscount, message.minReviews ?? 200, sorter, allowedSorters[sorter]);
        for (const item of sourceItems) {
          sourceUrls[sorter].add(item.url);
          const existing = map.get(item.url);
          if (existing) existing.rankings = [...new Set([...(existing.rankings || []), ...item.rankings])];
          else map.set(item.url, item);
        }
      }
    }
    const sourceCounts = Object.fromEntries(Object.entries(sourceUrls).map(([sorter, urls]) => [sorter, urls.size]));
    sendResponse({ ok: true, sourceCounts, products: [...map.values()].sort((a, b) => b.discount - a.discount || (b.rankings?.length || 0) - (a.rankings?.length || 0) || b.reviewCount - a.reviewCount) });
  })().catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
import { COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY } from "./config.js";

const DEEP_LINK_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";

function signedDate(now = new Date()) {
  const p = (value) => String(value).padStart(2, "0");
  return `${String(now.getUTCFullYear()).slice(-2)}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}Z`;
}

async function hmacHex(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createShortLinks(urls) {
  if (!urls.length) throw new Error("請至少選擇一個商品");
  const datetime = signedDate();
  const signature = await hmacHex(COUPANG_SECRET_KEY, `${datetime}POST${DEEP_LINK_PATH}`);
  const authorization = `CEA algorithm=HmacSHA256, access-key=${COUPANG_ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`;
  const response = await fetch(`https://api-gateway.tw.coupang.com${DEEP_LINK_PATH}`, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json;charset=UTF-8", "X-MARKET": "TW" },
    body: JSON.stringify({ coupangUrls: urls }),
  });
  const data = await response.json();
  if (!response.ok || data.rCode !== "0") throw new Error(data.rMessage || data.message || `API 錯誤 ${response.status}`);
  return data.data.map((row, index) => ({ originalUrl: row.originalUrl || urls[index], affiliateUrl: row.shortenUrl || "" }));
}
