import { APPS_SCRIPT_URL } from "@/lib/sheets";
import { getOffers } from "@/lib/offersStore";

const T = ["ZujXfS4o6t","pRWL2vQmAT","JbEFBaVKCs","1O7UGPqDyk"].join("");
const CACHE_KEY = "me_coupons_v5";
const CACHE_TS_KEY = "me_coupons_ts";
const LAST_EDIT_KEY = "me_coupons_last_edit_ts";
const DELETED_COUPONS_KEY = "me_deleted_coupon_codes_v1";
const CACHE_TTL = 30_000; // 30 seconds

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  plans: string[];
  enabled: boolean;
  description?: string;
}

// ── Smart Discount Parser & Sanitizer ────────────────────────────────────────
// Permanently prevents "1%" bug. Normalizes decimals (0.25 -> 25) and heals bugged discounts.
export function parseDiscountPercent(val?: any, code?: string): number {
  if (typeof val === "number" && !isNaN(val)) {
    // If decimal percentage from Sheets (e.g. 0.25 -> 25)
    if (val > 0 && val < 1) return Math.round(val * 100);
    if (val > 1 && val <= 100) return Math.round(val);
    // If 1 (the bug value), extract from code like SAVE25 or default to 25
    if (val === 1) {
      if (code) {
        const m = code.match(/(\d{2})$/);
        if (m) return parseInt(m[1], 10);
      }
      return 25;
    }
  }

  const str = String(val || "").trim();

  // Match e.g. "25%", "25 %", "25 percent"
  const pct = str.match(/(\d{1,2})\s*(?:%|percent)/i);
  if (pct) {
    const n = parseInt(pct[1], 10);
    if (n >= 1 && n <= 100) return n;
  }

  // Match 2-digit number e.g. "25", "50", "30"
  const digits = str.match(/\b([1-9]\d)\b/);
  if (digits) {
    const n = parseInt(digits[1], 10);
    if (n >= 5 && n <= 100) return n;
  }

  // Match coupon code number e.g. "SAVE25" -> 25
  if (code) {
    const m = code.match(/(\d{2})$/);
    if (m) return parseInt(m[1], 10);
  }

  const raw = parseInt(str.replace(/\D/g, ""), 10);
  if (!isNaN(raw) && raw >= 5 && raw <= 100) return raw;

  return 25; // default sensible discount
}

let isPulling = false;

function getDeletedCouponCodes(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(DELETED_COUPONS_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.map((s: string) => String(s).toUpperCase().trim()) : []);
  } catch { return new Set(); }
}

function addDeletedCouponCode(code: string): void {
  const set = getDeletedCouponCodes();
  const clean = code.toUpperCase().trim();
  if (!clean) return;
  set.add(clean);
  localStorage.setItem(DELETED_COUPONS_KEY, JSON.stringify(Array.from(set)));
}

// ── Automatic migration / cleanup of legacy unwanted coupons ─────────────────
if (typeof localStorage !== "undefined") {
  addDeletedCouponCode("MUSCLEMPIRE25");
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    if (Array.isArray(raw)) {
      const cleaned = raw.filter((c: Coupon) => (c.code || "").toUpperCase().trim() !== "MUSCLEMPIRE25");
      if (cleaned.length !== raw.length) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cleaned));
      }
    }
  } catch {}
}

// ── localStorage (instant read/write) ───────────────────────────────────────

function readCache(): Coupon[] {
  try {
    try {
      localStorage.removeItem("me_coupons_v4");
      localStorage.removeItem("me_coupons_v3");
      localStorage.removeItem("me_coupons_v2");
      localStorage.removeItem("me_coupons_v1");
      localStorage.removeItem("me_coupons");
    } catch {}
    const item = localStorage.getItem(CACHE_KEY);
    if (item === null) return [];
    const deletedCodes = getDeletedCouponCodes();
    const raw: Coupon[] = JSON.parse(item);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(c => !deletedCodes.has((c.code || "").toUpperCase().trim()))
      .map(c => ({
        ...c,
        code: (c.code || "").toUpperCase().trim(),
        discount: parseDiscountPercent(c.discount, c.code),
        plans: Array.isArray(c.plans) ? c.plans : [],
        enabled: c.enabled !== false,
      }));
  } catch {
    return [];
  }
}

function writeCache(coupons: Coupon[]): void {
  const deletedCodes = getDeletedCouponCodes();
  const valid = coupons
    .filter(c => !deletedCodes.has((c.code || "").toUpperCase().trim()))
    .map(c => ({
      ...c,
      code: (c.code || "").toUpperCase().trim(),
      discount: parseDiscountPercent(c.discount, c.code),
    }));
  localStorage.setItem(CACHE_KEY, JSON.stringify(valid));
  localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
}

function recordLocalEdit(): void {
  localStorage.setItem(LAST_EDIT_KEY, String(Date.now()));
}

function isRecentLocalEdit(): boolean {
  const ts = parseInt(localStorage.getItem(LAST_EDIT_KEY) || "0", 10);
  return Date.now() - ts < 15_000;
}

function isCacheStale(): boolean {
  const ts = parseInt(localStorage.getItem(CACHE_TS_KEY) || "0", 10);
  return Date.now() - ts > CACHE_TTL;
}

// ── Sheets (background sync only) ───────────────────────────────────────────

export async function pullFromSheets(retry = 1): Promise<Coupon[]> {
  if (isRecentLocalEdit() || isPulling) {
    return readCache();
  }
  isPulling = true;
  const deletedCodes = getDeletedCouponCodes();

  try {
    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getCoupons&token=${T}&_t=${Date.now()}`, {
          redirect: "follow",
          cache: "no-store",
        });
        const text = await res.text();
        const json = JSON.parse(text);
        if (Array.isArray(json?.coupons)) {
          if (!isRecentLocalEdit()) {
            const validCoupons = (json.coupons as Coupon[])
              .filter(c => c && c.code && !deletedCodes.has((c.code || "").toUpperCase().trim()))
              .map(c => ({
                ...c,
                code: String(c.code).toUpperCase().trim(),
                discount: parseDiscountPercent(c.discount, c.code),
                plans: Array.isArray(c.plans) ? c.plans : [],
                enabled: c.enabled === true || String(c.enabled).toLowerCase() === "true",
                description: String(c.description || ""),
              }));
            writeCache(validCoupons);
            window.dispatchEvent(new CustomEvent("couponsUpdated"));
            return validCoupons;
          }
        }
      } catch (e) {
        if (attempt < retry) await new Promise(r => setTimeout(r, 800));
      }
    }
  } finally {
    isPulling = false;
  }
  return readCache();
}

async function pushToSheets(coupons: Coupon[]): Promise<boolean> {
  const deletedCodes = getDeletedCouponCodes();
  const valid = coupons
    .filter(c => !deletedCodes.has((c.code || "").toUpperCase().trim()))
    .map(c => ({
      ...c,
      code: (c.code || "").toUpperCase().trim(),
      discount: parseDiscountPercent(c.discount, c.code),
    }));
  const dataStr = JSON.stringify(valid);
  const qs = new URLSearchParams({
    action: "saveCoupons",
    token: T,
    data: dataStr,
    _t: String(Date.now())
  }).toString();
  const url = `${APPS_SCRIPT_URL}?${qs}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store"
    });
    await res.text();
    return true;
  } catch {
    try {
      await fetch(url, { method: "GET", mode: "no-cors" });
      return true;
    } catch {
      return false;
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getCoupons(): Coupon[] {
  if (isCacheStale()) {
    pullFromSheets().catch(() => {});
  }
  return readCache();
}

function _save(coupons: Coupon[]): void {
  recordLocalEdit();
  writeCache(coupons);
  pushToSheets(coupons);
  window.dispatchEvent(new CustomEvent("couponsUpdated"));
}

export function addCoupon(coupon: Omit<Coupon, "id">): void {
  const cleanCode = coupon.code.toUpperCase().trim();
  const deletedCodes = getDeletedCouponCodes();
  if (deletedCodes.has(cleanCode)) {
    deletedCodes.delete(cleanCode);
    localStorage.setItem(DELETED_COUPONS_KEY, JSON.stringify(Array.from(deletedCodes)));
  }

  const coupons = readCache();
  if (coupons.find(c => c.code === cleanCode)) return;
  coupons.push({
    id: "coupon_" + Date.now(),
    ...coupon,
    code: cleanCode,
    discount: parseDiscountPercent(coupon.discount, cleanCode),
  });
  _save(coupons);
}

export function updateCoupon(id: string, updated: Partial<Coupon>): void {
  const current = readCache();
  const next = current.map(c => {
    if (c.id !== id) return c;
    const nextObj = { ...c, ...updated };
    if (updated.discount !== undefined) {
      nextObj.discount = parseDiscountPercent(updated.discount, nextObj.code);
    }
    return nextObj;
  });
  _save(next);
}

export function removeCoupon(id: string): void {
  const current = readCache();
  const target = current.find(c => c.id === id);
  if (target) {
    addDeletedCouponCode(target.code);
  }
  const next = current.filter(c => c.id !== id);
  _save(next);
}

export function saveCoupons(coupons: Coupon[]): void {
  _save(coupons);
}

export function ensureCouponExists(code: string, discount = 25, description?: string): void {
  const cleanCode = code.toUpperCase().trim();
  if (!cleanCode) return;
  const deletedCodes = getDeletedCouponCodes();
  if (deletedCodes.has(cleanCode)) return;

  const existing = readCache().find(c => c.code === cleanCode);
  if (existing) {
    // CRITICAL FIX: NEVER overwrite an existing coupon configured by admin!
    // Only heal if the existing coupon had the bugged 1% discount
    if (existing.discount <= 1) {
      const healed = parseDiscountPercent(discount, cleanCode);
      updateCoupon(existing.id, { discount: healed });
    }
    return;
  }

  const finalDisc = parseDiscountPercent(discount, cleanCode);
  addCoupon({
    code: cleanCode,
    discount: finalDisc,
    plans: [],
    enabled: true,
    description: description || `Coupon for ${cleanCode}`
  });
}

export function validateCoupon(code: string, planName: string): { discount: number; coupon: Coupon } | null {
  const cleanCode = code.toUpperCase().trim();
  if (!cleanCode) return null;
  const deletedCodes = getDeletedCouponCodes();
  if (deletedCodes.has(cleanCode)) return null;

  let coupons = getCoupons();
  let coupon = coupons.find(c => c.code === cleanCode && c.enabled);

  if (!coupon) {
    try {
      const activeOffers = getOffers();
      const matchedOffer = activeOffers.find((o: any) => o.couponCode && o.couponCode.toUpperCase().trim() === cleanCode && o.status !== "expired");
      if (matchedOffer) {
        const discNum = parseDiscountPercent(matchedOffer.discount, cleanCode);
        ensureCouponExists(cleanCode, discNum, `${matchedOffer.title} Offer Coupon`);
        coupons = getCoupons();
        coupon = coupons.find(c => c.code === cleanCode && c.enabled);
      }
    } catch {}
  }

  if (!coupon) return null;
  if (coupon.plans && coupon.plans.length > 0 && !coupon.plans.includes(planName)) return null;
  return { discount: parseDiscountPercent(coupon.discount, coupon.code), coupon };
}

// Legacy async compat shims
export async function syncCouponsFromSheets(): Promise<void> { await pullFromSheets(); }
