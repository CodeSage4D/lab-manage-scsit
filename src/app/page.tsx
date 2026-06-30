"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Mail, Phone, BookOpen, Plus, Trash2, Check, 
  Moon, Sun, ArrowRight, ArrowLeft, Download, Info, 
  Sparkles, CheckCircle2, X, FileText, Search, ShieldAlert, Award, ChevronDown
} from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import { submitForm, lookupSubmissionStatus, getSettings } from "./actions";

interface SoftwareRow {
  id: string;
  semester: string;
  softwareName: string;
  version: string;
  framework: string;
  frameworkVersion: string;
}

const SEMESTERS = [
  "Semester I", "Semester II", "Semester III", "Semester IV", 
  "Semester V", "Semester VI", "Semester VII", "Semester VIII"
];

const PRESETS = [
  { name: "Python", framework: "Django / Flask", version: "3.12" },
  { name: "Java JDK", framework: "Spring Boot / Hibernate", version: "21" },
  { name: ".NET SDK", framework: "ASP.NET Core", version: "8.0" },
  { name: "React", framework: "Next.js / Vite / Tailwind", version: "19.0" },
  { name: "Node.js", framework: "Express / NestJS", version: "20.12" },
  { name: "PostgreSQL", framework: "Relational DB", version: "16.2" },
  { name: "MySQL", framework: "Relational DB", version: "8.0" },
  { name: "MATLAB", framework: "Numeric Computing", version: "R2024b" },
  { name: "Docker Desktop", framework: "Containerization", version: "26.1" }
];

export default function FacultyPortal() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [portalTab, setPortalTab] = useState<"submit" | "track">("submit");

  // Steps: 1 = Enrollment, 2 = Software Specification Table, 3 = Receipt
  const [step, setStep] = useState(1);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Faculty details
  const [facultyData, setFacultyData] = useState({
    name: "",
    email: "",
    mobile: "",
    department: "SCSIT",
    semester: "Semester I"
  });

  // Software rows being built
  const [softwareList, setSoftwareList] = useState<SoftwareRow[]>([]);
  const [currSemester, setCurrSemester] = useState("Semester I");
  const [currSoftware, setCurrSoftware] = useState("");
  const [currVersion, setCurrVersion] = useState("");
  const [currFramework, setCurrFramework] = useState("");
  const [currFrameworkVersion, setCurrFrameworkVersion] = useState("");
  
  // Signature & Verification
  const [signature, setSignature] = useState<string | null>(null);
  const [isSignatureConfirmed, setIsSignatureConfirmed] = useState(false);

  // Autocomplete preset suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Loading & Submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    submissionId: string;
    createdAt: string;
  } | null>(null);

  // Tracking details
  const [trackQuery, setTrackQuery] = useState("");
  const [trackingResults, setTrackingResults] = useState<any[] | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  // UI helpers
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Close software presets dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync theme
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setTheme(isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);

    async function fetchPortalSettings() {
      try {
        const res = await getSettings();
        if (res.success && res.settings) {
          setSettings(res.settings);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoadingSettings(false);
      }
    }
    fetchPortalSettings();
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  // Autocomplete suggest matching
  const filteredPresets = PRESETS.filter(p =>
    p.name.toLowerCase().includes(currSoftware.toLowerCase()) && currSoftware.trim() !== ""
  );

  const selectPreset = (preset: typeof PRESETS[0]) => {
    setCurrSoftware(preset.name);
    setCurrVersion(preset.version);
    setCurrFramework(preset.framework);
    setCurrFrameworkVersion("");
    setShowSuggestions(false);
  };

  // Step 1 validation (Faculty Information)
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    
    if (!facultyData.name.trim()) errs.name = "Full Name is required";
    
    const emailLower = facultyData.email.trim().toLowerCase();
    if (!emailLower) errs.email = "Symbiosis Email is required";
    else if (!emailLower.endsWith("@suas.ac.in")) errs.email = "Only Symbiosis domain email (@suas.ac.in) is acceptable";
    
    const cleanMobile = facultyData.mobile.replace(/[^0-9]/g, "");
    if (!facultyData.mobile.trim()) errs.mobile = "Mobile Number is required";
    else if (cleanMobile.length < 10) errs.mobile = "Mobile number must be at least 10 digits";

    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setStep(2);
    }
  };

  // Add Software specification Row
  const handleAddRow = () => {
    const errs: Record<string, string> = {};
    if (!currSoftware.trim()) errs.software = "Software Name is required";
    if (!currVersion.trim()) errs.version = "Software Version is required";

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const newRow: SoftwareRow = {
      id: String(Date.now()),
      semester: currSemester,
      softwareName: currSoftware.trim(),
      version: currVersion.trim(),
      framework: currFramework.trim(),
      frameworkVersion: currFrameworkVersion.trim()
    };

    setSoftwareList(prev => [...prev, newRow]);
    
    // Clear requirement inputs (keep semester for ease of batch entries)
    setCurrSoftware("");
    setCurrVersion("");
    setCurrFramework("");
    setCurrFrameworkVersion("");
    showToast("Requirement row added successfully!");
  };

  // Remove specification Row
  const handleRemoveRow = (id: string) => {
    setSoftwareList(prev => prev.filter(r => r.id !== id));
    showToast("Requirement row removed.");
  };

  // Final Submit Action
  const handleFinalSubmit = async () => {
    if (!signature) {
      showToast("Verification signature is required.");
      return;
    }
    if (!isSignatureConfirmed) {
      showToast("Please confirm your signature verification checkbox.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Map rows to classes schema
      const mappedSubjects = [{
        id: String(Date.now()),
        subjectCode: "REQ",
        subjectName: "Lab Specifications Request",
        semesters: Array.from(new Set(softwareList.map(s => s.semester))),
        softwares: softwareList,
        framework: softwareList[0]?.framework || "",
        labSelection: null,
        status: "Pending",
        remarks: ""
      }];

      const res = await submitForm(facultyData, mappedSubjects, signature);
      if (res.success && res.data) {
        setSubmitResult({
          submissionId: res.data.submissionId,
          createdAt: res.data.createdAt
        });
        setSoftwareList([]);
        setSignature(null);
        setIsSignatureConfirmed(false);
        setShowReviewModal(false);
        setStep(3); // Go to receipt
      } else {
        showToast(res.error || "Submission failed. Please check network connection.");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to submit form due to internal error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Lookup Tracking Widget
  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError("");
    setTrackingResults(null);
    if (!trackQuery.trim()) {
      setTrackError("Please enter email address or AXN reference number.");
      return;
    }

    setIsTrackingLoading(true);
    try {
      const res = await lookupSubmissionStatus(trackQuery);
      if (res.success && res.data) {
        if (res.data.length === 0) {
          setTrackError("No matching submission records found.");
        } else {
          setTrackingResults(res.data);
        }
      } else {
        setTrackError(res.error || "Failed to query status.");
      }
    } catch (err) {
      console.error(err);
      setTrackError("Failed to resolve tracking details.");
    } finally {
      setIsTrackingLoading(false);
    }
  };

  // Helper status neon mapping
  const getStatusIndicator = (status: string) => {
    const normalized = (status || "pending").toLowerCase();
    if (normalized === "approved" || normalized === "completed" || normalized === "installed") {
      return { class: "neon-glow-green", dot: "● Approved", label: "Approved / Installed" };
    }
    if (normalized === "rejected" || normalized === "action required") {
      return { class: "neon-glow-ruby", dot: "● Action Required", label: "Rejected / Action Needed" };
    }
    return { class: "neon-glow-yellow", dot: "● Under Review", label: "Pending / Under Review" };
  };

  if (loadingSettings) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-t-suas-ruby border-slate-200 dark:border-zinc-800 rounded-full animate-spin" />
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 font-black uppercase tracking-widest animate-pulse">
          Loading SCSIT Portal Settings...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 min-h-screen">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700/80 text-xs font-bold font-sans"
          >
            <Sparkles size={14} className="text-suas-ruby-neon animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <header className="glass-panel no-print w-full max-w-5xl mx-auto p-4 flex items-center justify-between mb-8">
        <div className="flex items-center gap-3.5">
          <img 
            src="/img/symbiosis-university-of-applied-sciences-logo.jpg" 
            alt="Symbiosis Logo" 
            className="w-10 h-10 object-contain rounded-lg shrink-0 bg-white p-0.5"
          />
          <div>
            <h1 className="text-xs md:text-sm font-black text-slate-800 dark:text-white tracking-tight leading-tight">
              Symbiosis University of Applied Sciences
            </h1>
            <h3 className="text-[9px] md:text-[10px] font-black text-suas-ruby dark:text-suas-ruby-neon mt-0.5 font-display leading-tight">
              School of Computer Science and Information Technology (SCSIT)
            </h3>
            <h6 className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5 leading-none">
              Software Requirements List
            </h6>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.href = "/admin/login"}
            className="px-3.5 py-1.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-55 dark:hover:bg-zinc-800 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 transition cursor-pointer"
          >
            Admin Panel
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-55 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full max-w-4xl mx-auto space-y-6 pb-12">
        
        {/* Portal navigation tabs */}
        {settings.installation_status_enabled === "true" && step !== 3 && (
          <div className="no-print flex justify-center bg-slate-50 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 max-w-md mx-auto mb-2">
            <button
              onClick={() => setPortalTab("submit")}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${portalTab === "submit" ? "bg-white dark:bg-zinc-950 text-suas-ruby dark:text-suas-ruby-neon shadow-sm border border-slate-200/40 dark:border-zinc-800/40" : "text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350"}`}
            >
              Submit Requirements
            </button>
            <button
              onClick={() => setPortalTab("track")}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${portalTab === "track" ? "bg-white dark:bg-zinc-950 text-suas-ruby dark:text-suas-ruby-neon shadow-sm border border-slate-200/40 dark:border-zinc-800/40" : "text-slate-400 dark:text-slate-500 hover:text-slate-655 dark:hover:text-slate-350"}`}
            >
              Track Request Status
            </button>
          </div>
        )}

        {/* Notice Scroll Ticker */}
        {settings.notice_text && step === 1 && portalTab === "submit" && (
          <div className="monorail-wrap no-print rounded-2xl mb-2 flex items-center shadow-sm">
            <div className="monorail-title">Announcement</div>
            <div className="monorail-content-container">
              <div className="monorail-track">
                <span className="monorail-text">{settings.notice_text}</span>
                <span className="monorail-text">{settings.notice_text}</span>
              </div>
            </div>
          </div>
        )}

        {portalTab === "submit" && (
          <>
            {/* STEP 1: Faculty Information Enrollment */}
            {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 md:p-8 max-w-2xl mx-auto hover-3d"
          >
            <div className="pb-4 border-b border-slate-200/50 dark:border-zinc-800/50 mb-6">
              <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <User className="text-suas-ruby dark:text-suas-ruby-neon" size={18} />
                Faculty Enrollment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Please enter your credentials to initiate software requirement requests.
              </p>
            </div>

            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={facultyData.name}
                    onChange={e => setFacultyData({ ...facultyData, name: e.target.value })}
                    className="field-input !pl-10"
                  />
                  <User className="absolute left-3.5 top-[12px] text-slate-400" size={16} />
                </div>
                {errors.name && <span className="text-[10px] text-suas-ruby font-bold mt-0.5">{errors.name}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                  Symbiosis Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="e.g. name@suas.ac.in"
                    value={facultyData.email}
                    onChange={e => setFacultyData({ ...facultyData, email: e.target.value })}
                    className="field-input !pl-10"
                  />
                  <Mail className="absolute left-3.5 top-[12px] text-slate-400" size={16} />
                </div>
                {errors.email && <span className="text-[10px] text-suas-ruby font-bold mt-0.5">{errors.email}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                  Mobile Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={facultyData.mobile}
                    onChange={e => setFacultyData({ ...facultyData, mobile: e.target.value })}
                    className="field-input !pl-10"
                  />
                  <Phone className="absolute left-3.5 top-[12px] text-slate-400" size={16} />
                </div>
                {errors.mobile && <span className="text-[10px] text-suas-ruby font-bold mt-0.5">{errors.mobile}</span>}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition duration-200 cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                <span>Continue to Form</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </motion.div>
        )}

        {/* STEP 2: Software Specifications Form Builder */}
        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Faculty Mini Badge */}
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800/60 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white leading-tight">{facultyData.name}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">{facultyData.email} | {facultyData.mobile}</p>
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="px-3 py-1.5 text-[9px] font-black uppercase text-suas-ruby dark:text-suas-ruby-neon border border-rose-250 dark:border-rose-900/35 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-955/20 transition cursor-pointer"
              >
                Edit Info
              </button>
            </div>

            {/* Form specifications input */}
            <div className="glass-card p-6 md:p-8">
              <div className="pb-4 border-b border-slate-200/50 dark:border-zinc-800/50 mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <BookOpen className="text-suas-ruby dark:text-suas-ruby-neon" size={18} />
                  Software Specification Builder
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Add software, packages, versions, and frameworks required for your classes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Semester dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                    Target Semester <span className="text-suas-ruby">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={currSemester}
                      onChange={e => setCurrSemester(e.target.value)}
                      className="field-input appearance-none pr-8 font-semibold text-slate-700 dark:text-slate-350"
                    >
                      {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-[13px] text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Software Name (with suggestion) */}
                <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
                  <label className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                    Software Name <span className="text-suas-ruby">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Python, Java JDK"
                      value={currSoftware}
                      onChange={e => { setCurrSoftware(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      className="field-input"
                    />
                  </div>
                  {errors.software && <span className="text-[10px] text-suas-ruby font-bold">{errors.software}</span>}
                  
                  {/* Suggestions Popover */}
                  <AnimatePresence>
                    {showSuggestions && filteredPresets.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl py-1 text-left"
                      >
                        {filteredPresets.map(preset => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => selectPreset(preset)}
                            className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between transition cursor-pointer"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200">{preset.name}</span>
                            <span className="text-slate-400 font-mono text-[9px]">v{preset.version} · {preset.framework}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Software Version */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                    Software Version <span className="text-suas-ruby">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3.12, 21.0.1"
                    value={currVersion}
                    onChange={e => setCurrVersion(e.target.value)}
                    className="field-input"
                  />
                  {errors.version && <span className="text-[10px] text-suas-ruby font-bold">{errors.version}</span>}
                </div>

                {/* Framework (Optional) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                    Framework / Library Stack <span className="text-slate-400 dark:text-slate-500 font-normal">(Opt)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Django, Spring Boot, TensorFlow"
                    value={currFramework}
                    onChange={e => setCurrFramework(e.target.value)}
                    className="field-input"
                  />
                </div>

                {/* Framework Version (Optional) */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                    Framework Version <span className="text-slate-400 dark:text-slate-500 font-normal">(Opt)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 5.0.3"
                      value={currFrameworkVersion}
                      onChange={e => setCurrFrameworkVersion(e.target.value)}
                      className="field-input"
                    />
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition duration-200 shrink-0 cursor-pointer"
                    >
                      Add Row
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Table displaying requirements */}
            <div className="glass-card p-6 overflow-hidden">
              <h3 className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-4">
                Selected Software Requirements ({softwareList.length})
              </h3>
              
              {softwareList.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                  <p className="text-xs text-slate-400 italic">No software requirements added yet. Use the specification builder above to add software.</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-900/50 text-[9px] font-extrabold text-slate-450 uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                        <th className="px-4 py-3">Semester</th>
                        <th className="px-4 py-3">Software</th>
                        <th className="px-4 py-3">Version</th>
                        <th className="px-4 py-3">Framework (Optional)</th>
                        <th className="px-4 py-3">Framework Version (Optional)</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 font-semibold text-slate-700 dark:text-slate-350">
                      {softwareList.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/10 transition">
                          <td className="px-4 py-3 text-suas-ruby dark:text-suas-ruby-neon">{row.semester}</td>
                          <td className="px-4 py-3 text-slate-900 dark:text-white">{row.softwareName}</td>
                          <td className="px-4 py-3 font-mono">{row.version}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.framework || "—"}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono">{row.frameworkVersion || "—"}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition cursor-pointer"
                              title="Delete requirement"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200/50 dark:border-zinc-800/50">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-55 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  disabled={softwareList.length === 0}
                  onClick={() => setShowReviewModal(true)}
                  className={`flex items-center gap-1.5 px-6 py-2.5 text-xs font-extrabold uppercase rounded-xl transition duration-200 ${softwareList.length > 0 ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white cursor-pointer shadow-md shadow-slate-900/10" : "bg-slate-100 dark:bg-zinc-850 text-slate-400 dark:text-slate-600 cursor-not-allowed"}`}
                >
                  <span>Submit requirements</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Submission Receipt Page */}
        {step === 3 && submitResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 md:p-8 max-w-2xl mx-auto text-center space-y-6 border-t-4 border-t-suas-ruby-neon relative overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-suas-ruby-neon/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 rounded-full flex items-center justify-center mx-auto shadow shadow-emerald-500/10">
              <CheckCircle2 size={30} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Software Request Submitted!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Your requirements have been securely logged in the SCSIT laboratory database.
              </p>
            </div>

            {/* Receipt Box */}
            <div className="p-5 rounded-2xl bg-slate-55 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800/60 max-w-md mx-auto text-left space-y-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50 dark:border-zinc-800/50">
                <div>
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">Reference Number</span>
                  <span className="font-mono text-sm font-black text-slate-900 dark:text-white select-all">{submitResult.submissionId}</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">Timestamp</span>
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">{new Date(submitResult.createdAt).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div>
                <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Status Indicator</span>
                <span className="px-3 py-1 text-[10px] font-extrabold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/25 inline-flex items-center gap-1.5 shadow-sm shadow-amber-500/5 animate-pulse">
                  🟡 Pending Review
                </span>
              </div>

              <div className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold leading-relaxed border-t border-slate-200/50 dark:border-zinc-800/50 pt-2.5">
                Save this Reference ID for status checks using the tracking widget below.
              </div>
            </div>

            <button
              onClick={() => { setStep(1); setSubmitResult(null); }}
              className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition duration-200 cursor-pointer shadow-md inline-flex items-center gap-2"
            >
              <span>Submit Another Requirement</span>
            </button>
          </motion.div>
        )}
      </>
    )}
          {/* LOOKUP TRACKING WIDGET */}
        {portalTab === "track" && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="glass-card p-6 md:p-8 max-w-2xl mx-auto space-y-6"
          >
            {settings.installation_status_enabled === "true" ? (
              <>
                <div className="text-center space-y-2">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center justify-center gap-2">
                    <Search size={16} className="text-suas-ruby dark:text-suas-ruby-neon" />
                    Track Request Progress
                  </h3>
                  <p className="text-[11px] text-slate-505 dark:text-slate-400 max-w-md mx-auto font-medium">
                    Enter your <strong className="font-extrabold text-slate-800 dark:text-white">AXN</strong> reference ID or registered <strong className="font-extrabold text-slate-800 dark:text-white">@suas.ac.in</strong> email address to monitor your software deployment status.
                  </p>
                </div>

                <form onSubmit={handleTrackSubmit} className="flex gap-2 max-w-md mx-auto">
                  <input
                    type="text"
                    placeholder="AXN000001 or name@suas.ac.in"
                    value={trackQuery}
                    onChange={e => setTrackQuery(e.target.value)}
                    className="field-input"
                  />
                  <button
                    type="submit"
                    disabled={isTrackingLoading}
                    className="px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-xs rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition shrink-0 cursor-pointer disabled:opacity-60 flex items-center justify-center"
                  >
                    {isTrackingLoading ? "Searching..." : "Search"}
                  </button>
                </form>

                {trackError && (
                  <div className="p-3 text-xs font-semibold rounded-xl bg-rose-50 dark:bg-rose-955/20 text-suas-ruby dark:text-suas-ruby-neon border border-rose-150 dark:border-rose-900/30 flex items-center gap-2 max-w-md mx-auto">
                    <ShieldAlert size={14} />
                    <span>{trackError}</span>
                  </div>
                )}

                {/* Tracking Output */}
                {trackingResults && (
                  <div className="space-y-4 border-t border-slate-200/50 dark:border-zinc-800/50 pt-6">
                    <h4 className="text-xs font-black text-slate-805 dark:text-white uppercase tracking-wider text-center">Search Results ({trackingResults.length})</h4>
                    
                    <div className="space-y-4">
                      {trackingResults.map((record) => (
                        <div key={record.submissionId} className="p-4 rounded-xl bg-slate-55 dark:bg-zinc-900/30 border border-slate-200/50 dark:border-zinc-800/60 space-y-3">
                          <div className="flex justify-between items-start border-b border-slate-200/50 dark:border-zinc-800/50 pb-2.5">
                            <div>
                              <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block">Reference ID</span>
                              <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">{record.submissionId}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] font-black text-slate-455 uppercase tracking-widest block">Date Submitted</span>
                              <span className="text-[10px] font-bold text-slate-650 dark:text-slate-400">{new Date(record.createdAt).toLocaleDateString("en-IN")}</span>
                            </div>
                          </div>

                          {/* Decrypted row elements */}
                          <div className="space-y-2.5">
                            <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block">Software Status Details</span>
                            <div className="space-y-2">
                              {record.subjects && record.subjects.map((subj: any) => {
                                const softs = subj.softwares || [];
                                // Fallback details if subjects has simple software specs
                                if (softs.length === 0 && subj.softwareName) {
                                  softs.push({
                                    semester: subj.semesters?.[0] || record.semester || "—",
                                    softwareName: subj.softwareName,
                                    version: subj.softwareVersion || "—",
                                    framework: subj.framework || "—",
                                    frameworkVersion: ""
                                  });
                                }
                                
                                const stat = getStatusIndicator(subj.status);

                                return (
                                  <div key={subj.id} className="p-3 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200/40 dark:border-zinc-900/55 flex justify-between items-center gap-3">
                                    <div className="space-y-1">
                                      {softs.map((s: any, idx: number) => (
                                        <div key={idx} className="text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-tight">
                                          <span className="text-suas-ruby dark:text-suas-ruby-neon font-bold mr-1.5">[{s.semester}]</span>
                                          {s.softwareName} (v{s.version})
                                          {s.framework && <span className="text-slate-450 font-normal"> · {s.framework}</span>}
                                        </div>
                                      ))}
                                      {subj.remarks && (
                                        <div className="text-[10px] text-slate-500 font-medium italic mt-1 bg-slate-55 dark:bg-zinc-900 p-1.5 rounded-lg border border-slate-100 dark:border-zinc-800/45">
                                          Admin Remarks: {subj.remarks}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full ${stat.class}`}>
                                      {stat.dot}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
                  <Search size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">Status Tracking is Offline</h4>
                  <p className="text-xs text-slate-505 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed font-semibold">
                    Status lookup and live tracking is currently disabled by the SCSIT IT Department. Please contact the Lab Assistant directly for software deployment updates.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* STEP 3 REVIEW POPUP MODAL (Verification screen) */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 max-w-2xl w-full rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto flex flex-col justify-between"
            >
              {/* Receipt structure printed */}
              <div id="print-area" className="flex-1 space-y-6">
                
                {/* Logo & SCSIT Branding */}
                <div className="flex items-center gap-4 pb-4 border-b border-slate-200/50 dark:border-zinc-800/50 justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src="/img/symbiosis-university-of-applied-sciences-logo.jpg" 
                      alt="Symbiosis Logo" 
                      className="w-12 h-12 object-contain shrink-0 rounded-xl"
                    />
                    <div>
                      <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Symbiosis University of Applied Sciences</h2>
                      <h3 className="text-[10px] font-black text-suas-ruby dark:text-suas-ruby-neon uppercase tracking-widest mt-0.5 font-display">School of Computer Science and Information Technology (SCSIT)</h3>
                      <h4 className="text-[9px] font-extrabold text-slate-400 uppercase mt-0.5">Department: SCSIT</h4>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg bg-rose-50 dark:bg-rose-950/20 text-suas-ruby dark:text-suas-ruby-neon border border-rose-100 dark:border-rose-900/30">
                      Requirement Log
                    </span>
                  </div>
                </div>

                {/* Faculty details section */}
                <div className="p-4 rounded-xl bg-slate-55 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800/60 space-y-2">
                  <h4 className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Faculty verification details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-700 dark:text-slate-350 font-semibold">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block">Full Name</span>
                      <span className="font-extrabold text-slate-800 dark:text-white">{facultyData.name}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block">Registered Email</span>
                      <span className="font-extrabold text-slate-850 dark:text-slate-200 break-all">{facultyData.email}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block">Mobile Connection</span>
                      <span className="font-extrabold text-slate-850 dark:text-slate-200">{facultyData.mobile}</span>
                    </div>
                  </div>
                </div>

                {/* Complete table of requirements */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Software Requirements List</h4>
                  
                  <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-zinc-900/50 text-[9px] font-extrabold text-slate-450 uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                          <th className="px-3.5 py-2.5">Semester</th>
                          <th className="px-3.5 py-2.5">Software</th>
                          <th className="px-3.5 py-2.5">Version</th>
                          <th className="px-3.5 py-2.5">Framework (Optional)</th>
                          <th className="px-3.5 py-2.5">Framework Version (Optional)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 font-semibold text-slate-700 dark:text-slate-350">
                        {softwareList.map(row => (
                          <tr key={row.id} className="hover:bg-slate-50/20">
                            <td className="px-3.5 py-2.5 text-suas-ruby dark:text-suas-ruby-neon">{row.semester}</td>
                            <td className="px-3.5 py-2.5 text-slate-900 dark:text-white">{row.softwareName}</td>
                            <td className="px-3.5 py-2.5 font-mono">{row.version}</td>
                            <td className="px-3.5 py-2.5 text-slate-500">{row.framework || "—"}</td>
                            <td className="px-3.5 py-2.5 text-slate-500 font-mono">{row.frameworkVersion || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* E-Signature component pad */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest">Digital E-Signature Verification</h4>
                  <SignaturePad onChange={setSignature} savedSignature={signature} />
                  
                  {signature && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="sig-confirm"
                        checked={isSignatureConfirmed}
                        onChange={e => setIsSignatureConfirmed(e.target.checked)}
                        className="rounded border-slate-300 text-suas-ruby focus:ring-suas-ruby dark:bg-zinc-900 dark:border-zinc-800"
                      />
                      <label htmlFor="sig-confirm" className="text-[10px] font-bold text-slate-650 dark:text-slate-400 select-none cursor-pointer">
                        I verify that the above software specification list is correct and required for academic classes.
                      </label>
                    </div>
                  )}
                </div>

              </div>

              {/* Actions panel */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200/50 dark:border-zinc-800/50 no-print gap-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-xs font-black uppercase border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-55 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Edit details
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 border border-rose-250 dark:border-rose-900/40 text-suas-ruby dark:text-suas-ruby-neon hover:bg-rose-50 dark:hover:bg-rose-955/20 text-xs font-black uppercase rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download PDF</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !signature || !isSignatureConfirmed}
                    onClick={handleFinalSubmit}
                    className="px-6 py-2 bg-gradient-to-r from-suas-ruby to-suas-ruby-neon text-white text-xs font-black uppercase rounded-xl hover:shadow-lg hover:shadow-suas-ruby/25 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Styled receipt block for printable window.print() overlay */}
      <div className="print-only hidden font-sans p-8 space-y-6">
        <div className="flex items-center gap-4 border-b pb-4">
          <img 
            src="/img/symbiosis-university-of-applied-sciences-logo.jpg" 
            alt="Symbiosis Logo" 
            className="w-16 h-16 object-contain"
          />
          <div>
            <h1 className="text-xl font-bold uppercase">Symbiosis University of Applied Sciences</h1>
            <h2 className="text-xs uppercase text-slate-500 font-bold">School of Computer Science and Information Technology (SCSIT)</h2>
            <p className="text-[10px] text-slate-400 mt-1">Laboratory Software Requirements Verification Sheet</p>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-bold uppercase text-slate-700">Faculty Details</h3>
          <p className="text-xs"><strong>Name:</strong> {facultyData.name}</p>
          <p className="text-xs"><strong>Email:</strong> {facultyData.email}</p>
          <p className="text-xs"><strong>Mobile:</strong> {facultyData.mobile}</p>
          <p className="text-xs"><strong>Department:</strong> SCSIT</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase text-slate-700">Required Software Specifications</h3>
          <table className="w-full text-left border border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b">
                <th className="p-2">Semester</th>
                <th className="p-2">Software Name</th>
                <th className="p-2">Version</th>
                <th className="p-2">Framework (Optional)</th>
                <th className="p-2">Framework Version (Optional)</th>
              </tr>
            </thead>
            <tbody>
              {softwareList.map((row, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">{row.semester}</td>
                  <td className="p-2">{row.softwareName}</td>
                  <td className="p-2">{row.version}</td>
                  <td className="p-2">{row.framework || "—"}</td>
                  <td className="p-2">{row.frameworkVersion || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {signature && (
          <div className="pt-8 flex justify-end">
            <div className="text-center">
              <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Faculty Digitally Verified Signature</p>
              <div className="border p-2 inline-block bg-white">
                <img src={signature} alt="Signature Verification" className="h-12 w-auto max-w-[200px]" />
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-1 font-bold">Verification Reference: AXN Series Verification</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full py-8 mt-12 border-t border-slate-200/60 dark:border-zinc-850/60 text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold no-print flex flex-col items-center gap-1.5">
        <p className="uppercase tracking-widest">SCSIT Laboratory Requirement &amp; Installation Portal</p>
        <p className="text-xs font-black text-slate-655 dark:text-slate-350 tracking-wide font-display">School of Computer Science and Information Technology (SCSIT)</p>
        <p className="uppercase tracking-wider text-[9px]">Symbiosis University of Applied Sciences, Indore</p>
        <div className="flex flex-col sm:flex-row items-center gap-1.5 mt-2">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-extrabold">@ SCSIT Lab IT Team 2026</span>
          <span className="hidden sm:inline text-slate-200 dark:text-zinc-800">|</span>
          <span className="text-[7.5px] tracking-[0.35em] font-extrabold uppercase text-sky-200/15 dark:text-sky-950/10 select-none pointer-events-none hover:text-suas-ruby dark:hover:text-suas-ruby-neon hover:opacity-100 transition duration-700 cursor-default">
            registered with aurxon
          </span>
        </div>
      </footer>
    </div>
  );
}
