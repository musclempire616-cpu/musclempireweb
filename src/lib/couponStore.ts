import { APPS_SCRIPT_URL } from "@/lib/sheets";
import { getOffers } from "@/lib/offersStore";

const T = ["ZujXfS4o6t","pRWL2vQmAT","JbEFBaVKCs","1O7UGPqDyk"].join("");

// Purge any legacy localStorage cache keys so stale data NEVER persists locally
if (typeof localStorage !== "undefined") {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("me_coupon") || k.startsWith("me_deleted_coupon"))) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
}

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  plans: string[];
  enabled: boolean;
  description?: string;
}

// ── In-Memory Cache (Live Session Only — Never persisted to localStorage) ─────
let inMemoryCoupons: Coupon[] = [];
let isPullingCoupons = false;

// ── Smart Discount Parser & Sanitizer ────────────────────────────────────────
export function parseDiscountPercent(val?: any, code?: string): number {
  if (typeof val === "number" && !isNaN(val)) {
    if (val > 0 && val < 1) return Math.round(val * 100);
    if (val > 1 && val <= 100) return Math.round(val);
    if (val === 1) {
      if (code) {
        const m = code.match(/(\d{2})$/);
        if (m) return parseInt(m[1], 10);
      }
      return 25;
    }
  }

  const str = String(val || "").trim();

  const pct = str.match(/(\d{1,2})\s*(?:%|percent)/i);
  if (pct) {
    const n = parseInt(pct[1], 10);
    if (n >= 1 && n <= 100) return n;
  }

  const digits = str.match(/\b([1-9]\d)\b/);
  if (digits) {
    const n = parseInt(digits[1], 10);
    if (n >= 5 && n <= 100) return n;
  }

  if (code) {
    const m = code.match(/(\d{2})$/);
    if (m) return parseInt(m[1], 10);
  }

  const raw = parseInt(str.replace(/\D/g, ""), 10);
  if (!isNaN(raw) && raw >= 5 && raw <= 100) return raw;

  return 25;
}

// ── Deduplication Helper ──────────────────────────────────────────────────────
export function dedupeCoupons(coupons: Coupon[]): Coupon[] {
  const seenCodes = new Set<string>();
  const result: Coupon[] = [];

  for (const c of coupons) {
    if (!c) continue;
    const code = (c.code || "").toUpperCase().trim();
    if (!code || seenCodes.has(code)) continue;
    seenCodes.add(code);
    result.push({
      ...c,
      code,
      discount: parseDiscountPercent(c.discount, code),
      plans: Array.isArray(c.plans) ? c.plans : [],
      enabled: c.enabled !== false,
      description: String(c.description || ""),
    });
  }

  return result;
}

// ── Sheets API (Direct Fetch & Push — Zero Local Storage) ────────────────────

export async function pullFromSheets(retry = 2): Promise<Coupon[]> {
  if (isPullingCoupons) return inMemoryCoupons;
  isPullingCoupons = true;

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
          const deduped = dedupeCoupons(json.coupons);
          inMemoryCoupons = deduped;
          window.dispatchEvent(new CustomEvent("couponsUpdated"));
          return inMemoryCoupons;
        }
      } catch (e) {
        if (attempt < retry) await new Promise(r => setTimeout(r, 600));
      }
    }
  } finally {
    isPullingCoupons = false;
  }
  return inMemoryCoupons;
}

async function pushToSheets(coupons: Coupon[]): Promise<boolean> {
  const deduped = dedupeCoupons(coupons);
  const dataStr = JSON.stringify(deduped);
  const qs = new URLSearchParams({
    action: "saveCoupons",
    token: T,
    data: dataStr,
    _t: String(Date.now())
  }).toString();
  const url = `${APPS_SCRIPT_URL}?${qs}`;

  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", cache: "no-store" });
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

// ── Public Store API ─────────────────────────────────────────────────────────

export function getCoupons(): Coupon[] {
  if (inMemoryCoupons.length === 0 && !isPullingCoupons) {
    pullFromSheets().catch(() => {});
  }
  return inMemoryCoupons;
}

export async function addCoupon(coupon: Omit<Coupon, "id">): Promise<Coupon[]> {
  const cleanCode = coupon.code.toUpperCase().trim();
  if (!cleanCode) return inMemoryCoupons;

  // 1. Fetch latest from Sheets
  const current = await pullFromSheets();

  // 2. If coupon with this code already exists, update it rather than duplicating
  const existingIdx = current.findIndex(c => c.code.toUpperCase().trim() === cleanCode);
  let next: Coupon[];

  if (existingIdx !== -1) {
    next = current.map((c, idx) => idx === existingIdx ? {
      ...c,
      ...coupon,
      code: cleanCode,
      discount: parseDiscountPercent(coupon.discount, cleanCode),
    } : c);
  } else {
    next = [...current, {
      id: "coupon_" + Date.now(),
      ...coupon,
      code: cleanCode,
      discount: parseDiscountPercent(coupon.discount, cleanCode),
    }];
  }

  const deduped = dedupeCoupons(next);
  inMemoryCoupons = deduped;
  window.dispatchEvent(new CustomEvent("couponsUpdated"));

  // 3. Persist directly to Google Sheets and await confirmation
  await pushToSheets(deduped);
  return inMemoryCoupons;
}

export async function updateCoupon(id: string, updated: Partial<Coupon>): Promise<Coupon[]> {
  inMemoryCoupons = inMemoryCoupons.map(c => {
    if (c.id !== id) return c;
    const nextObj = { ...c, ...updated };
    if (updated.discount !== undefined) {
      nextObj.discount = parseDiscountPercent(updated.discount, nextObj.code);
    }
    return nextObj;
  });
  inMemoryCoupons = dedupeCoupons(inMemoryCoupons);
  window.dispatchEvent(new CustomEvent("couponsUpdated"));

  await pushToSheets(inMemoryCoupons);
  return inMemoryCoupons;
}

export async function removeCoupon(id: string): Promise<Coupon[]> {
  inMemoryCoupons = inMemoryCoupons.filter(c => c.id !== id);
  window.dispatchEvent(new CustomEvent("couponsUpdated"));

  await pushToSheets(inMemoryCoupons);
  return await pullFromSheets();
}

export async function saveCoupons(coupons: Coupon[]): Promise<boolean> {
  inMemoryCoupons = dedupeCoupons(coupons);
  window.dispatchEvent(new CustomEvent("couponsUpdated"));
  return await pushToSheets(inMemoryCoupons);
}

export async function ensureCouponExists(code: string, discount = 25, description?: string): Promise<void> {
  const cleanCode = code.toUpperCase().trim();
  if (!cleanCode) return;

  const existing = inMemoryCoupons.find(c => c.code === cleanCode);
  if (existing) {
    if (existing.discount <= 1) {
      const healed = parseDiscountPercent(discount, cleanCode);
      await updateCoupon(existing.id, { discount: healed });
    }
    return;
  }

  const finalDisc = parseDiscountPercent(discount, cleanCode);
  await addCoupon({
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

// Legacy async compat shim
export async function syncCouponsFromSheets(): Promise<void> { await pullFromSheets(); }
