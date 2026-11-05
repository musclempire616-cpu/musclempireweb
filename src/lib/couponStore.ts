import { supabase } from "@/lib/supabase";
import { getOffers } from "@/lib/offersStore";

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  plans: string[];
  enabled: boolean;
  description?: string;
}

// ── In-Memory Cache (Sub-millisecond access for UI) ─────────────────────────
let inMemoryCoupons: Coupon[] = [];
let isPullingCoupons = false;
let realtimeSubscribed = false;

// ── Smart Discount Parser & Sanitizer ────────────────────────────────────────
export function parseDiscountPercent(val?: any, code?: string): number {
  if (typeof val === "number" && !isNaN(val)) {
    if (val > 0 && val < 1) return Math.min(100, Math.round(val * 100));
    if (val > 1) return Math.min(100, Math.round(val));
    if (val === 1) {
      if (code) {
        const m = code.match(/(\d{2})$/);
        if (m) return Math.min(100, parseInt(m[1], 10));
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
  if (!isNaN(raw) && raw >= 1) return Math.min(100, raw);

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

function mapRowToCoupon(row: any): Coupon {
  return {
    id: String(row.id),
    code: String(row.code || "").toUpperCase().trim(),
    discount: parseDiscountPercent(row.discount, row.code),
    plans: Array.isArray(row.plans) ? row.plans : [],
    enabled: row.enabled !== false,
    description: String(row.description || ""),
  };
}

// ── Supabase Realtime Setup ──────────────────────────────────────────────────
function setupRealtime() {
  if (realtimeSubscribed || typeof window === "undefined") return;
  realtimeSubscribed = true;

  try {
    supabase
      .channel("public:coupons")
      .on("postgres_changes", { event: "*", schema: "public", table: "coupons" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newCp = mapRowToCoupon(payload.new);
          inMemoryCoupons = dedupeCoupons([newCp, ...inMemoryCoupons]);
        } else if (payload.eventType === "UPDATE") {
          const updated = mapRowToCoupon(payload.new);
          inMemoryCoupons = inMemoryCoupons.map((c) => (c.id === updated.id ? updated : c));
        } else if (payload.eventType === "DELETE") {
          const oldId = String((payload.old as any)?.id);
          inMemoryCoupons = inMemoryCoupons.filter((c) => c.id !== oldId);
        }
        window.dispatchEvent(new CustomEvent("couponsUpdated"));
      })
      .subscribe();
  } catch (err) {
    console.warn("Could not subscribe to Supabase coupon realtime:", err);
  }
}

// ── Supabase API (Fast REST Queries) ─────────────────────────────────────────

export async function pullFromSupabase(): Promise<Coupon[]> {
  if (isPullingCoupons) return inMemoryCoupons;
  isPullingCoupons = true;
  setupRealtime();

  try {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase pull coupons warning:", error.message);
      return inMemoryCoupons;
    }

    if (Array.isArray(data)) {
      const mapped = data.map(mapRowToCoupon);
      inMemoryCoupons = dedupeCoupons(mapped);
      window.dispatchEvent(new CustomEvent("couponsUpdated"));
    }
  } catch (err) {
    console.warn("Failed to fetch coupons from Supabase:", err);
  } finally {
    isPullingCoupons = false;
  }

  return inMemoryCoupons;
}

// Backward compatibility alias for existing callers
export const pullFromSheets = pullFromSupabase;
export const syncCouponsFromSheets = pullFromSupabase;

// ── Public Store API ─────────────────────────────────────────────────────────

export function getCoupons(): Coupon[] {
  if (inMemoryCoupons.length === 0 && !isPullingCoupons) {
    pullFromSupabase().catch(() => {});
  }
  return inMemoryCoupons;
}

export async function addCoupon(coupon: Omit<Coupon, "id">): Promise<Coupon[]> {
  const cleanCode = coupon.code.toUpperCase().trim();
  if (!cleanCode) return inMemoryCoupons;

  const finalDiscount = parseDiscountPercent(coupon.discount, cleanCode);
  const newId = "coupon_" + Date.now();

  const newCoupon: Coupon = {
    id: newId,
    code: cleanCode,
    discount: finalDiscount,
    plans: coupon.plans || [],
    enabled: coupon.enabled !== false,
    description: coupon.description || "",
  };

  // 1. Optimistic update in memory for immediate UI responsiveness
  inMemoryCoupons = dedupeCoupons([newCoupon, ...inMemoryCoupons]);
  window.dispatchEvent(new CustomEvent("couponsUpdated"));

  // 2. Persist to Supabase
  try {
    const { error } = await supabase.from("coupons").upsert({
      id: newId,
      code: cleanCode,
      discount: finalDiscount,
      plans: coupon.plans || [],
      enabled: coupon.enabled !== false,
      description: coupon.description || "",
    }, { onConflict: "code" });

    if (error) {
      console.error("Supabase addCoupon error:", error);
    }
  } catch (err) {
    console.error("Failed to add coupon to Supabase:", err);
  }

  return inMemoryCoupons;
}

export async function updateCoupon(id: string, updated: Partial<Coupon>): Promise<Coupon[]> {
  inMemoryCoupons = inMemoryCoupons.map((c) => {
    if (c.id !== id) return c;
    const nextObj = { ...c, ...updated };
    if (updated.discount !== undefined) {
      nextObj.discount = parseDiscountPercent(updated.discount, nextObj.code);
    }
    return nextObj;
  });
  inMemoryCoupons = dedupeCoupons(inMemoryCoupons);
  window.dispatchEvent(new CustomEvent("couponsUpdated"));

  try {
    const target = inMemoryCoupons.find((c) => c.id === id);
    if (target) {
      const { error } = await supabase
        .from("coupons")
        .update({
          code: target.code,
          discount: target.discount,
          plans: target.plans,
          enabled: target.enabled,
          description: target.description,
        })
        .eq("id", id);

      if (error) console.error("Supabase updateCoupon error:", error);
    }
  } catch (err) {
    console.error("Failed to update coupon in Supabase:", err);
  }

  return inMemoryCoupons;
}

export async function removeCoupon(id: string): Promise<Coupon[]> {
  inMemoryCoupons = inMemoryCoupons.filter((c) => c.id !== id);
  window.dispatchEvent(new CustomEvent("couponsUpdated"));

  try {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) console.error("Supabase removeCoupon error:", error);
  } catch (err) {
    console.error("Failed to remove coupon from Supabase:", err);
  }

  return inMemoryCoupons;
}

export async function saveCoupons(coupons: Coupon[]): Promise<boolean> {
  inMemoryCoupons = dedupeCoupons(coupons);
  window.dispatchEvent(new CustomEvent("couponsUpdated"));

  try {
    const rows = inMemoryCoupons.map((c) => ({
      id: c.id,
      code: c.code,
      discount: c.discount,
      plans: c.plans,
      enabled: c.enabled,
      description: c.description || "",
    }));

    const { error } = await supabase.from("coupons").upsert(rows, { onConflict: "code" });
    return !error;
  } catch {
    return false;
  }
}

export async function ensureCouponExists(code: string, discount = 25, description?: string): Promise<void> {
  const cleanCode = code.toUpperCase().trim();
  if (!cleanCode) return;

  const existing = inMemoryCoupons.find((c) => c.code === cleanCode);
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
    description: description || `Coupon for ${cleanCode}`,
  });
}

export function validateCoupon(code: string, planName: string): { discount: number; coupon: Coupon } | null {
  const cleanCode = code.toUpperCase().trim();
  if (!cleanCode) return null;

  let coupons = getCoupons();
  let coupon = coupons.find((c) => c.code === cleanCode && c.enabled);

  if (!coupon) {
    try {
      const activeOffers = getOffers();
      const matchedOffer = activeOffers.find(
        (o: any) => o.couponCode && o.couponCode.toUpperCase().trim() === cleanCode && o.status !== "expired"
      );
      if (matchedOffer) {
        const discNum = parseDiscountPercent(matchedOffer.discount, cleanCode);
        ensureCouponExists(cleanCode, discNum, `${matchedOffer.title} Offer Coupon`);
        coupons = getCoupons();
        coupon = coupons.find((c) => c.code === cleanCode && c.enabled);
      }
    } catch {}
  }

  if (!coupon) return null;
  if (coupon.plans && coupon.plans.length > 0 && !coupon.plans.includes(planName)) return null;
  return { discount: parseDiscountPercent(coupon.discount, coupon.code), coupon };
}

// Instant async validation direct to Supabase for 100% guarantee
export async function validateCouponDirect(code: string, planName: string): Promise<{ discount: number; coupon: Coupon } | null> {
  const cleanCode = code.toUpperCase().trim();
  if (!cleanCode) return null;

  // Check in-memory first for 0ms response
  const cached = validateCoupon(cleanCode, planName);
  if (cached) return cached;

  // Fallback to direct Supabase query (~30ms)
  try {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", cleanCode)
      .eq("enabled", true)
      .single();

    if (error || !data) return null;

    const coupon = mapRowToCoupon(data);
    inMemoryCoupons = dedupeCoupons([coupon, ...inMemoryCoupons]);

    if (coupon.plans && coupon.plans.length > 0 && !coupon.plans.includes(planName)) return null;
    return { discount: coupon.discount, coupon };
  } catch {
    return null;
  }
}

// Auto-fetch on app load
if (typeof window !== "undefined") {
  pullFromSupabase().catch(() => {});
}
