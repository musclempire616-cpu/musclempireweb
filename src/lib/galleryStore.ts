import { APPS_SCRIPT_URL } from "@/lib/sheets";

const T = ["ZujXfS4o6t","pRWL2vQmAT","JbEFBaVKCs","1O7UGPqDyk"].join("");

const IMAGES_KEY = "me_gallery_images_v4";
const IMAGES_TS_KEY = "me_gallery_images_ts";
const VIDEOS_KEY = "me_gallery_videos_v4";
const VIDEOS_TS_KEY = "me_gallery_videos_ts";
const LAST_EDIT_KEY = "me_gallery_last_edit_ts";
const CACHE_TTL = 60 * 1000; // 1 min

export interface GalleryImage { id: string; src: string; alt: string; }
export interface GalleryVideo { id: string; src: string; alt: string; thumbnail?: string; }

export function dedupeImages(images: GalleryImage[]): GalleryImage[] {
  const seenIds = new Set<string>();
  const seenSrcs = new Set<string>();
  return images.filter(img => {
    const normSrc = (img.src || "").trim().toLowerCase();
    if (!normSrc) return false;
    if (seenIds.has(img.id) || seenSrcs.has(normSrc)) return false;
    seenIds.add(img.id);
    seenSrcs.add(normSrc);
    return true;
  });
}

export function dedupeVideos(videos: GalleryVideo[]): GalleryVideo[] {
  const seenIds = new Set<string>();
  const seenSrcs = new Set<string>();
  return videos.filter(vid => {
    const normSrc = (vid.src || "").trim().toLowerCase();
    if (!normSrc) return false;
    if (seenIds.has(vid.id) || seenSrcs.has(normSrc)) return false;
    seenIds.add(vid.id);
    seenSrcs.add(normSrc);
    return true;
  });
}

// ── localStorage helpers ─────────────────────────────────────────────────────

function recordLocalEdit(): void {
  localStorage.setItem(LAST_EDIT_KEY, String(Date.now()));
}

function isRecentLocalEdit(): boolean {
  const ts = parseInt(localStorage.getItem(LAST_EDIT_KEY) || "0", 10);
  return Date.now() - ts < 15_000; // Skip sheet overwrite for 15s after user edit
}

function getLocalImages(): GalleryImage[] {
  try {
    try {
      localStorage.removeItem("me_gallery_images_v3");
      localStorage.removeItem("me_gallery_images_v2");
      localStorage.removeItem("me_gallery_images_v1");
      localStorage.removeItem("me_gallery_images");
    } catch {}
    return dedupeImages(JSON.parse(localStorage.getItem(IMAGES_KEY) || "[]"));
  } catch { return []; }
}

function saveLocalImages(images: GalleryImage[]): void {
  const deduped = dedupeImages(images);
  localStorage.setItem(IMAGES_KEY, JSON.stringify(deduped));
  localStorage.setItem(IMAGES_TS_KEY, String(Date.now()));
}

function getLocalVideos(): GalleryVideo[] {
  try {
    try {
      localStorage.removeItem("me_gallery_videos_v3");
      localStorage.removeItem("me_gallery_videos_v2");
      localStorage.removeItem("me_gallery_videos_v1");
      localStorage.removeItem("me_gallery_videos");
    } catch {}
    return dedupeVideos(JSON.parse(localStorage.getItem(VIDEOS_KEY) || "[]"));
  } catch { return []; }
}

function saveLocalVideos(videos: GalleryVideo[]): void {
  const deduped = dedupeVideos(videos);
  localStorage.setItem(VIDEOS_KEY, JSON.stringify(deduped));
  localStorage.setItem(VIDEOS_TS_KEY, String(Date.now()));
}

// ── Sheets ────────────────────────────────────────────────────────────────────

async function fetchImagesFromSheets(retry = 1): Promise<GalleryImage[] | null> {
  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getImages&token=${T}&_t=${Date.now()}`, {
        redirect: "follow", cache: "no-store",
      });
      const text = await res.text();
      const json = JSON.parse(text);
      if (Array.isArray(json?.images)) return json.images;
    } catch {
      if (attempt < retry) await new Promise(r => setTimeout(r, 800));
    }
  }
  return null;
}

async function saveImagesToSheets(images: GalleryImage[]): Promise<boolean> {
  const dataStr = JSON.stringify(dedupeImages(images));
  const qs = new URLSearchParams({ action: "saveImages", token: T, data: dataStr, _t: String(Date.now()) }).toString();
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`, { method: "GET", redirect: "follow", cache: "no-store" });
    await res.text();
    return true;
  } catch {
    return false;
  }
}

async function fetchVideosFromSheets(retry = 1): Promise<GalleryVideo[] | null> {
  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getVideos&token=${T}&_t=${Date.now()}`, {
        redirect: "follow", cache: "no-store",
      });
      const text = await res.text();
      const json = JSON.parse(text);
      if (Array.isArray(json?.videos)) return json.videos;
    } catch {
      if (attempt < retry) await new Promise(r => setTimeout(r, 800));
    }
  }
  return null;
}

async function saveVideosToSheets(videos: GalleryVideo[]): Promise<boolean> {
  const dataStr = JSON.stringify(dedupeVideos(videos));
  const qs = new URLSearchParams({ action: "saveVideos", token: T, data: dataStr, _t: String(Date.now()) }).toString();
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`, { method: "GET", redirect: "follow", cache: "no-store" });
    await res.text();
    return true;
  } catch {
    return false;
  }
}

// ── Public API — Images ──────────────────────────────────────────────────────

export async function getGalleryImages(): Promise<GalleryImage[]> {
  if (!isRecentLocalEdit()) {
    syncImagesFromSheets().catch(() => {});
  }
  return getLocalImages();
}

export async function syncImagesFromSheets(): Promise<GalleryImage[]> {
  if (isRecentLocalEdit()) {
    return getLocalImages();
  }
  const remote = await fetchImagesFromSheets();
  if (remote !== null) {
    if (!isRecentLocalEdit()) {
      const deduped = dedupeImages(remote);
      saveLocalImages(deduped);
      if (deduped.length < remote.length) {
        saveImagesToSheets(deduped);
      }
      window.dispatchEvent(new CustomEvent("galleryUpdated"));
      return deduped;
    }
  }
  return getLocalImages();
}

export async function addGalleryImage(src: string, alt: string): Promise<void> {
  if (src.startsWith("data:")) throw new Error("Use a URL (imgbb.com) instead of uploading a file.");
  recordLocalEdit();
  const current = getLocalImages();
  const normSrc = src.trim().toLowerCase();
  if (current.find(i => i.src.trim().toLowerCase() === normSrc)) return;
  current.push({ id: Date.now().toString(), src: src.trim(), alt: alt.trim() });
  const deduped = dedupeImages(current);
  saveLocalImages(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));
  await saveImagesToSheets(deduped);
}

export async function removeGalleryImage(id: string): Promise<void> {
  recordLocalEdit();
  const current = getLocalImages().filter(i => i.id !== id);
  const deduped = dedupeImages(current);
  saveLocalImages(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));
  await saveImagesToSheets(deduped);
}

// ── Public API — Videos ──────────────────────────────────────────────────────

export async function getGalleryVideos(): Promise<GalleryVideo[]> {
  if (!isRecentLocalEdit()) {
    syncVideosFromSheets().catch(() => {});
  }
  return getLocalVideos();
}

export async function syncVideosFromSheets(): Promise<GalleryVideo[]> {
  if (isRecentLocalEdit()) {
    return getLocalVideos();
  }
  const remote = await fetchVideosFromSheets();
  if (remote !== null) {
    if (!isRecentLocalEdit()) {
      const deduped = dedupeVideos(remote);
      saveLocalVideos(deduped);
      if (deduped.length < remote.length) {
        saveVideosToSheets(deduped);
      }
      window.dispatchEvent(new CustomEvent("galleryUpdated"));
      return deduped;
    }
  }
  return getLocalVideos();
}

export async function addGalleryVideo(src: string, alt: string, thumbnail?: string): Promise<void> {
  if (src.startsWith("data:")) throw new Error("Use a URL instead of uploading a file.");
  recordLocalEdit();
  const current = getLocalVideos();
  const normSrc = src.trim().toLowerCase();
  if (current.find(v => v.src.trim().toLowerCase() === normSrc)) return;
  current.push({ id: Date.now().toString(), src: src.trim(), alt: alt.trim(), thumbnail });
  const deduped = dedupeVideos(current);
  saveLocalVideos(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));
  await saveVideosToSheets(deduped);
}

export async function removeGalleryVideo(id: string): Promise<void> {
  recordLocalEdit();
  const current = getLocalVideos().filter(v => v.id !== id);
  const deduped = dedupeVideos(current);
  saveLocalVideos(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));
  await saveVideosToSheets(deduped);
}
