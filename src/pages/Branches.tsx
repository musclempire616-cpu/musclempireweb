import { useState, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Phone,
  Clock,
  Sparkles,
  Dumbbell,
  Users,
  CheckCircle2,
  Navigation,
  ShieldCheck,
  Zap,
  Building2,
  Flame,
  ChevronRight,
  Star,
  Award,
  ArrowUpRight,
  MessageSquare,
  Compass,
  HeartHandshake
} from "lucide-react";
import PlanNavbar from "@/components/PlanNavbar";
import Footer from "@/components/Footer";
import { APPS_SCRIPT_URL } from "@/lib/sheets";

const OWNER_PHONE = "919137870108";

type BranchType = "all" | "unisex" | "female";

interface BranchInfo {
  id: string;
  type: "unisex" | "female";
  badge: string;
  badgeBg: string;
  badgeTextColor: string;
  title: string;
  tagline: string;
  city: string;
  address: string;
  phone: string;
  hours: string[];
  peakHours: string;
  size: string;
  mapEmbedUrl: string;
  mapDirectUrl: string;
  equipment: string[];
  amenities: string[];
  programs: string[];
  whatsappMessage: string;
  imageOverlayGrad: string;
}

const branchesData: BranchInfo[] = [
  {
    id: "unisex-branch",
    type: "unisex",
    badge: "Unisex Powerhouse",
    badgeBg: "bg-[#E8A820]/15 border-[#E8A820]/40",
    badgeTextColor: "text-[#E8A820]",
    title: "Muscle Empire – Unisex Gym",
    tagline: "High-Performance Strength, Hypertrophy & Athletic Conditioning Hub",
    city: "Ghatkopar West, Mumbai",
    address: "J/16, Jay Hanuman Mandir, Barvenagar Colony, Bhatwadi, Ghatkopar (West), Mumbai – 400084",
    phone: "+91 97730 53632",
    hours: [
      "Monday – Saturday: 6:00 AM – 11:00 PM",
      "Sunday: Closed (Maintenance & Recovery)"
    ],
    peakHours: "7:00 AM – 10:00 AM & 6:00 PM – 9:30 PM",
    size: "2,000+ Sq. Ft. Floor Space",
    mapEmbedUrl: "https://maps.google.com/maps?q=Muscle%20Empire%20Gym%20Bhatwadi%20Barve%20Nagar%20Ghatkopar%20West%20Mumbai&t=&z=16&ie=UTF8&iwloc=&output=embed",
    mapDirectUrl: "https://maps.google.com/?q=Muscle+Empire+Gym+Bhatwadi+Barve+Nagar+Ghatkopar+West+Mumbai",
    equipment: [
      "Olympic Power Racks",
      "Dumbbells Racks from 2.5kg to 60kg",
      "Cable Crossover Machines",
      "Spin Bikes & Cardio Zone",
      "Weight Lifting Zone",
      "CrossFit Zone",
      "Multiple Benches"
    ],
    amenities: [
      "Heavy Duty Power Racks",
      "Secure Lockers",
      "Changing Rooms",
      "Fully Air Conditioned Gym Area",
      "1-on-1 Expert Personal Training"
    ],
    programs: [
      "Hypertrophy & Bodybuilding",
      "Powerlifting & Strength Development",
      "Fat Loss & Metabolic Conditioning",
      "Custom Macro & Nutrition Guidance"
    ],
    whatsappMessage: "Hi Muscle Empire! I want to book a Free Trial Class at your Unisex Gym Branch in Bhatwadi.",
    imageOverlayGrad: "from-[#E8A820]/20 via-[#1C1C1E] to-[#1C1C1E]"
  },
  {
    id: "female-branch",
    type: "female",
    badge: "Female Exclusive Wing",
    badgeBg: "bg-pink-500/15 border-pink-500/40",
    badgeTextColor: "text-pink-400",
    title: "Muscle Empire – Female Gym",
    tagline: "100% Private, Empowering & Secure Fitness Sanctuary Dedicated to Women",
    city: "Ghatkopar West, Mumbai",
    address: "1st Floor, Ranveer Apartment, Sanjay Kokate Lane, Bhatwadi, Ghatkopar (West), Mumbai – 400084",
    phone: "+91 97730 53632",
    hours: [
      "Morning Batch: 6:00 AM – 12:00 PM",
      "Evening Batch: 4:00 PM – 10:00 PM",
      "Sunday: Closed"
    ],
    peakHours: "7:30 AM – 10:30 AM & 5:30 PM – 8:30 PM",
    size: "1,000+ Sq. Ft. Private Floor Space",
    mapEmbedUrl: "https://maps.google.com/maps?q=Ranveer%20Apartment%20Sanjay%20Kokate%20Lane%20Bhatwadi%20Ghatkopar%20West%20Mumbai&t=&z=16&ie=UTF8&iwloc=&output=embed",
    mapDirectUrl: "https://maps.google.com/?q=Ranveer+Apartment+Sanjay+Kokate+Lane+Bhatwadi+Ghatkopar+West+Mumbai",
    equipment: [
      "Women-only environment",
      "Personal coaching",
      "Weight management",
      "Strength training"
    ],
    amenities: [
      "100% Expert Coaches & Support Staff",
      "Changing Rooms",
      "Expert Nutrition Consultations"
    ],
    programs: [
      "Zumba & Cardio Dance Workouts",
      "Post-Natal & Core Rehabilitation",
      "Body Toning & Weight Loss Programs",
      "PCOS / PCOD Fitness Management"
    ],
    whatsappMessage: "Hi Muscle Empire! I want to book a Free Trial at your Female Exclusive Gym Branch in Bhatwadi.",
    imageOverlayGrad: "from-pink-500/20 via-[#1C1C1E] to-[#1C1C1E]"
  }
];

export default function Branches() {
  const [activeTab, setActiveTab] = useState<BranchType>("all");
  const [selectedBranchForForm, setSelectedBranchForForm] = useState<string>("unisex");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    age: "",
    branch: "Unisex Gym Branch (Bhatwadi)",
    notes: ""
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const filteredBranches = branchesData.filter(b => {
    if (activeTab === "all") return true;
    return b.type === activeTab;
  });

  const handleQuickEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = "Please enter your name.";
    }
    if (!formData.phone.trim() || !/^\+?[0-9]{10,13}$/.test(formData.phone.replace(/\s/g, ""))) {
      errors.phone = "Enter a valid phone number (10-13 digits).";
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const today = new Date().toLocaleDateString("en-IN");
    fetch(`${APPS_SCRIPT_URL}?${new URLSearchParams({
      action: "enquiry",
      date: today,
      name: formData.name,
      phone: formData.phone,
      age: formData.age || "N/A",
      goal: `Branch Inquiry: ${formData.branch}`,
      notes: formData.notes || "Branch page quick inquiry"
    })}`, { redirect: "follow" }).catch(() => null);

    const msg = encodeURIComponent(
      `Hi Muscle Empire! I am interested in visiting your *${formData.branch}*.\n\n*Name:* ${formData.name}\n*Phone:* ${formData.phone}\n*Age:* ${formData.age || "N/A"}\n*Notes:* ${formData.notes || "Trial Request"}`
    );
    window.open(`https://wa.me/${OWNER_PHONE}?text=${msg}`, "_blank");
    setFormSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#141416] text-white selection:bg-[#E8A820] selection:text-black font-sans">
      <PlanNavbar />

      <main className="pt-24 pb-20 relative overflow-hidden">
        {/* Subtle decorative background glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#E8A820]/[0.03] blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-40 right-10 w-[500px] h-[500px] bg-pink-500/[0.02] blur-[140px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          {/* Page Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#E8A820] text-xs font-black uppercase tracking-widest mb-4"
            >
              <Compass size={14} className="text-[#E8A820]" />
              <span>Our Locations & Centers</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight uppercase leading-tight mb-5"
            >
              Explore Muscle Empire{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8A820] via-yellow-400 to-[#E8A820]">
                Branches
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-neutral-400 text-base sm:text-lg leading-relaxed"
            >
              Whether you are looking for heavy powerlifting gear or a private women-only fitness suite, find your nearest Muscle Empire branch.
            </motion.p>
          </div>

          {/* High Level Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 rounded-3xl bg-[#1C1C1E] border border-white/[0.08] shadow-2xl mb-14"
          >
            {[
              { label: "Active Centers", value: "2 Centers", sub: "Ghatkopar West", icon: Building2 },
              { label: "Expert Trainers", value: "8+ Coaches", sub: "Male & Female Staff", icon: Award },
              { label: "Happy Athletes", value: "5,000+ Members", sub: "Strong Community", icon: Users },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-neutral-400">{stat.label}</span>
                  <stat.icon size={18} className="text-[#E8A820]" />
                </div>
                <span className="text-xl sm:text-2xl font-black text-white">{stat.value}</span>
                <span className="text-[11px] text-neutral-400 mt-1">{stat.sub}</span>
              </div>
            ))}
          </motion.div>

          {/* Filter Tabs */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex p-1.5 rounded-2xl bg-[#1C1C1E] border border-white/[0.08] gap-1 sm:gap-2 flex-wrap justify-center">
              {[
                { id: "all", label: "All Centers" },
                { id: "unisex", label: "Unisex Gym" },
                { id: "female", label: "Female Exclusive" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as BranchType)}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-[#E8A820] text-black shadow-lg"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Branch Cards List */}
          <div className="space-y-16 mb-20">
            <AnimatePresence mode="wait">
              {filteredBranches.map(branch => (
                <motion.div
                  key={branch.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-[32px] bg-[#1C1C1E] border border-white/[0.08] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] grid grid-cols-1 lg:grid-cols-12 gap-0"
                >
                  {/* Left Content Column (7 cols) */}
                  <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center gap-3 flex-wrap mb-4">
                        <span className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${branch.badgeBg} ${branch.badgeTextColor}`}>
                          {branch.badge}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.06]">
                          <MapPin size={13} className="text-[#E8A820]" />
                          {branch.city}
                        </span>
                      </div>

                      {/* Title & Tagline */}
                      <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2">
                        {branch.title}
                      </h2>
                      <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                        {branch.tagline}
                      </p>

                      {/* Info Grid (Address, Hours, Phone) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-black/40 border border-white/[0.06] mb-6 text-xs sm:text-sm">
                        {/* Address */}
                        <div className="sm:col-span-2 flex items-start gap-3">
                          <MapPin size={18} className="text-[#E8A820] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">Location Address</span>
                            <p className="text-white font-medium leading-relaxed">{branch.address}</p>
                          </div>
                        </div>

                        {/* Hours */}
                        <div className="flex items-start gap-3">
                          <Clock size={18} className="text-[#E8A820] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">Operating Timings</span>
                            {branch.hours.map((h, idx) => (
                              <p key={idx} className="text-white font-medium">{h}</p>
                            ))}
                          </div>
                        </div>

                        {/* Phone */}
                        <div className="flex items-start gap-3">
                          <Phone size={18} className="text-[#E8A820] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-0.5">Direct Line</span>
                            <a href={`tel:${branch.phone.replace(/\s/g, "")}`} className="text-white font-bold hover:text-[#E8A820] transition-colors block">
                              {branch.phone}
                            </a>
                            <a href="tel:+919702268603" className="text-white font-bold hover:text-[#E8A820] transition-colors block">
                              +91 97022 68603
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Amenities Checklist */}
                      <div className="mb-6">
                        <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
                          <Sparkles size={14} className="text-[#E8A820]" />
                          Key Amenities & Highlights
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {branch.amenities.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2.5 text-xs text-neutral-300">
                              <CheckCircle2 size={15} className="text-[#E8A820] shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Equipment Highlights */}
                      <div className="mb-6">
                        <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
                          <Dumbbell size={14} className="text-[#E8A820]" />
                          Equipment & Facilities
                        </h4>
                        <ul className="space-y-1.5">
                          {branch.equipment.map((eq, idx) => (
                            <li key={idx} className="text-xs text-neutral-300 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E8A820]/70 shrink-0" />
                              <span>{eq}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-3">
                      <a
                        href={`https://wa.me/${OWNER_PHONE}?text=${encodeURIComponent(branch.whatsappMessage)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[200px] h-12 bg-[#E8A820] hover:bg-[#d49518] text-black font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg cursor-pointer"
                      >
                        <MessageSquare size={16} />
                        <span>Book Trial at this Branch</span>
                      </a>

                      <a
                        href={branch.mapDirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 h-12 bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 border border-white/[0.1] transition-all cursor-pointer"
                      >
                        <Navigation size={15} className="text-[#E8A820]" />
                        <span>Get Directions</span>
                        <ArrowUpRight size={14} className="text-neutral-400" />
                      </a>
                    </div>
                  </div>

                  {/* Right Map Column (5 cols) */}
                  <div className="lg:col-span-5 relative min-h-[320px] lg:min-h-full bg-black/60 border-t lg:border-t-0 lg:border-l border-white/[0.08] flex flex-col">
                    <iframe
                      src={branch.mapEmbedUrl}
                      className="w-full h-full min-h-[340px] border-0 invert-[0.9] hue-rotate-[180deg] opacity-90 hover:opacity-100 transition-opacity"
                      allowFullScreen
                      loading="lazy"
                      title={`${branch.title} Map`}
                    />
                    <div className="p-4 bg-[#141416]/95 border-t border-white/[0.08] flex items-center justify-between text-xs text-neutral-400">
                      <span className="flex items-center gap-1.5">
                        <Flame size={14} className="text-[#E8A820]" />
                        Floor Area: <strong className="text-white">{branch.size}</strong>
                      </span>
                      <span className="text-[11px] text-neutral-400">Ghatkopar West</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Interactive Branch Comparison Matrix */}
          {/* Quick Branch Visit Booking Form */}
          <div className="max-w-3xl mx-auto rounded-[32px] bg-[#1C1C1E] border border-white/[0.08] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="text-center mb-8">
              <span className="text-[#E8A820] text-xs font-black uppercase tracking-widest block mb-2">Instant Booking</span>
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">Schedule Your Branch Visit</h3>
              <p className="text-neutral-400 text-xs sm:text-sm mt-2">
                Select your preferred branch location and our team will get in touch to arrange your complimentary day pass.
              </p>
            </div>

            {formSubmitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-xl font-black text-white mb-2">Visit Scheduled!</h4>
                <p className="text-neutral-400 text-sm max-w-md mx-auto mb-6">
                  Thank you, <strong>{formData.name}</strong>. WhatsApp has been launched with your branch pass request details.
                </p>
                <button
                  onClick={() => setFormSubmitted(false)}
                  className="px-6 py-2.5 bg-[#E8A820] text-black font-bold uppercase text-xs rounded-xl"
                >
                  Book for another person
                </button>
              </div>
            ) : (
              <form onSubmit={handleQuickEnquiry} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 font-bold text-xs uppercase mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-11 px-4 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#E8A820]"
                    />
                    {formErrors.name && <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-neutral-400 font-bold text-xs uppercase mb-1.5">Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="10-digit phone number"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full h-11 px-4 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#E8A820]"
                    />
                    {formErrors.phone && <p className="text-red-400 text-xs mt-1">{formErrors.phone}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 font-bold text-xs uppercase mb-1.5">Preferred Branch Location</label>
                    <select
                      value={formData.branch}
                      onChange={e => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full h-11 px-4 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#E8A820]"
                    >
                      <option value="Unisex Gym Branch (Bhatwadi)">Unisex Gym Branch – Bhatwadi, Ghatkopar W</option>
                      <option value="Female Exclusive Branch (Ranveer Apt)">Female Gym Branch – Ranveer Apt, Ghatkopar W</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-400 font-bold text-xs uppercase mb-1.5">Your Age</label>
                    <input
                      type="text"
                      placeholder="e.g. 24"
                      value={formData.age}
                      onChange={e => setFormData({ ...formData, age: e.target.value })}
                      className="w-full h-11 px-4 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#E8A820]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-400 font-bold text-xs uppercase mb-1.5">Any Specific Goal or Request?</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us what you're looking for (e.g. Personal Training, Fat Loss, Powerlifting)..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#E8A820] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-12 bg-[#E8A820] hover:bg-[#d49518] text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <HeartHandshake size={18} />
                  <span>Confirm Free Branch Pass</span>
                </button>
              </form>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
