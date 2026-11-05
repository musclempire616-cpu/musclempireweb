import { supabase } from "@/lib/supabase";

// Admin username is "pronectar" or "admin@musclempire.in"
const ADMIN_USER = ["pro", "nec", "tar"].join("");
const ADMIN_EMAIL = "admin@musclempire.in";
const SESSION_KEY = "me_admin_session";

export async function login(username: string, password: string): Promise<boolean> {
  const normUser = username.trim().toLowerCase();
  if (normUser !== ADMIN_USER && normUser !== ADMIN_EMAIL) {
    return false;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: password.trim(),
    });

    if (error || !data.session) {
      console.warn("Supabase auth login failed:", error?.message);
      return false;
    }

    localStorage.setItem(SESSION_KEY, "true");
    return true;
  } catch (err) {
    console.error("Login error:", err);
    return false;
  }
}

export async function changePassword(currentPass: string, newPass: string): Promise<boolean> {
  try {
    // 1. Verify current credentials
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: currentPass.trim(),
    });
    if (verifyErr) return false;

    // 2. Update to new password in Supabase Auth
    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPass.trim(),
    });

    if (updateErr) {
      console.error("Failed to update password:", updateErr.message);
      return false;
    }

    // 3. Keep admin_settings in sync (accessible now because user is authenticated)
    await supabase.from("admin_settings").upsert({
      key: "admin_password",
      value: newPass.trim(),
      updated_at: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.error("Change password error:", err);
    return false;
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
  supabase.auth.signOut().catch(() => {});
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(SESSION_KEY) === "true";
}

export async function hasValidSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      localStorage.setItem(SESSION_KEY, "true");
      return true;
    }
  } catch {}
  localStorage.removeItem(SESSION_KEY);
  return false;
}
