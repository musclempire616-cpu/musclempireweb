import type { Offer } from "@/data/offers";
import { APPS_SCRIPT_URL } from "@/lib/sheets";

const T = ["ZujXfS4o6t","pRWL2vQmAT","JbEFBaVKCs","1O7UGPqDyk"].join("");
const CACHE_KEY = "me_offers_v6";
const CACHE_TS_KEY = "me_offers_ts";
const LAST_EDIT_KEY = "me_offers_last_edit_ts";
const COUPON_MAP_KEY = "me_offer_coupons_map_v2";
const CACHE_TTL = 30_000;

// ── Image URL Normalizer ─────────────────────────────────────────────────────
// ── Date/Time Formatter (normal readable 24:00 format) ────────────────────────
export function formatOfferDateTime(val?: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  if (!trimmed) return "";

  if (/limited|soon|tbd|free/i.test(trimmed) && !/\d{4}/.test(trimmed)) {
    return trimmed;
  }

  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
      const datePart = d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const hasTime = /(?:\b\d{1,2}:\d{2}|\bGMT\b|\bT\d{2}:)/i.test(trimmed);
      if (hasTime) {
        const hours = d.getHours();
        const mins = d.getMinutes();
        const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
        const timePart = (hours === 0 && mins === 0)
          ? "24:00"
          : `${hours < 10 ? `0${hours}` : hours}:${minsStr}`;
        return `${datePart}, ${timePart}`;
      }

      return datePart;
    }
  } catch {}

  return trimmed;
}

export function normalizeImageUrl(url?: string): string {
  if (!url) return "";
  let u = url.trim();

  // Known ImgBB webpage -> direct image mappings
  if (u.includes("ibb.co/F4pfqKNc")) {
    return "https://i.ibb.co/b5tyRPqY/Muscle-Empire-Diwali-Offer-2026-Copy.png";
  }

  // Google Drive share link -> direct view link
  const gdrive = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdrive) {
    return `https://drive.google.com/uc?export=view&id=${gdrive[1]}`;
  }

  // Dropbox link -> raw image link
  if (u.includes("dropbox.com") && u.includes("dl=0")) {
    return u.replace("dl=0", "raw=1");
  }

  return u;
}

// ── Persistent Offer-Coupon Map (preserves couponCode locally & across Sheets sync)
function readCouponMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(COUPON_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCouponMap(map: Record<string, string>): void {
  try {
    localStorage.setItem(COUPON_MAP_KEY, JSON.stringify(map));
  } catch {}
}

function recordCouponForOffer(id: string, title: string, couponCode?: string): void {
  if (!id && !title) return;
  const map = readCouponMap();
  const cleanCode = (couponCode || "").trim().toUpperCase();
  if (cleanCode) {
    if (id) map[id] = cleanCode;
    if (title) map[title.toLowerCase().trim()] = cleanCode;
  } else {
    if (id) delete map[id];
    if (title) delete map[title.toLowerCase().trim()];
  }
  writeCouponMap(map);
}

function getCouponForOffer(id: string, title: string): string | undefined {
  const map = readCouponMap();
  return (id && map[id]) || (title && map[title.toLowerCase().trim()]) || undefined;
}

// ── Metadata Tag Encoder/Decoder ─────────────────────────────────────────────
// Encodes couponCode into description so it survives Sheets sync without requiring backend schema change
const COUPON_TAG_REGEX = /\[COUPON:\s*([A-Z0-9_-]+)\]/i;

function encodeOfferForSheets(offer: Offer): Offer {
  const normImage = normalizeImageUrl(offer.image);
  let desc = (offer.description || "").replace(new RegExp(COUPON_TAG_REGEX, "gi"), "").trim();
  const cleanCoupon = (offer.couponCode || "").trim().toUpperCase();
  if (cleanCoupon) {
    desc = desc ? `${desc}\n[COUPON:${cleanCoupon}]` : `[COUPON:${cleanCoupon}]`;
  }
  return {
    ...offer,
    description: desc,
    image: normImage?.startsWith("data:") ? "" : normImage,
  };
}

function decodeOfferFromSheets(offer: Offer): Offer {
  let desc = offer.description || "";
  let couponCode = offer.couponCode;

  // Extract from metadata tag in description if present
  const match = desc.match(COUPON_TAG_REGEX);
  if (match) {
    couponCode = match[1].toUpperCase().trim();
    desc = desc.replace(new RegExp(COUPON_TAG_REGEX, "gi"), "").trim();
  }

  // Fallback to local persistent map if tag wasn't present
  if (!couponCode) {
    couponCode = getCouponForOffer(offer.id, offer.title);
  } else {
    // Record to map for redundancy
    recordCouponForOffer(offer.id, offer.title, couponCode);
  }

  return {
    ...offer,
    description: desc,
    couponCode: couponCode || undefined,
    image: normalizeImageUrl(offer.image),
  };
}

// ── localStorage (instant) ───────────────────────────────────────────────────

function readCache(): Offer[] {
  try {
    try {
      localStorage.removeItem("me_offers_v5");
      localStorage.removeItem("me_offers_v4");
      localStorage.removeItem("me_offers_v3");
      localStorage.removeItem("me_offers_v2");
      localStorage.removeItem("me_offers_v1");
    } catch {}
    const item = localStorage.getItem(CACHE_KEY);
    if (item === null) return [];
    const list: Offer[] = JSON.parse(item);
    return Array.isArray(list) ? list.map(decodeOfferFromSheets) : [];
  } catch {
    return [];
  }
}

function writeCache(offers: Offer[]): void {
  const processed = offers.map(o => {
    if (o.couponCode) {
      recordCouponForOffer(o.id, o.title, o.couponCode);
    }
    return {
      ...o,
      image: normalizeImageUrl(o.image),
    };
  });
  localStorage.setItem(CACHE_KEY, JSON.stringify(processed));
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

// ── Sheets (background) ───────────────────────────────────────────────────────

export async function pullOffersFromSheets(retry = 1): Promise<Offer[]> {
  if (isRecentLocalEdit()) {
    return readCache();
  }

  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getOffers&token=${T}&_t=${Date.now()}`, {
        redirect: "follow",
        cache: "no-store",
      });
      const text = await res.text();
      const json = JSON.parse(text);
      if (Array.isArray(json?.offers)) {
        if (!isRecentLocalEdit()) {
          const offers: Offer[] = json.offers.map(decodeOfferFromSheets);
          writeCache(offers);
          window.dispatchEvent(new CustomEvent("offersUpdated"));
          return offers;
        }
      }
    } catch {
      if (attempt < retry) await new Promise(r => setTimeout(r, 600));
    }
  }
  return readCache();
}

async function pushToSheets(offers: Offer[]): Promise<boolean> {
  const prepared = offers.map(encodeOfferForSheets);
  const dataStr = JSON.stringify(prepared);
  const qs = new URLSearchParams({
    action: "saveOffers",
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

// ── Public API ────────────────────────────────────────────────────────────────

export function getOffers(): Offer[] {
  const cached = readCache();
  if (isCacheStale() || localStorage.getItem(CACHE_KEY) === null) {
    pullOffersFromSheets().catch(() => {});
  }
  return cached;
}

export function getOffersAndSync(): Offer[] {
  const cached = readCache();
  pullOffersFromSheets();
  return cached;
}

function _save(offers: Offer[]): void {
  recordLocalEdit();
  writeCache(offers);
  pushToSheets(offers);
  window.dispatchEvent(new CustomEvent("offersUpdated"));
}

export function saveOffers(offers: Offer[]): void { _save(offers); }

export function addOffer(offer: Omit<Offer, "id">): void {
  const offers = readCache();
  const id = "offer_" + Date.now();
  if (offer.couponCode) {
    recordCouponForOffer(id, offer.title, offer.couponCode);
  }
  offers.push({ id, ...offer, image: normalizeImageUrl(offer.image) });
  _save(offers);
}

export function removeOffer(id: string): void {
  const current = readCache();
  const next = current.filter(o => o.id !== id);
  _save(next);
}

export function updateOffer(id: string, updated: Partial<Offer>): void {
  const current = readCache();
  if (updated.couponCode !== undefined || updated.title !== undefined) {
    const existing = current.find(o => o.id === id);
    const title = updated.title || existing?.title || "";
    recordCouponForOffer(id, title, updated.couponCode ?? existing?.couponCode);
  }
  const next = current.map(o => o.id === id ? {
    ...o,
    ...updated,
    image: updated.image !== undefined ? normalizeImageUrl(updated.image) : o.image
  } : o);
  _save(next);
}
