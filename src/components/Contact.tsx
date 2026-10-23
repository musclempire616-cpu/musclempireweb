import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MapPin, Mail, CheckCircle2, Clock, User, Building2, FileText } from "lucide-react";
import { APPS_SCRIPT_URL } from "@/lib/sheets";

const OWNER_PHONE = "919137870108";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    age: "",
    goals: [] as string[],
    customGoal: "",
    message: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim() || form.firstName.trim().length < 2) {
      e.firstName = "First name must be at least 2 characters.";
    }
    if (!form.phone.trim() || !/^\+?[0-9]{10,13}$/.test(form.phone.replace(/\s/g, ""))) {
      e.phone = "Enter a valid phone number (10–13 digits).";
    }
    if (form.email.trim() && !/\S+@\S+\.\S+/.test(form.email.trim())) {
      e.email = "Enter a valid email address.";
    }
    if (!form.age.trim() || isNaN(Number(form.age.trim())) || Number(form.age.trim()) <= 0) {
      e.age = "Please enter a valid age.";
    }
    if (form.goals.includes("Others") && !form.customGoal.trim()) {
      e.customGoal = "Please specify your goal.";
    }
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    const today = new Date().toLocaleDateString("en-IN");
    
    const selectedGoalsList = form.goals.map(g => g === "Others" ? form.customGoal : g).filter(Boolean);
    const selectedGoals = selectedGoalsList.length > 0 ? selectedGoalsList.join(", ") : "N/A";
    const notesStr = `Email: ${form.email}\nMessage: ${form.message}`;
    
    fetch(`${APPS_SCRIPT_URL}?${new URLSearchParams({ 
      action: "enquiry", 
      date: today, 
      name: fullName, 
      phone: form.phone, 
      age: form.age, 
      goal: selectedGoals, 
      notes: notesStr 
    })}`, { redirect: "follow" }).catch(() => null);
    
    const msg = encodeURIComponent(`Hi! I'd like to get in touch with Muscle Empire.\n\n*Name:* ${fullName}\n*Phone:* ${form.phone}\n*Email:* ${form.email || "N/A"}\n*Age:* ${form.age}\n*Goal:* ${selectedGoals}\n*Message:* ${form.message}`);
    
    window.open(`https://wa.me/${OWNER_PHONE}?text=${msg}`, "_blank");
    
    setSubmitted(true);
    
    const id = window.setTimeout(() => {
      handleReset();
    }, 5000);
    setTimeoutId(id);
  };

  const handleReset = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setSubmitted(false);
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      age: "",
      goals: [],
      customGoal: "",
      message: ""
    });
    setErrors({});
  };

  const getInputClass = (fieldName: keyof typeof form, value: string) => {
    const base = "w-full h-12 pl-10 pr-4 bg-[#1C1C1E] border border-white/[0.12] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#E8A820] focus:ring-1 focus:ring-[#E8A820]/50 transition-all text-sm";
    if (errors[fieldName]) {
      return `${base} border-red-500 focus:border-red-500 focus:ring-red-500`;
    }
    if (value && !errors[fieldName]) {
      return `${base} border-green-500/30 focus:border-green-500 focus:ring-green-500/10`;
    }
    return base;
  };

  return (
    <section id="contact" className="py-24 relative overflow-hidden bg-[#1C1C1E] flex items-center justify-center min-h-screen">
      {/* Blurred gradient background shapes */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#E8A820]/[0.04] blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-pink-500/[0.03] blur-[130px]" />
        <div className="absolute top-[30%] right-[20%] w-[40vw] h-[40vw] rounded-full bg-purple-500/[0.02] blur-[130px]" />
      </div>

      <div className="max-w-6xl mx-auto px-5 w-full relative z-10">
        <div className="bg-[#232325] text-white rounded-[32px] border border-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-8 md:p-12 lg:p-14 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Contact info & Map */}
          <div className="flex flex-col gap-6 w-full">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Contact information
            </h2>
            <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
              We help you find direction, build strength, and keep your body moving forward—strategically and confidently.
            </p>

            <div className="mt-4 flex flex-col gap-5">
              {/* Phone */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-[#E8A820] shrink-0 border border-white/[0.06]">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-0.5">Phone</p>
                  <a href="tel:+919773053632" className="text-white font-semibold text-sm hover:text-[#E8A820] transition-colors">
                    +91 97730 53632
                  </a>
                  <a href="tel:+919702268603" className="text-white font-semibold text-sm hover:text-[#E8A820] transition-colors block mt-0.5">
                    +91 97022 68603
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-[#E8A820] shrink-0 border border-white/[0.06]">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-0.5">Email</p>
                  <a href="mailto:musclempire616@gmail.com" className="text-white font-semibold text-sm hover:text-[#E8A820] transition-colors">
                    musclempire616@gmail.com
                  </a>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-[#E8A820] shrink-0 border border-white/[0.06] mt-0.5">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Operating Hours</p>
                  <p className="text-white font-semibold text-sm leading-relaxed">
                    Unisex: Mon–Sat 6 AM – 11 PM
                  </p>
                  <p className="text-white font-semibold text-sm leading-relaxed">
                    Female: Mon–Sat 6–12 PM & 4–10 PM
                  </p>
                </div>
              </div>

              {/* Unisex Gym */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-[#E8A820] shrink-0 border border-white/[0.06] mt-0.5">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Unisex Gym</p>
                  <span className="text-white font-semibold text-sm leading-relaxed">
                    J/16, Jay Hanuman Mandir, Barvenagar Colony, Bhatwadi, Ghatkopar (West), Mumbai – 400084
                  </span>
                </div>
              </div>

              {/* Female Gym */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-[#E8A820] shrink-0 border border-white/[0.06] mt-0.5">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Female Gym</p>
                  <span className="text-white font-semibold text-sm leading-relaxed">
                    1st Floor, Ranveer Apartment, Sanjay Kokate Lane, Bhatwadi, Ghatkopar (West), Mumbai – 400084
                  </span>
                </div>
              </div>
            </div>

            {/* Map Embed */}
            <iframe
              src="https://maps.google.com/maps?q=Muscle%20Empire%20Gym%20Bhatwadi%20Barve%20Nagar%20Ghatkopar%20West%20Mumbai&t=&z=16&ie=UTF8&iwloc=&output=embed"
              className="w-full h-[220px] rounded-2xl border border-white/[0.08] shadow-sm mt-6 invert-[0.9] hue-rotate-[180deg]"
              allowFullScreen
              loading="lazy"
              title="Muscle Empire Gymnasium Map"
            />
          </div>

          {/* Right Column: Form */}
          <div className="bg-[#232325] w-full">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center text-center py-8"
                >
                  <div className="w-20 h-20 rounded-full bg-green-500/[0.08] border border-green-500/20 flex items-center justify-center mb-6 shadow-[0_8px_24px_rgba(37,211,102,0.1)]">
                    <CheckCircle2 size={40} className="text-[#25D366] animate-bounce" />
                  </div>
                  
                  <h4 className="font-sans font-black text-white text-2xl mb-3">WhatsApp Connection Opened!</h4>
                  <p className="text-neutral-400 text-sm leading-relaxed max-w-sm mb-8">
                    Thanks <strong className="text-white">{form.firstName}</strong>! Your message is ready to send in WhatsApp. If it didn't open automatically, please check your browser's pop-up blocker.
                  </p>
                  
                  {/* Countdown progress bar */}
                  <div className="w-full max-w-[280px] bg-white/[0.05] h-1.5 rounded-full overflow-hidden mb-8 relative">
                    <motion.div 
                      key={submitted ? "active-progress" : "inactive-progress"}
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: 5, ease: "linear" }}
                      className="h-full bg-[#E8A820]"
                    />
                  </div>

                  <button 
                    onClick={handleReset}
                    className="px-6 py-3 bg-[#E8A820] hover:bg-[#d49518] text-[#1C1C1E] text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 hover:shadow-lg cursor-pointer"
                  >
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">
                      Send Us a Message
                    </h2>
                    <p className="text-neutral-400 text-sm mt-2">
                      Fill up the form and our team will get back to you within 24 hours.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                    {/* First name & Last name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-neutral-400 font-semibold text-xs uppercase tracking-wider mb-1.5">First name</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                            <User size={16} />
                          </div>
                          <input
                            type="text"
                            placeholder="Enter first name"
                            value={form.firstName}
                            onChange={e => setForm({...form, firstName: e.target.value})}
                            className={getInputClass("firstName", form.firstName)}
                          />
                        </div>
                        {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                      </div>

                      <div className="relative">
                        <label className="block text-neutral-400 font-semibold text-xs uppercase tracking-wider mb-1.5">Last name</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                            <User size={16} />
                          </div>
                          <input
                            type="text"
                            placeholder="Enter last name"
                            value={form.lastName}
                            onChange={e => setForm({...form, lastName: e.target.value})}
                            className={getInputClass("lastName", form.lastName)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-neutral-400 font-semibold text-xs uppercase tracking-wider mb-1.5">Email</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                            <Mail size={16} />
                          </div>
                          <input
                            type="email"
                            placeholder="Enter email"
                            value={form.email}
                            onChange={e => setForm({...form, email: e.target.value})}
                            className={getInputClass("email", form.email)}
                          />
                        </div>
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                      </div>

                      <div className="relative">
                        <label className="block text-neutral-400 font-semibold text-xs uppercase tracking-wider mb-1.5">Phone</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                            <Phone size={16} />
                          </div>
                          <input
                            type="tel"
                            placeholder="Enter phone"
                            value={form.phone}
                            onChange={e => setForm({...form, phone: e.target.value})}
                            className={getInputClass("phone", form.phone)}
                          />
                        </div>
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                      </div>
                    </div>

                    {/* Age */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-neutral-400 font-semibold text-xs uppercase tracking-wider mb-1.5">Age</label>
                        <div className="relative flex items-center">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                            <User size={16} />
                          </div>
                          <input
                            type="text"
                            placeholder="Enter age"
                            value={form.age}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === "" || /^[0-9]*$/.test(val)) {
                                setForm({...form, age: val});
                              }
                            }}
                            className={`${getInputClass("age", form.age)} pr-20`}
                          />
                          <div className="absolute right-1 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const currentAge = parseInt(form.age) || 0;
                                if (currentAge > 0) {
                                  setForm({ ...form, age: (currentAge - 1).toString() });
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer select-none"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const currentAge = parseInt(form.age) || 0;
                                setForm({ ...form, age: (currentAge + 1).toString() });
                              }}
                              className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer select-none"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
                      </div>
                    </div>

                    {/* My Goal */}
                    <div className="relative">
                      <label className="block text-neutral-400 font-semibold text-xs uppercase tracking-wider mb-2">My Goal</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          "Full Body Workout",
                          "Weight Gain",
                          "Weight Loss",
                          "Muscle Gain",
                          "Cardio",
                          "Others"
                        ].map((g) => {
                          const isSelected = form.goals.includes(g);
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => {
                                const newGoals = form.goals.includes(g)
                                  ? form.goals.filter((x) => x !== g)
                                  : [...form.goals, g];
                                setForm({ ...form, goals: newGoals });
                              }}
                              className={`relative flex items-center gap-3 px-5 py-3.5 rounded-full border text-left transition-all duration-200 ${
                                isSelected
                                  ? "border-[#E8A820] bg-[#E8A820]/[0.06] text-white"
                                  : "border-white/[0.08] bg-[#1C1C1E] text-neutral-400 hover:bg-white/[0.02]"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                                  isSelected ? "border-[#E8A820]" : "border-neutral-600"
                                }`}
                              >
                                {isSelected && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#E8A820]" />
                                )}
                              </div>
                              <span className="text-sm font-semibold tracking-wide">{g}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Specify Goal (conditionally rendered) */}
                    <AnimatePresence>
                      {form.goals.includes("Others") && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="relative overflow-hidden"
                        >
                          <label className="block text-neutral-400 font-semibold text-xs uppercase tracking-wider mb-1.5">Specify Goal</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                              <FileText size={16} />
                            </div>
                            <input
                              type="text"
                              placeholder="Describe your goal"
                              value={form.customGoal}
                              onChange={e => setForm({...form, customGoal: e.target.value})}
                              className={getInputClass("customGoal", form.customGoal)}
                            />
                          </div>
                          {errors.customGoal && <p className="text-red-500 text-xs mt-1">{errors.customGoal}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Message */}
                    <div className="relative">
                      <label className="block text-neutral-400 font-semibold text-xs uppercase tracking-wider mb-1.5">Message</label>
                      <textarea
                        placeholder="Type here..."
                        rows={4}
                        value={form.message}
                        onChange={e => setForm({...form, message: e.target.value})}
                        className="w-full p-4 bg-[#1C1C1E] border border-white/[0.12] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-[#E8A820] focus:ring-1 focus:ring-[#E8A820]/50 transition-all text-sm resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="self-start px-8 h-12 bg-[#E8A820] hover:bg-[#d49518] text-[#1C1C1E] font-black uppercase tracking-wider text-xs rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
                    >
                      Send Message
                    </button>
                  </form>
                </div>
              )}
            </AnimatePresence>
          </div>
          
        </div>
      </div>
    </section>
  );
}
