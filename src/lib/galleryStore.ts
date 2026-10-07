import { APPS_SCRIPT_URL } from "@/lib/sheets";

const T = ["ZujXfS4o6t","pRWL2vQmAT","JbEFBaVKCs","1O7UGPqDyk"].join("");

const IMAGES_KEY = "me_gallery_images_v5";
const VIDEOS_KEY = "me_gallery_videos_v5";
const LAST_EDIT_KEY = "me_gallery_last_edit_ts";

export interface GalleryImage { id: string; src: string; alt: string; }
export interface GalleryVideo { id: string; src: string; alt: string; thumbnail?: string; }

let isSavingImages = false;
let isSavingVideos = false;

// ── Strict deduplication by normalized URL ───────────────────────────────────

export function dedupeImages(images: GalleryImage[]): GalleryImage[] {
  const seenSrcs = new Set<string>();
  return images.filter(img => {
    const normSrc = (img.src || "").trim().toLowerCase();
    if (!normSrc) return false;
    if (seenSrcs.has(normSrc)) return false;
    seenSrcs.add(normSrc);
    return true;
  });
}

export function dedupeVideos(videos: GalleryVideo[]): GalleryVideo[] {
  const seenSrcs = new Set<string>();
  return videos.filter(vid => {
    const normSrc = (vid.src || "").trim().toLowerCase();
    if (!normSrc) return false;
    if (seenSrcs.has(normSrc)) return false;
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
  return Date.now() - ts < 15_000;
}

function getLocalImages(): GalleryImage[] {
  try {
    const item = localStorage.getItem(IMAGES_KEY);
    if (!item) return [];
    return dedupeImages(JSON.parse(item));
  } catch { return []; }
}

function saveLocalImages(images: GalleryImage[]): void {
  const deduped = dedupeImages(images);
  localStorage.setItem(IMAGES_KEY, JSON.stringify(deduped));
}

function getLocalVideos(): GalleryVideo[] {
  try {
    const item = localStorage.getItem(VIDEOS_KEY);
    if (!item) return [];
    return dedupeVideos(JSON.parse(item));
  } catch { return []; }
}

function saveLocalVideos(videos: GalleryVideo[]): void {
  const deduped = dedupeVideos(videos);
  localStorage.setItem(VIDEOS_KEY, JSON.stringify(deduped));
}

// ── Google Sheets API ────────────────────────────────────────────────────────

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
      if (attempt < retry) await new Promise(r => setTimeout(r, 600));
    }
  }
  return null;
}

async function saveImagesToSheets(images: GalleryImage[]): Promise<boolean> {
  const deduped = dedupeImages(images);
  const dataStr = JSON.stringify(deduped);
  const qs = new URLSearchParams({ action: "saveImages", token: T, data: dataStr, _t: String(Date.now()) }).toString();
  const url = `${APPS_SCRIPT_URL}?${qs}`;

  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", cache: "no-store" });
    await res.text();
    return true;
  } catch {
    try {
      await fetch(url, { method: "GET", mode: "no-cors" });
      return true;
    } catch {
      return false;
    }
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
      if (attempt < retry) await new Promise(r => setTimeout(r, 600));
    }
  }
  return null;
}

async function saveVideosToSheets(videos: GalleryVideo[]): Promise<boolean> {
  const deduped = dedupeVideos(videos);
  const dataStr = JSON.stringify(deduped);
  const qs = new URLSearchParams({ action: "saveVideos", token: T, data: dataStr, _t: String(Date.now()) }).toString();
  const url = `${APPS_SCRIPT_URL}?${qs}`;

  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", cache: "no-store" });
    await res.text();
    return true;
  } catch {
    try {
      await fetch(url, { method: "GET", mode: "no-cors" });
      return true;
    } catch {
      return false;
    }
  }
}

// ── Public API — Images ──────────────────────────────────────────────────────

export async function getGalleryImages(): Promise<GalleryImage[]> {
  if (!isRecentLocalEdit() && !isSavingImages) {
    syncImagesFromSheets().catch(() => {});
  }
  return getLocalImages();
}

export async function syncImagesFromSheets(): Promise<GalleryImage[]> {
  if (isRecentLocalEdit() || isSavingImages) {
    return getLocalImages();
  }

  const remote = await fetchImagesFromSheets();
  if (remote !== null) {
    if (isRecentLocalEdit() || isSavingImages) {
      return getLocalImages();
    }
    const dedupedRemote = dedupeImages(remote);
    saveLocalImages(dedupedRemote);
    if (remote.length > dedupedRemote.length) {
      saveImagesToSheets(dedupedRemote).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent("galleryUpdated"));
    return dedupedRemote;
  }
  return getLocalImages();
}

export function addGalleryImage(src: string, alt: string): void {
  if (src.startsWith("data:")) throw new Error("Use a URL (imgbb.com) instead of uploading a file.");
  recordLocalEdit();
  const current = getLocalImages();
  const normSrc = src.trim().toLowerCase();
  if (current.find(i => i.src.trim().toLowerCase() === normSrc)) return;

  const newId = "img_" + Date.now();
  current.push({ id: newId, src: src.trim(), alt: alt.trim() });
  const deduped = dedupeImages(current);
  saveLocalImages(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));

  isSavingImages = true;
  saveImagesToSheets(deduped).finally(() => {
    setTimeout(() => { isSavingImages = false; }, 2000);
  });
}

export function removeGalleryImage(id: string): void {
  recordLocalEdit();
  const current = getLocalImages().filter(i => i.id !== id);
  const deduped = dedupeImages(current);
  saveLocalImages(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));

  isSavingImages = true;
  saveImagesToSheets(deduped).finally(() => {
    setTimeout(() => { isSavingImages = false; }, 2000);
  });
}

// ── Public API — Videos ──────────────────────────────────────────────────────

export async function getGalleryVideos(): Promise<GalleryVideo[]> {
  if (!isRecentLocalEdit() && !isSavingVideos) {
    syncVideosFromSheets().catch(() => {});
  }
  return getLocalVideos();
}

export async function syncVideosFromSheets(): Promise<GalleryVideo[]> {
  if (isRecentLocalEdit() || isSavingVideos) {
    return getLocalVideos();
  }

  const remote = await fetchVideosFromSheets();
  if (remote !== null) {
    if (isRecentLocalEdit() || isSavingVideos) {
      return getLocalVideos();
    }
    const dedupedRemote = dedupeVideos(remote);
    saveLocalVideos(dedupedRemote);
    if (remote.length > dedupedRemote.length) {
      saveVideosToSheets(dedupedRemote).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent("galleryUpdated"));
    return dedupedRemote;
  }
  return getLocalVideos();
}

export function addGalleryVideo(src: string, alt: string, thumbnail?: string): void {
  if (src.startsWith("data:")) throw new Error("Use a URL instead of uploading a file.");
  recordLocalEdit();
  const current = getLocalVideos();
  const normSrc = src.trim().toLowerCase();
  if (current.find(v => v.src.trim().toLowerCase() === normSrc)) return;

  const newId = "vid_" + Date.now();
  current.push({ id: newId, src: src.trim(), alt: alt.trim(), thumbnail });
  const deduped = dedupeVideos(current);
  saveLocalVideos(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));

  isSavingVideos = true;
  saveVideosToSheets(deduped).finally(() => {
    setTimeout(() => { isSavingVideos = false; }, 2000);
  });
}

export function removeGalleryVideo(id: string): void {
  recordLocalEdit();
  const current = getLocalVideos().filter(v => v.id !== id);
  const deduped = dedupeVideos(current);
  saveLocalVideos(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));

  isSavingVideos = true;
  saveVideosToSheets(deduped).finally(() => {
    setTimeout(() => { isSavingVideos = false; }, 2000);
  });
}
