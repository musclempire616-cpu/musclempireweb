import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, "../dist");

const SEO_ROUTES = {
  "/": {
    title: "Muscle Empire Gymnasium – Best Gym in Ghatkopar, Mumbai",
    description:
      "Muscle Empire Gymnasium is a hardcore training facility in Ghatkopar, Mumbai, offering strength training, muscle building, fat loss, modern equipment, experienced trainers, and flexible membership plans.",
    url: "https://www.musclempire.in/",
  },
  "/branches": {
    title: "Muscle Empire Gymnasium – Gym Branches in Ghatkopar, Mumbai",
    description:
      "Explore Muscle Empire Gymnasium branches and locations in Ghatkopar, Mumbai. Find our gym facilities, training options, and membership information.",
    url: "https://www.musclempire.in/branches",
  },
  "/offers": {
    title: "Gym Offers & Membership Plans in Ghatkopar – Muscle Empire",
    description:
      "Explore the latest gym offers and membership plans at Muscle Empire Gymnasium in Ghatkopar, Mumbai. Find a plan that fits your fitness goals.",
    url: "https://www.musclempire.in/offers",
  },
  "/nutrition": {
    title: "Nutrition & Diet Plans in Ghatkopar – Muscle Empire Gym",
    description:
      "Get personalized nutrition guidance and diet planning at Muscle Empire Gymnasium in Ghatkopar, Mumbai to support muscle gain, fat loss, weight management, and fitness goals.",
    url: "https://www.musclempire.in/nutrition",
  },
  "/gallery": {
    title: "Muscle Empire Gymnasium – Gym Gallery in Ghatkopar",
    description:
      "Explore the Muscle Empire Gymnasium gallery featuring our gym environment, equipment, trainers, workouts, and fitness facilities in Ghatkopar, Mumbai.",
    url: "https://www.musclempire.in/gallery",
  },
  "/terms": {
    title: "Terms & Conditions – Muscle Empire Gymnasium",
    description:
      "Read the terms and conditions for using the Muscle Empire Gymnasium website and its services.",
    url: "https://www.musclempire.in/terms",
  },
  "/sagarkharat": {
    title: "Admin Portal – Muscle Empire Gymnasium",
    description: "Private Admin Portal for Muscle Empire Gymnasium.",
    noindex: true,
  },
};

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setMetaTag(html, attrType, attrVal, content) {
  const regex = new RegExp(`<meta\\s+[^>]*?${attrType}=["']${attrVal}["'][^>]*?>`, "gi");
  const newTag = `<meta ${attrType}="${attrVal}" content="${escapeHtml(content)}" />`;
  if (regex.test(html)) {
    return html.replace(regex, newTag);
  }
  return html.replace("</head>", `    ${newTag}\n  </head>`);
}

function updateTitle(html, title) {
  const regex = /<title>[^<]*<\/title>/i;
  const newTitle = `<title>${escapeHtml(title)}</title>`;
  if (regex.test(html)) {
    return html.replace(regex, newTitle);
  }
  return html.replace("</head>", `    ${newTitle}\n  </head>`);
}

function setCanonicalTag(html, url) {
  const regex = /<link\s+[^>]*?rel=["']canonical["'][^>]*?>/gi;
  const newTag = `<link rel="canonical" href="${url}" />`;
  if (regex.test(html)) {
    return html.replace(regex, newTag);
  }
  return html.replace("</head>", `    ${newTag}\n  </head>`);
}

function processRoute(templateHtml, routePath, seo) {
  let html = templateHtml;

  // 1. Update Title
  html = updateTitle(html, seo.title);

  // 2. Update Meta Description & Robots
  html = setMetaTag(html, "name", "description", seo.description);

  if (seo.noindex) {
    html = setMetaTag(html, "name", "robots", "noindex, nofollow");
    // Remove canonical tag if present for noindex routes
    html = html.replace(/<link\s+[^>]*?rel=["']canonical["'][^>]*?>\s*/gi, "");
  } else {
    html = setMetaTag(html, "name", "robots", "index, follow");

    // 3. Update Open Graph Tags
    html = setMetaTag(html, "property", "og:title", seo.title);
    html = setMetaTag(html, "property", "og:description", seo.description);
    html = setMetaTag(html, "property", "og:type", "website");
    if (seo.url) html = setMetaTag(html, "property", "og:url", seo.url);

    // 4. Update Twitter Cards
    html = setMetaTag(html, "name", "twitter:card", "summary_large_image");
    html = setMetaTag(html, "name", "twitter:title", seo.title);
    html = setMetaTag(html, "name", "twitter:description", seo.description);

    // 5. Update Canonical Link
    if (seo.url) html = setCanonicalTag(html, seo.url);
  }

  return html;
}

function prerenderSEO() {
  const indexPath = path.join(DIST_DIR, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error("Error: dist/index.html not found. Run vite build first.");
    process.exit(1);
  }

  const templateHtml = fs.readFileSync(indexPath, "utf8");

  for (const [routePath, seo] of Object.entries(SEO_ROUTES)) {
    const outputHtml = processRoute(templateHtml, routePath, seo);

    if (routePath === "/") {
      fs.writeFileSync(indexPath, outputHtml, "utf8");
      console.log(`[SEO Prerender] Generated static HTML for route: / (dist/index.html)`);
    } else {
      const routeName = routePath.replace(/^\//, "");
      // Write dist/routeName.html
      const htmlFile = path.join(DIST_DIR, `${routeName}.html`);
      fs.writeFileSync(htmlFile, outputHtml, "utf8");

      // Write dist/routeName/index.html
      const routeDir = path.join(DIST_DIR, routeName);
      if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
      }
      const targetFile = path.join(routeDir, "index.html");
      fs.writeFileSync(targetFile, outputHtml, "utf8");

      console.log(`[SEO Prerender] Generated static HTML for route: ${routePath} (${htmlFile} and ${targetFile})`);
    }
  }
}

prerenderSEO();
