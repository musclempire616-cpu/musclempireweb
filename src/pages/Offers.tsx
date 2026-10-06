import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tag, Clock, Calendar, Zap, Sparkles, AlertCircle } from "lucide-react";
import PlanNavbar from "@/components/PlanNavbar";
import Footer from "@/components/Footer";
import { GradientBackground } from "@/components/ui/desert-horizon";
import CouponClaimModal from "@/components/CouponClaimModal";

import { getOffers, pullOffersFromSheets } from "@/lib/offersStore";
import chalkboardBg from "@/assets/images/chalkboard-bg.webp";

const upcomingOffers: Offer[] = [];

type Offer = {
  title: string;
  description: string;
  discount?: string;
  validTill?: string;
  launchDate?: string;
  teaser?: string;
  cta?: string;
  image?: string;
  whatsappMessage?: string;
  couponCode?: string;
};

function OfferCard({
  offer,
  upcoming = false,
  expired = false,
  onClaim,
}: {
  offer: Offer;
  upcoming?: boolean;
  expired?: boolean;
  onClaim?: (offer: Offer) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`bg-white border rounded-2xl overflow-hidden flex flex-col transition-all shadow-sm ${
        expired ? "border-black opacity-75 grayscale-[0.3]" : "border-black hover:shadow-lg"
      }`}
    >
      {/* Banner */}
      <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
        {offer.image ? (
          <img src={offer.image} alt={offer.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Zap size={48} className="text-gray-300" />
        )}
        {/* Badge */}
        {expired ? (
          <span className="absolute top-3 right-3 bg-red-600 text-white text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
            Expired
          </span>
        ) : upcoming ? (
          <span className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
            Coming Soon
          </span>
        ) : offer.discount ? (
          <span className="absolute top-3 right-3 bg-gray-900 text-white text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
            {offer.discount}
          </span>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <h3 className="text-gray-900 font-black uppercase tracking-tight text-lg leading-tight">
          {offer.title}
        </h3>
        <p className="text-gray-500 text-sm leading-relaxed flex-1">
          {upcoming ? offer.teaser : offer.description}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {upcoming ? (
            <>
              <Calendar size={13} />
              <span>
                Launches:{" "}
                <span className="text-gray-700 font-bold">{offer.launchDate}</span>
              </span>
            </>
          ) : offer.validTill ? (
            <>
              <Clock size={13} />
              <span>
                {expired ? "Expired on: " : "Valid till: "}
                <span className="text-gray-700 font-bold">{formatValidTill(offer.validTill)}</span>
              </span>
            </>
          ) : null}
        </div>

        {/* CTA */}
        {expired ? (
          <div className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 font-bold uppercase tracking-wider py-3 rounded-xl text-xs mt-1 select-none">
            <AlertCircle size={14} />
            Offer Expired
          </div>
        ) : !upcoming ? (
          <button
            onClick={() => onClaim?.(offer)}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-black uppercase tracking-widest py-3 rounded-xl text-sm transition-colors mt-1 cursor-pointer"
          >
            <Sparkles size={15} />
            {offer.cta || "Claim Offer"}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center mb-5">
        <Tag size={32} className="text-gray-300" />
      </div>
      <h4 className="text-gray-900 font-black uppercase tracking-wide text-xl mb-2">{title}</h4>
      <p className="text-gray-500 text-sm max-w-xs">{desc}</p>
    </div>
  );
}

// Clean up date strings like "Thu Dec 31 2026 00:00:00 GMT+0530 (India Standard Time)" → "31 Dec 2026"
function formatValidTill(val?: string): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
  } catch {}
  return val;
}

export default function Offers() {
  const ongoingRef = useRef<HTMLDivElement>(null);
  const upcomingRef = useRef<HTMLDivElement>(null);
  const expiredRef = useRef<HTMLDivElement>(null);
  const [ongoingOffers, setOngoingOffers] = useState<Offer[]>([]);
  const [upcomingDynamicOffers, setUpcomingDynamicOffers] = useState<Offer[]>([]);
  const [expiredOffers, setExpiredOffers] = useState<Offer[]>([]);
  const [selectedClaimOffer, setSelectedClaimOffer] = useState<Offer | null>(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchOffers = () => {
      const all = getOffers();
      setOngoingOffers(all.filter(o => o.status === "active").map(o => ({
        title: o.title, description: o.description, discount: o.discount,
        validTill: o.validTill, cta: o.ctaText, whatsappMessage: o.whatsappMessage,
        image: o.image, couponCode: o.couponCode,
      })));
      setUpcomingDynamicOffers(all.filter(o => o.status === "upcoming").map(o => ({
        title: o.title, description: o.description, discount: o.discount,
        validTill: o.validTill, launchDate: o.validTill, teaser: o.description,
        cta: o.ctaText, whatsappMessage: o.whatsappMessage,
        image: o.image, couponCode: o.couponCode,
      })));
      setExpiredOffers(all.filter(o => o.status === "expired").map(o => ({
        title: o.title, description: o.description, discount: o.discount,
        validTill: o.validTill, cta: o.ctaText, whatsappMessage: o.whatsappMessage,
        image: o.image, couponCode: o.couponCode,
      })));
    };
    fetchOffers();
    pullOffersFromSheets().then(fetchOffers);
    window.addEventListener("offersUpdated", fetchOffers);
    return () => window.removeEventListener("offersUpdated", fetchOffers);
  }, []);

  return (
    <div className="relative min-h-screen bg-white text-gray-900 overflow-hidden">
      {/* Desert Horizon gradient fills the entire page background */}
      <GradientBackground className="fixed inset-0 -z-10" />
      {/* White overlay so content stays readable but gradient peeks through */}
      <div className="fixed inset-0 -z-10 bg-white/70" />

      <PlanNavbar />

      <main className="pb-20">
        {/* Header */}
        <div className="pt-32 pb-16">
          <div className="container mx-auto px-4 md:px-6 max-w-6xl text-center">
            <p className="text-amber-900/60 font-bold uppercase tracking-[0.2em] text-xs mb-3 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-amber-900/30 inline-block" />
              Limited Time
              <span className="w-8 h-px bg-amber-900/30 inline-block" />
            </p>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4 text-gray-900">
              Exclusive{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-800 to-amber-500">
                Offers
              </span>
            </h1>
            <p className="text-amber-900/60 text-lg max-w-xl mx-auto">
              Take advantage of our latest fitness deals and upcoming promotions.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 max-w-6xl pt-10">

          {/* Ongoing Offers */}
          <div id="ongoing" ref={ongoingRef} className="mb-20 scroll-mt-36">
            <h2 className="text-gray-900 font-black uppercase tracking-wider text-2xl mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-gray-900 rounded-full animate-pulse" />
              Ongoing Offers
            </h2>
            {ongoingOffers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {ongoingOffers.map((offer, i) => (
                  <OfferCard
                    key={i}
                    offer={offer}
                    onClaim={(off) => setSelectedClaimOffer(off)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No Ongoing Offers"
                desc="There are currently no active offers. Check back soon!"
              />
            )}
          </div>

          {/* Upcoming Offers */}
          <div id="upcoming" ref={upcomingRef} className="mb-20 scroll-mt-36">
            <h2 className="text-gray-900 font-black uppercase tracking-wider text-2xl mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Upcoming Offers
            </h2>
            {upcomingDynamicOffers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingDynamicOffers.map((offer, i) => (
                  <OfferCard key={i} offer={offer} upcoming />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No Upcoming Offers"
                desc="Stay tuned! Exciting offers are coming soon."
              />
            )}
          </div>

          {/* Expired Offers */}
          <div id="expired" ref={expiredRef} className="scroll-mt-36">
            <h2 className="text-gray-900 font-black uppercase tracking-wider text-2xl mb-8 flex items-center gap-3">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              Expired Offers
            </h2>
            {expiredOffers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {expiredOffers.map((offer, i) => (
                  <OfferCard key={i} offer={offer} expired />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No Expired Offers"
                desc="Past promotional offers will be listed here."
              />
            )}
          </div>

        </div>
      </main>

      <Footer />

      <CouponClaimModal
        isOpen={!!selectedClaimOffer}
        onClose={() => setSelectedClaimOffer(null)}
        offer={selectedClaimOffer}
      />
    </div>
  );
}
