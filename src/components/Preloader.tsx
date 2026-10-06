import { useEffect, useRef } from "react";
import gsap from "gsap";
import heroBg from "@/assets/images/hero-bg.webp";
import { FEATURES } from "@/components/WhyChooseUs";

const IMAGES_TO_PRELOAD = [heroBg, ...FEATURES.map((f) => f.src)];

// ViewBox dimensions
const VB_W = 800;
const VB_H = 140;
// The text baseline sits at y=118 with fontSize=130, so the top of the letters
// is roughly at y=118-130 = -12 (slightly above viewBox).
// The fluid fill range: FLUID_TOP = topmost y the fluid reaches (= 0, above all letters)
//                       FLUID_BOT = bottommost y (= VB_H, fully hidden below)
const FLUID_BOT = VB_H;  // 140 — starting position (empty)
const FLUID_TOP = 0;     // 0   — ending position (100% full)

export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const fluidRef   = useRef<SVGRectElement>(null);
  const waveGrpRef = useRef<SVGGElement>(null);
  const wave1Ref   = useRef<SVGPathElement>(null);
  const wave2Ref   = useRef<SVGPathElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const overlay   = overlayRef.current;
    const fluid     = fluidRef.current;
    const waveGrp   = waveGrpRef.current;
    const percentEl = percentRef.current;
    if (!overlay || !fluid || !waveGrp || !percentEl) return;

    // Preload images in background — doesn't affect timing
    IMAGES_TO_PRELOAD.forEach((src) => { const i = new Image(); i.src = src; });

    // Exactly 3 s: 2.15 s fill + 0.85 s slide-up
    const FILL_DURATION = 2.15;
    const EXIT_DURATION = 0.85;

    const state = { val: 0 };

    // Entrance fade-in
    gsap.from(overlay, { opacity: 0, duration: 0.5, ease: "power2.out" });

    // Wave ripple — runs indefinitely until exit
    const waveTl = gsap.timeline({ repeat: -1, yoyo: true });
    if (wave1Ref.current && wave2Ref.current) {
      waveTl
        .to(wave1Ref.current, {
          attr: {
            d: `M0,4 C133,8 267,0 400,4 C533,8 667,0 ${VB_W},4 L${VB_W},${VB_H} L0,${VB_H} Z`,
          },
          duration: 0.85,
          ease: "sine.inOut",
        })
        .to(wave1Ref.current, {
          attr: {
            d: `M0,4 C133,0 267,8 400,4 C533,0 667,8 ${VB_W},4 L${VB_W},${VB_H} L0,${VB_H} Z`,
          },
          duration: 0.85,
          ease: "sine.inOut",
        });

      gsap.to(wave2Ref.current, {
        attr: {
          d: `M0,2 C160,6 320,0 480,3 C640,6 720,0 ${VB_W},3 L${VB_W},${VB_H} L0,${VB_H} Z`,
        },
        duration: 1.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }

    // Apply 0-100 progress: fluid rect rises from FLUID_BOT to FLUID_TOP
    const applyProgress = (v: number) => {
      const pct = Math.min(100, Math.max(0, v));
      percentEl.textContent = `${Math.round(pct)}%`;

      // fluidY: starts at FLUID_BOT (140), ends at FLUID_TOP (0) at 100%
      const fluidY = FLUID_BOT - (pct / 100) * (FLUID_BOT - FLUID_TOP);
      const fluidH = FLUID_BOT - fluidY;

      fluid.setAttribute("y",      String(fluidY));
      fluid.setAttribute("height", String(fluidH));

      // Wave group sits right on top of the fluid surface
      waveGrp.setAttribute("transform", `translate(0,${fluidY - 8})`);
    };

    // Initialise at 0
    applyProgress(0);

    // Master tween — linear rise for exactly FILL_DURATION seconds
    gsap.to(state, {
      val: 100,
      duration: FILL_DURATION,
      ease: "none",           // perfectly linear so rise looks steady
      onUpdate() { applyProgress(state.val); },
      onComplete() {
        waveTl.kill();
        gsap.timeline({ delay: 1, onComplete }).to(overlay, {
          yPercent: -100,
          duration: EXIT_DURATION,
          ease: "expo.inOut",
        });
      },
    });
  }, [onComplete]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[99999] bg-[#0d0d0d] flex flex-col items-center justify-center gap-6 overflow-hidden"
    >
      {/*
        viewBox = "0 0 240 100"
        Text is centred vertically at y=65 (baseline) so the letters sit
        in the middle of the 100-unit tall space.
        The fluid rect occupies the same 0-0-240-100 coordinate space and
        rises from y=100 upward.
        clipPath cuts everything to letter shapes only.
      */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-[min(92vw,820px)]"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        <defs>
          <clipPath id="me-text-clip">
            <text
              x={VB_W / 2}
              y="118"
              textAnchor="middle"
              dominantBaseline="auto"
              fontFamily="'Anton', 'Impact', sans-serif"
              fontWeight="900"
              fontSize="130"
              letterSpacing="2"
            >
              MUSCLE EMPIRE
            </text>
          </clipPath>

          <linearGradient id="me-fluid-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ffe066" />
            <stop offset="50%"  stopColor="#ffd11a" />
            <stop offset="100%" stopColor="#f5c000" />
          </linearGradient>
        </defs>

        {/* Clipped group — only letter interiors are visible */}
        <g clipPath="url(#me-text-clip)">
          {/* Fluid body — rises from bottom */}
          <rect
            ref={fluidRef}
            x="0"
            y={VB_H}
            width={VB_W}
            height="0"
            fill="url(#me-fluid-grad)"
          />

          {/* Wave surface on top of fluid */}
          <g ref={waveGrpRef}>
            {/* Back wave */}
            <path
              ref={wave2Ref}
              d={`M0,2 C160,0 320,6 480,3 C640,6 720,0 ${VB_W},3 L${VB_W},${VB_H} L0,${VB_H} Z`}
              fill="rgba(255,224,102,0.5)"
            />
            {/* Front wave */}
            <path
              ref={wave1Ref}
              d={`M0,4 C133,0 267,8 400,4 C533,0 667,8 ${VB_W},4 L${VB_W},${VB_H} L0,${VB_H} Z`}
              fill="#ffe066"
            />
          </g>
        </g>
      </svg>

      {/* Percentage */}
      <span
        ref={percentRef}
        className="font-mono text-sm tracking-[0.35em] text-white/40"
      >
        0%
      </span>
    </div>
  );
}
