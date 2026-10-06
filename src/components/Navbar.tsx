import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import logo from "@/assets/images/logo.webp";

export default function Navbar() {
  const [nameVisible, setNameVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [, navigate] = useLocation();

  useEffect(() => {
    const fn = () => {
      const current = window.scrollY;
      if (current > 80) {
        setNameVisible(current < lastScrollY.current);
      } else {
        setNameVisible(true);
      }
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <motion.div
      className="fixed top-8 left-5 md:left-8 z-50 pointer-events-auto"
      animate={{ opacity: nameVisible ? 1 : 0, y: nameVisible ? 0 : -16 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <a
        href="/"
        aria-label="Muscle Empire Home"
        onClick={e => { e.preventDefault(); navigate("/"); }}
        className="flex items-center gap-3 group select-none"
      >
        <div className="relative shrink-0">
          <img
            src={logo}
            alt="Muscle Empire"
            width={96}
            height={96}
            className="relative h-24 w-24 object-contain"
          />
        </div>

      </a>
    </motion.div>
  );
}
