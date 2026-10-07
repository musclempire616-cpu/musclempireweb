import { APPS_SCRIPT_URL } from "@/lib/sheets";

const T = ["ZujXfS4o6t","pRWL2vQmAT","JbEFBaVKCs","1O7UGPqDyk"].join("");

const IMAGES_KEY = "me_gallery_images_v4";
const IMAGES_TS_KEY = "me_gallery_images_ts";
const VIDEOS_KEY = "me_gallery_videos_v4";
const VIDEOS_TS_KEY = "me_gallery_videos_ts";
const LAST_EDIT_KEY = "me_gallery_last_edit_ts";
const DELETED_IMAGES_KEY = "me_gallery_deleted_images_v2";
const DELETED_VIDEOS_KEY = "me_gallery_deleted_videos_v2";

export interface GalleryImage { id: string; src: string; alt: string; }
export interface GalleryVideo { id: string; src: string; alt: string; thumbnail?: string; }

let isSavingImages = false;
let isSavingVideos = false;

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

// ── Tombstone helpers for deletions ──────────────────────────────────────────

function getDeletedImageIds(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(DELETED_IMAGES_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw : []);
  } catch { return new Set(); }
}

function addDeletedImageId(id: string): void {
  const set = getDeletedImageIds();
  set.add(id);
  localStorage.setItem(DELETED_IMAGES_KEY, JSON.stringify(Array.from(set)));
}

function pruneDeletedImageIds(existingRemoteIds: Set<string>): void {
  const set = getDeletedImageIds();
  let changed = false;
  set.forEach(id => {
    if (!existingRemoteIds.has(id)) {
      set.delete(id);
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem(DELETED_IMAGES_KEY, JSON.stringify(Array.from(set)));
  }
}

function getDeletedVideoIds(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(DELETED_VIDEOS_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw : []);
  } catch { return new Set(); }
}

function addDeletedVideoId(id: string): void {
  const set = getDeletedVideoIds();
  set.add(id);
  localStorage.setItem(DELETED_VIDEOS_KEY, JSON.stringify(Array.from(set)));
}

function pruneDeletedVideoIds(existingRemoteIds: Set<string>): void {
  const set = getDeletedVideoIds();
  let changed = false;
  set.forEach(id => {
    if (!existingRemoteIds.has(id)) {
      set.delete(id);
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem(DELETED_VIDEOS_KEY, JSON.stringify(Array.from(set)));
  }
}

// ── localStorage helpers ─────────────────────────────────────────────────────

function recordLocalEdit(): void {
  localStorage.setItem(LAST_EDIT_KEY, String(Date.now()));
}

function isRecentLocalEdit(): boolean {
  const ts = parseInt(localStorage.getItem(LAST_EDIT_KEY) || "0", 10);
  return Date.now() - ts < 30_000; // Block remote overwrite for 30s after edit
}

function getLocalImages(): GalleryImage[] {
  try {
    const deleted = getDeletedImageIds();
    const raw: GalleryImage[] = JSON.parse(localStorage.getItem(IMAGES_KEY) || "[]");
    const valid = Array.isArray(raw) ? raw.filter(img => !deleted.has(img.id)) : [];
    return dedupeImages(valid);
  } catch { return []; }
}

function saveLocalImages(images: GalleryImage[]): void {
  const deduped = dedupeImages(images);
  localStorage.setItem(IMAGES_KEY, JSON.stringify(deduped));
  localStorage.setItem(IMAGES_TS_KEY, String(Date.now()));
}

function getLocalVideos(): GalleryVideo[] {
  try {
    const deleted = getDeletedVideoIds();
    const raw: GalleryVideo[] = JSON.parse(localStorage.getItem(VIDEOS_KEY) || "[]");
    const valid = Array.isArray(raw) ? raw.filter(vid => !deleted.has(vid.id)) : [];
    return dedupeVideos(valid);
  } catch { return []; }
}

function saveLocalVideos(videos: GalleryVideo[]): void {
  const deduped = dedupeVideos(videos);
  localStorage.setItem(VIDEOS_KEY, JSON.stringify(deduped));
  localStorage.setItem(VIDEOS_TS_KEY, String(Date.now()));
}

// ── Sheets ────────────────────────────────────────────────────────────────────

async function fetchImagesFromSheets(retry = 2): Promise<GalleryImage[] | null> {
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

async function fetchVideosFromSheets(retry = 2): Promise<GalleryVideo[] | null> {
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
  const local = getLocalImages();
  if (isSavingImages) return local;

  const remote = await fetchImagesFromSheets();
  if (remote !== null) {
    if (isSavingImages) return getLocalImages();

    const deletedIds = getDeletedImageIds();
    const filteredRemote = remote.filter(img => !deletedIds.has(img.id));
    const remoteIdSet = new Set(remote.map(img => img.id));
    pruneDeletedImageIds(remoteIdSet);

    if (isRecentLocalEdit()) {
      const currentLocal = getLocalImages();
      saveImagesToSheets(currentLocal).catch(() => {});
      return currentLocal;
    }

    const combined = dedupeImages([...local, ...filteredRemote]);
    saveLocalImages(combined);

    if (combined.length !== remote.length) {
      saveImagesToSheets(combined).catch(() => {});
    }

    window.dispatchEvent(new CustomEvent("galleryUpdated"));
    return combined;
  }
  return local;
}

export function addGalleryImage(src: string, alt: string): void {
  if (src.startsWith("data:")) throw new Error("Use a URL (imgbb.com) instead of uploading a file.");
  recordLocalEdit();
  const current = getLocalImages();
  const normSrc = src.trim().toLowerCase();
  if (current.find(i => i.src.trim().toLowerCase() === normSrc)) return;

  const newId = Date.now().toString();
  current.push({ id: newId, src: src.trim(), alt: alt.trim() });
  const deduped = dedupeImages(current);
  saveLocalImages(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));

  isSavingImages = true;
  saveImagesToSheets(deduped)
    .then(() => {
      setTimeout(() => saveImagesToSheets(deduped).catch(() => {}), 1500);
    })
    .finally(() => {
      setTimeout(() => { isSavingImages = false; }, 2500);
    });
}

export function removeGalleryImage(id: string): void {
  recordLocalEdit();
  addDeletedImageId(id);
  const current = getLocalImages().filter(i => i.id !== id);
  const deduped = dedupeImages(current);
  saveLocalImages(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));

  isSavingImages = true;
  saveImagesToSheets(deduped)
    .then(() => {
      setTimeout(() => saveImagesToSheets(deduped).catch(() => {}), 1500);
    })
    .finally(() => {
      setTimeout(() => { isSavingImages = false; }, 2500);
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
  const local = getLocalVideos();
  if (isSavingVideos) return local;

  const remote = await fetchVideosFromSheets();
  if (remote !== null) {
    if (isSavingVideos) return getLocalVideos();

    const deletedIds = getDeletedVideoIds();
    const filteredRemote = remote.filter(vid => !deletedIds.has(vid.id));
    const remoteIdSet = new Set(remote.map(vid => vid.id));
    pruneDeletedVideoIds(remoteIdSet);

    if (isRecentLocalEdit()) {
      const currentLocal = getLocalVideos();
      saveVideosToSheets(currentLocal).catch(() => {});
      return currentLocal;
    }

    const combined = dedupeVideos([...local, ...filteredRemote]);
    saveLocalVideos(combined);

    if (combined.length !== remote.length) {
      saveVideosToSheets(combined).catch(() => {});
    }

    window.dispatchEvent(new CustomEvent("galleryUpdated"));
    return combined;
  }
  return local;
}

export function addGalleryVideo(src: string, alt: string, thumbnail?: string): void {
  if (src.startsWith("data:")) throw new Error("Use a URL instead of uploading a file.");
  recordLocalEdit();
  const current = getLocalVideos();
  const normSrc = src.trim().toLowerCase();
  if (current.find(v => v.src.trim().toLowerCase() === normSrc)) return;

  const newId = Date.now().toString();
  current.push({ id: newId, src: src.trim(), alt: alt.trim(), thumbnail });
  const deduped = dedupeVideos(current);
  saveLocalVideos(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));

  isSavingVideos = true;
  saveVideosToSheets(deduped)
    .then(() => {
      setTimeout(() => saveVideosToSheets(deduped).catch(() => {}), 1500);
    })
    .finally(() => {
      setTimeout(() => { isSavingVideos = false; }, 2500);
    });
}

export function removeGalleryVideo(id: string): void {
  recordLocalEdit();
  addDeletedVideoId(id);
  const current = getLocalVideos().filter(v => v.id !== id);
  const deduped = dedupeVideos(current);
  saveLocalVideos(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));

  isSavingVideos = true;
  saveVideosToSheets(deduped)
    .then(() => {
      setTimeout(() => saveVideosToSheets(deduped).catch(() => {}), 1500);
    })
    .finally(() => {
      setTimeout(() => { isSavingVideos = false; }, 2500);
    });
}
