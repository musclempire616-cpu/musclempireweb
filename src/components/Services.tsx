import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, HeartPulse, Flame, Bike, User, Apple } from "lucide-react";
import MagicRings from "@/components/MagicRings";

const SERVICES = [
  { title: "Personal Training",  Icon: User,       color: "#E65100", glow: "rgba(230,81,0,.26)",   bg: "rgba(230,81,0,0.10)"   },
  { title: "Strength Training",  Icon: Dumbbell,   color: "#2E7D32", glow: "rgba(46,125,50,.24)",  bg: "rgba(46,125,50,0.10)"  },
  { title: "Weight Loss",        Icon: HeartPulse, color: "#C62828", glow: "rgba(198,40,40,.24)",  bg: "rgba(198,40,40,0.10)"  },
  { title: "CrossFit",           Icon: Flame,      color: "#F57F17", glow: "rgba(245,127,23,.26)", bg: "rgba(245,127,23,0.10)" },
  { title: "Cycling Sessions",   Icon: Bike,       color: "#1565C0", glow: "rgba(21,101,192,.24)", bg: "rgba(21,101,192,0.10)" },
  { title: "Nutrition Coaching", Icon: Apple,      color: "#6A1B9A", glow: "rgba(106,27,154,.24)", bg: "rgba(106,27,154,0.10)" },
];
const N = SERVICES.length;

/* ── Shared card face ──────────────────────────────────────── */
function CardFace({ s, w, h, isFront }: { s: typeof SERVICES[0]; w: number; h: number; isFront: boolean }) {
  const fs = Math.max(24, Math.round(w * 0.135));
  return (
    <div style={{
      width: w, height: h, flexShrink: 0,
      background: `radial-gradient(circle at 38% 32%, ${s.glow} 0%, transparent 62%), #1e1e20`,
      border: `1.5px solid ${isFront ? s.color + "70" : s.color + "28"}`,
      borderRadius: 20,
      boxShadow: isFront ? `0 20px 56px rgba(0,0,0,.45), 0 0 48px ${s.glow}` : `0 6px 18px rgba(0,0,0,.28)`,
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column", padding: 20,
      transition: "border-color .35s, box-shadow .35s",
    }}>
      <div style={{ position:"absolute", top:0, left:"18%", right:"18%", height:1, pointerEvents:"none",
        background:`linear-gradient(90deg,transparent,${s.color}88,transparent)`, opacity: isFront ? 1 : 0.3 }} />
      <div style={{ position:"absolute", bottom:6, right:6, pointerEvents:"none",
        color: s.color, opacity: isFront ? 0.12 : 0.05 }}>
        <s.Icon size={Math.round(w * 0.46)} strokeWidth={0.7} />
      </div>
      <div style={{ width:44, height:44, borderRadius:14, flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        background: s.bg, color: s.color, marginBottom:14, position:"relative", zIndex:2,
        boxShadow: isFront ? `0 0 20px ${s.color}44` : "none" }}>
        <s.Icon size={Math.round(w * 0.13)} strokeWidth={2} />
      </div>
      <h3 style={{
        color: isFront ? s.color : "rgba(242,239,233,.75)",
        fontFamily:"var(--app-font-display)", fontWeight:900, fontSize: fs,
        lineHeight:1.2, zIndex:2, position:"relative",
        display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden",
        transition:"color .35s",
      }}>{s.title}</h3>
    </div>
  );
}

/* ── Cylinder math ─────────────────────────────────────────── */
function cylTransform(index: number, active: number, total: number, radius: number) {
  const step = (2 * Math.PI) / total;
  let off = index - active;
  while (off >  total / 2) off -= total;
  while (off < -total / 2) off += total;
  const angle  = off * step;
  const x      = radius * Math.sin(angle);
  const z      = radius * (Math.cos(angle) - 1);
  const rotY   = -(angle * 180) / Math.PI;
  const depth  = (Math.cos(angle) + 1) / 2;
  const scale  = 0.68 + depth * 0.32;
  const opa    = 0.55 + depth * 0.45;
  const zIdx   = Math.round(depth * 100);
  return { x, z, rotY, scale, opa, zIdx, depth };
}

/* ── Desktop 3D cylinder carousel ─────────────────────────── */
function DesktopCarousel({ items }: { items: typeof SERVICES }) {
  const activeF   = useRef(0);
  const targetF   = useRef(0);
  const [render, setRender] = useState(0);
  const autoRef   = useRef<ReturnType<typeof setInterval>>();
  const dragging  = useRef(false);
  const px0       = useRef(0);
  const af0       = useRef(0);
  const cardW = 220; const cardH = 260;

  const [radius, setRadius] = useState(420);
  useEffect(() => {
    const upd = () => setRadius(window.innerWidth < 1280 ? 340 : 420);
    upd(); window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      let d = targetF.current - activeF.current;
      while (d >  N/2) d -= N;
      while (d < -N/2) d += N;
      if (Math.abs(d) > 0.0005) {
        activeF.current += d * 0.1;
        setRender(activeF.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const resetAuto = useCallback(() => {
    clearInterval(autoRef.current);
    autoRef.current = setInterval(() => { targetF.current += 1; }, 2800);
  }, []);
  useEffect(() => { resetAuto(); return () => clearInterval(autoRef.current); }, [resetAuto]);

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true; px0.current = e.clientX; af0.current = targetF.current;
    clearInterval(autoRef.current);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    targetF.current = af0.current + (px0.current - e.clientX) / (cardW * 0.9);
  };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    targetF.current = Math.round(targetF.current);
    resetAuto();
  };

  const dotIdx = ((Math.round(render) % N) + N) % N;

  return (
    <div style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div style={{ position:"relative", width:"100%", height: cardH + 80,
        perspective: 2000, perspectiveOrigin:"50% 50%", cursor:"grab", overflow:"visible", touchAction:"none" }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
          justifyContent:"center", transformStyle:"preserve-3d" }}>
          {items.map((s, i) => {
            const { x, z, rotY, scale, opa, zIdx } = cylTransform(i, render, N, radius);
            return (
              <motion.div key={i}
                style={{ position:"absolute", zIndex: zIdx,
                  x, rotateY: rotY, scale, opacity: opa, translateZ: z }}>
                <CardFace s={s} w={cardW} h={cardH} isFront={Math.abs(i - Math.round(render + N * 100) % N) <= 0.5 ||
                  Math.abs(i - (Math.round(render + N * 100) % N) + N) <= 0.5 ||
                  Math.abs(i - (Math.round(render + N * 100) % N) - N) <= 0.5} />
              </motion.div>
            );
          })}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:16 }}>
        {items.map((s,i) => (
          <button key={i} onClick={() => { targetF.current = i; resetAuto(); }}
            style={{ borderRadius:999, border:"none", cursor:"pointer",
              background: i===dotIdx ? s.color : "rgba(255,255,255,.2)",
              width: i===dotIdx ? 22 : 7, height:7, transition:"width .3s, background .3s" }}
            aria-label={s.title} />
        ))}
      </div>
    </div>
  );
}

/* ── Mobile slide carousel ─────────────────────────────────── */
function MobileCarousel({ items }: { items: typeof SERVICES }) {
  const [active, setActive] = useState(0);
  const [dir, setDir]       = useState(1);
  const autoRef = useRef<ReturnType<typeof setInterval>>();
  const touchX  = useRef(0);

  const cw = Math.min(typeof window !== "undefined" ? window.innerWidth - 48 : 280, 260);
  const ch = Math.round(cw * 1.12);

  const go = useCallback((d: 1 | -1) => { setDir(d); setActive(a => (a + d + N) % N); }, []);
  const resetAuto = useCallback(() => {
    clearInterval(autoRef.current);
    autoRef.current = setInterval(() => go(1), 3000);
  }, [go]);
  useEffect(() => { resetAuto(); return () => clearInterval(autoRef.current); }, [resetAuto]);

  return (
    <div style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div style={{ position:"relative", width:"100%", height: ch + 20, overflow:"hidden", touchAction:"pan-y" }}
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          const diff = touchX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40) { go(diff > 0 ? 1 : -1); resetAuto(); }
        }}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div key={active} custom={dir}
            variants={{
              enter:  (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
              center: { x: "0%", opacity: 1 },
              exit:   (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
            }}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
            style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <CardFace s={items[active]} w={cw} h={ch} isFront />
          </motion.div>
        </AnimatePresence>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:14 }}>
        <button onClick={() => { go(-1); resetAuto(); }}
          style={{ width:34, height:34, borderRadius:10, border:"1px solid rgba(255,255,255,.12)",
            background:"rgba(255,255,255,.05)", color:"rgba(242,239,233,.65)", fontSize:18,
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
        <div style={{ display:"flex", gap:6 }}>
          {items.map((s,i) => (
            <div key={i} style={{ borderRadius:999, width: i===active ? 20 : 7, height:7,
              background: i===active ? s.color : "rgba(255,255,255,.2)",
              transition:"width .3s, background .3s" }} />
          ))}
        </div>
        <button onClick={() => { go(1); resetAuto(); }}
          style={{ width:34, height:34, borderRadius:10, border:"1px solid rgba(255,255,255,.12)",
            background:"rgba(255,255,255,.05)", color:"rgba(242,239,233,.65)", fontSize:18,
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
      </div>
    </div>
  );
}

/* ── Section ─────────────────────────────────────────────────── */
export default function Services() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section id="services" className="py-20 bg-[#1C1C1E] overflow-hidden relative">
      {/* MagicRings WebGL background - Desktop only for smooth mobile performance */}
      {!isMobile && (
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ opacity: 0.32 }}>
          <MagicRings
            color="#E8A820" colorTwo="#ffffff" ringCount={5} speed={0.5} attenuation={9}
            lineThickness={1.6} baseRadius={0.28} radiusStep={0.11} scaleRate={0.1} opacity={1}
            blur={0} noiseAmount={0} rotation={0} ringGap={1.6} fadeIn={0.7} fadeOut={0.5}
            followMouse={false} hoverScale={1} parallax={0} clickBurst={false}
          />
        </div>
      )}

      <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
        viewport={{ once:true, margin:"-60px" }} transition={{ duration:0.65, ease:[0.16,1,0.3,1] }}
        className="text-center max-w-xl mx-auto px-5 mb-10 relative z-10">
        <div className="eyebrow justify-center mb-4">What we offer</div>
        <h2 className="font-display font-black text-[#F2EFE9] text-[clamp(2rem,4.5vw,2.9rem)]">
          Arsenal of <span className="text-gold-gradient">disciplines</span>
        </h2>
      </motion.div>

      <div className="relative z-10 px-4">
        {isMobile
          ? <MobileCarousel items={SERVICES} />
          : <DesktopCarousel items={SERVICES} />
        }
      </div>
    </section>
  );
}
