import type { Offer } from "@/data/offers";
import { supabase } from "@/lib/supabase";

// ── In-Memory Cache (Live Session Only) ──────────────────────────────────────
let inMemoryOffers: Offer[] = [];
let isFetchingOffers = false;
let realtimeSubscribed = false;

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

// ── Date/Time Formatter (normal readable format) ─────────────────────────────
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
        const timePart = hours === 0 && mins === 0 ? "24:00" : `${hours < 10 ? `0${hours}` : hours}:${minsStr}`;
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

function mapRowToOffer(row: any): Offer {
  const codes = row.coupon_code
    ? String(row.coupon_code).split(",").map((c: string) => c.trim().toUpperCase()).filter(Boolean)
    : [];

  return {
    id: String(row.id),
    title: String(row.title || "").trim(),
    subtitle: String(row.subtitle || ""),
    description: String(row.description || ""),
    discount: String(row.discount || ""),
    badge: String(row.badge || ""),
    validTill: String(row.valid_till || ""),
    ctaText: String(row.cta_text || "Claim Offer"),
    whatsappMessage: String(row.whatsapp_message || ""),
    couponCode: row.coupon_code ? String(row.coupon_code).trim().toUpperCase() : undefined,
    couponCodes: codes,
    status: (row.status || "active") as "active" | "upcoming" | "expired",
    image: normalizeImageUrl(row.image),
    isFeatured: row.is_featured !== false,
    showInPopup: row.show_in_popup !== false,
  };
}

function mapOfferToRow(offer: Offer | Omit<Offer, "id">, id?: string): any {
  const codeStr = (offer.couponCodes && offer.couponCodes.length > 0)
    ? offer.couponCodes.map(c => c.trim().toUpperCase()).filter(Boolean).join(", ")
    : (offer.couponCode ? offer.couponCode.trim().toUpperCase() : "");

  return {
    id: id || (offer as any).id,
    title: offer.title.trim(),
    subtitle: offer.subtitle || "",
    description: offer.description || "",
    discount: offer.discount || "",
    badge: offer.badge || "",
    valid_till: offer.validTill || "",
    cta_text: offer.ctaText || "Claim Offer",
    whatsapp_message: offer.whatsappMessage || "",
    coupon_code: codeStr,
    status: offer.status || "active",
    image: normalizeImageUrl(offer.image),
    is_featured: offer.isFeatured !== false,
    show_in_popup: offer.showInPopup !== false,
  };
}

// ── Supabase Realtime Setup ──────────────────────────────────────────────────
function setupRealtime() {
  if (realtimeSubscribed || typeof window === "undefined") return;
  realtimeSubscribed = true;

  try {
    supabase
      .channel("public:offers")
      .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newOffer = mapRowToOffer(payload.new);
          inMemoryOffers = dedupeOffers([newOffer, ...inMemoryOffers]);
        } else if (payload.eventType === "UPDATE") {
          const updated = mapRowToOffer(payload.new);
          inMemoryOffers = inMemoryOffers.map((o) => (o.id === updated.id ? updated : o));
        } else if (payload.eventType === "DELETE") {
          const oldId = String((payload.old as any)?.id);
          inMemoryOffers = inMemoryOffers.filter((o) => o.id !== oldId);
        }
        window.dispatchEvent(new CustomEvent("offersUpdated"));
      })
      .subscribe();
  } catch (err) {
    console.warn("Could not subscribe to Supabase offer realtime:", err);
  }
}

// ── Supabase API (Fast REST Queries) ─────────────────────────────────────────

export async function pullOffersFromSupabase(): Promise<Offer[]> {
  if (isFetchingOffers) return inMemoryOffers;
  isFetchingOffers = true;
  setupRealtime();

  try {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase pull offers warning:", error.message);
      return inMemoryOffers;
    }

    if (Array.isArray(data)) {
      const mapped = data.map(mapRowToOffer);
      inMemoryOffers = dedupeOffers(mapped);
      window.dispatchEvent(new CustomEvent("offersUpdated"));
    }
  } catch (err) {
    console.warn("Failed to fetch offers from Supabase:", err);
  } finally {
    isFetchingOffers = false;
  }

  return inMemoryOffers;
}

// ── Public Store API ─────────────────────────────────────────────────────────

export function getOffers(): Offer[] {
  if (inMemoryOffers.length === 0 && !isFetchingOffers) {
    pullOffersFromSupabase().catch(() => {});
  }
  return inMemoryOffers;
}

export function getOffersAndSync(): Offer[] {
  pullOffersFromSupabase().catch(() => {});
  return inMemoryOffers;
}

export async function addOffer(offer: Omit<Offer, "id">): Promise<Offer[]> {
  const cleanTitle = offer.title.trim().toLowerCase();
  if (inMemoryOffers.some((o) => o.title.trim().toLowerCase() === cleanTitle)) {
    return inMemoryOffers;
  }

  const newId = "offer_" + Date.now();
  const newOffer: Offer = {
    id: newId,
    ...offer,
    title: offer.title.trim(),
    image: normalizeImageUrl(offer.image),
  };

  // 1. Optimistic update in memory
  inMemoryOffers = dedupeOffers([newOffer, ...inMemoryOffers]);
  window.dispatchEvent(new CustomEvent("offersUpdated"));

  // 2. Persist to Supabase
  try {
    const row = mapOfferToRow(newOffer, newId);
    const { error } = await supabase.from("offers").insert([row]);
    if (error) console.error("Supabase addOffer error:", error);
  } catch (err) {
    console.error("Failed to add offer to Supabase:", err);
  }

  return inMemoryOffers;
}

export async function removeOffer(id: string): Promise<Offer[]> {
  inMemoryOffers = inMemoryOffers.filter((o) => o.id !== id);
  window.dispatchEvent(new CustomEvent("offersUpdated"));

  try {
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) console.error("Supabase removeOffer error:", error);
  } catch (err) {
    console.error("Failed to remove offer from Supabase:", err);
  }

  return inMemoryOffers;
}

export async function updateOffer(id: string, updated: Partial<Offer>): Promise<Offer[]> {
  inMemoryOffers = inMemoryOffers.map((o) =>
    o.id === id
      ? {
          ...o,
          ...updated,
          image: updated.image !== undefined ? normalizeImageUrl(updated.image) : o.image,
        }
      : o
  );
  inMemoryOffers = dedupeOffers(inMemoryOffers);
  window.dispatchEvent(new CustomEvent("offersUpdated"));

  try {
    const target = inMemoryOffers.find((o) => o.id === id);
    if (target) {
      const row = mapOfferToRow(target, id);
      const { error } = await supabase.from("offers").update(row).eq("id", id);
      if (error) console.error("Supabase updateOffer error:", error);
    }
  } catch (err) {
    console.error("Failed to update offer in Supabase:", err);
  }

  return inMemoryOffers;
}

// Auto-fetch on app load
if (typeof window !== "undefined") {
  pullOffersFromSupabase().catch(() => {});
}
