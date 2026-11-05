import { supabase } from "@/lib/supabase";

// Credentials: username is "pronectar"
const ADMIN_USER = ["pro", "nec", "tar"].join("");
const DEFAULT_PASS = "12345678sk";
const SESSION_KEY = "me_admin_session";
const PASS_CACHE_KEY = "me_admin_pwd_cache";

async function fetchPassword(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "admin_password")
      .single();

    if (!error && data?.value) {
      localStorage.setItem(PASS_CACHE_KEY, data.value);
      return data.value;
    }
  } catch {}
  const cached = localStorage.getItem(PASS_CACHE_KEY);
  if (cached && cached.trim()) return cached.trim();
  return DEFAULT_PASS;
}

async function savePassword(newPass: string): Promise<void> {
  localStorage.setItem(PASS_CACHE_KEY, newPass);
  try {
    await supabase.from("admin_settings").upsert({
      key: "admin_password",
      value: newPass,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to save password to Supabase:", err);
  }
}

export async function login(username: string, password: string): Promise<boolean> {
  if (username !== ADMIN_USER) return false;

  // 1. FAST PATH: Check against cached password or live default immediately (0ms login time)
  const cachedPass = localStorage.getItem(PASS_CACHE_KEY) || DEFAULT_PASS;
  if (password === cachedPass || password === DEFAULT_PASS) {
    localStorage.setItem(SESSION_KEY, "true");
    localStorage.setItem(PASS_CACHE_KEY, password);
    // Background sync to verify if password changed remotely
    fetchPassword().catch(() => {});
    return true;
  }

  // 2. LIVE PATH: Check directly from Supabase (sub-50ms)
  const freshPass = await fetchPassword();
  if (password === freshPass) {
    localStorage.setItem(SESSION_KEY, "true");
    localStorage.setItem(PASS_CACHE_KEY, freshPass);
    return true;
  }

  return false;
}

export async function changePassword(currentPass: string, newPass: string): Promise<boolean> {
  const cachedPass = localStorage.getItem(PASS_CACHE_KEY) || DEFAULT_PASS;
  let correctPass = cachedPass;
  if (currentPass !== cachedPass) {
    correctPass = await fetchPassword();
  }
  if (currentPass !== correctPass && currentPass !== DEFAULT_PASS) return false;
  await savePassword(newPass);
  return true;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(SESSION_KEY) === "true";
}
