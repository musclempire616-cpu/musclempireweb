import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { login, changePassword, hasValidSession } from "@/lib/adminAuth";
import { Lock, Eye, EyeOff, KeyRound } from "lucide-react";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "change">("login");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changeMsg, setChangeMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    hasValidSession().then((valid) => {
      if (valid) navigate("/sagarkharat/dashboard");
    });
  }, [navigate]);

  const inputCls = "w-full bg-[#0d1117] border border-white/10 focus:border-green-400 focus:outline-none h-11 px-3 text-white placeholder:text-white/20 text-sm rounded-lg transition-colors";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");
    const ok = await login(username.trim(), password);
    if (ok) {
      navigate("/sagarkharat/dashboard");
    } else {
      setLoginError("Invalid username or password.");
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeMsg(null);
    if (newPass.length < 8) { setChangeMsg({ text: "New password must be at least 8 characters.", ok: false }); return; }
    if (newPass !== confirmPass) { setChangeMsg({ text: "New passwords do not match.", ok: false }); return; }
    setChanging(true);
    const ok = await changePassword(currentPass, newPass);
    setChanging(false);
    if (ok) {
      setChangeMsg({ text: "Password changed! All devices updated.", ok: true });
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
      setTimeout(() => setMode("login"), 1800);
    } else {
      setChangeMsg({ text: "Current password is incorrect.", ok: false });
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-500/10 border border-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {mode === "login" ? <Lock size={24} className="text-green-400" /> : <KeyRound size={24} className="text-green-400" />}
          </div>
          <h1 className="text-xl font-black uppercase tracking-widest text-white">
            {mode === "login" ? "Admin Portal" : "Change Password"}
          </h1>
          <p className="text-white/30 text-xs mt-1 uppercase tracking-widest">Muscle Empire Nutrition</p>
        </div>

        {mode === "login" && (
          <form onSubmit={handleLogin} className="bg-[#161b22] border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-1.5">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter username" autoComplete="username" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                  autoComplete="current-password" className={inputCls + " pr-10"} />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {loginError && <p className="text-red-400 text-xs text-center bg-red-400/10 border border-red-400/20 rounded-lg py-2">{loginError}</p>}
            <button type="submit" disabled={loading || !username || !password}
              className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-black uppercase tracking-widest py-3 rounded-xl text-sm transition-colors">
              {loading ? "Verifying..." : "Sign In"}
            </button>
            <button type="button" onClick={() => { setMode("change"); setLoginError(""); }}
              className="w-full text-white/30 hover:text-white/60 text-xs uppercase tracking-widest py-2 transition-colors">
              Change Password
            </button>
          </form>
        )}

        {mode === "change" && (
          <form onSubmit={handleChangePassword} className="bg-[#161b22] border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-1.5">Current Password</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)} placeholder="Enter current password"
                  className={inputCls + " pr-10"} />
                <button type="button" onClick={() => setShowCurrent(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-1.5">New Password</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPass}
                  onChange={e => setNewPass(e.target.value)} placeholder="Min 8 characters"
                  className={inputCls + " pr-10"} />
                <button type="button" onClick={() => setShowNew(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-1.5">Confirm New Password</label>
              <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                placeholder="Repeat new password" className={inputCls} />
            </div>
            {changeMsg && (
              <p className={`text-xs text-center px-3 py-2 rounded-lg border ${changeMsg.ok ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-red-400 bg-red-400/10 border-red-400/20"}`}>
                {changeMsg.text}
              </p>
            )}
            <button type="submit" disabled={changing || !currentPass || !newPass || !confirmPass}
              className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-black uppercase tracking-widest py-3 rounded-xl text-sm transition-colors">
              {changing ? "Saving to all devices..." : "Update Password"}
            </button>
            <button type="button" onClick={() => { setMode("login"); setChangeMsg(null); }}
              className="w-full text-white/30 hover:text-white/60 text-xs uppercase tracking-widest py-2 transition-colors">
              Back to Login
            </button>
          </form>
        )}
        <p className="text-center text-white/15 text-xs mt-6">This is a private admin area.</p>
      </div>
    </div>
  );
}
