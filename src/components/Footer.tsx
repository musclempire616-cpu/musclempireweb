import { FaInstagram, FaFacebookF, FaLinkedinIn } from "react-icons/fa";
import logo from "@/assets/images/logo-footer.webp";

const quickLinks = [
  { href: "/branches", label: "Branches" },
  { href: "#about",    label: "Achievements" },
  { href: "#services", label: "Programs" },
  { href: "#pricing",  label: "Membership" },
  { href: "#reviews",  label: "Reviews" },
  { href: "#contact",  label: "Contact" },
];

const training = ["Personal training", "Strength & conditioning", "CrossFit", "Weight loss", "Nutrition planning"];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white pt-20 pb-10 border-t border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-5 md:px-8">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          {/* Brand */}
          <div className="lg:col-span-1">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-3 mb-5 group"
            >
              <img
                src={logo}
                alt="Muscle Empire"
                width={80}
                height={80}
                loading="lazy"
                className="h-20 w-20 object-contain"
              />
              <span className="font-display font-black text-[1.05rem] text-[#C8900A] tracking-tight">
                Muscle Empire®
              </span>
            </button>
            <p className="text-black text-[0.85rem] leading-relaxed mb-6">
              Ghatkopar's premier hardcore training facility. We provide the iron, you provide the dedication.
            </p>
            <div className="flex gap-2.5">
              {[
                { href: "https://www.instagram.com/musclempire_15", Icon: FaInstagram, label: "Follow Muscle Empire on Instagram" },
                { href: "https://www.facebook.com/musclemmpire",    Icon: FaFacebookF, label: "Follow Muscle Empire on Facebook" },
                { href: "https://www.linkedin.com/in/musclempire/", Icon: FaLinkedinIn, label: "Follow Muscle Empire on LinkedIn" },
              ].map(({ href, Icon, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-xl bg-black/[0.05] flex items-center justify-center text-black hover:text-black hover:bg-black/[0.10] transition-all duration-200"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-black font-bold text-[12px] uppercase tracking-widest mb-5">Quick links</h4>
            <ul className="space-y-3">
              {quickLinks.map(l => (
                <li key={l.href}>
                  <a href={l.href} className="text-black hover:text-[#C8900A] text-[0.87rem] transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Training */}
          <div>
            <h4 className="text-black font-bold text-[12px] uppercase tracking-widest mb-5">Training</h4>
            <ul className="space-y-3">
              {training.map(t => (
                <li key={t} className="text-black text-[0.87rem]">{t}</li>
              ))}
            </ul>
          </div>

          {/* Visit us */}
          <div>
            <h4 className="text-black font-bold text-[12px] uppercase tracking-widest mb-5">Visit us</h4>
            <address className="not-italic text-[0.85rem] text-black space-y-4 leading-relaxed">
              <p>
                <strong className="text-black block mb-0.5 font-semibold">Unisex gym</strong>
                J/16, Jay Hanuman Mandir,<br />
                Barvenagar Colony, Bhatwadi,<br />
                Ghatkopar West, Mumbai – 400084
              </p>
              <p>
                <strong className="text-black block mb-0.5 font-semibold">Female gym</strong>
                1st Floor, Ranveer Apartment,<br />
                Sanjay Kokate Lane, Bhatwadi,<br />
                Ghatkopar West, Mumbai – 400084
              </p>
              <p>
                <strong className="text-black block mb-0.5 font-semibold">Call / WhatsApp</strong>
                <a href="tel:+919773053632" className="hover:text-[#C8900A] transition-colors block">+91 97730 53632</a>
                <a href="tel:+919702268603" className="hover:text-[#C8900A] transition-colors block">+91 97022 68603 (Office)</a>
              </p>
              <p>
                <strong className="text-black block mb-0.5 font-semibold">Email</strong>
                <a href="mailto:musclempire616@gmail.com" className="hover:text-[#C8900A] transition-colors">
                  musclempire616@gmail.com
                </a>
              </p>
              <div className="flex flex-col gap-2.5 mt-4 md:hidden">
                <a href="#" className="text-[11px] text-black hover:text-[#C8900A] transition-colors uppercase tracking-widest w-fit">Privacy policy</a>
                <a href="/terms" className="text-[11px] text-black hover:text-[#C8900A] transition-colors uppercase tracking-widest w-fit">Terms & Conditions</a>
              </div>
            </address>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-black/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-black uppercase tracking-widest text-center md:text-left">
            &copy; {year} Muscle Empire Gymnasium. All rights reserved.
          </p>
          <div className="hidden md:flex gap-4 md:gap-6 flex-wrap justify-center">
            <a href="#" className="text-[11px] text-black hover:text-[#C8900A] transition-colors uppercase tracking-widest">Privacy policy</a>
            <a href="/terms" className="text-[11px] text-black hover:text-[#C8900A] transition-colors uppercase tracking-widest">Terms & Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
