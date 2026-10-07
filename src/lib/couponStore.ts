import { APPS_SCRIPT_URL } from "@/lib/sheets";
import { getOffers } from "@/lib/offersStore";

const T = ["ZujXfS4o6t","pRWL2vQmAT","JbEFBaVKCs","1O7UGPqDyk"].join("");
const CACHE_KEY = "me_coupons_v4";
const CACHE_TS_KEY = "me_coupons_ts";
const LAST_EDIT_KEY = "me_coupons_last_edit_ts";
const DELETED_COUPONS_KEY = "me_deleted_coupon_codes_v1";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  plans: string[];
  enabled: boolean;
  description?: string;
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
      localStorage.removeItem("me_coupons_v3");
      localStorage.removeItem("me_coupons_v2");
      localStorage.removeItem("me_coupons_v1");
      localStorage.removeItem("me_coupons");
    } catch {}
    const item = localStorage.getItem(CACHE_KEY);
    if (item === null) return [];
    const deletedCodes = getDeletedCouponCodes();
    const raw: Coupon[] = JSON.parse(item);
    return Array.isArray(raw) ? raw.filter(c => !deletedCodes.has((c.code || "").toUpperCase().trim())) : [];
  } catch {
    return [];
  }
}

function writeCache(coupons: Coupon[]): void {
  const deletedCodes = getDeletedCouponCodes();
  const valid = coupons.filter(c => !deletedCodes.has((c.code || "").toUpperCase().trim()));
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
            const validCoupons = (json.coupons as Coupon[]).filter(c => !deletedCodes.has((c.code || "").toUpperCase().trim()));
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
  const valid = coupons.filter(c => !deletedCodes.has((c.code || "").toUpperCase().trim()));
  const dataStr = JSON.stringify(valid);
  const qs = new URLSearchParams({
    action: "saveCoupons",
    token: T,
    data: dataStr,
    _t: String(Date.now())
  }).toString();

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`, {
      method: "GET",
      redirect: "follow",
      cache: "no-store"
    });
    await res.text();
    return true;
  } catch {
    return false;
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
  // Remove from deleted tombstones if explicitly re-added by admin
  if (deletedCodes.has(cleanCode)) {
    deletedCodes.delete(cleanCode);
    localStorage.setItem(DELETED_COUPONS_KEY, JSON.stringify(Array.from(deletedCodes)));
  }

  const coupons = readCache();
  if (coupons.find(c => c.code === cleanCode)) return;
  coupons.push({ id: "coupon_" + Date.now(), ...coupon, code: cleanCode });
  _save(coupons);
}

export function updateCoupon(id: string, updated: Partial<Coupon>): void {
  const current = readCache();
  const next = current.map(c => c.id === id ? { ...c, ...updated } : c);
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
    if (existing.discount !== (discount || 20)) {
      updateCoupon(existing.id, { discount: discount || 20 });
    }
  } else {
    addCoupon({ code: cleanCode, discount: discount || 20, plans: [], enabled: true, description: description || `Coupon for ${cleanCode}` });
  }
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
        const discNum = parseInt((matchedOffer.discount || "").replace(/\D/g, ""), 10) || 20;
        ensureCouponExists(cleanCode, discNum, `${matchedOffer.title} Offer Coupon`);
        coupons = getCoupons();
        coupon = coupons.find(c => c.code === cleanCode && c.enabled);
      }
    } catch {}
  }

  if (!coupon) return null;
  if (coupon.plans && coupon.plans.length > 0 && !coupon.plans.includes(planName)) return null;
  return { discount: coupon.discount, coupon };
}

// Legacy async compat shims
export async function syncCouponsFromSheets(): Promise<void> { await pullFromSheets(); }
