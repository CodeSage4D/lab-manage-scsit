"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, ShieldAlert, Sun, Moon, RefreshCw, Eye, EyeOff, KeyRound, Sparkles, AlertCircle } from "lucide-react";
import { verifyAdminLogin, verifyAdminPINLogin, setupAdminPIN } from "../../actions";

export default function AdminLogin() {
  const router = useRouter();

  const [loginMethod, setLoginMethod] = useState<"password" | "pin">("password");
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [showPass, setShowPass] = useState(false);
  
  // PIN Setup Modal states (shown on first successful password login if no PIN is set)
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [tempAdminId, setTempAdminId] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  /* ── Initialise ── */
  useEffect(() => {
    const isAuth = localStorage.getItem("admin_auth") === "true";
    if (isAuth) {
      router.replace("/admin");
      return;
    }

    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setTheme(isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);
    
    // Check if there's a saved Admin ID to speed up login
    const savedId = localStorage.getItem("last_admin_id");
    if (savedId) {
      setAdminId(savedId);
    }
  }, [router]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  /* ── Authentication Handler ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    
    if (!adminId.trim()) {
      setError("Please enter your Admin ID.");
      return;
    }

    if (loginMethod === "password" && !password) {
      setError("Please enter your password.");
      return;
    }

    if (loginMethod === "pin" && (!pin || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin))) {
      setError("Please enter a valid 4 to 8 digit numeric PIN.");
      return;
    }

    setLoading(true);

    try {
      if (loginMethod === "password") {
        const res = await verifyAdminLogin(adminId, password);
        if (res.success && res.data) {
          const found = res.data;
          
          // Save last logged in ID for quick PIN login later
          localStorage.setItem("last_admin_id", found.id);

          // If PIN is not set, block dashboard routing and trigger PIN setup modal
          if (!found.isPinSet) {
            setTempAdminId(found.id);
            setTempPassword(password);
            setShowPinSetup(true);
            setLoading(false);
            return;
          }

          completeSession(found);
        } else {
          setError(res.error || "Invalid Admin ID or Password.");
          setLoading(false);
        }
      } else {
        // PIN login
        const res = await verifyAdminPINLogin(adminId, pin);
        if (res.success && res.data) {
          completeSession(res.data);
        } else {
          setError(res.error || "Invalid PIN passcode.");
          setLoading(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Authentication error. Please check database connection and try again.");
      setLoading(false);
    }
  };

  /* ── Save session state ── */
  const completeSession = (adminData: any) => {
    localStorage.setItem("admin_auth", "true");
    localStorage.setItem("admin_id", adminData.id);
    localStorage.setItem("admin_name", adminData.name);
    localStorage.setItem("admin_role", adminData.role);
    localStorage.setItem("admin_email", adminData.email);
    localStorage.setItem("admin_mobile", adminData.mobile);
    localStorage.setItem("admin_assigned_labs", adminData.assigned_labs || "");
    localStorage.setItem("login_timestamp", Date.now().toString());
    
    if (adminData.profile_photo) {
      localStorage.setItem("admin_profile_photo", adminData.profile_photo);
    } else {
      localStorage.removeItem("admin_profile_photo");
    }
    
    router.push("/admin");
  };

  /* ── PIN Creation Handler ── */
  const handlePinSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPin !== confirmPin) {
      setError("PINs do not match. Please verify.");
      return;
    }

    if (newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      setError("PIN passcode must be between 4 and 8 digits numeric.");
      return;
    }

    setLoading(true);
    try {
      const res = await setupAdminPIN(tempAdminId, tempPassword, newPin);
      if (res.success) {
        setShowPinSetup(false);
        setSuccessMsg("PIN passcode configured successfully! Logging you in...");
        
        // Re-authenticate to get session
        const loginRes = await verifyAdminLogin(tempAdminId, tempPassword);
        if (loginRes.success && loginRes.data) {
          setTimeout(() => {
            completeSession(loginRes.data);
          }, 1200);
        } else {
          setError("Failed to initialize session. Please reload and login with PIN.");
          setLoading(false);
        }
      } else {
        setError(res.error || "Failed to configure PIN passcode.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("PIN registration failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-rose-50/20 via-slate-50/50 to-rose-50/10 dark:from-zinc-950 dark:to-zinc-950 transition-colors duration-300">
      
      {/* Theme toggle — top-right corner */}
      <div className="fixed top-4 right-4">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-zinc-800 transition"
          title="Toggle Theme"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      {/* Centered glass login card */}
      <div className="glass-card w-full max-w-sm p-8 shadow-2xl relative overflow-hidden text-left border border-slate-200/50 dark:border-zinc-800/50">
        
        {/* Decorative blur blobs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-suas-ruby/15 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-8 w-32 h-32 rounded-full bg-gradient-to-tr from-suas-ruby-neon/10 to-transparent blur-2xl pointer-events-none" />

        {/* Logo + heading */}
        <div className="text-center space-y-3 mb-7 relative z-10">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/30 text-suas-ruby dark:text-suas-ruby-neon rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Lock size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-805 dark:text-white font-display tracking-tight uppercase">
              SCSIT Portal Lock
            </h1>
            <p className="text-[10px] font-bold text-suas-ruby dark:text-suas-ruby-neon uppercase tracking-wider mt-0.5">
              Secure Multi-Admin Credentials
            </p>
          </div>
        </div>

        {/* Toggle Login Method */}
        <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl mb-6 relative z-10">
          <button
            type="button"
            onClick={() => { setLoginMethod("password"); setError(""); }}
            className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              loginMethod === "password"
                ? "bg-white dark:bg-zinc-800 text-slate-850 dark:text-white shadow-sm"
                : "text-slate-400 hover:text-slate-655"
            }`}
          >
            Password Auth
          </button>
          <button
            type="button"
            onClick={() => { setLoginMethod("pin"); setError(""); }}
            className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              loginMethod === "pin"
                ? "bg-white dark:bg-zinc-800 text-slate-850 dark:text-white shadow-sm"
                : "text-slate-400 hover:text-slate-655"
            }`}
          >
            Quick PIN Login
          </button>
        </div>

        {/* Success/Error messages */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-suas-ruby dark:text-suas-ruby-neon text-xs flex items-start gap-2.5">
            <ShieldAlert size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-250 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5">
            <Sparkles size={14} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4 relative z-10" noValidate>
          {/* Admin ID / Username / Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Admin ID / Official Email
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. N5428, monark.raikwar"
                value={adminId}
                onChange={e => { setAdminId(e.target.value); setError(""); }}
                autoComplete="username"
                className="field-input !pl-10 pr-4"
              />
              <User className="absolute left-3.5 top-[12px] text-suas-ruby dark:text-suas-ruby-neon shrink-0" size={16} />
            </div>
          </div>

          {/* Password Auth Form */}
          {loginMethod === "password" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Enter secure password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  autoComplete="current-password"
                  className="field-input !pl-10 pr-10"
                />
                <Lock className="absolute left-3.5 top-[12px] text-suas-ruby dark:text-suas-ruby-neon shrink-0" size={16} />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-3 text-slate-450 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ) : (
            // PIN Quick Login Form
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Quick Login PIN Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="4 to 8 digit Passcode"
                  maxLength={8}
                  pattern="\d*"
                  value={pin}
                  onChange={e => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                  className="field-input !pl-10 pr-4 font-mono tracking-widest text-center"
                />
                <KeyRound className="absolute left-3.5 top-[12px] text-suas-ruby dark:text-suas-ruby-neon shrink-0" size={16} />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 flex items-center justify-center gap-2 bg-slate-900 dark:bg-white hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white text-white dark:text-slate-900 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md transition duration-250 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Terminal</span>
            )}
          </button>
        </form>
      </div>

      {/* PIN Setup Overlay Modal */}
      {showPinSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800/50 max-w-sm w-full rounded-2xl shadow-2xl p-6 relative text-left">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/25 border border-amber-100 dark:border-amber-900/30 text-amber-500 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm mb-3">
                <KeyRound size={20} />
              </div>
              <h3 className="text-base font-black text-slate-805 dark:text-white font-display">Configure Quick PIN Passcode</h3>
              <p className="text-[10px] text-slate-455 mt-1">To enable future rapid logins, configure a secure 4-8 digit passcode now.</p>
            </div>

            <form onSubmit={handlePinSetupSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase tracking-wider block text-slate-400 font-bold">New Passcode PIN</label>
                <input
                  type="password"
                  placeholder="4 to 8 digits numeric"
                  maxLength={8}
                  pattern="\d*"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))}
                  className="field-input font-mono tracking-widest text-center"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase tracking-wider block text-slate-400 font-bold">Confirm Passcode PIN</label>
                <input
                  type="password"
                  placeholder="Re-enter passcode"
                  maxLength={8}
                  pattern="\d*"
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  className="field-input font-mono tracking-widest text-center"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition shadow-md cursor-pointer disabled:opacity-60"
              >
                {loading ? <RefreshCw size={13} className="animate-spin mx-auto" /> : <span>Confirm & Setup PIN</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 text-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold space-y-1">
        <p className="uppercase tracking-wider">Developed &amp; Maintained by SCSIT IT Team</p>
        <p>School of Computer Science &amp; Information Technology, SUAS</p>
      </footer>
    </div>
  );
}
