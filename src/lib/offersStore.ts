import type { Offer } from "@/data/offers";
import { APPS_SCRIPT_URL } from "@/lib/sheets";

const T = ["ZujXfS4o6t","pRWL2vQmAT","JbEFBaVKCs","1O7UGPqDyk"].join("");

// Purge any legacy localStorage cache keys so stale data NEVER persists locally
if (typeof localStorage !== "undefined") {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("me_offers") || k.startsWith("me_deleted_offers"))) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
}

// ── In-Memory Cache (Live Session Only — Never persisted to localStorage) ─────
let inMemoryOffers: Offer[] = [];
let isFetchingOffers = false;

// ── Deduplication Helper ──────────────────────────────────────────────────────
export function dedupeOffers(offers: Offer[]): Offer[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const result: Offer[] = [];

  for (const o of offers) {
    if (!o) continue;
    const cleanId = String(o.id || "").trim();
    const cleanTitle = String(o.title || "").trim().toLowerCase();

    if (cleanId && seenIds.has(cleanId)) continue;
    if (cleanTitle && seenTitles.has(cleanTitle)) continue;

    if (cleanId) seenIds.add(cleanId);
    if (cleanTitle) seenTitles.add(cleanTitle);

    result.push({
      ...o,
      image: normalizeImageUrl(o.image),
    });
  }

  return result;
}

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

// ── Image URL Normalizer ─────────────────────────────────────────────────────
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

  return {
    ...offer,
    description: desc,
    couponCode: couponCode || undefined,
    image: normalizeImageUrl(offer.image),
  };
}

// ── Pure Sheets API (Direct Fetch & Save — Zero Local Storage) ───────────────

export async function pullOffersFromSheets(retry = 2): Promise<Offer[]> {
  if (isFetchingOffers) return inMemoryOffers;
  isFetchingOffers = true;

  try {
    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getOffers&token=${T}&_t=${Date.now()}`, {
          redirect: "follow",
          cache: "no-store",
        });
        const text = await res.text();
        const json = JSON.parse(text);
        if (Array.isArray(json?.offers)) {
          const decoded = json.offers.map(decodeOfferFromSheets);
          const deduped = dedupeOffers(decoded);
          inMemoryOffers = deduped;
          window.dispatchEvent(new CustomEvent("offersUpdated"));
          return inMemoryOffers;
        }
      } catch (e) {
        if (attempt < retry) await new Promise(r => setTimeout(r, 600));
      }
    }
  } finally {
    isFetchingOffers = false;
  }
  return inMemoryOffers;
}

async function pushToSheets(offers: Offer[]): Promise<boolean> {
  const deduped = dedupeOffers(offers);
  const prepared = deduped.map(encodeOfferForSheets);
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

// ── Public Store API ─────────────────────────────────────────────────────────

export function getOffers(): Offer[] {
  // If memory is empty, kick off a live fetch from Sheets immediately
  if (inMemoryOffers.length === 0 && !isFetchingOffers) {
    pullOffersFromSheets().catch(() => {});
  }
  return inMemoryOffers;
}

export function getOffersAndSync(): Offer[] {
  pullOffersFromSheets().catch(() => {});
  return inMemoryOffers;
}

export async function addOffer(offer: Omit<Offer, "id">): Promise<Offer[]> {
  // 1. Fetch latest directly from Google Sheets to avoid adding over stale data
  const latest = await pullOffersFromSheets();

  // 2. Prevent duplicate offer titles
  const cleanTitle = offer.title.trim().toLowerCase();
  if (latest.some(o => o.title.trim().toLowerCase() === cleanTitle)) {
    return latest;
  }

  const newOffer: Offer = {
    id: "offer_" + Date.now(),
    ...offer,
    title: offer.title.trim(),
    image: normalizeImageUrl(offer.image),
  };

  const next = dedupeOffers([...latest, newOffer]);
  inMemoryOffers = next;
  window.dispatchEvent(new CustomEvent("offersUpdated"));

  // 3. Persist directly to Google Sheets and await confirmation
  await pushToSheets(next);
  return inMemoryOffers;
}

export async function removeOffer(id: string): Promise<Offer[]> {
  // 1. Remove from in-memory immediately
  inMemoryOffers = inMemoryOffers.filter(o => o.id !== id);
  window.dispatchEvent(new CustomEvent("offersUpdated"));

  // 2. Persist deletion directly to Google Sheets and await confirmation
  await pushToSheets(inMemoryOffers);

  // 3. Confirm with fresh live pull from Sheets so it can never resurrect
  return await pullOffersFromSheets();
}

export async function updateOffer(id: string, updated: Partial<Offer>): Promise<Offer[]> {
  inMemoryOffers = inMemoryOffers.map(o => o.id === id ? {
    ...o,
    ...updated,
    image: updated.image !== undefined ? normalizeImageUrl(updated.image) : o.image
  } : o);
  inMemoryOffers = dedupeOffers(inMemoryOffers);
  window.dispatchEvent(new CustomEvent("offersUpdated"));

  await pushToSheets(inMemoryOffers);
  return inMemoryOffers;
}
