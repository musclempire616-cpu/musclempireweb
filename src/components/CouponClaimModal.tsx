import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Copy, Check, ArrowRight, MessageSquare, Tag, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { ensureCouponExists } from "@/lib/couponStore";

export interface OfferClaimData {
  title: string;
  discount?: string;
  couponCode?: string;
  description?: string;
  whatsappMessage?: string;
}

interface CouponClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: OfferClaimData | null;
}

const OWNER_PHONE = "919773053632";

export default function CouponClaimModal({ isOpen, onClose, offer }: CouponClaimModalProps) {
  const [copied, setCopied] = useState(false);
  const [, navigate] = useLocation();

  const couponCode = offer?.couponCode?.trim().toUpperCase() || "";

  useEffect(() => {
    if (isOpen && offer && couponCode) {
      const discNum = parseInt((offer.discount || "").replace(/\D/g, ""), 10) || 25;
      ensureCouponExists(couponCode, discNum, `${offer.title} Coupon`);
    }
  }, [isOpen, offer, couponCode]);

  if (!isOpen || !offer) return null;

  const handleCopyCode = () => {
    if (!couponCode) return;
    const discNum = parseInt((offer.discount || "").replace(/\D/g, ""), 10) || 25;
    ensureCouponExists(couponCode, discNum, `${offer.title} Coupon`);

    // Most reliable cross-browser copy
    const el = document.createElement("textarea");
    el.value = couponCode;
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
    // Also try modern API in parallel
    if (navigator.clipboard) {
      navigator.clipboard.writeText(couponCode).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleGoToPricing = () => {
    const discNum = parseInt((offer.discount || "").replace(/\D/g, ""), 10) || 25;
    ensureCouponExists(couponCode, discNum, `${offer.title} Coupon`);
    sessionStorage.setItem("auto_apply_coupon", couponCode);
    onClose();

    // Notify Pricing component to automatically open Pricing Modal with coupon
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("autoClaimOffer", { detail: { couponCode } }));
    }, 100);

    if (window.location.pathname === "/") {
      const el = document.querySelector("#pricing");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.hash = "pricing";
      }
    } else {
      navigate("/#pricing");
    }
  };

  const handleClaimWhatsApp = () => {
    const text = encodeURIComponent(
      offer.whatsappMessage ||
        `Hi Muscle Empire! I would like to claim the ${offer.title} offer using Coupon Code ${couponCode}.`
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
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl z-10 overflow-hidden text-gray-900 border border-gray-100"
        >
          {/* Top Decorative Gradient */}
          <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

          <div className="p-6 sm:p-8">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Sparkles size={24} className="text-amber-600" />
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
                <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 leading-tight">
                  {offer.title}
                </h3>
              </div>
            </div>

            {/* Coupon Code Box */}
            <div className="mb-6 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 border-2 border-dashed border-amber-500/30 rounded-2xl p-4 sm:p-5 text-center relative overflow-hidden">
              <p className="text-xs font-bold text-amber-900/70 uppercase tracking-widest mb-1.5">
                Your Exclusive Coupon Code
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-2xl sm:text-3xl font-black tracking-wider text-gray-900 select-all">
                  {couponCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    copied
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                      : "bg-gray-900 hover:bg-gray-800 text-white shadow-md shadow-gray-900/20"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={14} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy Code
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                How to Claim & Apply Coupon
              </h4>
              <div className="space-y-3 text-xs text-gray-600">
                <div className="flex items-start gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <div className="w-5 h-5 rounded-full bg-gray-900 text-white font-black flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </div>
                  <p>
                    Click <strong className="text-gray-900">Copy Code</strong> above to save coupon{" "}
                    <code className="font-mono text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-bold">
                      {couponCode}
                    </code>.
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <div className="w-5 h-5 rounded-full bg-gray-900 text-white font-black flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </div>
                  <p>
                    Go to <strong className="text-gray-900">Pricing & Membership Plans</strong> section.
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <div className="w-5 h-5 rounded-full bg-gray-900 text-white font-black flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </div>
                  <p>
                    Click <strong className="text-gray-900">"Have a coupon code?"</strong> and paste your code.
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-emerald-900 font-medium">
                    Your discount applies instantly before checkout!
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGoToPricing}
                className="w-full sm:flex-1 h-14 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-wider text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                Go to Pricing & Apply
                <ArrowRight size={14} />
              </button>

              <button
                onClick={handleClaimWhatsApp}
                className="w-full sm:w-auto h-14 px-6 bg-gray-900 hover:bg-gray-800 text-white font-black uppercase tracking-wider text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
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
