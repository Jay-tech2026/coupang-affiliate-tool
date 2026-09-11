import test from "node:test";
import assert from "node:assert/strict";
import { authorization, isAffiliateUrl, signedDate } from "./server.js";

test("uses Coupang UTC timestamp format", () => {
  assert.equal(signedDate(new Date("2026-09-04T09:08:07Z")), "260904T090807Z");
});

test("creates deterministic HMAC authorization", () => {
  process.env.COUPANG_ACCESS_KEY = "access";
  process.env.COUPANG_SECRET_KEY = "secret";
  const value = authorization("GET", "/path", "a=1", new Date("2026-09-04T09:08:07Z"));
  assert.match(value, /^CEA algorithm=HmacSHA256, access-key=access, signed-date=260904T090807Z, signature=[a-f0-9]{64}$/);
});

test("recognizes Taiwan affiliate URLs returned by Gold Box", () => {
  assert.equal(isAffiliateUrl("https://coupang.onelink.me/yowQ?pid=coupang_partners"), true);
  assert.equal(isAffiliateUrl("https://link.tw.coupang.com/re2/TWAFSDP"), true);
  assert.equal(isAffiliateUrl("https://www.tw.coupang.com/products/123"), false);
});
