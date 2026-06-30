"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, ShieldAlert, Sun, Moon, RefreshCw, Eye, EyeOff } from "lucide-react";
import { verifyAdminLogin } from "../../actions";

export default function AdminLogin() {
  const router = useRouter();

  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
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
  }, [router]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  /* ── Login handler ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!adminId.trim() || !password) {
      setError("Please enter your Admin ID and password.");
      return;
    }
    setLoading(true);

    try {
      const res = await verifyAdminLogin(adminId, password);
      if (res.success && res.data) {
        const found = res.data;
        // Save session information to localStorage
        localStorage.setItem("admin_auth", "true");
        localStorage.setItem("admin_id", found.id);
        localStorage.setItem("admin_name", found.name);
        localStorage.setItem("admin_role", found.role);
        localStorage.setItem("admin_email", found.email);
        localStorage.setItem("admin_mobile", found.mobile);
        localStorage.setItem("admin_assigned_labs", found.assigned_labs);
        if (found.profile_photo) {
          localStorage.setItem("admin_profile_photo", found.profile_photo);
        } else {
          localStorage.removeItem("admin_profile_photo");
        }
        
        router.push("/admin");
      } else {
        setError(res.error || "Invalid Admin ID or Password. Please try again.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setError("Authentication error. Please check database connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-rose-50/20 via-slate-50/50 to-rose-50/10 dark:from-zinc-950 dark:to-zinc-950">
      
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
      <div className="glass-card w-full max-w-sm p-8 shadow-2xl relative overflow-hidden">
        
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-suas-ruby/15 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-8 w-32 h-32 rounded-full bg-gradient-to-tr from-suas-ruby-neon/10 to-transparent blur-2xl pointer-events-none" />

        {/* Logo + heading */}
        <div className="text-center space-y-3 mb-7 relative z-10">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/30 text-suas-ruby dark:text-suas-ruby-neon rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Lock size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white font-display tracking-tight">
              SCSIT Admin Portal
            </h1>
            <p className="text-[10px] font-bold text-suas-ruby dark:text-suas-ruby-neon uppercase tracking-wider mt-0.5">
              School of Computer Science &amp; IT
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-suas-ruby dark:text-suas-ruby-neon text-xs flex items-start gap-2.5">
            <ShieldAlert size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4 relative z-10" noValidate>
          {/* Admin ID */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
              Admin ID
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. admin, it.staff1"
                value={adminId}
                onChange={e => { setAdminId(e.target.value); setError(""); }}
                autoComplete="username"
                className="field-input !pl-10 pr-4"
              />
              <User className="absolute left-3.5 top-[12px] text-suas-ruby dark:text-suas-ruby-neon shrink-0" size={16} />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                autoComplete="current-password"
                className="field-input !pl-10 pr-10"
              />
              <Lock className="absolute left-3.5 top-[12px] text-suas-ruby dark:text-suas-ruby-neon shrink-0" size={16} />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-3 text-slate-450 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 flex items-center justify-center gap-2 bg-slate-900 dark:bg-white hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white text-white dark:text-slate-900 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md transition duration-250 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <span>Sign In to Dashboard</span>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold space-y-1">
        <p className="uppercase tracking-wider">Developed &amp; Maintained by SCSIT IT Team</p>
        <p>School of Computer Science &amp; Information Technology, SUAS</p>
      </footer>
    </div>
  );
}
