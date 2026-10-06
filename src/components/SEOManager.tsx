import { useEffect } from "react";
import { useLocation } from "wouter";

interface SEOData {
  title: string;
  description: string;
}

const SEO_MAP: Record<string, SEOData> = {
  "/": {
    title: "Muscle Empire Gymnasium – Best Gym in Ghatkopar, Mumbai",
    description:
      "Muscle Empire Gymnasium is a hardcore training facility in Ghatkopar, Mumbai, offering strength training, muscle building, fat loss, modern equipment, experienced trainers, and flexible membership plans.",
  },
  "/branches": {
    title: "Muscle Empire Gymnasium – Gym Branches in Ghatkopar, Mumbai",
    description:
      "Explore Muscle Empire Gymnasium branches and locations in Ghatkopar, Mumbai. Find our gym facilities, training options, and membership information.",
  },
  "/offers": {
    title: "Gym Offers & Membership Plans in Ghatkopar – Muscle Empire",
    description:
      "Explore the latest gym offers and membership plans at Muscle Empire Gymnasium in Ghatkopar, Mumbai. Find a plan that fits your fitness goals.",
  },
  "/nutrition": {
    title: "Nutrition & Diet Plans in Ghatkopar – Muscle Empire Gym",
    description:
      "Get personalized nutrition guidance and diet planning at Muscle Empire Gymnasium in Ghatkopar, Mumbai to support muscle gain, fat loss, weight management, and fitness goals.",
  },
  "/gallery": {
    title: "Muscle Empire Gymnasium – Gym Gallery in Ghatkopar",
    description:
      "Explore the Muscle Empire Gymnasium gallery featuring our gym environment, equipment, trainers, workouts, and fitness facilities in Ghatkopar, Mumbai.",
  },
  "/terms": {
    title: "Terms & Conditions – Muscle Empire Gymnasium",
    description:
      "Read the terms and conditions for using the Muscle Empire Gymnasium website and its services.",
  },
};

const DEFAULT_SEO: SEOData = SEO_MAP["/"];

function setMetaTag(attrName: "name" | "property", attrValue: string, content: string) {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export default function SEOManager() {
  const [location] = useLocation();

  useEffect(() => {
    // Extract base pathname without query string or trailing slash
    const pathOnly = location.split("?")[0];
    const cleanPath = pathOnly === "/" ? "/" : pathOnly.replace(/\/$/, "");

    // Do NOT add SEO metadata intended for indexing to any private /sagarkharat admin routes
    if (cleanPath.startsWith("/sagarkharat")) {
      document.title = "Admin Portal – Muscle Empire Gymnasium";
      setMetaTag("name", "robots", "noindex, nofollow");
      return;
    }

    const seo = SEO_MAP[cleanPath] || DEFAULT_SEO;

    // Update Document Title
    document.title = seo.title;

    // Update Meta Description & Robots
    setMetaTag("name", "description", seo.description);
    setMetaTag("name", "robots", "index, follow");

    // Update Open Graph (OG) Tags
    setMetaTag("property", "og:title", seo.title);
    setMetaTag("property", "og:description", seo.description);
    if (typeof window !== "undefined") {
      setMetaTag("property", "og:url", window.location.origin + cleanPath);
    }

    // Update Twitter Card Tags
    setMetaTag("name", "twitter:title", seo.title);
    setMetaTag("name", "twitter:description", seo.description);
  }, [location]);

  return null;
}
