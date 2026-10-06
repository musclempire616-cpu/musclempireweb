import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { Phone, X, CheckCircle2 } from "lucide-react";

const OWNER_PHONE = "919773053632";
const CALL_URL = "tel:+919773053632";
const CALL_URL_2 = "tel:+919702268603";

const goals = [
  { value: "full_body",   label: "Full body workout" },
  { value: "weight_gain", label: "Weight gain" },
  { value: "weight_loss", label: "Weight loss" },
  { value: "muscle_gain", label: "Muscle gain" },
  { value: "cardio",      label: "Cardio" },
];

type F = { name: string; age: string; requirement: string; phone: string };

function WhatsAppForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<F>({ name: "", age: "", requirement: "", phone: "" });
  const [errors, setErrors] = useState<Partial<F>>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const e: Partial<F> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "At least 2 characters.";
    if (!form.age || isNaN(+form.age) || +form.age < 10 || +form.age > 90) e.age = "Age between 10–90.";
    if (!form.requirement) e.requirement = "Please select a goal.";
    if (!form.phone.trim() || !/^\+?[0-9]{10,13}$/.test(form.phone.replace(/\s/g, ""))) e.phone = "Valid phone number required.";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    const label = goals.find(g => g.value === form.requirement)?.label || form.requirement;
    const msg = encodeURIComponent(`Hi! I'd like to join Muscle Empire.\n\n*Name:* ${form.name}\n*Age:* ${form.age}\n*Goal:* ${label}\n*Phone:* ${form.phone}`);
    window.open(`https://wa.me/${OWNER_PHONE}?text=${msg}`, "_blank");
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setForm({ name:"", age:"", requirement:"", phone:"" }); onClose(); }, 3500);
  };

  const inp = "w-full bg-[#252528] border border-white/[0.10] focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]/25 outline-none rounded-xl h-11 px-3.5 text-white placeholder:text-white/25 text-[0.87rem] transition-all";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4"
    >
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} />

      <motion.div
        className="relative w-full max-w-md bg-[#252528] border border-white/[0.09] rounded-[22px] shadow-[0_40px_80px_rgba(0,0,0,0.7)] z-10 overflow-hidden"
        initial={{ y: 48, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 48, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#25D366]">
          <div className="flex items-center gap-2">
            <FaWhatsapp size={20} className="text-white" />
            <span className="text-white font-bold text-[0.9rem] tracking-wide">WhatsApp us</span>
          </div>
          <button onClick={onClose} aria-label="Close form" className="text-white/70 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F7F6F3]/10">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6">
          {submitted ? (
            <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} className="flex flex-col items-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#25D366]/15 flex items-center justify-center mb-4">
                <CheckCircle2 size={34} className="text-[#25D366]" />
              </div>
              <h5 className="text-white font-black text-lg mb-1">WhatsApp opened!</h5>
              <p className="text-white/50 text-sm">Your details are pre-filled. Just hit send!</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <p className="text-white/40 text-[11px] uppercase tracking-widest mb-2">Fill in your details and we'll open WhatsApp.</p>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/45 mb-1.5">Full name</label>
                <input type="text" placeholder="John Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inp} />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/45 mb-1.5">Age</label>
                <input type="number" placeholder="25" min={10} max={90} value={form.age} onChange={e => setForm({...form, age: e.target.value})} className={inp} />
                {errors.age && <p className="text-red-400 text-xs mt-1">{errors.age}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/45 mb-2">My goal</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {goals.map(g => (
                    <label key={g.value} className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl cursor-pointer text-[0.8rem] font-medium capitalize transition-all ${form.requirement === g.value ? "border-[#25D366] bg-[#25D366]/10 text-white" : "border-white/[0.08] text-white/45 hover:border-white/20"}`}>
                      <input type="radio" name="req-popup" value={g.value} checked={form.requirement === g.value} onChange={e => setForm({...form, requirement: e.target.value})} className="accent-[#25D366] w-3 h-3 shrink-0" />
                      {g.label}
                    </label>
                  ))}
                </div>
                {errors.requirement && <p className="text-red-400 text-xs mt-1">{errors.requirement}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/45 mb-1.5">Phone number</label>
                <input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inp} />
                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
              </div>

              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1db954] text-white font-bold text-[13px] h-12 rounded-xl transition-all hover:shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:-translate-y-0.5">
                <FaWhatsapp size={17} />
                Send via WhatsApp
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function FloatingContact() {
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <>
      <div className="fixed right-5 bottom-20 z-[999] flex flex-col gap-3 items-end">
        {/* WhatsApp */}
        <motion.button
          onClick={() => setPopupOpen(true)}
          aria-label="Chat on WhatsApp"
          className="group flex items-center gap-3"
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="hidden sm:block bg-[#252528]/90 backdrop-blur border border-white/[0.09] text-white/80 text-[11px] font-semibold px-3 py-2 rounded-xl opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap shadow-lg">
            WhatsApp us
          </span>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.93 }}
            className="relative overflow-hidden flex items-center justify-center text-white rounded-2xl"
            style={{
              width: 40,
              height: 40,
              background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.12) 100%)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.28)",
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.08)",
            }}
          >
            {/* Top specular highlight */}
            <div
              className="absolute top-0 left-[15%] right-[15%] h-[38%] rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.0) 70%)",
                filter: "blur(1px)",
              }}
            />
            {/* Bottom depth shadow */}
            <div
              className="absolute bottom-0 inset-x-0 h-1/2 rounded-b-2xl pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.12) 0%, transparent 100%)" }}
            />
            <FaWhatsapp size={18} className="relative z-10" />
          </motion.div>
        </motion.button>

        {/* Call — shows number chooser */}
        <motion.div
          className="group flex items-center gap-3 relative"
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.58, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Number chooser on hover */}
          <div className="hidden sm:flex flex-col gap-1 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
            <a href={CALL_URL} className="bg-[#252528]/90 backdrop-blur border border-white/[0.09] text-white/80 text-[11px] font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg hover:text-white hover:border-white/30 transition-colors">
              +91 97730 53632
            </a>
            <a href={CALL_URL_2} className="bg-[#252528]/90 backdrop-blur border border-white/[0.09] text-white/80 text-[11px] font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg hover:text-white hover:border-white/30 transition-colors">
              +91 97022 68603
            </a>
          </div>
          <a href={CALL_URL} aria-label="Call us">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.93 }}
              className="relative overflow-hidden flex items-center justify-center text-white rounded-2xl"
              style={{
                width: 40, height: 40,
                background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.12) 100%)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.28)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.08)",
              }}
            >
              <div className="absolute top-0 left-[15%] right-[15%] h-[38%] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.0) 70%)", filter: "blur(1px)" }} />
              <div className="absolute bottom-0 inset-x-0 h-1/2 rounded-b-2xl pointer-events-none"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.12) 0%, transparent 100%)" }} />
              <Phone size={17} strokeWidth={2.5} className="relative z-10" />
            </motion.div>
          </a>
        </motion.div>
      </div>

      <AnimatePresence>
        {popupOpen && <WhatsAppForm onClose={() => setPopupOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
