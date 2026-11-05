import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Copy, Check, ArrowRight, MessageSquare, Tag, Ticket, Info } from "lucide-react";
import { useLocation } from "wouter";
import { ensureCouponExists, parseDiscountPercent } from "@/lib/couponStore";

export interface OfferClaimData {
  title: string;
  discount?: string;
  couponCode?: string;
  couponCodes?: string[];
  description?: string;
  whatsappMessage?: string;
}

interface CouponClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: OfferClaimData | null;
}

const OWNER_PHONE = "918779682084";

export default function CouponClaimModal({ isOpen, onClose, offer }: CouponClaimModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [, navigate] = useLocation();

  // Extract all coupon codes from offer
  const rawCodes = offer?.couponCodes && offer.couponCodes.length > 0
    ? offer.couponCodes
    : (offer?.couponCode ? offer.couponCode.split(",").map(c => c.trim().toUpperCase()).filter(Boolean) : []);

  const fallbackCode = offer?.title
    ? `${offer.title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}${parseInt((offer.discount || "").replace(/\D/g, ""), 10) || 20}`
    : "EMPIRE25";

  const couponCodesList = rawCodes.length > 0 ? rawCodes : [fallbackCode];

  useEffect(() => {
    if (isOpen && offer && couponCodesList.length > 0) {
      couponCodesList.forEach((code) => {
        const discNum = parseDiscountPercent(offer.discount, code);
        ensureCouponExists(code, discNum, `${offer.title} Coupon (${code})`);
      });
    }
  }, [isOpen, offer]);

  if (!isOpen || !offer) return null;

  const handleCopyCode = (code: string) => {
    if (!code) return;
    const discNum = parseDiscountPercent(offer.discount, code);
    ensureCouponExists(code, discNum, `${offer.title} Coupon (${code})`);

    // Cross-browser copy
    const el = document.createElement("textarea");
    el.value = code;
    el.setAttribute("readonly", "");
    el.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;";
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, 99999);
    try {
      document.execCommand("copy");
    } catch {}
    document.body.removeChild(el);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(prev => (prev === code ? null : prev));
    }, 2200);
  };

  const handleGoToPricing = () => {
    // If the user already copied a specific code, auto-apply that one; otherwise use the first coupon
    const primaryCode = copiedCode || couponCodesList[0];
    const discNum = parseDiscountPercent(offer.discount, primaryCode);
    ensureCouponExists(primaryCode, discNum, `${offer.title} Coupon`);

    // Store in both session & local storage so it survives cross-page routing
    sessionStorage.setItem("auto_apply_coupon", primaryCode);
    localStorage.setItem("auto_apply_coupon", primaryCode);
    sessionStorage.setItem("scroll_to_hash", "#pricing");

    // Clear stale scroll positions so Home scrolls directly to pricing
    sessionStorage.removeItem("scroll_/");
    sessionStorage.removeItem("scroll_before_plans");

    onClose();

    // Small delay to allow modal exit animation
    setTimeout(() => {
      if (window.location.pathname === "/") {
        const el = document.getElementById("pricing");
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 76;
          window.scrollTo({ top, behavior: "smooth" });
        }
      } else {
        navigate("/#pricing");
      }
    }, 120);
  };

  const handleClaimWhatsApp = () => {
    const codesStr = couponCodesList.join(", ");
    const text = encodeURIComponent(
      offer.whatsappMessage ||
        `Hi Muscle Empire! I would like to claim the ${offer.title} offer using Coupon Code ${codesStr}.`
    );
    window.open(`https://wa.me/${OWNER_PHONE}?text=${text}`, "_blank");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl z-10 overflow-hidden text-gray-900 border border-gray-100"
        >
          {/* Top Decorative Gradient */}
          <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 shrink-0" />

          <div className="p-6 sm:p-7 overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer z-10"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3.5 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Sparkles size={22} className="text-amber-600" />
              </div>
              <div className="pr-6">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-gray-900 text-white px-2.5 py-0.5 rounded-full">
                    {offer.discount || "Special Discount"}
                  </span>
                  <span className="text-xs text-amber-600 font-bold flex items-center gap-1">
                    <Tag size={12} /> Claim Offer
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-gray-900 leading-tight">
                  {offer.title}
                </h3>
              </div>
            </div>

            {/* Coupon Codes List (one below other, compact size, no exclusive text) */}
            <div className="mb-4 space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {couponCodesList.map((code) => {
                const isCopied = copiedCode === code;
                return (
                  <div
                    key={code}
                    className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border-2 border-dashed border-amber-500/35 rounded-xl px-3.5 py-2 flex items-center justify-between gap-3 transition-colors hover:border-amber-500/60"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Ticket size={15} className="text-amber-600 shrink-0" />
                      <span className="font-mono text-base sm:text-lg font-black tracking-wider text-gray-900 select-all truncate">
                        {code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCode(code)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                        isCopied
                          ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                          : "bg-gray-900 hover:bg-gray-800 text-white shadow-sm shadow-gray-900/20"
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check size={12} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy Code
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Offer Description (replaces former steps) */}
            {offer.description && (
              <div className="mb-5 bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-800/80 mb-1.5 flex items-center gap-1.5">
                  <Info size={13} className="text-amber-600 shrink-0" />
                  Offer Details
                </h4>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line font-medium">
                  {offer.description}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                onClick={handleGoToPricing}
                className="w-full sm:flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-wider text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                Go to Pricing & Apply
                <ArrowRight size={14} />
              </button>

              <button
                onClick={handleClaimWhatsApp}
                className="w-full sm:w-auto h-12 px-5 bg-gray-900 hover:bg-gray-800 text-white font-black uppercase tracking-wider text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <MessageSquare size={14} />
                Claim via WhatsApp
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
