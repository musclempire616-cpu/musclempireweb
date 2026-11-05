import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { Phone } from "lucide-react";

const OWNER_PHONE = "918779682084";
const CALL_URL = "tel:+919773053632";
const CALL_URL_2 = "tel:+919702268603";

const WA_MSG = encodeURIComponent("Hi Muscle Empire! I would like to inquire about gym memberships and plans.");
const WA_URL = `https://wa.me/${OWNER_PHONE}?text=${WA_MSG}`;

export default function FloatingContact() {
  return (
    <div className="fixed right-5 bottom-20 z-[999] flex flex-col gap-3 items-end">
      {/* WhatsApp — Direct redirect to WhatsApp number */}
      <motion.a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="group flex items-center gap-3 cursor-pointer"
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
      </motion.a>

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
  );
}
