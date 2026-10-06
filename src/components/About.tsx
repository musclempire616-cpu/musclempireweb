import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import aboutImg from "@/assets/images/about-img.webp";

/* ────────────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────────────── */

interface Medal {
  name: string;
  level: string;
  result: string;
  tier: "gold" | "silver" | "bronze";
}

interface Entry {
  year: string;
  tag: string;
  tagColor: string;
  narrative: string;
  medals: Medal[];
}

const entries: Entry[] = [
  {
    year: "Today",
    tag: "Coaching era",
    tagColor: "#8c8c8c",
    narrative: "Competition closed. Every athlete trained here inherits the standard those 21 medals set.",
    medals: [],
  },
  {
    year: "2017",
    tag: "Senior debut",
    tagColor: "#ff5a1f",
    narrative: "Moved up to Seniors. Clean sweep on the first attempt.",
    medals: [
      { name: "Mumbai Shree",      level: "City",   result: "Overall Champion", tier: "gold" },
      { name: "Maharashtra Shree", level: "State",  result: "Gold",             tier: "gold" },
      { name: "Bharat Shree",      level: "Nation", result: "Gold",             tier: "gold" },
    ],
  },
  {
    year: "AIU",
    tag: "All India University",
    tagColor: "#c08056",
    narrative: "Represented Mumbai at nationals, returned with a podium.",
    medals: [
      { name: "2013–14", level: "National Camp", result: "Represented", tier: "gold"   },
      { name: "2015–16", level: "AIU",           result: "Bronze",      tier: "bronze" },
    ],
  },
  {
    year: "University",
    tag: "Mumbai University",
    tagColor: "#8c8c8c",
    narrative: "Four inter-university seasons representing Mumbai.",
    medals: [
      { name: "2012–13", level: "", result: "Silver", tier: "silver" },
      { name: "2013–14", level: "", result: "Gold",   tier: "gold"   },
      { name: "2015–16", level: "", result: "Gold",   tier: "gold"   },
      { name: "2016–17", level: "", result: "Silver", tier: "silver" },
    ],
  },
  {
    year: "2012–16",
    tag: "Kumar · ×4",
    tagColor: "var(--gold)",
    narrative: "Four unbroken years. Same sweep, every season.",
    medals: [
      { name: "Mumbai Kumar",      level: "City",   result: "Overall ×4",  tier: "gold" },
      { name: "Maharashtra Kumar", level: "State",  result: "Gold ×4",     tier: "gold" },
      { name: "Bharat Kumar",      level: "Nation", result: "Gold ×4",     tier: "gold" },
    ],
  },
  {
    year: "2011",
    tag: "Junior",
    tagColor: "var(--gold)",
    narrative: "Debut season — triple crown on the first state platform.",
    medals: [
      { name: "Mumbai Shree",      level: "City",   result: "Overall Champion", tier: "gold" },
      { name: "Maharashtra Kishor",level: "State",  result: "Gold",             tier: "gold" },
      { name: "Bharat Kishor",     level: "Nation", result: "Gold",             tier: "gold" },
    ],
  },
];

const tierDot: Record<string, string> = {
  gold:   "bg-[var(--gold)]",
  silver: "bg-neutral-400",
  bronze: "bg-[#c08056]",
};

/* ────────────────────────────────────────────────────────────────
   FADE-UP
   ──────────────────────────────────────────────────────────────── */

function FadeUp({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : "translateY(20px)",
        transition: "opacity .8s ease, transform .8s cubic-bezier(.2,.7,.2,1)",
      }}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   MINIMAL ENTRY CARD
   ──────────────────────────────────────────────────────────────── */

function EntryCard({ e }: { e: Entry }) {
  return (
    <div
      className="group relative px-5 py-5 rounded-xl transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      onMouseEnter={e2 => {
        (e2.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
        (e2.currentTarget as HTMLDivElement).style.borderColor = "rgba(232,168,32,0.18)";
      }}
      onMouseLeave={e2 => {
        (e2.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)";
        (e2.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)";
      }}
    >
      {/* Top row: year + tag */}
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span
          className="font-anton text-3xl leading-none text-[var(--gold)]"
        >
          {e.year}
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.22em] shrink-0 font-bold"
          style={{ color: e.tagColor }}
        >
          {e.tag}
        </span>
      </div>

      {/* Narrative */}
      <p className="text-neutral-400 text-[13px] leading-relaxed mb-3">{e.narrative}</p>

      {/* Medal pills */}
      {e.medals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {e.medals.map((m, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tierDot[m.tier]}`} />
              {m.name && <span className="text-white/40">{m.name}</span>}
              {m.level && <span className="text-white/25">·</span>}
              {m.level && <span>{m.level}</span>}
              <span className="text-white/25">·</span>
              <span
                className="font-semibold"
                style={{ color: m.tier === "gold" ? "var(--gold)" : m.tier === "silver" ? "#ccc" : "#c08056" }}
              >
                {m.result}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* CTA for "Today" card */}
      {e.year === "Today" && (
        <a
          href="#pricing"
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--gold)] hover:text-white transition mt-2 group/link font-bold"
        >
          Train under this standard
          <span className="transition group-hover/link:translate-x-0.5">→</span>
        </a>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   MAIN
   ──────────────────────────────────────────────────────────────── */

export default function About() {
  const scrollPanelRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    const el = scrollPanelRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop === 0 && e.deltaY < 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
      if (!atTop && !atBottom) {
        e.preventDefault();
        el.scrollTop += e.deltaY;
      }
    };
    el.dataset.wheelHandler = "active";
    (el as any)._wheelHandler = onWheel;
    window.addEventListener("wheel", onWheel, { passive: false });
  };

  const handleMouseLeave = () => {
    const el = scrollPanelRef.current;
    if (!el || !(el as any)._wheelHandler) return;
    window.removeEventListener("wheel", (el as any)._wheelHandler);
    delete (el as any)._wheelHandler;
  };
  return (
    <section id="about" className="relative" style={{ background: "var(--sec-dark-mid)" }}>
      {/* Ambients */}
      <div className="absolute inset-0 -z-0 grain pointer-events-none" />
      <div
        className="absolute -z-0 top-[-10%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] rounded-full blur-[140px] opacity-[0.10] pointer-events-none"
        style={{ background: "radial-gradient(circle,#ff5a1f 0%,transparent 70%)" }}
      />
      <div
        className="absolute -z-0 bottom-[-20%] right-[-10%] w-[60vw] h-[50vh] rounded-full blur-[140px] opacity-[0.07] pointer-events-none"
        style={{ background: "radial-gradient(circle,var(--gold) 0%,transparent 70%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 pt-24 pb-10">

        {/* ── Section header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <div className="eyebrow mb-3">Hall of fame</div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <h2 className="font-display font-black text-foreground text-[clamp(2rem,4.5vw,2.8rem)]">
              Champion's <span className="text-gold-gradient">timeline</span>
            </h2>
            <p className="text-neutral-500 text-sm max-w-xs leading-relaxed">
              A decade of medals — city, state and national.
            </p>
          </div>
        </motion.div>

        {/* ── Two-column: image | scroll window ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-14 items-start">

          {/* Left — sticky photo */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="relative self-start lg:sticky lg:top-24"
          >
            <div className="relative rounded-[22px] overflow-hidden group shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
              <div className="absolute inset-0 bg-[var(--gold)]/8 mix-blend-overlay z-10 group-hover:opacity-0 transition-opacity duration-500" />
              <img
                src={aboutImg}
                alt="Sagar Kharat — champion athlete and founder"
                width={600}
                height={800}
                loading="lazy"
                className="w-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute bottom-0 inset-x-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent z-20" />
            </div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.45, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -bottom-4 right-5 z-30 rounded-xl px-5 py-3 shadow-[0_8px_32px_rgba(232,168,32,0.4)]"
              style={{ background: "var(--gold)" }}
            >
              <p className="text-2xl font-black leading-none text-[#1C1C1E] font-display">21+</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#1C1C1E]/60 mt-0.5 leading-snug">
                National &amp;<br />state medals
              </p>
            </motion.div>
          </motion.div>

          {/* Right — scroll window */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between mb-3">
              <span className="font-anton text-xl tracking-wide text-white/80">The Record</span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                2011 → Today
              </span>
            </div>

            {/* The window */}
            <div
              className="relative rounded-2xl overflow-hidden"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 24px 64px rgba(0,0,0,0.5)",
              }}
            >
              {/* Top fade */}
              <div
                className="absolute top-0 inset-x-0 h-10 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to bottom,rgba(12,12,14,0.95),transparent)" }}
              />
              {/* Bottom fade */}
              <div
                className="absolute bottom-0 inset-x-0 h-14 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to top,rgba(12,12,14,0.98),transparent)" }}
              />

              {/* Scrollable list */}
              <div
                ref={scrollPanelRef}
                className="timeline-scroll overflow-y-auto"
                style={{
                  height: "580px",
                  background: "rgba(10,10,12,0.9)",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(232,168,32,0.3) transparent",
                }}
              >
                <div className="px-3 py-4 flex flex-col gap-2.5">
                  {entries.map((e, i) => (
                    <EntryCard key={i} e={e} />
                  ))}
                  <div className="h-8" />
                </div>
              </div>
            </div>

            <p className="text-[10px] text-neutral-700 mt-2 text-right tracking-widest uppercase">
              scroll inside ↕
            </p>
          </motion.div>

        </div>
      </div>


    </section>
  );
}
