import { useEffect } from "react";
import { useLocation } from "wouter";
import StaggeredMenu from "@/components/ui/StaggeredMenu";

const navLinks = [
  { name: "Reviews", href: "#reviews" },
  { name: "Contact", href: "#contact" },
  { name: "Offers", href: "/offers", isPage: true },
  { name: "Nutrition", href: "/nutrition", isPage: true },
];

const staggeredItems = [
  { label: "Branches", ariaLabel: "View branch locations", link: "/branches" },
  { label: "Pricing", ariaLabel: "View pricing plans", link: "#pricing" },
  { label: "Nutrition", ariaLabel: "View nutrition assessment", link: "/nutrition" },
  { label: "Offers", ariaLabel: "View offers", link: "/offers" },
  { label: "Gallery", ariaLabel: "View gallery", link: "/gallery" },
  { label: "Reviews", ariaLabel: "Go to Reviews", link: "#reviews" },
  { label: "Contact", ariaLabel: "Go to Contact", link: "#contact" },
];

const staggeredSocials = [
  { label: "Instagram", link: "https://instagram.com" },
  { label: "YouTube", link: "https://www.youtube.com/@sagarKharat-d7g" },
  { label: "LinkedIn", link: "https://www.linkedin.com/in/musclempire/" },
];

function smoothScroll(href: string) {
  const el = document.querySelector(href);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: "smooth" });
}

export default function GlobalMenu() {
  const [location, navigate] = useLocation();

  const handleItemClick = (item: { label: string; link: string }, e: React.MouseEvent) => {
    e.preventDefault();

    const isHash = item.link.startsWith("#");
    if (isHash && location !== "/") {
      sessionStorage.setItem("scroll_to_hash", item.link);
      navigate("/");
      return;
    }

    const link = navLinks.find(l => l.name === item.label);
    if (link) {
      if (link.isPage || link.href.startsWith("/")) {
        sessionStorage.setItem("scroll_before_plans", String(window.scrollY));
        navigate(link.href);
      } else {
        setTimeout(() => smoothScroll(link.href), 10);
      }
    } else if (item.link.startsWith("/")) {
      sessionStorage.setItem("scroll_before_plans", String(window.scrollY));
      navigate(item.link);
    } else if (item.link.startsWith("#")) {
      setTimeout(() => smoothScroll(item.link), 10);
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[60]">
      <StaggeredMenu
        position="right"
        isFixed
        items={staggeredItems}
        socialItems={staggeredSocials}
        displaySocials
        menuButtonColor="#F2EFE9"
        openMenuButtonColor="#F2EFE9"
        changeMenuColorOnOpen
        colors={["#1C1C1E", "#252528"]}
        accentColor="#E8A820"
        onItemClick={handleItemClick}
        onMenuOpen={() => window.dispatchEvent(new CustomEvent("menuStateChange", { detail: true }))}
        onMenuClose={() => window.dispatchEvent(new CustomEvent("menuStateChange", { detail: false }))}
      />
    </div>
  );
}
