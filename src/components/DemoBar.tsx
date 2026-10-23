import { FaWhatsapp } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const DEMO_MSG = encodeURIComponent(
  "Hi! I'd like to book a FREE demo session at Muscle Empire Gymnasium. Please share the available slots."
);
const DEMO_LINK = `https://wa.me/919137870108?text=${DEMO_MSG}`;

export default function DemoBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleMenuStateChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setMenuOpen(customEvent.detail);
    };
    window.addEventListener("menuStateChange", handleMenuStateChange);
    return () => window.removeEventListener("menuStateChange", handleMenuStateChange);
  }, []);

  return (
    <AnimatePresence>
      {!menuOpen && (
        <motion.div
          className="fixed bottom-5 left-0 right-0 z-[998] flex items-center justify-center px-4 pointer-events-none"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Bubble wrapper */}
          <motion.div
            className="pointer-events-auto relative overflow-hidden rounded-full px-6 py-3"
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            style={{
              /* deep dark glass base */
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.12) 100%)",
              backdropFilter: "blur(22px) saturate(180%)",
              WebkitBackdropFilter: "blur(22px) saturate(180%)",
              /* iridescent rim */
              border: "1px solid rgba(255,255,255,0.28)",
              /* outer glow */
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {/* Top specular highlight — the "mirror" effect */}
            <div
              className="absolute top-0 left-[10%] right-[10%] h-[42%] rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.0) 75%)",
                filter: "blur(2px)",
              }}
            />

            {/* Iridescent shimmer sweep */}
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-full"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "linear", repeatDelay: 1.5 }}
              style={{
                background:
                  "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
              }}
            />

            {/* Text content */}
            <p className="relative z-10 text-white text-[13px] sm:text-sm font-medium text-center leading-none whitespace-nowrap"
               style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
              Book a{" "}
              <a
                href={DEMO_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold hover:underline"
                style={{ color: "#4ade80" }}
              >
                free demo session
              </a>{" "}
              for{" "}
              <span className="font-bold" style={{ color: "#E8A820" }}>FREE</span>
              {" "}and{" "}
              <a
                href={DEMO_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold uppercase tracking-wide hover:underline"
                style={{ color: "#4ade80" }}
              >
                <FaWhatsapp size={13} />
                Book now
              </a>
            </p>

            {/* Bottom inner shadow for depth */}
            <div
              className="absolute bottom-0 inset-x-0 h-1/2 rounded-b-full pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.18) 0%, transparent 100%)",
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
