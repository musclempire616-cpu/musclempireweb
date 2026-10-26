import { useLayoutEffect, useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import WhyChooseUs from "@/components/WhyChooseUs";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Preloader from "@/components/Preloader";

export default function Home() {
  const isAutoClaim = typeof sessionStorage !== "undefined" && (
    !!sessionStorage.getItem("scroll_to_hash") ||
    !!sessionStorage.getItem("auto_apply_coupon") ||
    (typeof window !== "undefined" && window.location.hash === "#pricing")
  );

  // Skip preloader if returning or navigating with coupon/pricing hash
  const savedScroll = isAutoClaim ? null : (sessionStorage.getItem("scroll_/") || sessionStorage.getItem("scroll_before_plans"));
  const isReturning = !!savedScroll || isAutoClaim;
  const [loading, setLoading] = useState(!isReturning);

  // Restore scroll immediately before paint when returning (unless claiming an offer)
  useLayoutEffect(() => {
    if (isAutoClaim) return;
    const pos = sessionStorage.getItem("scroll_/") || sessionStorage.getItem("scroll_before_plans");
    if (pos) window.scrollTo(0, parseInt(pos, 10));
  }, [isAutoClaim]);

  // After preloader / on mount
  useEffect(() => {
    if (!loading) {
      // Handle hash / pricing target navigation FIRST
      const hash = sessionStorage.getItem("scroll_to_hash") || (window.location.hash ? window.location.hash : null);
      if (hash) {
        sessionStorage.removeItem("scroll_to_hash");
        sessionStorage.removeItem("scroll_/");
        sessionStorage.removeItem("scroll_before_plans");
        setTimeout(() => {
          const el = document.querySelector(hash);
          if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY - 76;
            window.scrollTo({ top, behavior: "smooth" });
          }
          window.dispatchEvent(new CustomEvent("autoClaimOffer"));
        }, 150);
        return;
      }

      // Restore scroll after content renders
      const pos = sessionStorage.getItem("scroll_/") || sessionStorage.getItem("scroll_before_plans");
      if (pos) {
        setTimeout(() => window.scrollTo(0, parseInt(pos, 10)), 50);
        return;
      }
      // Fresh visit — scroll to top
      if (!isReturning) window.scrollTo(0, 0);
    }
  }, [loading, isReturning]);

  return (
    <>
      {loading && <Preloader onComplete={() => setLoading(false)} />}

      {/* Always mounted so the slide-up exit reveals the page underneath */}
      <div className="min-h-[100dvh] w-full bg-background text-foreground selection:bg-primary selection:text-black">
        <Navbar />
        <main>
          <Hero />
          <About />
          <Services />
          <WhyChooseUs />
          <Pricing />
          <Testimonials />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  );
}
