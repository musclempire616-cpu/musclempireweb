import { motion, AnimatePresence } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { Dumbbell, Users, ArrowRight, Check, Award, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import unisexBg from "@/assets/images/unisex-bg.webp";
import femaleBg from "@/assets/images/female-bg.webp";
import { PricingModal } from "@/components/ui/pricing-table";
import type { PricingPlan, PricingFeature } from "@/components/ui/pricing-table";
import { openRazorpay } from "@/lib/razorpay";
import { validateCoupon } from "@/lib/couponStore";

/* ── Unisex gym data ──────────────────────────────────────── */
// Gym-only plans (used as base; CrossFit & Gym+CF toggled in GymCard)
const unisexGymPlans: PricingPlan[] = [
  {
    name: "Monthly",
    level: "basic",
    price: { monthly: 1500, yearly: 1500 },
    originalPrice: { monthly: 1500, yearly: 1500 },
    months: 1, monthlyRate: 1500,
    description: "Pay month-to-month",
    priceSuffix: "/mo"
  },
  {
    name: "Quarterly",
    level: "standard",
    price: { monthly: 3500, yearly: 3500 },
    originalPrice: { monthly: 4500, yearly: 4500 },
    months: 3, monthlyRate: 1500,
    description: "₹3,500 billed every 3 months",
    priceSuffix: "/3mo"
  },
  {
    name: "Half Yearly",
    level: "standard",
    price: { monthly: 5500, yearly: 5500 },
    originalPrice: { monthly: 9000, yearly: 9000 },
    months: 6, monthlyRate: 1500,
    popular: true,
    description: "₹5,500 billed every 6 months",
    priceSuffix: "/6mo"
  },
  {
    name: "Yearly",
    level: "premium",
    price: { monthly: 8500, yearly: 8500 },
    originalPrice: { monthly: 18000, yearly: 18000 },
    months: 12, monthlyRate: 1500,
    description: "₹8,500 billed annually",
    priceSuffix: "/yr"
  },
];

// Gym + CrossFit plans
const unisexGymCFPlans: PricingPlan[] = [
  {
    name: "Monthly",
    level: "basic",
    price: { monthly: 2500, yearly: 2500 },
    originalPrice: { monthly: 2500, yearly: 2500 },
    months: 1, monthlyRate: 2500,
    description: "Pay month-to-month",
    priceSuffix: "/mo"
  },
  {
    name: "Quarterly",
    level: "standard",
    price: { monthly: 5500, yearly: 5500 },
    originalPrice: { monthly: 7500, yearly: 7500 },
    months: 3, monthlyRate: 2500,
    description: "₹5,500 billed every 3 months",
    priceSuffix: "/3mo"
  },
  {
    name: "Half Yearly",
    level: "standard",
    price: { monthly: 8500, yearly: 8500 },
    originalPrice: { monthly: 15000, yearly: 15000 },
    months: 6, monthlyRate: 2500,
    popular: true,
    description: "₹8,500 billed every 6 months",
    priceSuffix: "/6mo"
  },
  {
    name: "Yearly",
    level: "premium",
    price: { monthly: 12500, yearly: 12500 },
    originalPrice: { monthly: 30000, yearly: 30000 },
    months: 12, monthlyRate: 2500,
    description: "₹12,500 billed annually",
    priceSuffix: "/yr"
  },
];

// Default shown in modal (gym only; swapped by planType)
const unisexPlans = unisexGymPlans;

const unisexFeatures: PricingFeature[] = [
  { name: "All gym equipment",                included: "basic"   },
  { name: "Trainer assistance",               included: "basic"   },
  { name: "Strength training",                included: "basic"   },
  { name: "Flexible workout timings",         included: "basic"   },
  { name: "Workout guidance",                 included: "basic"   },

  { name: "Form correction coaching",         included: "basic"   },
];

/* ── Female gym data ──────────────────────────────────────── */
// Membership registration fee: ₹500 (one-time)
const femalePlans: PricingPlan[] = [
  {
    name: "Monthly",
    level: "basic",
    price: { monthly: 1500, yearly: 1500 },
    originalPrice: { monthly: 1500, yearly: 1500 },
    months: 1, monthlyRate: 1500,
    description: "Pay month-to-month",
    priceSuffix: "/mo"
  },
  {
    name: "Quarterly",
    level: "standard",
    price: { monthly: 3000, yearly: 3000 },
    originalPrice: { monthly: 4500, yearly: 4500 },
    months: 3, monthlyRate: 1500,
    description: "₹3,000 billed every 3 months",
    priceSuffix: "/3mo"
  },
  {
    name: "Half Yearly",
    level: "standard",
    price: { monthly: 5500, yearly: 5500 },
    originalPrice: { monthly: 9000, yearly: 9000 },
    months: 6, monthlyRate: 1500,
    popular: true,
    description: "₹5,500 billed every 6 months",
    priceSuffix: "/6mo"
  },
  {
    name: "Yearly",
    level: "premium",
    price: { monthly: 8000, yearly: 8000 },
    originalPrice: { monthly: 18000, yearly: 18000 },
    months: 12, monthlyRate: 1500,
    description: "₹8,000 billed annually",
    priceSuffix: "/yr"
  },
];

const femaleFeatures: PricingFeature[] = [
  { name: "All gym equipment",                included: "basic"    },
  { name: "Women-only environment",           included: "basic"    },
  { name: "Trainer assistance",               included: "basic"    },
  { name: "Strength training",                included: "basic"    },
  { name: "Workout guidance",                 included: "basic"    },
  { name: "Priority trainer support",         included: "basic"    },
  { name: "Progress check-ins",               included: "basic"    },
];

const gyms = [
  {
    title: "Muscle Empire Gymnasium",
    subtitle: "Unisex",
    Icon: Dumbbell,
    tag: "For everyone",
    tagStyle: "bg-[#E8A820] text-[#1C1C1E]",
    desc: "A complete fitness destination with strength training, CrossFit, expert trainers, and premium equipment for all fitness levels.",
    price: "Starting from ₹1,500/month",
    features: ["Expert trainers", "Full strength equipment", "All fitness levels welcome"],
    href: "/unisex-gym-plans",
    featured: true,
    bgImg: unisexBg,
    accentColor: "#E8A820",
    glowColor: "rgba(232,168,32,0.15)",
    plans: unisexPlans,
    tableFeatures: unisexFeatures,
    gymOnlyPlans: unisexGymPlans,
    gymCFPlans: unisexGymCFPlans,
  },
  {
    title: "Muscle Empire Crossfit Studio",
    subtitle: "Female only",
    Icon: Users,
    tag: "Ladies only",
    tagStyle: "bg-pink-500/15 text-pink-400 border border-pink-500/30",
    desc: "A dedicated women's space offering strength training, CrossFit, weight management, and personal coaching in a comfortable environment. New registration: ₹500.",
    price: "Starting from ₹1,500/month",
    features: ["Women-only environment", "Personal coaching", "Weight management", "Strength training"],
    href: "/female-gym-plans",
    featured: false,
    bgImg: femaleBg,
    accentColor: "#ec4899",
    glowColor: "rgba(236,72,153,0.15)",
    plans: femalePlans,
    tableFeatures: femaleFeatures,
  },
];

type PlanType = "gym" | "crossfit_gym";

function GymCard({ gym, i, onSelect }: { gym: typeof gyms[0], i: number, onSelect: (g: typeof gyms[0], pt: PlanType) => void }) {
  const [planType, setPlanType] = useState<PlanType>("gym");

  // Starting (monthly) price per toggle
  const currentPrice = gym.featured
    ? planType === "gym" ? 1500 : 2500
    : 1500;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px" }}
      transition={{ delay: 0, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col rounded-[22px] p-8 border transition-all duration-300 overflow-hidden hover:-translate-y-2 ${
        gym.featured
          ? "bg-[#232325]/90 border-[#E8A820]/30 shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:border-[#E8A820]/60 hover:shadow-[0_20px_50px_rgba(232,168,32,0.15)]"
          : "bg-[#1a1018]/90 border-pink-500/20 shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:border-pink-500/40 hover:shadow-[0_20px_50px_rgba(236,72,153,0.15)]"
      }`}
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0 -z-20 overflow-hidden rounded-[22px] pointer-events-none">
        <div 
          className="w-full h-full bg-cover bg-center transition-all duration-700 opacity-[0.07] group-hover:opacity-[0.16] group-hover:scale-110"
          style={{ backgroundImage: `url(${gym.bgImg})` }}
        />
      </div>

      {/* Tint Overlay for contrast */}
      <div 
        className={`absolute inset-0 -z-10 rounded-[22px] transition-opacity duration-300 pointer-events-none ${
          gym.featured 
            ? "bg-gradient-to-b from-[#232325]/85 via-[#232325]/95 to-[#232325]" 
            : "bg-gradient-to-b from-[#1a1018]/85 via-[#1a1018]/95 to-[#1a1018]"
        }`} 
      />

      {/* Tag */}
      <span className={`absolute top-6 right-6 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full z-10 ${gym.tagStyle}`}>
        {gym.tag}
      </span>

      {/* Accent glow on hover */}
      <div 
        className="absolute inset-0 rounded-[22px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
        style={{ 
          background: `radial-gradient(circle at 50% 20%, ${gym.glowColor} 0%, transparent 60%)` 
        }} 
      />

      {/* Icon */}
      <div className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 ${
        gym.featured ? "bg-[#E8A820]/14 text-[#E8A820]" : "bg-pink-500/[0.12] text-pink-400"
      }`}>
        <gym.Icon size={24} />
      </div>

      <h3 className="text-white font-black text-[1.2rem] tracking-tight mb-1 pr-20 z-10">{gym.title}</h3>
      <p className={`text-[11px] font-bold uppercase tracking-widest mb-5 z-10 ${gym.featured ? "text-[#E8A820]" : "text-pink-400"}`}>
        {gym.subtitle}
      </p>

      <div className={`w-8 h-[1.5px] mb-5 rounded-full z-10 transition-all duration-300 group-hover:w-16 ${gym.featured ? "bg-[#E8A820]" : "bg-pink-500/40"}`} />

      <p className="text-white/45 text-[0.875rem] leading-relaxed mb-6 flex-1 z-10">{gym.desc}</p>

      {/* Features */}
      <ul className="space-y-2 mb-7 z-10">
        {gym.features.map((f, j) => (
          <li key={j} className="flex items-center gap-2.5 text-[0.85rem] text-white/60 transition-colors duration-300 group-hover:text-white/80">
            <Check size={13} className={gym.featured ? "text-[#E8A820]" : "text-pink-400"} strokeWidth={3} />
            {f}
          </li>
        ))}
      </ul>

      {/* Toggles — only show for unisex gym (featured); female has no toggle */}
      {gym.featured && (
        <div className="flex items-center justify-center gap-1 mb-5 z-10 relative bg-black/40 p-1.5 rounded-full border border-white/10 w-full mx-auto">
          {(["gym", "crossfit_gym"] as const).map(type => {
            const active = planType === type;
            const label = type === "gym" ? "Gym" : "Gym + CF";
            return (
              <button
                key={type}
                onClick={() => setPlanType(type)}
                className="flex-1 px-2 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap"
                style={{
                  background: active ? gym.accentColor : "transparent",
                  color: active ? "#1C1C1E" : "rgba(255,255,255,0.6)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Price */}
      <div className={`mb-5 px-5 py-3.5 rounded-xl border z-10 transition-all duration-300 flex items-baseline gap-1 ${
        gym.featured
          ? "bg-[#E8A820]/[0.05] border-[#E8A820]/15 group-hover:bg-[#E8A820]/[0.10] group-hover:border-[#E8A820]/30"
          : "bg-pink-500/[0.04] border-pink-500/15 group-hover:bg-pink-500/[0.08] group-hover:border-pink-500/30"
      }`}>
        <span className="text-[0.8rem] text-white/50 mr-1 font-medium">Starting from</span>
        <span className="text-[1rem] text-white/40 font-bold">₹</span>
        <NumberFlow
          value={currentPrice}
          className="text-[1.2rem] font-black text-white"
        />
        <span className="text-[0.8rem] text-white/50 ml-1 font-medium">/month</span>
      </div>

      {/* CTA */}
      <button
        onClick={() => onSelect(gym, planType)}
        className={`w-full flex items-center justify-center gap-2 font-bold text-[13px] h-[52px] rounded-xl transition-all duration-300 z-10 ${
          gym.featured
            ? "btn-gold group-hover:shadow-[0_10px_25px_rgba(232,168,32,0.25)]"
            : "text-white font-bold hover:-translate-y-0.5 group-hover:shadow-[0_10px_25px_rgba(236,72,153,0.25)]"
        }`}
        style={!gym.featured ? {
          background: "linear-gradient(135deg, #ec4899, #db2777)",
          boxShadow: "0 4px 20px rgba(236,72,153,0.25)",
        } : undefined}
      >
        View all plans <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
      </button>
    </motion.div>
  );
}

export default function Pricing() {
  const [, navigate] = useLocation();
  const [modalGym, setModalGym] = useState<{gym: typeof gyms[0], planType: PlanType} | null>(null);
  const [ptModalOpen, setPtModalOpen] = useState(false);

  // Auto-open pricing modal if user claimed a coupon offer
  useEffect(() => {
    const handleAutoClaim = () => {
      const code = sessionStorage.getItem("auto_apply_coupon");
      if (code) {
        setModalGym({ gym: gyms[0], planType: "gym" });
      }
    };

    handleAutoClaim();
    window.addEventListener("autoClaimOffer", handleAutoClaim);
    return () => window.removeEventListener("autoClaimOffer", handleAutoClaim);
  }, []);

  // Coupon states for Dietitian and PT cards
  const [dietCoupon, setDietCoupon] = useState("");
  const [dietCouponMsg, setDietCouponMsg] = useState<{text: string; valid: boolean} | null>(null);
  const [dietDiscount, setDietDiscount] = useState(0);
  const [ptCoupon, setPtCoupon] = useState("");
  const [ptCouponMsg, setPtCouponMsg] = useState<{text: string; valid: boolean} | null>(null);
  const [ptDiscount, setPtDiscount] = useState(0);
  const [showDietCoupon, setShowDietCoupon] = useState(false);
  const [showPtCoupon, setShowPtCoupon] = useState(false);

  // Separate coupons for each PT modal plan
  const [pt12Coupon, setPt12Coupon] = useState("");
  const [pt12Msg, setPt12Msg] = useState<{text: string; valid: boolean} | null>(null);
  const [pt12Discount, setPt12Discount] = useState(0);
  const [showPt12Coupon, setShowPt12Coupon] = useState(false);

  const [ptEdCoupon, setPtEdCoupon] = useState("");
  const [ptEdMsg, setPtEdMsg] = useState<{text: string; valid: boolean} | null>(null);
  const [ptEdDiscount, setPtEdDiscount] = useState(0);
  const [showPtEdCoupon, setShowPtEdCoupon] = useState(false);

  function applyDietCoupon() {
    const result = validateCoupon(dietCoupon, "Dietitian Plan");
    if (result) { setDietDiscount(result.discount); setDietCouponMsg({ text: `${result.discount}% OFF applied!`, valid: true }); }
    else { setDietDiscount(0); setDietCouponMsg({ text: "Invalid or expired coupon", valid: false }); }
  }
  function applyPtCoupon() {
    const result = validateCoupon(ptCoupon, "Personal Training Plan");
    if (result) { setPtDiscount(result.discount); setPtCouponMsg({ text: `${result.discount}% OFF applied!`, valid: true }); }
    else { setPtDiscount(0); setPtCouponMsg({ text: "Invalid or expired coupon", valid: false }); }
  }
  function applyPt12Coupon() {
    const result = validateCoupon(pt12Coupon, "PT 12 Sessions");
    if (result) { setPt12Discount(result.discount); setPt12Msg({ text: `${result.discount}% OFF applied!`, valid: true }); }
    else { setPt12Discount(0); setPt12Msg({ text: "Invalid or expired coupon", valid: false }); }
  }
  function applyPtEdCoupon() {
    const result = validateCoupon(ptEdCoupon, "PT Every Day");
    if (result) { setPtEdDiscount(result.discount); setPtEdMsg({ text: `${result.discount}% OFF applied!`, valid: true }); }
    else { setPtEdDiscount(0); setPtEdMsg({ text: "Invalid or expired coupon", valid: false }); }
  }
  function discountedPrice(base: number, discount: number) {
    return Math.round(base * (1 - discount / 100));
  }

  return (
    <section id="pricing" className="py-28 bg-[#1C1C1E] relative overflow-hidden">
      {/* Golden grid background */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(232,168,32,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232,168,32,0.12) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px",
        }}
      />
      {/* Central golden radial glow over the grid */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(232,168,32,0.10) 0%, transparent 75%)",
        }}
      />
      {/* Vignette to fade grid at edges */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, #1C1C1E 100%)",
        }}
      />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

      <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-xl mx-auto mb-16"
        >
          <div className="eyebrow justify-center mb-4">Membership plans</div>
          <h2 className="font-display font-black text-white text-[clamp(2rem,4.5vw,2.9rem)] mb-4">
            Invest in <span className="text-gold-gradient">yourself</span>
          </h2>
          <p className="text-white/50 text-[1rem] leading-relaxed">
            Two world-class facilities. One goal — your transformation.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1200px] mx-auto items-stretch">
          {gyms.map((gym, i) => (
            <GymCard key={i} gym={gym} i={i} onSelect={(g, pt) => setModalGym({ gym: g, planType: pt })} />
          ))}

          {/* Third Column: Dietitian & PT Cards stacked */}
          <div className="flex flex-col gap-6 justify-between h-full">
            {/* Dietitian Plan Card */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px" }}
              transition={{ delay: 0, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex flex-col rounded-[22px] p-6 border transition-all duration-300 hover:-translate-y-1 bg-[#0a1a10]/90 border-green-500/20 shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:border-green-500/40 hover:shadow-[0_20px_50px_rgba(34,197,94,0.15)] font-sans flex-1"
            >
              {/* Tint Overlay for contrast */}
              <div className="absolute inset-0 -z-10 rounded-[22px] transition-opacity duration-300 pointer-events-none bg-gradient-to-b from-[#0a1a10]/85 via-[#0a1a10]/95 to-[#0a1a10]" />

              {/* Accent glow on hover */}
              <div 
                className="absolute inset-0 rounded-[22px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                style={{ background: `radial-gradient(circle at 50% 20%, rgba(34,197,94,0.15) 0%, transparent 60%)` }} 
              />

              {/* badge */}
              <span className="absolute top-6 right-6 text-[9px] font-black tracking-widest uppercase text-green-500 bg-green-500/15 border border-green-500/30 px-3 py-1 rounded-full z-10">
                For Everyone
              </span>

              {/* icon */}
              <div className="w-[46px] h-[46px] rounded-2xl bg-green-500/15 flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 z-10 text-green-500">
                <svg viewBox="0 0 24 24" className="w-[20px] h-[20px] stroke-current fill-none stroke-[2] stroke-linecap-round stroke-linejoin-round">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10"/>
                  <path d="M12 2c0 5.5 4.5 10 10 10"/>
                  <path d="M12 12L7 17"/>
                </svg>
              </div>

              <h3 className="text-[1.1rem] font-black text-white tracking-tight mb-0.5 pr-20 z-10">Personalised Dietitian Plan</h3>
              <p className="text-[10px] font-bold tracking-widest uppercase text-green-500 mb-4 z-10">Nutrition · Wellness</p>

              <div className="w-8 h-[1.5px] mb-4 rounded-full z-10 transition-all duration-300 group-hover:w-16 bg-green-500/40" />

              {/* description */}
              <p className="text-[0.825rem] leading-relaxed text-white/45 mb-4 flex-1 z-10">
                A customised meal and nutrition plan designed by an expert dietitian, tailored to your health goals and dietary preferences.
              </p>

              <div className="mt-auto z-10">
                {/* price pill */}
                <div className="mb-2 px-4 py-2.5 rounded-xl border text-white font-black text-[0.95rem] z-10 transition-all duration-300 bg-green-500/[0.04] border-green-500/15 group-hover:bg-green-500/[0.08] group-hover:border-green-500/30 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="line-through text-white/30 text-[0.8rem]">₹1,200</span>
                    <span>{dietDiscount > 0 ? `₹${discountedPrice(800, dietDiscount)}` : "₹800"}</span>
                  </span>
                  <span className="text-[0.75rem] font-medium text-white/45">/ session</span>
                </div>

                {/* Coupon */}
                <button onClick={() => setShowDietCoupon(v => !v)} className="text-[10px] text-green-400/70 hover:text-green-400 underline underline-offset-2 mb-2 cursor-pointer block transition-colors">
                  {showDietCoupon ? "Hide coupon" : "Have a coupon code?"}
                </button>
                {showDietCoupon && (
                  <div className="mb-3 flex gap-2">
                    <input
                      value={dietCoupon}
                      onChange={e => { setDietCoupon(e.target.value.toUpperCase()); setDietCouponMsg(null); }}
                      placeholder="Enter code"
                      className="flex-1 h-8 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white outline-none focus:border-green-400/50"
                    />
                    <button onClick={applyDietCoupon} className="h-8 px-3 bg-green-500 hover:bg-green-400 text-black text-xs font-black rounded-lg transition-colors cursor-pointer">Apply</button>
                  </div>
                )}
                {dietCouponMsg && (
                  <p className={`text-[10px] mb-2 font-bold ${dietCouponMsg.valid ? "text-green-400" : "text-red-400"}`}>{dietCouponMsg.text}</p>
                )}

                {/* CTA */}
                <button 
                  type="button" 
                  onClick={() => openRazorpay("Personalised Dietitian Plan", discountedPrice(800, dietDiscount) * 100)}
                  className="w-full flex items-center justify-center gap-2 font-bold text-[12px] h-[46px] rounded-xl transition-all duration-300 z-10 text-[#0f2a1a] bg-green-500 hover:bg-green-400 shadow-[0_4px_20px_rgba(34,197,94,0.25)] group-hover:shadow-[0_10px_25px_rgba(34,197,94,0.35)] hover:-translate-y-0.5 group"
                >
                  Get this plan <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>

            {/* Personal Trainer Card */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px" }}
              transition={{ delay: 0, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex flex-col rounded-[22px] p-6 border transition-all duration-300 hover:-translate-y-1 bg-[#0a1424]/90 border-blue-500/20 shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:border-blue-500/40 hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] font-sans flex-1"
            >
              {/* Tint Overlay for contrast */}
              <div className="absolute inset-0 -z-10 rounded-[22px] transition-opacity duration-300 pointer-events-none bg-gradient-to-b from-[#0a1424]/85 via-[#0a1424]/95 to-[#0a1424]" />

              {/* Accent glow on hover */}
              <div 
                className="absolute inset-0 rounded-[22px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                style={{ background: `radial-gradient(circle at 50% 20%, rgba(59,130,246,0.15) 0%, transparent 60%)` }} 
              />

              {/* badge */}
              <span className="absolute top-6 right-6 text-[9px] font-black tracking-widest uppercase text-blue-400 bg-blue-500/15 border border-blue-500/30 px-3 py-1 rounded-full z-10">
                1-on-1 PT
              </span>

              {/* icon */}
              <div className="w-[46px] h-[46px] rounded-2xl bg-blue-500/15 flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 z-10 text-blue-400">
                <Award size={20} />
              </div>

              <h3 className="text-[1.1rem] font-black text-white tracking-tight mb-0.5 pr-20 z-10">Personal Training Plan</h3>
              <p className="text-[10px] font-bold tracking-widest uppercase text-blue-400 mb-4 z-10">Elite Coaching · Fitness</p>

              <div className="w-8 h-[1.5px] mb-4 rounded-full z-10 transition-all duration-300 group-hover:w-16 bg-blue-500/40" />

              {/* description */}
              <p className="text-[0.825rem] leading-relaxed text-white/45 mb-3 flex-1 z-10">
                Accelerate your transformation with one-on-one professional coaching, tailored exercise planning, and real-time form guidance.
              </p>

              <div className="mt-auto z-10">
                {/* CTA */}
                <button 
                  type="button" 
                  onClick={() => setPtModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 font-bold text-[12px] h-[46px] rounded-xl transition-all duration-300 z-10 text-[#0f1a2a] bg-blue-500 hover:bg-blue-400 shadow-[0_4px_20px_rgba(59,130,246,0.25)] group-hover:shadow-[0_10px_25px_rgba(59,130,246,0.35)] hover:-translate-y-0.5 group"
                >
                  View plans <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Pricing modal */}
      {modalGym && (
        <PricingModal
          open={!!modalGym}
          onClose={() => setModalGym(null)}
          title={`${modalGym.gym.title} (${modalGym.planType === 'gym' ? 'Gym Only' : 'Gym + CrossFit'})`}
          subtitle={modalGym.gym.subtitle}
          accentColor={modalGym.gym.accentColor}
          features={modalGym.gym.tableFeatures}
          plans={
            modalGym.gym.featured
              ? (modalGym.planType === 'crossfit_gym'
                  ? (modalGym.gym.gymCFPlans ?? modalGym.gym.plans)
                  : (modalGym.gym.gymOnlyPlans ?? modalGym.gym.plans))
              : modalGym.gym.plans
          }
          onGetStarted={(plan, finalPrice, couponCode) => {
            const amount = finalPrice ?? plan.price.monthly;
            const couponNote = couponCode ? ` [Coupon: ${couponCode}]` : "";
            const planName = `${modalGym.gym.title} [${modalGym.planType === 'gym' ? 'Gym Only' : 'Gym + CrossFit'}] - ${plan.name}${couponNote}`;
            openRazorpay(planName, amount * 100);
            setModalGym(null);
          }}
        />
      )}
      {/* PT Modal */}
      <AnimatePresence>
        {ptModalOpen && (
          <motion.div
            className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => setPtModalOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full sm:max-w-md rounded-[24px] z-10 overflow-y-auto max-h-[90vh]"
              style={{ background: "#18181a", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}
              initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-0.5">1-on-1 PT</p>
                  <h3 className="font-black text-white text-[1rem]">Personal Training Plan</h3>
                </div>
                <button
                  onClick={() => setPtModalOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors bg-white/[0.06]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-6 flex flex-col gap-4">
                {/* 12 Sessions */}
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-black text-white text-[1rem]">12 Sessions</p>
                      <p className="text-[11px] text-blue-400 uppercase tracking-widest font-bold mt-0.5">Per month</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[2rem] font-black text-white leading-none">₹5,000</p>
                      <p className="text-[11px] text-white/35 mt-0.5">≈ ₹417 / session</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 mb-4">
                    {["12 sessions with a dedicated trainer", "Custom workout program", "Form correction & guidance", "Progress tracking"].map(f => (
                      <li key={f} className="flex items-center gap-2 text-[12px] text-white/60">
                        <Check size={12} className="text-blue-400 shrink-0" strokeWidth={3} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {/* Coupon for 12 Sessions */}
                  <button onClick={() => setShowPt12Coupon(v => !v)} className="text-[10px] text-blue-400/70 hover:text-blue-400 underline underline-offset-2 mb-2 cursor-pointer block transition-colors">
                    {showPt12Coupon ? "Hide coupon" : "Have a coupon code?"}
                  </button>
                  {showPt12Coupon && (
                    <div className="mb-2 flex gap-2">
                      <input value={pt12Coupon} onChange={e => { setPt12Coupon(e.target.value.toUpperCase()); setPt12Msg(null); }}
                        placeholder="Enter code" className="flex-1 h-8 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white outline-none focus:border-blue-400/50" />
                      <button onClick={applyPt12Coupon} className="h-8 px-3 bg-blue-500 hover:bg-blue-400 text-black text-xs font-black rounded-lg cursor-pointer">Apply</button>
                    </div>
                  )}
                  {pt12Msg && <p className={`text-[10px] mb-2 font-bold ${pt12Msg.valid ? "text-blue-400" : "text-red-400"}`}>{pt12Msg.text}</p>}
                  {pt12Discount > 0 && (
                    <div className="mb-2 flex items-center justify-between text-[11px]">
                      <span className="text-white/40 line-through">₹5,000</span>
                      <span className="text-blue-400 font-black">₹{discountedPrice(5000, pt12Discount)} ({pt12Discount}% OFF)</span>
                    </div>
                  )}
                  <button
                    onClick={() => { openRazorpay("Personal Training – 12 Sessions/month", discountedPrice(5000, pt12Discount) * 100); setPtModalOpen(false); }}
                    className="w-full h-[42px] rounded-xl font-bold text-[12px] bg-blue-500 hover:bg-blue-400 text-[#0f1a2a] transition-all flex items-center justify-center gap-2 group"
                  >
                    {pt12Discount > 0 ? `Get started – ₹${discountedPrice(5000, pt12Discount)}` : "Get started"} <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>

                {/* Every Day */}
                <div className="rounded-2xl border border-blue-400/40 bg-blue-500/[0.10] p-5 relative">
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500 text-[#0f1a2a]">Best Results</span>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-black text-white text-[1rem]">Every Day</p>
                      <p className="text-[11px] text-blue-400 uppercase tracking-widest font-bold mt-0.5">Per month</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[2rem] font-black text-white leading-none">₹8,000</p>
                      <p className="text-[11px] text-white/35 mt-0.5">Daily coaching</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 mb-4">
                    {["Daily sessions with a dedicated trainer", "Custom workout program", "Form correction & guidance", "Progress tracking", "Nutrition tips included"].map(f => (
                      <li key={f} className="flex items-center gap-2 text-[12px] text-white/60">
                        <Check size={12} className="text-blue-400 shrink-0" strokeWidth={3} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {/* Coupon for Every Day */}
                  <button onClick={() => setShowPtEdCoupon(v => !v)} className="text-[10px] text-blue-400/70 hover:text-blue-400 underline underline-offset-2 mb-2 cursor-pointer block transition-colors">
                    {showPtEdCoupon ? "Hide coupon" : "Have a coupon code?"}
                  </button>
                  {showPtEdCoupon && (
                    <div className="mb-2 flex gap-2">
                      <input value={ptEdCoupon} onChange={e => { setPtEdCoupon(e.target.value.toUpperCase()); setPtEdMsg(null); }}
                        placeholder="Enter code" className="flex-1 h-8 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white outline-none focus:border-blue-400/50" />
                      <button onClick={applyPtEdCoupon} className="h-8 px-3 bg-blue-500 hover:bg-blue-400 text-black text-xs font-black rounded-lg cursor-pointer">Apply</button>
                    </div>
                  )}
                  {ptEdMsg && <p className={`text-[10px] mb-2 font-bold ${ptEdMsg.valid ? "text-blue-400" : "text-red-400"}`}>{ptEdMsg.text}</p>}
                  {ptEdDiscount > 0 && (
                    <div className="mb-2 flex items-center justify-between text-[11px]">
                      <span className="text-white/40 line-through">₹8,000</span>
                      <span className="text-blue-400 font-black">₹{discountedPrice(8000, ptEdDiscount)} ({ptEdDiscount}% OFF)</span>
                    </div>
                  )}
                  <button
                    onClick={() => { openRazorpay("Personal Training – Every Day/month", discountedPrice(8000, ptEdDiscount) * 100); setPtModalOpen(false); }}
                    className="w-full h-[42px] rounded-xl font-bold text-[12px] bg-blue-500 hover:bg-blue-400 text-[#0f1a2a] transition-all flex items-center justify-center gap-2 group"
                  >
                    {ptEdDiscount > 0 ? `Get started – ₹${discountedPrice(8000, ptEdDiscount)}` : "Get started"} <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
