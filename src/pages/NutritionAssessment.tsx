import { useState, useLayoutEffect, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Shift = {
  name: string;
  from: string;
  to: string;
};

type Meal = {
  name: string;
  time: string;
  food: string;
};
import chalkboardBg from "@/assets/images/chalkboard-bg.webp";
import { StarsBackground } from "@/components/ui/stars";
import { CheckCircle2, User, Scale, Heart, Utensils, Target, FileText, Clock, ChevronRight, ChevronLeft, ChevronUp, ChevronDown } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import PlanNavbar from "@/components/PlanNavbar";
import Footer from "@/components/Footer";
import { submitAssessment } from "@/lib/sheets";
import type { AssessmentData } from "@/lib/sheets";
import { RAZORPAY_KEY } from "@/lib/razorpay";
import { validateCoupon } from "@/lib/couponStore";

const WA_NUMBER = "919773053632";

const blockNonNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (
    ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key) ||
    (e.ctrlKey || e.metaKey)
  ) {
    return;
  }
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

const blockNonAlphabetKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (
    ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", " "].includes(e.key) ||
    (e.ctrlKey || e.metaKey)
  ) {
    return;
  }
  if (!/^[a-zA-Z]$/.test(e.key)) {
    e.preventDefault();
  }
};

type Form = {
  name: string; phone: string; email: string; age: string; gender: string;
  weight: string; height: string;
  wakeTime: string; bedTime: string; sleepDuration: string;
  duty: string;
  restTimeFrom: string; restTimeTo: string; restTime: string;
  doesWorkout: string; workoutType: string;
  workoutTimeFrom: string; workoutTimeTo: string; workoutTime: string;
  foodPref: string;
  collegeTimeFrom: string; collegeTimeTo: string; collegeTime: string;
  workTimeFrom: string; workTimeTo: string; workTime: string;
  medicalConditions: string; allergies: string; supplements: string;
  goals: string[]; otherGoal: string;
  remarks: string; foodHistory: string; consent: boolean;
};

const empty: Form = {
  name: "", phone: "", email: "", age: "", gender: "",
  weight: "", height: "",
  wakeTime: "", bedTime: "", sleepDuration: "",
  duty: "",
  restTimeFrom: "", restTimeTo: "", restTime: "",
  doesWorkout: "", workoutType: "",
  workoutTimeFrom: "", workoutTimeTo: "", workoutTime: "",
  foodPref: "",
  collegeTimeFrom: "", collegeTimeTo: "", collegeTime: "",
  workTimeFrom: "", workTimeTo: "", workTime: "",
  medicalConditions: "", allergies: "", supplements: "",
  goals: [], otherGoal: "",
  remarks: "", foodHistory: "", consent: false,
};

function bmi(w: string, h: string) {
  const wn = parseFloat(w), hn = parseFloat(h) / 100;
  if (!wn || !hn || hn <= 0) return null;
  return wn / (hn * hn);
}
function calculateSleepDuration(bedTime: string, wakeTime: string): string {
  if (!bedTime || !wakeTime) return "";
  const [bedH, bedM] = bedTime.split(":").map(Number);
  const [wakeH, wakeM] = wakeTime.split(":").map(Number);
  if (isNaN(bedH) || isNaN(bedM) || isNaN(wakeH) || isNaN(wakeM)) return "";

  const bedMinutes = bedH * 60 + bedM;
  const wakeMinutes = wakeH * 60 + wakeM;

  let diffMinutes = 0;
  if (wakeMinutes >= bedMinutes) {
    diffMinutes = wakeMinutes - bedMinutes;
  } else {
    diffMinutes = (24 * 60 - bedMinutes) + wakeMinutes;
  }

  const hours = diffMinutes / 60;
  return Number(hours.toFixed(1)).toString();
}
function bmiCategory(b: number) {
  if (b < 18.5) return { label: "Underweight", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/25" };
  if (b < 25)   return { label: "Normal weight", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/25" };
  if (b < 30)   return { label: "Overweight", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/25" };
  return { label: "Obese", color: "text-red-400", bg: "bg-red-400/10 border-red-400/25" };
}

function bodyFat(bmiVal: number, ageStr: string, gender: string) {
  const age = parseFloat(ageStr);
  if (!bmiVal || !age || !gender) return null;
  const genderVal = gender.toLowerCase() === "male" ? 1 : 0;
  // Deurenberg formula for adults
  const bf = (1.20 * bmiVal) + (0.23 * age) - (10.8 * genderVal) - 5.4;
  return bf > 0 ? bf : null;
}

function bodyFatCategory(bf: number, gender: string) {
  const isMale = gender.toLowerCase() === "male";
  if (isMale) {
    if (bf < 6) return { label: "Essential Fat", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/25" };
    if (bf < 14) return { label: "Athletic/Fit", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/25" };
    if (bf < 18) return { label: "Fitness", color: "text-emerald-300", bg: "bg-emerald-300/10 border-emerald-300/25" };
    if (bf < 25) return { label: "Average", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/25" };
    return { label: "Obese", color: "text-red-400", bg: "bg-red-400/10 border-red-400/25" };
  } else {
    if (bf < 14) return { label: "Essential Fat", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/25" };
    if (bf < 21) return { label: "Athletic/Fit", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/25" };
    if (bf < 25) return { label: "Fitness", color: "text-emerald-300", bg: "bg-emerald-300/10 border-emerald-300/25" };
    if (bf < 32) return { label: "Average", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/25" };
    return { label: "Obese", color: "text-red-400", bg: "bg-red-400/10 border-red-400/25" };
  }
}

const formatTime12h = (timeStr: string): string => {
  if (!timeStr) return "";
  if (timeStr.includes(" to ")) {
    const parts = timeStr.split(" to ");
    const formattedParts = parts.map(p => formatTime12h(p)).filter(Boolean);
    return formattedParts.join(" to ");
  }
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  if (isNaN(hours)) return timeStr;
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${period}`;
};

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parse = (t: string) => {
    const m = t.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return { h: 0, min: 0, period: "AM", isSet: false };
    const h24 = parseInt(m[1], 10);
    return { h: h24 % 12 === 0 ? 12 : h24 % 12, min: parseInt(m[2], 10), period: h24 >= 12 ? "PM" : "AM", isSet: true };
  };
  const { h, min, period, isSet } = parse(value);
  const emit = (newH: number, newMin: number, newPeriod: string) => {
    if (!newH) { onChange(""); return; }
    let h24 = newH % 12;
    if (newPeriod === "PM") h24 += 12;
    onChange(`${String(h24).padStart(2,"0")}:${String(newMin).padStart(2,"0")}`);
  };
  const sel = "bg-[#18181a] border border-white/[0.10] text-[#F2EFE9] rounded-2xl h-12 outline-none focus:border-[#E8A820] transition-all duration-200 text-center text-[0.9rem] cursor-pointer";
  return (
    <div className="flex items-center gap-2">
      <select value={isSet ? String(h).padStart(2,"0") : ""} onChange={e => emit(parseInt(e.target.value)||0, min, period)} className={`${sel} w-16`}>
        <option value="">HH</option>
        {Array.from({length:12},(_,i)=>i+1).map(v=><option key={v} value={String(v).padStart(2,"0")}>{String(v).padStart(2,"0")}</option>)}
      </select>
      <span className="text-[#F2EFE9]/20 font-bold text-xl select-none">:</span>
      <select value={isSet ? String(min).padStart(2,"00") : "00"} onChange={e => emit(h||1, parseInt(e.target.value), period)} className={`${sel} w-16`}>
        {["00","05","10","15","20","25","30","35","40","45","50","55"].map(v=><option key={v} value={v}>{v}</option>)}
      </select>
      <div
        className="flex flex-col h-12 w-16 rounded-2xl overflow-hidden border border-white/[0.10] bg-[#18181a] cursor-pointer select-none p-0.5 justify-between"
        onWheel={e => { e.preventDefault(); emit(h||1, min, period === "AM" ? "PM" : "AM"); }}
        title="Click or scroll mouse wheel to change AM / PM"
      >
        {(["AM", "PM"] as const).map(p => {
          const active = period === p && isSet;
          return (
            <button
              key={p}
              type="button"
              onClick={() => emit(h || 1, min, p)}
              className={`w-full h-[21px] rounded-xl text-[10px] font-black tracking-wider transition-all duration-200 flex items-center justify-center cursor-pointer ${
                active
                  ? "bg-[#E8A820] text-black shadow-md scale-[1.02]"
                  : "bg-transparent text-[#F2EFE9]/40 hover:text-[#F2EFE9]/80"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const getTimeIcon = (timeStr: string): string => {
  if (!timeStr) return "⏰";
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "⏰";
  const hours = parseInt(match[1], 10);
  if (isNaN(hours)) return "⏰";
  return (hours >= 6 && hours < 18) ? "ΓÿÇ∩╕Å" : "≡ƒîÖ";
};

/* ΓöÇΓöÇ Shared UI primitives ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const inp = (err?: string) =>
  `w-full bg-white/[0.05] border ${err ? "border-red-400/60" : "border-white/[0.12]"} focus:border-[#E8A820] focus:ring-1 focus:ring-[#E8A820]/20 outline-none rounded-2xl h-12 px-4 text-[#F2EFE9] placeholder:text-white/25 text-[0.9rem] transition-all duration-200`;

const textareaBase =
  "w-full bg-white/[0.05] border border-white/[0.12] focus:border-[#E8A820] focus:ring-1 focus:ring-[#E8A820]/20 outline-none rounded-2xl px-4 py-3 text-[#F2EFE9] placeholder:text-white/25 text-[0.9rem] transition-all duration-200 resize-none";

const Err = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-red-400 text-xs mt-1.5 font-medium">{msg}</p> : null;

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[11px] font-bold uppercase tracking-widest text-[#F2EFE9]/45 mb-2">{children}</label>
);

function PillOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-[0.84rem] font-semibold border transition-all duration-200 ${
        active
          ? "bg-[#E8A820] text-black border-[#E8A820] shadow-[0_2px_12px_rgba(232,168,32,0.30)]"
          : "bg-white/[0.04] text-[#F2EFE9]/60 border-white/[0.10] hover:border-[#E8A820]/40 hover:text-[#F2EFE9]/90"
      }`}
    >{label}</button>
  );
}

const STEPS = [
  { label: "Personal",     icon: User },
  { label: "Body",         icon: Scale },
  { label: "Lifestyle",    icon: Clock },
  { label: "Diet",         icon: Utensils },
  { label: "Health",       icon: Heart },
  { label: "Goals",        icon: Target },
  { label: "History",      icon: FileText },
  { label: "Review",       icon: CheckCircle2 },
];

const slide = {
  initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
};

export default function NutritionAssessment() {
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [step, setStep]     = useState(0);
  const [dir, setDir]       = useState(1);
  const [submitted, setSubmitted] = useState(false);
  // Dietitian plan coupon on nutrition form
  const [dietNutrCoupon, setDietNutrCoupon] = useState("");
  const [dietNutrCouponMsg, setDietNutrCouponMsg] = useState<{text: string; valid: boolean} | null>(null);
  const [dietNutrCouponDiscount, setDietNutrCouponDiscount] = useState(0);
  const [showDietNutrCoupon, setShowDietNutrCoupon] = useState(false);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([{ name: "Shift 1", from: "", to: "" }]);

  useEffect(() => {
    if (meals.length > 0) {
      const historyStr = meals
        .map((m, idx) => `Meal #${idx + 1}: ${m.name || "N/A"} (${m.time || "N/A"}) - ${m.food || "N/A"}`)
        .join("\n");
      setForm(f => ({ ...f, foodHistory: historyStr }));
    } else {
      setForm(f => ({ ...f, foodHistory: "" }));
    }
  }, [meals]);

  useEffect(() => {
    if (form.wakeTime && form.bedTime) {
      const calculated = calculateSleepDuration(form.bedTime, form.wakeTime);
      setForm(f => ({ ...f, sleepDuration: calculated }));
      if (errors.sleepDuration) {
        setErrors(prev => {
          const next = { ...prev };
          delete next.sleepDuration;
          return next;
        });
      }
    } else {
      setForm(f => ({ ...f, sleepDuration: "" }));
    }
  }, [form.wakeTime, form.bedTime]);

  const addMeal = () => {
    setMeals([...meals, { name: "", time: "", food: "" }]);
  };

  const removeMeal = (idx: number) => {
    setMeals(meals.filter((_, i) => i !== idx));
  };

  const updateMeal = (idx: number, key: keyof Meal, val: string) => {
    setMeals(meals.map((m, i) => i === idx ? { ...m, [key]: val } : m));
  };

  useLayoutEffect(() => { window.scrollTo(0, 0); }, []);

  const bmiVal = bmi(form.weight, form.height);
  const bmiCat = bmiVal ? bmiCategory(bmiVal) : null;
  const bfVal = bmiVal ? bodyFat(bmiVal, form.age, form.gender) : null;
  const bfCat = bfVal ? bodyFatCategory(bfVal, form.gender) : null;

  const set = (k: keyof Form, v: string | boolean | string[]) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
  };

  const toggleGoal = (g: string) => {
    const cur = form.goals;
    set("goals", cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g]);
  };

  const validateStep = (s: number) => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (s === 0) {
      if (!form.name.trim()) e.name = "Full name is required";
      if (!form.phone.trim() || form.phone.replace(/\s/g, "").length !== 10) {
        e.phone = "Enter a valid 10-digit mobile number";
      }
      if (!form.age || isNaN(Number(form.age))) e.age = "Age is required";
      if (!form.email.trim()) {
        e.email = "Email address is required";
      } else if (!form.email.includes("@")) {
        e.email = "Please include an '@' in the email address (e.g. name@domain.com)";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        e.email = "Enter a valid email address (e.g. name@domain.com)";
      }
      if (!form.gender) e.gender = "Gender selection is required";
    }
    if (s === 1) {
      if (!form.weight) e.weight = "Weight is required";
      if (!form.height) e.height = "Height is required";
    }
    if (s === 2) {
      if (!form.wakeTime) e.wakeTime = "Wake-up time is required";
      if (!form.bedTime) e.bedTime = "Bed time is required";
      if (!form.sleepDuration) e.sleepDuration = "Sleep duration is required";
      if (!form.doesWorkout) {
        e.doesWorkout = "Please select whether you workout";
      } else if (form.doesWorkout === "Yes") {
        if (!form.workoutType) e.workoutType = "Please select workout option";
        if (!form.workoutTimeFrom || !form.workoutTimeTo) {
          e.workoutTime = "Workout start time and end time are required";
        }
      }
    }
    if (s === 3) {
      if (!form.foodPref) e.foodPref = "Food preference selection is required";
    }
    if (s === 4) {
    }
    if (s === 5) {
      if (form.goals.length === 0) e.goals = "Select at least one goal";
      if (form.goals.includes("Other") && !form.otherGoal.trim()) e.otherGoal = "Goal specification is required";
    }
    if (s === 6) {
      if (meals.length > 0) {
        const missing = meals.some(m => !m.name.trim() || !m.time.trim() || !m.food.trim());
        if (missing) {
          e.foodHistory = "Please fill in all fields (Meal Name, Time, and Food) for each added meal.";
        }
      }
    }
    if (s === 7) {
      if (!form.consent) e.consent = "Please confirm declaration before submitting";
    }
    return e;
  };

  const goNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setDir(1);
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    setErrors({});
    setDir(-1);
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    const e = {
      ...validateStep(0), ...validateStep(1), ...validateStep(2), ...validateStep(3),
      ...validateStep(4), ...validateStep(5), ...validateStep(6), ...validateStep(7),
    };
    if (Object.keys(e).length) {
      setErrors(e);
      for(let i=0; i<8; i++) if (Object.keys(validateStep(i)).length) { setStep(i); break; }
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Build payload
    const foodHistoryStr = meals.map((m, idx) => `Meal #${idx + 1}: ${m.name || "N/A"} (${formatTime12h(m.time)}) - ${m.food || "N/A"}`).join("\n");
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const goalsList = [...form.goals, form.otherGoal ? `Other: ${form.otherGoal}` : ""].filter(Boolean).join(", ");
    const payload: AssessmentData = {
      date: today, name: form.name, phone: form.phone, email: form.email,
      age: form.age, gender: form.gender, weight: form.weight, height: form.height,
      bmi: bmiVal ? bmiVal.toFixed(1) : "", bmiCategory: bmiCat?.label || "",
      wakeTime: formatTime12h(form.wakeTime), bedTime: formatTime12h(form.bedTime), sleepDuration: form.sleepDuration,
      workoutTime: form.doesWorkout === "Yes" ? `${form.workoutType} (${formatTime12h(form.workoutTimeFrom)} - ${formatTime12h(form.workoutTimeTo)})` : "No",
      duty: form.duty === "Shifted"
        ? `Shifted: ${shifts.filter(s => s.from && s.to).map(s => `${s.name} (${formatTime12h(s.from)}-${formatTime12h(s.to)})`).join(", ") || "Shifted"}`
        : form.duty,
      restTime: formatTime12h(form.restTime), targetWeight: "",
      weightChange: "", foodPref: form.foodPref,
      collegeTime: formatTime12h(form.collegeTime), workTime: formatTime12h(form.workTime),
      medicalConditions: form.medicalConditions, allergies: form.allergies,
      supplements: form.supplements, goals: goalsList, remarks: form.remarks,
      foodHistory: foodHistoryStr, status: "New", notes: "",
    };

    // Load Razorpay script
    const loadScript = () => new Promise<boolean>(resolve => {
      if ((window as any).Razorpay) { resolve(true); return; }
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

    const loaded = await loadScript();
    if (!loaded) { alert("Could not load payment gateway. Check your connection."); return; }

    // Calculate discounted amount
    const baseAmount = 800;
    const finalAmount = dietNutrCouponDiscount > 0
      ? Math.round(baseAmount * (1 - dietNutrCouponDiscount / 100))
      : baseAmount;

    const options = {
      key: RAZORPAY_KEY,
      amount: finalAmount * 100,
      currency: "INR",
      name: "Muscle Empire Gymnasium",
      description: "Personalised Dietitian Plan",
      image: "/favicon.png",
      prefill: { name: form.name, contact: form.phone, email: form.email },
      theme: { color: "#E8A820" },
      handler: async (response: { razorpay_payment_id: string }) => {
        // Payment successful — now submit the form
        await submitAssessment({ ...payload, notes: "" });
        setSubmitted(true);
        window.scrollTo(0, 0);
        // Show success popup
        showPaymentPopup(true, response.razorpay_payment_id);
      },
      modal: { ondismiss: () => {} },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on("payment.failed", (r: any) => {
      showPaymentPopup(false, undefined, r?.error?.description || "Payment was declined.");
    });
    rzp.open();
  };

  function showPaymentPopup(success: boolean, paymentId?: string, errorMsg?: string) {
    const existing = document.getElementById("rzp-nutr-popup");
    if (existing) existing.remove();
    const overlay = document.createElement("div");
    overlay.id = "rzp-nutr-popup";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);font-family:-apple-system,sans-serif;";
    const box = document.createElement("div");
    box.style.cssText = "background:#111;border-radius:24px;padding:40px 36px;max-width:380px;width:90%;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.1);";
    if (success) {
      box.innerHTML = `<div style="width:72px;height:72px;background:rgba(34,197,94,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><h2 style="font-size:1.4rem;font-weight:900;color:#fff;margin:0 0 8px;">Payment Successful!</h2><p style="color:#aaa;font-size:0.9rem;margin:0 0 6px;">Welcome to Muscle Empire! ≡ƒÆ¬</p><p style="color:#666;font-size:0.75rem;margin:0 0 20px;">Payment ID: <strong style="color:#aaa;">${paymentId}</strong></p><p style="color:#aaa;font-size:0.85rem;margin:0 0 28px;background:rgba(34,197,94,0.1);border-radius:12px;padding:12px;">Your assessment has been submitted. Our dietician will contact you shortly.</p><button id="rzp-nutr-close" style="background:#22c55e;color:#000;border:none;border-radius:12px;padding:14px 32px;font-size:0.9rem;font-weight:800;cursor:pointer;width:100%;">Done</button>`;
    } else {
      box.innerHTML = `<div style="width:72px;height:72px;background:rgba(239,68,68,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div><h2 style="font-size:1.4rem;font-weight:900;color:#fff;margin:0 0 8px;">Payment Failed</h2><p style="color:#aaa;font-size:0.9rem;margin:0 0 6px;">Something went wrong.</p><p style="color:#666;font-size:0.8rem;margin:0 0 28px;">${errorMsg || "Please try again."}</p><button id="rzp-nutr-close" style="background:#ef4444;color:#fff;border:none;border-radius:12px;padding:14px 32px;font-size:0.9rem;font-weight:800;cursor:pointer;width:100%;">Try Again</button>`;
    }
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById("rzp-nutr-close")!.onclick = () => overlay.remove();
    overlay.onclick = (ev) => { if (ev.target === overlay) overlay.remove(); };
  }

  /* ΓöÇΓöÇ Success screen ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-[#F2EFE9] flex flex-col relative overflow-hidden">
        <div 
          className="fixed inset-0 pointer-events-none z-0 opacity-80 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${chalkboardBg})`,
            maskImage: "linear-gradient(to bottom, transparent 0px, transparent 100px, black 160px), radial-gradient(ellipse 70% 60% at 50% 55%, transparent 40%, black 80%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, transparent 100px, black 160px), radial-gradient(ellipse 70% 60% at 50% 55%, transparent 40%, black 80%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "destination-in",
          }}
        />
        <PlanNavbar />
        <main className="flex items-center justify-center flex-1 px-4 relative z-10">
          <motion.div initial={{ opacity:0, scale:0.88 }} animate={{ opacity:1, scale:1 }}
            transition={{ duration:0.65, ease:[0.16,1,0.3,1] }}
            className="text-center max-w-md mx-auto"
          >
            <motion.div
              initial={{ scale:0 }} animate={{ scale:1 }}
              transition={{ delay:0.2, type:"spring", stiffness:260, damping:20 }}
              className="w-24 h-24 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-8"
            >
              <CheckCircle2 size={52} className="text-emerald-400" />
            </motion.div>
            <motion.h2 initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.35,duration:0.6 }}
              className="font-display font-black text-[#F2EFE9] text-3xl mb-4"
            >
              Assessment submitted!
            </motion.h2>
            <motion.p initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.45,duration:0.5 }}
              className="text-[#F2EFE9]/55 text-[0.97rem] leading-relaxed"
            >
              Thank you for submitting your assessment. Our nutritionist will review your information and contact you shortly with your personalised diet plan.
            </motion.p>
          </motion.div>
        </main>
        <div className="relative z-10 bg-[#1C1C1E]">
          <Footer />
        </div>
      </div>
    );
  }

  /* ΓöÇΓöÇ Step content renderer ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  const pct = ((step) / (STEPS.length - 1)) * 100;

  const stepContent = () => {
    switch (step) {
      /* Step 0 — Personal */
      case 0: return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Full name <span className="text-red-400">*</span></Label>
              <input type="text" value={form.name} onChange={e=>set("name",e.target.value)} className={inp(errors.name)} />
              <Err msg={errors.name} />
            </div>
            <div>
              <Label>Mobile number <span className="text-red-400">*</span></Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F2EFE9]/60 font-bold text-[0.9rem] pointer-events-none select-none">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={form.phone}
                  onKeyDown={blockNonNumericKeys}
                  onChange={e=>set("phone",e.target.value.replace(/[^0-9]/g,""))}
                  className={`${inp(errors.phone)} pl-14`}
                />
              </div>
              <Err msg={errors.phone} />
            </div>
            <div>
              <Label>Age <span className="text-red-400">*</span></Label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={form.age}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const val = parseInt(form.age, 10);
                      const current = isNaN(val) ? 24 : val;
                      if (current < 99) set("age", String(current + 1));
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const val = parseInt(form.age, 10);
                      const current = isNaN(val) ? 25 : val;
                      if (current > 10) set("age", String(current - 1));
                    } else {
                      blockNonNumericKeys(e);
                    }
                  }}
                  onChange={e=>set("age",e.target.value.replace(/[^0-9]/g,""))}
                  className={`${inp(errors.age)} pr-10`}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-col bg-[#2C2C2E] border border-white/10 rounded-md overflow-hidden shrink-0 select-none">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      const val = parseInt(form.age, 10);
                      const current = isNaN(val) ? 24 : val;
                      if (current < 99) set("age", String(current + 1));
                    }}
                    className="px-1.5 py-0.5 hover:bg-white/20 active:bg-white/30 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <span className="text-[8px] leading-none">▲</span>
                  </button>
                  <div className="h-[1px] bg-white/10" />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      const val = parseInt(form.age, 10);
                      const current = isNaN(val) ? 25 : val;
                      if (current > 10) set("age", String(current - 1));
                    }}
                    className="px-1.5 py-0.5 hover:bg-white/20 active:bg-white/30 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <span className="text-[8px] leading-none">▼</span>
                  </button>
                </div>
              </div>
              <Err msg={errors.age} />
            </div>
            <div>
              <Label>Email address <span className="text-red-400">*</span></Label>
              <input type="email" value={form.email} onChange={e=>set("email",e.target.value)} className={inp(errors.email)} />
              <Err msg={errors.email} />
            </div>
          </div>
          <div>
            <Label>Gender <span className="text-red-400">*</span></Label>
            <div className="flex flex-wrap gap-3">
              {["Male","Female","Other"].map(g=>(
                <PillOption key={g} label={g} active={form.gender===g} onClick={()=>set("gender",g)} />
              ))}
            </div>
            <Err msg={errors.gender} />
          </div>
        </div>
      );
      /* Step 1 — Body */
      case 1: return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Weight (kg) <span className="text-red-400">*</span></Label>
              <input type="text" inputMode="numeric" maxLength={3} value={form.weight} onKeyDown={blockNonNumericKeys} onChange={e=>set("weight",e.target.value.replace(/[^0-9]/g,""))} className={inp(errors.weight)} />
              <Err msg={errors.weight} />
            </div>
            <div>
              <Label>Height (cm) <span className="text-red-400">*</span></Label>
              <input type="text" inputMode="numeric" maxLength={3} value={form.height} onKeyDown={blockNonNumericKeys} onChange={e=>set("height",e.target.value.replace(/[^0-9]/g,""))} className={inp(errors.height)} />
              <Err msg={errors.height} />
            </div>
          </div>
          {bmiVal && bmiCat && (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
              className={bfVal && bfCat ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "w-full"}
            >
              <div className={`border rounded-2xl p-5 flex items-center justify-between ${bmiCat.bg}`}>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-0.5 text-[#F2EFE9]">Your BMI</p>
                  <p className={`text-4xl font-black ${bmiCat.color}`}>{bmiVal.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-0.5 text-[#F2EFE9]">Category</p>
                  <p className={`text-xl font-black ${bmiCat.color}`}>{bmiCat.label}</p>
                </div>
              </div>
              {bfVal && bfCat && (
                <div className={`border rounded-2xl p-5 flex items-center justify-between ${bfCat.bg}`}>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-0.5 text-[#F2EFE9]">Body Fat (Est.)</p>
                    <p className={`text-4xl font-black ${bfCat.color}`}>{bfVal.toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-0.5 text-[#F2EFE9]">Category</p>
                    <p className={`text-xl font-black ${bfCat.color}`}>{bfCat.label}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      );
      /* Step 2 — Lifestyle */
      case 2: return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Wake-up time <span className="text-red-400">*</span></Label>
              <TimeInput value={form.wakeTime} onChange={v=>set("wakeTime",v)} />
              {form.wakeTime && <span className="text-[11px] font-bold text-[#E8A820] mt-1.5 block">⏰ {formatTime12h(form.wakeTime)}</span>}
              <Err msg={errors.wakeTime} />
            </div>
            <div>
              <Label>Bed time <span className="text-red-400">*</span></Label>
              <TimeInput value={form.bedTime} onChange={v=>set("bedTime",v)} />
              {form.bedTime && <span className="text-[11px] font-bold text-[#E8A820] mt-1.5 block">⏰ {formatTime12h(form.bedTime)}</span>}
              <Err msg={errors.bedTime} />
            </div>
            <div>
              <Label>Sleep duration (hours) <span className="text-red-400">*</span></Label>
              <input type="text" readOnly placeholder="Calculated automatically" value={form.sleepDuration ? `${form.sleepDuration} hrs` : ""} className={`${inp(errors.sleepDuration)} cursor-not-allowed opacity-80`} />
              <Err msg={errors.sleepDuration} />
            </div>
          </div>

          <div>
              <Label>Duty type <span className="text-xs font-normal text-white/40">(Optional)</span></Label>
              <div className="flex flex-wrap gap-3">
                {["Regular","Shifted"].map(d=>(
                  <PillOption key={d} label={d} active={form.duty===d} onClick={()=>set("duty",d)} />
                ))}
              </div>

              {/* Shift entries — shown when Shifted is selected */}
              {form.duty === "Shifted" && (
                <div className="mt-4 space-y-3">
                  {shifts.map((shift, idx) => (
                    <div key={idx} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <input
                          value={shift.name}
                          onChange={e => {
                            const updated = [...shifts];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setShifts(updated);
                          }}
                          placeholder={`Shift ${idx + 1}`}
                          className="bg-transparent text-[#F2EFE9] font-bold text-sm outline-none flex-1"
                        />
                        {shifts.length > 1 && (
                          <button type="button" onClick={() => setShifts(shifts.filter((_, i) => i !== idx))}
                            className="text-red-400/60 hover:text-red-400 transition-colors ml-2 text-xs uppercase tracking-wider font-bold cursor-pointer">
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] text-[#F2EFE9]/40 uppercase tracking-wider font-bold block mb-1">From</span>
                          <TimeInput value={shift.from} onChange={v => { const u = [...shifts]; u[idx] = { ...u[idx], from: v }; setShifts(u); }} />
                          {shift.from && <span className="text-[11px] font-bold text-[#E8A820] mt-1 block">⏰ {formatTime12h(shift.from)}</span>}
                        </div>
                        <div>
                          <span className="text-[10px] text-[#F2EFE9]/40 uppercase tracking-wider font-bold block mb-1">To</span>
                          <TimeInput value={shift.to} onChange={v => { const u = [...shifts]; u[idx] = { ...u[idx], to: v }; setShifts(u); }} />
                          {shift.to && <span className="text-[11px] font-bold text-[#E8A820] mt-1 block">⏰ {formatTime12h(shift.to)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setShifts([...shifts, { name: `Shift ${shifts.length + 1}`, from: "", to: "" }])}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-white/[0.12] hover:border-[#E8A820]/50 text-[#F2EFE9]/40 hover:text-[#E8A820] text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2">
                    + Add Shift
                  </button>
                </div>
              )}
          </div>

          <div>
            <Label>Rest time <span className="text-xs font-normal text-white/40">(Optional)</span></Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-[#F2EFE9]/40 uppercase tracking-wider font-bold block mb-1">From</span>
                <TimeInput value={form.restTimeFrom} onChange={v => { set("restTimeFrom", v); const to = form.restTimeTo; set("restTime", v && to ? `${v} to ${to}` : ""); }} />
              </div>
              <div>
                <span className="text-[10px] text-[#F2EFE9]/40 uppercase tracking-wider font-bold block mb-1">To</span>
                <TimeInput value={form.restTimeTo} onChange={v => { set("restTimeTo", v); const from = form.restTimeFrom; set("restTime", from && v ? `${from} to ${v}` : ""); }} />
              </div>
            </div>
            {form.restTime && <span className="text-[11px] font-bold text-[#E8A820] mt-1.5 block">⏰ {formatTime12h(form.restTime)}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>College timing <span className="text-xs font-normal text-white/40">(Optional)</span></Label>
              <div className="flex flex-col gap-3">
                <div>
                  <span className="text-[10px] text-[#F2EFE9]/40 uppercase tracking-wider font-bold block mb-1">From</span>
                  <TimeInput value={form.collegeTimeFrom} onChange={v => { set("collegeTimeFrom", v); const to = form.collegeTimeTo; set("collegeTime", v && to ? `${v} to ${to}` : ""); }} />
                </div>
                <div>
                  <span className="text-[10px] text-[#F2EFE9]/40 uppercase tracking-wider font-bold block mb-1">To</span>
                  <TimeInput value={form.collegeTimeTo} onChange={v => { set("collegeTimeTo", v); const from = form.collegeTimeFrom; set("collegeTime", from && v ? `${from} to ${v}` : ""); }} />
                </div>
              </div>
              {form.collegeTime && <span className="text-[11px] font-bold text-[#E8A820] mt-1.5 block">⏰ {formatTime12h(form.collegeTime)}</span>}
            </div>
            <div>
              <Label>Work timing <span className="text-xs font-normal text-white/40">(Optional)</span></Label>
              <div className="flex flex-col gap-3">
                <div>
                  <span className="text-[10px] text-[#F2EFE9]/40 uppercase tracking-wider font-bold block mb-1">From</span>
                  <TimeInput value={form.workTimeFrom} onChange={v => { set("workTimeFrom", v); const to = form.workTimeTo; set("workTime", v && to ? `${v} to ${to}` : ""); }} />
                </div>
                <div>
                  <span className="text-[10px] text-[#F2EFE9]/40 uppercase tracking-wider font-bold block mb-1">To</span>
                  <TimeInput value={form.workTimeTo} onChange={v => { set("workTimeTo", v); const from = form.workTimeFrom; set("workTime", from && v ? `${from} to ${v}` : ""); }} />
                </div>
              </div>
              {form.workTime && <span className="text-[11px] font-bold text-[#E8A820] mt-1.5 block">⏰ {formatTime12h(form.workTime)}</span>}
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.08]">
            <Label>Do you workout? <span className="text-red-400">*</span></Label>
            <div className="flex flex-wrap gap-3 mb-2">
              {["Yes", "No"].map(w => (
                <PillOption
                  key={w}
                  label={w}
                  active={form.doesWorkout === w}
                  onClick={() => {
                    set("doesWorkout", w);
                    if (w === "No") {
                      set("workoutType", "");
                      set("workoutTimeFrom", "");
                      set("workoutTimeTo", "");
                      set("workoutTime", "No workout");
                    }
                  }}
                />
              ))}
            </div>
            <Err msg={errors.doesWorkout} />
          </div>

          {form.doesWorkout === "Yes" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-1">
              <div>
                <Label>Workout option <span className="text-red-400">*</span></Label>
                <div className="flex flex-wrap gap-3">
                  {["Enrolled in Gym", "Self Workout"].map(wt => (
                    <PillOption
                      key={wt}
                      label={wt}
                      active={form.workoutType === wt}
                      onClick={() => set("workoutType", wt)}
                    />
                  ))}
                </div>
                <Err msg={errors.workoutType} />
              </div>

              <div>
                <Label>Workout time <span className="text-red-400">*</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-[#F2EFE9]/40 uppercase tracking-wider font-bold block mb-1">From</span>
                    <TimeInput value={form.workoutTimeFrom} onChange={v => { set("workoutTimeFrom", v); const to = form.workoutTimeTo; set("workoutTime", v && to ? `${v} to ${to}` : ""); }} />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#F2EFE9]/40 uppercase tracking-wider font-bold block mb-1">To</span>
                    <TimeInput value={form.workoutTimeTo} onChange={v => { set("workoutTimeTo", v); const from = form.workoutTimeFrom; set("workoutTime", from && v ? `${from} to ${v}` : ""); }} />
                  </div>
                </div>
                {form.workoutTime && form.workoutTime !== "No workout" && (
                  <span className="text-[11px] font-bold text-[#E8A820] mt-1.5 block">⏰ {formatTime12h(form.workoutTime)}</span>
                )}
                <Err msg={errors.workoutTime} />
              </div>
            </motion.div>
          )}
        </div>
      );

      /* Step 3 — Diet & schedule */
      case 3: return (
        <div className="space-y-5">
          <div>
            <Label>Food preference <span className="text-red-400">*</span></Label>
            <div className="flex flex-wrap gap-3">
              {["Vegetarian","Non-Vegetarian","Eggitarian","Vegan"].map(f=>(
                <PillOption key={f} label={f} active={form.foodPref===f} onClick={()=>set("foodPref",f)} />
              ))}
            </div>
            <Err msg={errors.foodPref} />
          </div>
        </div>
      );

      /* Step 4 — Health */
      case 4: return (
        <div className="space-y-5">
          {(["medicalConditions","allergies","supplements"] as const).map((key,i)=>(
            <div key={key}>
              <Label>
                {["Medical conditions","Allergies","Current supplements / medicines"][i]} <span className="text-xs font-normal text-white/40">(Optional)</span>
              </Label>
              <textarea rows={2}
                value={form[key]} onChange={e=>set(key,e.target.value)} 
                className={`${textareaBase} border-white/[0.12]`} 
              />
            </div>
          ))}
        </div>
      );
      /* Step 5 — Goals */
      case 5: return (
        <div className="space-y-5">
          <div>
            <Label>Select your goals <span className="text-red-400">*</span></Label>
            <div className="flex flex-wrap gap-3">
              {["Weight Loss","Fat Loss","Muscle Gain","Weight Gain","Maintenance","Other"].map(g=>(
                <button key={g} type="button" onClick={()=>toggleGoal(g)}
                  className={`px-4 py-2.5 rounded-xl text-[0.84rem] font-semibold border transition-all duration-200 ${
                    form.goals.includes(g)
                      ? "bg-[#E8A820] text-black border-[#E8A820] shadow-[0_2px_12px_rgba(232,168,32,0.30)]"
                      : "bg-white/[0.04] text-[#F2EFE9]/60 border-white/[0.10] hover:border-[#E8A820]/40 hover:text-[#F2EFE9]/90"
                  }`}
                >{g}</button>
              ))}
            </div>
            <Err msg={errors.goals} />
          </div>
          {form.goals.includes("Other") && (
            <div>
              <Label>Specify your goal <span className="text-red-400">*</span></Label>
              <input type="text" value={form.otherGoal} onChange={e=>set("otherGoal",e.target.value)} className={inp(errors.otherGoal)} />
              <Err msg={errors.otherGoal} />
            </div>
          )}
          <div>
            <Label>Additional remarks <span className="text-xs font-normal text-white/40">(Optional)</span></Label>
            <textarea rows={2}
              value={form.remarks} onChange={e=>set("remarks",e.target.value)} 
              className={`${textareaBase} border-white/[0.12]`} 
            />
          </div>
        </div>
      );

      /* Step 6 — Food history */
      case 6: return (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <p className="text-[#F2EFE9]/50 text-[0.9rem] leading-relaxed">
              Describe what you ate over the last 7 days.
            </p>
            <button
              type="button"
              onClick={addMeal}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 text-xs font-bold uppercase tracking-wider transition-all duration-200 shrink-0 self-start sm:self-auto font-sans"
            >
              + Add Meal
            </button>
          </div>
          {meals.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-white/[0.08] bg-white/[0.02] rounded-2xl py-12 px-4 text-center">
              <p className="text-[#F2EFE9]/40 text-sm">Click "+ Add Meal" to add meal entries to the diet plan.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {meals.map((m, idx) => (
                <div key={idx} className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] relative space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#E8A820]">Meal #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeMeal(idx)}
                      className="text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-wider"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Meal Name <span className="text-red-400">*</span></Label>
                      <input
                        type="text"
                        value={m.name}
                        onKeyDown={blockNonAlphabetKeys}
                        onChange={e => updateMeal(idx, "name", e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
                        className={inp()}
                      />
                    </div>
                    <div>
                      <Label>Meal Time <span className="text-red-400">*</span></Label>
                      <TimeInput value={m.time} onChange={v => updateMeal(idx, "time", v)} />
                      {m.time && <span className="text-[11px] font-bold text-[#E8A820] mt-1.5 block">⏰ {formatTime12h(m.time)}</span>}
                    </div>
                  </div>
                  <div>
                    <Label>Food &amp; Quantity <span className="text-red-400">*</span></Label>
                    <textarea
                      rows={2}
                      value={m.food}
                      onChange={e => updateMeal(idx, "food", e.target.value)}
                      className={textareaBase}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Err msg={errors.foodHistory} />
        </div>
      );
      /* Step 7 — Review & submit */
      case 7: {
        const rows: [string, string][] = [
          ["Name", form.name], ["Phone", `+91 ${form.phone}`], ["Email", form.email],
          ["Age", form.age], ...(form.gender ? [["Gender", form.gender] as [string,string]] : []),
          ["Weight", `${form.weight} kg`], ["Height", `${form.height} cm`],
          ...(bmiVal ? [["BMI", `${bmiVal.toFixed(1)} — ${bmiCat?.label}`] as [string,string]] : []),
          ...(bfVal ? [["Body Fat (Est.)", `${bfVal.toFixed(1)}% — ${bfCat?.label}`] as [string,string]] : []),
          ...(form.wakeTime ? [["Wake-up", formatTime12h(form.wakeTime)] as [string,string]] : []),
          ...(form.bedTime ? [["Bed time", formatTime12h(form.bedTime)] as [string,string]] : []),
          ...(form.sleepDuration ? [["Sleep", `${form.sleepDuration} hrs`] as [string,string]] : []),
          ...(form.duty ? [["Duty type", form.duty === "Shifted"
            ? `Shifted: ${shifts.filter(s => s.from && s.to).map(s => `${s.name} (${formatTime12h(s.from)}-${formatTime12h(s.to)})`).join(", ") || "Shifted"}`
            : form.duty] as [string,string]] : []),
          ...(form.restTime ? [["Rest time", formatTime12h(form.restTime)] as [string,string]] : []),
          ...(form.doesWorkout ? [["Workout", form.doesWorkout === "Yes" ? `${form.workoutType || "Yes"} (${formatTime12h(form.workoutTime)})` : "No"] as [string,string]] : []),
          ["Food preference", form.foodPref],
          ...(form.collegeTime ? [["College timing", formatTime12h(form.collegeTime)] as [string,string]] : []),
          ...(form.workTime ? [["Work timing", formatTime12h(form.workTime)] as [string,string]] : []),
          ...(form.medicalConditions ? [["Medical conditions", form.medicalConditions] as [string,string]] : []),
          ...(form.allergies ? [["Allergies", form.allergies] as [string,string]] : []),
          ...(form.supplements ? [["Supplements", form.supplements] as [string,string]] : []),
          ["Goals", [...form.goals, form.otherGoal ? `Other: ${form.otherGoal}` : ""].filter(Boolean).join(", ")],
          ...(form.remarks ? [["Remarks", form.remarks] as [string,string]] : []),
          ["Food history", form.foodHistory.substring(0,120) + (form.foodHistory.length > 120 ? "…" : "")],
        ];
        return (
          <div className="space-y-5">
          <p className="text-[#F2EFE9]/50 text-sm">Please review your information before submitting.</p>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06] overflow-hidden">
            {rows.map(([k,v])=>(
              <div key={k} className="flex gap-4 px-5 py-3">
                <span className="text-[#F2EFE9]/40 text-[0.8rem] font-semibold uppercase tracking-wide w-36 shrink-0">{k}</span>
                <span className="text-[#F2EFE9]/90 text-[0.87rem] leading-snug">{v}</span>
              </div>
            ))}
          </div>
          <label className={`flex items-start gap-3 p-4 border rounded-2xl cursor-pointer transition-all ${form.consent ? "border-[#E8A820]/50 bg-[#E8A820]/[0.06]" : "border-white/[0.10]"}`}>
            <input type="checkbox" checked={form.consent} onChange={e=>set("consent",e.target.checked)} className="accent-[#E8A820] mt-0.5 shrink-0 w-4 h-4" />
            <span className="text-[0.87rem] text-[#F2EFE9]/55 leading-relaxed">
              I confirm that the information provided is accurate and can be used to prepare my personalised nutrition plan.
            </span>
          </label>
            <Err msg={errors.consent} />

          {/* ΓöÇΓöÇ Dietitian Plan Payment Card ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
          <div className="rounded-2xl border border-green-500/30 bg-green-500/[0.06] p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-black text-white text-[1rem] mb-0.5">Personalised Dietitian Plan</p>
                <p className="text-[10px] font-bold tracking-widest uppercase text-green-400">Nutrition ┬╖ Wellness</p>
              </div>
              <div className="text-right">
                {dietNutrCouponDiscount > 0 ? (
                  <>
                    <p className="text-[0.85rem] text-white/30 line-through">₹800</p>
                    <p className="text-[1.6rem] font-black text-white leading-none">₹{Math.round(800 * (1 - dietNutrCouponDiscount / 100))}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[0.85rem] text-white/30 line-through">₹1,200</p>
                    <p className="text-[1.6rem] font-black text-white leading-none">₹800</p>
                  </>
                )}
                <p className="text-[11px] text-white/35 mt-0.5">one-time</p>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {["Custom meal & nutrition plan by expert dietitian", "Tailored to your health goals & food preference", "WhatsApp follow-up support"].map(f => (
                <li key={f} className="flex items-center gap-2 text-[12px] text-white/60">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => setShowDietNutrCoupon(v => !v)} className="text-[10px] text-green-400/70 hover:text-green-400 underline underline-offset-2 mb-2 cursor-pointer block transition-colors">
              {showDietNutrCoupon ? "Hide coupon" : "Have a coupon code?"}
            </button>
            {showDietNutrCoupon && (
              <div className="mb-2 flex gap-2">
                <input value={dietNutrCoupon} onChange={e => { setDietNutrCoupon(e.target.value.toUpperCase()); setDietNutrCouponMsg(null); }}
                  placeholder="Enter code"
                  className="flex-1 h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-green-400/50" />
                <button onClick={() => {
                  const result = validateCoupon(dietNutrCoupon, "Dietitian Plan");
                  if (result) { setDietNutrCouponDiscount(result.discount); setDietNutrCouponMsg({ text: `${result.discount}% OFF applied!`, valid: true }); }
                  else { setDietNutrCouponDiscount(0); setDietNutrCouponMsg({ text: "Invalid or expired coupon", valid: false }); }
                }} className="h-9 px-4 bg-green-500 hover:bg-green-400 text-black text-xs font-black rounded-xl cursor-pointer transition-colors">Apply</button>
              </div>
            )}
            {dietNutrCouponMsg && (
              <p className={`text-[10px] font-bold ${dietNutrCouponMsg.valid ? "text-green-400" : "text-red-400"}`}>{dietNutrCouponMsg.text}</p>
            )}
          </div>
          </div>
        );
      }

      default: return null;
    }
  };

  const StepIcon = STEPS[step].icon;

  return (
    <div className="min-h-screen bg-black text-[#F2EFE9] relative flex flex-col overflow-hidden">
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-80 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${chalkboardBg})`,
          maskImage: "linear-gradient(to bottom, transparent 0px, transparent 100px, black 160px), radial-gradient(ellipse 70% 60% at 50% 55%, transparent 40%, black 80%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, transparent 100px, black 160px), radial-gradient(ellipse 70% 60% at 50% 55%, transparent 40%, black 80%)",
          maskComposite: "intersect",
          WebkitMaskComposite: "destination-in",
        }}
      />
      <PlanNavbar />
      <main className="pt-24 pb-24 px-4 relative z-10">
        <div className="max-w-2xl mx-auto">

          {/* ΓöÇΓöÇ Header ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
          <div className="text-center mb-10">
            <div className="eyebrow justify-center mb-4">Personalised plan</div>
            <h1 className="font-display font-black text-[clamp(2rem,5vw,2.8rem)] leading-tight mb-3 text-white">
              Nutrition <span className="text-gold-gradient">assessment</span>
            </h1>
            <p className="text-[#F2EFE9]/45 text-[0.93rem] max-w-md mx-auto">
              Fill in your details and our certified dietician will prepare a personalised nutrition plan for you.
            </p>
          </div>

          {/* ΓöÇΓöÇ Step pills (scrollable on mobile) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            {STEPS.map((s,i)=>{
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => {
                    if (i === step) return;
                    setErrors({});
                    setDir(i > step ? 1 : -1);
                    setStep(i);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0 transition-all backdrop-blur-md ${
                    active ? "bg-[#E8A820] text-black hover:bg-[#d49518]" :
                    done   ? "bg-[#E8A820]/15 text-[#E8A820] hover:bg-[#E8A820]/25" :
                             "bg-white/[0.04] text-[#F2EFE9]/30 hover:text-[#F2EFE9]/60 hover:bg-white/[0.08]"
                  }`}
                >
                  <Icon size={12} />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* ΓöÇΓöÇ Card ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
          <div className="bg-[#18181a] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl shadow-black/80 relative z-10">
            {/* Card header */}
            <div className="flex items-center gap-3 px-7 py-5 border-b border-white/[0.06]">
              <div className="w-9 h-9 rounded-xl bg-[#E8A820] flex items-center justify-center shrink-0">
                <StepIcon size={17} className="text-black" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#F2EFE9]/35">Step {step + 1} of {STEPS.length}</p>
                <h2 className="font-display font-black text-[#F2EFE9] text-[1.1rem]">{STEPS[step].label}</h2>
              </div>
            </div>

            {/* Card body — animated */}
            <div className="px-7 py-7 overflow-hidden" onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                e.preventDefault();
                const inputs = Array.from(document.querySelectorAll('input, textarea'));
                const idx = inputs.indexOf(e.target);
                if (idx > -1 && idx < inputs.length - 1) {
                  (inputs[idx + 1] as HTMLElement).focus();
                }
              }
            }}>
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={step}
                  custom={dir}
                  variants={slide}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {stepContent()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Card footer — navigation */}
            <div className="px-7 py-5 border-t border-white/[0.06] flex items-center justify-between gap-4">
              {step > 0 ? (
                <button type="button" onClick={goPrev}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.10] text-[#F2EFE9]/70 hover:text-[#F2EFE9] hover:bg-white/[0.09] font-semibold text-[0.87rem] transition-all">
                  <ChevronLeft size={16} /> Previous
                </button>
              ) : <div />}

              {step < STEPS.length - 1 ? (
                <button type="button" onClick={goNext}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl bg-[#E8A820] hover:bg-[#d49518] text-black font-bold text-[0.9rem] transition-all hover:shadow-[0_4px_20px_rgba(232,168,32,0.35)] hover:-translate-y-0.5">
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button type="button" onClick={handleSubmit}
                  className="flex items-center gap-2.5 px-7 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-[0.9rem] transition-all hover:shadow-[0_4px_20px_rgba(34,197,94,0.40)] hover:-translate-y-0.5">
                  Pay {dietNutrCouponDiscount > 0 ? `₹${Math.round(800 * (1 - dietNutrCouponDiscount / 100))}` : "₹800"} &amp; Submit
                </button>
              )}
            </div>
          </div>

        </div>
      </main>
      <div className="relative z-10 bg-[#1C1C1E]">
        <Footer />
      </div>
    </div>
  );
}