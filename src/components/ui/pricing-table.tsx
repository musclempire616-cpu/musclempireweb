"use client"

import * as React from "react"
import { CheckIcon } from "@radix-ui/react-icons"
import NumberFlow from "@number-flow/react"
import { X, ArrowRight } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { validateCoupon, getCoupons, syncCouponsFromSheets } from "@/lib/couponStore"

/* ── Types ─────────────────────────────────────────────────── */

export type PlanLevel = "basic" | "standard" | "premium" | string

export interface PricingFeature {
  name: string
  included: PlanLevel | null
}

export interface PricingPlan {
  name: string
  level: PlanLevel
  price: {
    monthly: number
    yearly: number
  }
  originalPrice?: {
    monthly: number
    yearly: number
  }
  monthlyRate?: number   // base per-month rate used to show "N × ₹rate" calculation
  months?: number        // number of months in this plan
  popular?: boolean
  description?: string
  priceSuffix?: string
}

export interface PricingTableProps {
  features: PricingFeature[]
  plans: PricingPlan[]
  accentColor?: string
  onGetStarted?: (plan: PricingPlan, finalPrice?: number, couponCode?: string | null) => void
  defaultPlan?: PlanLevel
}

/* ── Helper ─────────────────────────────────────────────────── */

function shouldShowCheck(included: PricingFeature["included"], level: string): boolean {
  const order = ["basic", "standard", "premium"]
  const includedIdx = order.indexOf(included ?? "")
  const levelIdx = order.indexOf(level)
  if (includedIdx === -1 || levelIdx === -1) return included === level || included === "all"
  return levelIdx >= includedIdx
}

/* ── PricingTable ───────────────────────────────────────────── */

export function PricingTable({
  features,
  plans,
  accentColor = "#E8A820",
  onGetStarted,
  defaultPlan,
}: PricingTableProps) {
  const [selectedPlan, setSelectedPlan] = React.useState<string>(
    defaultPlan ?? plans.find(p => p.popular)?.name ?? plans[0]?.name
  )
  const [showCoupon, setShowCoupon]     = React.useState(false)
  const [couponInput, setCouponInput]   = React.useState("")
  const [couponStatus, setCouponStatus] = React.useState<"idle" | "valid" | "invalid" | "not_applicable">("idle")
  const [appliedCoupon, setAppliedCoupon] = React.useState<string | null>(null)
  const [discount, setDiscount]         = React.useState(0)

  // Sync coupons from Sheets on mount (background, non-blocking)
  React.useEffect(() => { syncCouponsFromSheets(); }, [])

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase()
    const result = validateCoupon(code, selectedPlan)
    if (result) {
      setDiscount(result.discount)
      setAppliedCoupon(code)
      setCouponStatus("valid")
      return
    }
    setDiscount(0)
    setAppliedCoupon(null)
    const allCoupons = getCoupons()
    const exists = allCoupons.find(c => c.code === code)
    if (exists && exists.enabled && exists.plans.length > 0 && !exists.plans.includes(selectedPlan)) {
      setCouponStatus("not_applicable")
    } else {
      setCouponStatus("invalid")
    }
  }

  // Re-validate when plan changes
  React.useEffect(() => {
    if (!appliedCoupon) return
    const result = validateCoupon(appliedCoupon, selectedPlan)
    if (!result) {
      setDiscount(0)
      setCouponStatus("not_applicable")
    } else {
      setDiscount(result.discount)
      setCouponStatus("valid")
    }
  }, [selectedPlan, appliedCoupon])

  // Check for auto_apply_coupon in sessionStorage/localStorage on mount
  React.useEffect(() => {
    const code = sessionStorage.getItem("auto_apply_coupon") || localStorage.getItem("auto_apply_coupon")
    if (code) {
      sessionStorage.removeItem("auto_apply_coupon")
      localStorage.removeItem("auto_apply_coupon")
      const cleanCode = code.trim().toUpperCase()
      setShowCoupon(true)
      setCouponInput(cleanCode)
      const result = validateCoupon(cleanCode, selectedPlan)
      if (result) {
        setDiscount(result.discount)
        setAppliedCoupon(cleanCode)
        setCouponStatus("valid")
      } else {
        setCouponStatus("invalid")
      }
    }
  }, [])

  function removeCoupon() {
    setCouponInput("")
    setDiscount(0)
    setAppliedCoupon(null)
    setCouponStatus("idle")
    setShowCoupon(false)
  }

  return (
    <div className="w-full">
      {/* Plan Pills */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-center sm:gap-2 mb-8 w-full max-w-[340px] sm:w-fit mx-auto">
        {plans.map((plan) => {
          const active = selectedPlan === plan.name
          return (
            <button
              key={plan.name}
              type="button"
              onClick={() => setSelectedPlan(plan.name)}
              className="relative w-full sm:w-auto px-3.5 sm:px-5 py-2.5 rounded-xl sm:rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-all duration-300 border cursor-pointer hover:border-white/20"
              style={{
                background: active ? accentColor : "rgba(255,255,255,0.03)",
                color: active ? "#1C1C1E" : "rgba(255,255,255,0.6)",
                borderColor: active ? accentColor : "rgba(255,255,255,0.08)",
              }}
            >
              {plan.name}
              {plan.popular && (
                <span
                  className="absolute -top-2 -right-2 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                  style={{ background: accentColor, color: "#1C1C1E", boxShadow: `0 0 8px ${accentColor}80` }}
                >
                  Popular
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Features included in selected plan */}
      {(() => {
        const activePlan = plans.find(p => p.name === selectedPlan);
        const included = features.filter(f => activePlan && shouldShowCheck(f.included, activePlan.level));
        const excluded = features.filter(f => activePlan && !shouldShowCheck(f.included, activePlan.level));
        return (
          <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {included.map((f, i) => (
              <div key={f.name} className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent" }}>
                <CheckIcon className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                <span className="text-[13px] text-white/70">{f.name}</span>
              </div>
            ))}
            {excluded.map((f, i) => (
              <div key={f.name} className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < excluded.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: "transparent" }}>
                <X className="w-4 h-4 shrink-0 text-white/15" />
                <span className="text-[13px] text-white/30 line-through">{f.name}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* CTA */}
      <div className="p-4 sm:p-6 md:px-8 bg-[#1a1a1a]/50 border-t border-white/5 rounded-b-[24px]">
        {/* Dynamic Price Display */}
        {(() => {
          const activePlan = plans.find((p) => p.name === selectedPlan);
          if (!activePlan) return null;
          const hasDiscount = activePlan.originalPrice &&
            activePlan.originalPrice.monthly !== activePlan.price.monthly;
          const finalPrice = Math.round(activePlan.price.monthly * (1 - discount / 100));
          return (
            <div className="flex flex-col items-center justify-center mb-6">
              {hasDiscount && activePlan.months && activePlan.monthlyRate && (
                <>
                  <span className="text-[12px] text-white/30 mb-0.5">
                    {activePlan.months} × ₹{activePlan.monthlyRate.toLocaleString()}
                  </span>
                  <span className="text-[18px] font-bold text-white/25 line-through decoration-white/30 mb-1">
                    = ₹{activePlan.originalPrice!.monthly.toLocaleString()}
                  </span>
                </>
              )}
              {/* Actual price + effective per-month inline */}
              <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2.5 sm:gap-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg text-white/40 mr-0.5">₹</span>
                  <NumberFlow
                    value={finalPrice}
                    className="text-3xl sm:text-4xl font-black text-white"
                  />
                  <span className="text-sm text-white/40 ml-1">
                    {activePlan.priceSuffix || "/mo"}
                  </span>
                </div>
                {activePlan.months && activePlan.months > 1 && (
                  <div className="flex items-center sm:items-baseline gap-1.5 sm:flex-col sm:items-center sm:gap-0.5 bg-white/[0.03] sm:bg-transparent px-3 py-1 sm:p-0 rounded-full border border-white/[0.05] sm:border-0">
                    <span className="text-sm sm:text-[18px] font-black text-white">
                      ₹{Math.round(finalPrice / activePlan.months).toLocaleString()}
                      <span className="text-[10px] sm:text-[11px] font-medium text-white/40 ml-0.5 sm:ml-1">/mo</span>
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                      effective
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap justify-center">
                {hasDiscount && activePlan.originalPrice && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                    style={{ background: `${accentColor}22`, color: accentColor }}>
                    Save ₹{(activePlan.originalPrice.monthly - activePlan.price.monthly).toLocaleString()}
                  </span>
                )}
                {discount > 0 && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
                    Coupon: −{discount}% applied
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Coupon code */}
        <div className="mb-4">
          {!showCoupon ? (
            <button
              type="button"
              onClick={() => setShowCoupon(true)}
              className="w-full text-[12px] text-white/40 hover:text-white/70 transition-colors py-2 border border-dashed border-white/10 hover:border-white/25 rounded-xl"
            >
              Have a coupon code?
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2"
            >
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={couponInput}
                  onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponStatus("idle"); setDiscount(0); setAppliedCoupon(null); }}
                  onKeyDown={e => e.key === "Enter" && applyCoupon()}
                  onKeyUp={e => e.key === "Enter" && applyCoupon()}
                  placeholder="Enter coupon code"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  className="w-full h-11 px-4 rounded-xl text-[13px] font-bold uppercase tracking-widest bg-white/[0.06] border text-white placeholder-white/25 outline-none transition-all"
                  style={{
                    borderColor: couponStatus === "valid" ? "#22c55e" : couponStatus === "invalid" ? "#ef4444" : "rgba(255,255,255,0.12)",
                  }}
                />
                {couponStatus === "valid" && (
                  <button type="button" onClick={removeCoupon} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={applyCoupon}
                disabled={!couponInput.trim()}
                className="h-11 px-4 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                style={{ background: accentColor, color: "#1C1C1E" }}
              >
                Apply
              </button>
            </motion.div>
          )}
          {couponStatus === "invalid" && (
            <p className="text-[11px] text-red-400 mt-1.5 px-1">Invalid coupon code. Please try again.</p>
          )}
          {couponStatus === "not_applicable" && (
            <p className="text-[11px] text-orange-400 mt-1.5 px-1">This coupon isn't valid for the selected plan.</p>
          )}
          {couponStatus === "valid" && (
            <p className="text-[11px] text-green-400 mt-1.5 px-1">Coupon applied — {discount}% off!</p>
          )}
        </div>

        <button
          className="w-full flex items-center justify-center gap-2 font-bold text-sm h-12 rounded-xl transition-all duration-300 group hover:-translate-y-0.5"
          style={{
            background: accentColor,
            color: "#1C1C1E",
            boxShadow: `0 8px 25px ${accentColor}40`,
          }}
          onClick={() => {
            const plan = plans.find(p => p.name === selectedPlan)
            if (onGetStarted && plan) {
              const finalPrice = Math.round(plan.price.monthly * (1 - discount / 100))
              onGetStarted(plan, finalPrice, appliedCoupon)
            }
          }}
        >
          Get started — {plans.find((p) => p.name === selectedPlan)?.name}
          <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  )
}

/* ── PricingModal ───────────────────────────────────────────── */

interface PricingModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle: string
  accentColor: string
  features: PricingFeature[]
  plans: PricingPlan[]
  onGetStarted?: (plan: PricingPlan, finalPrice?: number, couponCode?: string | null) => void
}

export function PricingModal({
  open,
  onClose,
  title,
  subtitle,
  accentColor,
  features,
  plans,
  onGetStarted,
}: PricingModalProps) {
  // close on Escape
  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  // lock body scroll
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet */}
          <motion.div
            className="relative w-full sm:max-w-2xl max-h-[90dvh] overflow-y-auto rounded-[24px] z-10"
            style={{
              background: "#18181a",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
            }}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >

            {/* Header */}
            <div
              className="sticky top-0 z-20 flex items-center justify-between px-6 py-4"
              style={{ background: "#18181a", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-widest mb-0.5"
                  style={{ color: accentColor }}
                >
                  {subtitle}
                </p>
                <h3 className="font-black text-white text-[1rem] leading-tight">{title}</h3>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 sm:px-6 py-6">
              <PricingTable
                features={features}
                plans={plans}
                accentColor={accentColor}
                onGetStarted={onGetStarted}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
