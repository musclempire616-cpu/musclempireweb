import { supabase } from "@/lib/supabase";

const IMAGES_KEY = "me_gallery_images_v5";
const VIDEOS_KEY = "me_gallery_videos_v5";
const LAST_EDIT_KEY = "me_gallery_last_edit_ts";

export interface GalleryImage { id: string; src: string; alt: string; }
export interface GalleryVideo { id: string; src: string; alt: string; thumbnail?: string; }

let isSavingImages = false;
let isSavingVideos = false;
let realtimeSubscribed = false;

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
  try { localStorage.setItem(LAST_EDIT_KEY, String(Date.now())); } catch {}
}

function isRecentLocalEdit(): boolean {
  try {
    const ts = parseInt(localStorage.getItem(LAST_EDIT_KEY) || "0", 10);
    return Date.now() - ts < 15_000;
  } catch {
    return false;
  }
}

function getLocalImages(): GalleryImage[] {
  try {
    const raw = JSON.parse(localStorage.getItem(IMAGES_KEY) || "[]");
    return Array.isArray(raw) ? dedupeImages(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalImages(images: GalleryImage[]): void {
  try { localStorage.setItem(IMAGES_KEY, JSON.stringify(images)); } catch {}
}

function getLocalVideos(): GalleryVideo[] {
  try {
    const raw = JSON.parse(localStorage.getItem(VIDEOS_KEY) || "[]");
    return Array.isArray(raw) ? dedupeVideos(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalVideos(videos: GalleryVideo[]): void {
  try { localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos)); } catch {}
}

// ── Supabase Realtime Setup ──────────────────────────────────────────────────
function setupRealtime() {
  if (realtimeSubscribed || typeof window === "undefined") return;
  realtimeSubscribed = true;

  try {
    supabase
      .channel("public:gallery")
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery" }, () => {
        syncImagesFromSheets().catch(() => {});
        syncVideosFromSheets().catch(() => {});
        window.dispatchEvent(new CustomEvent("galleryUpdated"));
      })
      .subscribe();
  } catch (err) {
    console.warn("Could not subscribe to Supabase gallery realtime:", err);
  }
}

// ── Supabase API Sync Functions ──────────────────────────────────────────────

async function fetchImagesFromSupabase(): Promise<GalleryImage[] | null> {
  setupRealtime();
  try {
    const { data, error } = await supabase
      .from("gallery")
      .select("*")
      .eq("type", "image")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetch images error:", error.message);
      return null;
    }
    return (data || []).map((row: any) => ({
      id: String(row.id),
      src: String(row.src),
      alt: String(row.alt || ""),
    }));
  } catch {
    return null;
  }
}

async function fetchVideosFromSupabase(): Promise<GalleryVideo[] | null> {
  setupRealtime();
  try {
    const { data, error } = await supabase
      .from("gallery")
      .select("*")
      .eq("type", "video")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetch videos error:", error.message);
      return null;
    }
    return (data || []).map((row: any) => ({
      id: String(row.id),
      src: String(row.src),
      alt: String(row.alt || ""),
      thumbnail: row.thumbnail || undefined,
    }));
  } catch {
    return null;
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

  const remote = await fetchImagesFromSupabase();
  if (remote !== null) {
    const dedupedRemote = dedupeImages(remote);
    saveLocalImages(dedupedRemote);
    window.dispatchEvent(new CustomEvent("galleryUpdated"));
    return dedupedRemote;
  }
  return getLocalImages();
}

export function addGalleryImage(src: string, alt: string): void {
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
  supabase.from("gallery").upsert({ id: newId, type: "image", src: src.trim(), alt: alt.trim() }).then(() => {
    setTimeout(() => { isSavingImages = false; }, 1000);
  });
}

export function removeGalleryImage(id: string): void {
  recordLocalEdit();
  const current = getLocalImages().filter(i => i.id !== id);
  const deduped = dedupeImages(current);
  saveLocalImages(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));

  isSavingImages = true;
  supabase.from("gallery").delete().eq("id", id).then(() => {
    setTimeout(() => { isSavingImages = false; }, 1000);
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

  const remote = await fetchVideosFromSupabase();
  if (remote !== null) {
    const dedupedRemote = dedupeVideos(remote);
    saveLocalVideos(dedupedRemote);
    window.dispatchEvent(new CustomEvent("galleryUpdated"));
    return dedupedRemote;
  }
  return getLocalVideos();
}

export function addGalleryVideo(src: string, alt: string, thumbnail?: string): void {
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
  supabase.from("gallery").upsert({ id: newId, type: "video", src: src.trim(), alt: alt.trim(), thumbnail: thumbnail || "" }).then(() => {
    setTimeout(() => { isSavingVideos = false; }, 1000);
  });
}

export function removeGalleryVideo(id: string): void {
  recordLocalEdit();
  const current = getLocalVideos().filter(v => v.id !== id);
  const deduped = dedupeVideos(current);
  saveLocalVideos(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));

  isSavingVideos = true;
  supabase.from("gallery").delete().eq("id", id).then(() => {
    setTimeout(() => { isSavingVideos = false; }, 1000);
  });
}
