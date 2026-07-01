"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Phone, BookOpen, Plus, Trash2, Edit3, Check,
  Moon, Sun, ArrowRight, ArrowLeft, Download, Info,
  Sparkles, CheckCircle2, X, FileText, Search, ShieldAlert,
  ChevronDown, Upload, Clipboard, Wand2, AlertCircle,
  Package, Tag, Layers, RefreshCw, Save, Eye, Copy
} from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import { submitForm, lookupSubmissionStatus, getSettings } from "../actions";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface SoftwareRow {
  id: string;
  semester: string;
  softwareName: string;
  version: string;
  framework: string;
  frameworkVersion: string;
  needsReview?: boolean; // flag extracted fields that need manual verification
}

const SEMESTERS = [
  "Semester I", "Semester II", "Semester III", "Semester IV",
  "Semester V", "Semester VI", "Semester VII", "Semester VIII"
];

/* ─── Smart software extraction patterns ─────────────────────────────────
   Parses free-text / copy-pasted documents and extracts structured
   software rows. Each detected software becomes one separate DB row.
 ─────────────────────────────────────────────────────────────────────────*/
function extractSoftwareFromText(text: string, defaultSemester: string): SoftwareRow[] {
  const lines = text.split(/\n|;|,(?=[A-Z])/).map(l => l.trim()).filter(Boolean);
  const rows: SoftwareRow[] = [];

  // Comprehensive software name keywords for detection
  const knownSoftware = [
    "python","java","jdk","node","nodejs","react","angular","vue","next","nextjs",
    ".net","dotnet","c#","c++","cpp","php","ruby","go","golang","rust","kotlin",
    "swift","typescript","mysql","postgresql","postgres","mongodb","redis","sqlite",
    "oracle","sql server","mssql","docker","kubernetes","k8s","aws","azure","gcp",
    "matlab","r language","rstudio","jupyter","anaconda","tensorflow","pytorch",
    "keras","opencv","scikit","pandas","numpy","flask","django","spring","hibernate",
    "express","laravel","wordpress","apache","nginx","git","github","gitlab",
    "visual studio","vs code","vscode","eclipse","intellij","netbeans","pycharm",
    "sublime","postman","figma","xcode","android studio","hadoop","spark","kafka",
    "elasticsearch","tableau","power bi","weka","rapidminer","xampp","wamp","lamp",
    "unity","unreal","blender","photoshop","illustrator","vmware","virtualbox",
    "putty","wireshark","metasploit","cisco packet","network simulator",
    "solidworks","autocad","catia","staad.pro","etabs"
  ];

  // Version pattern: matches things like 3.12, v3.12, 21.0, 2024b, etc.
  const versionPat = /\b(?:v|version\s*)?(\d{1,3}(?:\.\d{1,3}){0,3}[a-z]?(?:\.\d+)?|R\d{4}[ab]?|LTS)\b/i;
  // Semester pattern
  const semesterPat = /sem(?:ester)?\s*([I1-8IVXLC]+)/i;
  // Framework / library pattern
  const frameworkPat = /(?:with|using|via|framework[:\-]?\s*|library[:\-]?\s*)([A-Za-z][A-Za-z0-9.\-_ ]+?)(?:,|\.|;|$)/i;

  lines.forEach(line => {
    const lower = line.toLowerCase();
    const matchedSoftware = knownSoftware.find(sw => lower.includes(sw));

    if (matchedSoftware) {
      const vMatch = line.match(versionPat);
      const sMatch = line.match(semesterPat);
      const fMatch = line.match(frameworkPat);

      // Capitalize software name properly
      const startIdx = lower.indexOf(matchedSoftware);
      const rawName = line.substring(startIdx, startIdx + matchedSoftware.length);
      const softwareName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      rows.push({
        id: String(Date.now()) + Math.random(),
        semester: sMatch
          ? `Semester ${sMatch[1].toUpperCase().replace(/^(\d)$/, '$1')}`
          : defaultSemester,
        softwareName,
        version: vMatch ? vMatch[1] : "",
        framework: fMatch ? fMatch[1].trim() : "",
        frameworkVersion: "",
        needsReview: !vMatch, // flag if version is missing
      });
    } else if (line.length > 3 && line.length < 80 && /[A-Za-z]{3}/.test(line)) {
      // Generic catch: any non-empty line that looks like a software name
      const vMatch = line.match(versionPat);
      const sMatch = line.match(semesterPat);
      const cleaned = line.replace(versionPat, "").replace(semesterPat, "").replace(/[:|\-–]/g, "").trim();
      if (cleaned.length > 2 && cleaned.length < 50) {
        rows.push({
          id: String(Date.now()) + Math.random(),
          semester: sMatch
            ? `Semester ${sMatch[1].toUpperCase()}`
            : defaultSemester,
          softwareName: cleaned,
          version: vMatch ? vMatch[1] : "",
          framework: "",
          frameworkVersion: "",
          needsReview: true, // always flag generic catches
        });
      }
    }
  });

  // Deduplicate by software name + semester
  const seen = new Set<string>();
  return rows.filter(r => {
    const key = `${r.softwareName.toLowerCase()}_${r.semester}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const PRESETS = [
  { name: "Python", framework: "Django / Flask", version: "3.12" },
  { name: "Java JDK", framework: "Spring Boot / Hibernate", version: "21" },
  { name: ".NET SDK", framework: "ASP.NET Core", version: "8.0" },
  { name: "React", framework: "Next.js / Vite", version: "19.0" },
  { name: "Node.js", framework: "Express / NestJS", version: "20.12" },
  { name: "PostgreSQL", framework: "Relational DB", version: "16.2" },
  { name: "MySQL", framework: "Relational DB", version: "8.0" },
  { name: "MATLAB", framework: "Numeric Computing", version: "R2024b" },
  { name: "Docker Desktop", framework: "Containerization", version: "26.1" },
  { name: "Android Studio", framework: "Java / Kotlin", version: "2024.1" },
  { name: "Visual Studio Code", framework: "IDE", version: "1.92" },
  { name: "Eclipse IDE", framework: "Java EE", version: "2024-06" },
  { name: "Anaconda", framework: "Python/Data Science", version: "2024.06" },
  { name: "MongoDB", framework: "NoSQL DB", version: "7.0" },
  { name: "Wireshark", framework: "Network Analysis", version: "4.2" },
];

function getStatusIndicator(status: string) {
  if (status === "Installed") return { dot: "✅ Installed", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border" };
  if (status === "In Progress") return { dot: "🔄 In Progress", class: "bg-blue-500/10 text-blue-600 border-blue-500/20 border" };
  return { dot: "⏳ Pending", class: "bg-amber-500/10 text-amber-600 border-amber-500/20 border" };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function FacultyPortal() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [portalTab, setPortalTab] = useState<"submit" | "track">("submit");

  // Steps: 1 = Enrollment, 2 = Software Specification, 3 = Review & Sign, 4 = Receipt
  const [step, setStep] = useState(1);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Faculty details
  const [facultyData, setFacultyData] = useState({
    name: "", email: "", mobile: "", department: "SCSIT", semester: "Semester I"
  });

  // Software rows
  const [softwareList, setSoftwareList] = useState<SoftwareRow[]>([]);
  const [currSemester, setCurrSemester] = useState("Semester I");
  const [currSoftware, setCurrSoftware] = useState("");
  const [currVersion, setCurrVersion] = useState("");
  const [currFramework, setCurrFramework] = useState("");
  const [currFrameworkVersion, setCurrFrameworkVersion] = useState("");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Smart extraction
  const [showExtractor, setShowExtractor] = useState(false);
  const [extractText, setExtractText] = useState("");
  const [extractSemester, setExtractSemester] = useState("Semester I");
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractPreview, setExtractPreview] = useState<SoftwareRow[]>([]);

  // Autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Signature & Verification
  const [signature, setSignature] = useState<string | null>(null);
  const [isSignatureConfirmed, setIsSignatureConfirmed] = useState(false);

  // Loading & Submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    submissionId: string; createdAt: string;
  } | null>(null);

  // Tracking
  const [trackQuery, setTrackQuery] = useState("");
  const [trackingResults, setTrackingResults] = useState<any[] | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  // UI helpers
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg); setToastType(type);
    setTimeout(() => setToastMessage(""), 4500);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setTheme(isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);

    async function fetchPortalSettings() {
      try {
        const res = await getSettings();
        if (res.success && res.settings) setSettings(res.settings);
      } catch { /* ignore */ } finally { setLoadingSettings(false); }
    }
    fetchPortalSettings();
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  // ── Autocomplete ──────────────────────────────────────────────────────
  const filteredPresets = PRESETS.filter(p =>
    p.name.toLowerCase().includes(currSoftware.toLowerCase()) && currSoftware.trim() !== ""
  );

  const selectPreset = (preset: typeof PRESETS[0]) => {
    setCurrSoftware(preset.name);
    setCurrVersion(preset.version);
    setCurrFramework(preset.framework);
    setShowSuggestions(false);
  };

  // ── Step 1 Validation ─────────────────────────────────────────────────
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!facultyData.name.trim()) errs.name = "Full Name is required";
    const emailLower = facultyData.email.trim().toLowerCase();
    if (!emailLower) errs.email = "Email is required";
    else if (!emailLower.endsWith("@suas.ac.in")) errs.email = "Only @suas.ac.in domain email is accepted";
    const cleanMobile = facultyData.mobile.replace(/[^0-9]/g, "");
    if (!facultyData.mobile.trim()) errs.mobile = "Mobile Number is required";
    else if (cleanMobile.length < 10) errs.mobile = "Must be at least 10 digits";
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep(2);
  };

  // ── Add Software Row ──────────────────────────────────────────────────
  const handleAddRow = () => {
    const errs: Record<string, string> = {};
    if (!currSoftware.trim()) errs.software = "Software Name is required";
    if (!currVersion.trim()) errs.version = "Version is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (editingRowId) {
      setSoftwareList(prev => prev.map(r =>
        r.id === editingRowId
          ? { ...r, semester: currSemester, softwareName: currSoftware.trim(), version: currVersion.trim(), framework: currFramework.trim(), frameworkVersion: currFrameworkVersion.trim(), needsReview: false }
          : r
      ));
      setEditingRowId(null);
      showToast("Software row updated.");
    } else {
      setSoftwareList(prev => [...prev, {
        id: String(Date.now()),
        semester: currSemester,
        softwareName: currSoftware.trim(),
        version: currVersion.trim(),
        framework: currFramework.trim(),
        frameworkVersion: currFrameworkVersion.trim(),
        needsReview: false,
      }]);
      showToast("Software row added successfully.");
    }
    setCurrSoftware(""); setCurrVersion(""); setCurrFramework(""); setCurrFrameworkVersion("");
  };

  const handleEditRow = (row: SoftwareRow) => {
    setEditingRowId(row.id);
    setCurrSemester(row.semester);
    setCurrSoftware(row.softwareName);
    setCurrVersion(row.version);
    setCurrFramework(row.framework);
    setCurrFrameworkVersion(row.frameworkVersion);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRemoveRow = (id: string) => {
    setSoftwareList(prev => prev.filter(r => r.id !== id));
    if (editingRowId === id) { setEditingRowId(null); setCurrSoftware(""); setCurrVersion(""); setCurrFramework(""); setCurrFrameworkVersion(""); }
    showToast("Row removed.");
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setCurrSoftware(""); setCurrVersion(""); setCurrFramework(""); setCurrFrameworkVersion("");
  };

  // ── Smart Extraction ──────────────────────────────────────────────────
  const handleExtract = useCallback(() => {
    if (!extractText.trim()) { showToast("Paste some text first.", "error"); return; }
    setExtractLoading(true);
    setTimeout(() => {
      const extracted = extractSoftwareFromText(extractText, extractSemester);
      setExtractPreview(extracted);
      setExtractLoading(false);
      if (extracted.length === 0) showToast("No software detected. Try adding manually.", "error");
      else showToast(`${extracted.length} software item(s) detected. Review and confirm.`);
    }, 600);
  }, [extractText, extractSemester]);

  const handleConfirmExtracted = () => {
    setSoftwareList(prev => [...prev, ...extractPreview]);
    setExtractPreview([]);
    setExtractText("");
    setShowExtractor(false);
    showToast(`${extractPreview.length} software row(s) imported successfully.`);
  };

  const updateExtractedRow = (id: string, field: keyof SoftwareRow, value: string) => {
    setExtractPreview(prev => prev.map(r => r.id === id ? { ...r, [field]: value, needsReview: false } : r));
  };

  // ── Final Submit ──────────────────────────────────────────────────────
  const handleFinalSubmit = async () => {
    if (!signature) { showToast("Please sign before submitting.", "error"); return; }
    if (!isSignatureConfirmed) { showToast("Please check the confirmation checkbox.", "error"); return; }
    setIsSubmitting(true);
    try {
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
        setSubmitResult({ submissionId: res.data.submissionId, createdAt: res.data.createdAt });
        setSoftwareList([]); setSignature(null); setIsSignatureConfirmed(false);
        setShowReviewModal(false); setStep(3);
      } else {
        showToast(res.error || "Submission failed. Please retry.", "error");
      }
    } catch {
      showToast("Internal error. Please try again.", "error");
    } finally { setIsSubmitting(false); }
  };

  // ── Track Request ─────────────────────────────────────────────────────
  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;
    setIsTrackingLoading(true); setTrackError(""); setTrackingResults(null);
    try {
      const res = await lookupSubmissionStatus(trackQuery.trim());
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setTrackingResults(res.data);
      } else {
        setTrackError("No records found for this query. Please check your reference ID or email.");
      }
    } catch { setTrackError("Network error. Please try again."); }
    finally { setIsTrackingLoading(false); }
  };

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Loading SCSIT LabOS Portal…</p>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col transition-colors duration-300">

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border ${
              toastType === "error"
                ? "bg-red-950 border-red-800/60 text-red-300"
                : "bg-zinc-900 text-white border-zinc-800/60"
            }`}
          >
            {toastType === "error" ? <AlertCircle size={14} className="text-red-400" /> : <Sparkles size={14} className="text-rose-400 animate-pulse" />}
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-slate-200/60 dark:border-zinc-900/60 shadow-[0_1px_20px_rgba(0,0,0,0.04)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-[72px] flex items-center justify-between">
          {/* Branding */}
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 opacity-15 blur-sm" />
              <img
                src="/img/symbiosis-university-of-applied-sciences-logo.jpg"
                alt="SUAS Logo"
                className="w-10 h-10 object-contain rounded-xl bg-white relative border border-white/50 shadow-sm"
              />
            </div>
            <div>
              <h1 className="text-[11px] sm:text-[12px] font-black text-[#C1121F] leading-tight tracking-tight uppercase">
                Symbiosis University of Applied Sciences
              </h1>
              <p className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight mt-0.5">
                School of Computer Science & Information Technology (SCSIT)
              </p>
              <p className="text-[8px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest leading-none mt-0.5">
                SCSIT LabOS · Software Requirements Portal
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.location.href = "/admin/login"}
              className="hidden sm:flex px-3.5 py-1.5 border border-slate-200 dark:border-zinc-800 hover:border-rose-300/50 dark:hover:border-rose-900/40 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition duration-200 cursor-pointer items-center gap-1.5"
            >
              Admin Panel
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition duration-200 cursor-pointer"
            >
              {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Tab Bar ───────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200/60 dark:border-zinc-900/60 bg-white dark:bg-zinc-950 no-print">
        <div className="max-w-5xl mx-auto px-4 md:px-6 flex gap-0">
          {[
            { id: "submit" as const, label: "Submit Requirements", icon: <Plus size={13} /> },
            { id: "track" as const, label: "Track Request Status", icon: <Search size={13} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPortalTab(tab.id)}
              className={`flex items-center gap-1.5 px-5 py-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all duration-200 cursor-pointer ${
                portalTab === tab.id
                  ? "border-[#C1121F] text-[#C1121F] dark:text-rose-400 dark:border-rose-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          SUBMIT TAB
      ───────────────────────────────────────────────────────────────── */}
      {portalTab === "submit" && (
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6 pb-16 no-print">

          {/* Notice Ticker */}
          {settings.notice_text && step === 1 && (
            <div className="monorail-wrap rounded-2xl flex items-center shadow-sm">
              <div className="monorail-title">Announcement</div>
              <div className="monorail-content-container">
                <div className="monorail-track">
                  <span className="monorail-text">{settings.notice_text}</span>
                  <span className="monorail-text">{settings.notice_text}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Progress Steps Indicator ──────────────────────────────── */}
          {step <= 2 && (
            <div className="flex items-center justify-center gap-3">
              {[
                { num: 1, label: "Identity" },
                { num: 2, label: "Software List" },
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border-2 transition-all duration-300 ${
                      step >= s.num
                        ? "bg-[#C1121F] border-[#C1121F] text-white shadow-md shadow-rose-500/25"
                        : "border-slate-300 dark:border-zinc-700 text-slate-400 dark:text-zinc-500"
                    }`}>
                      {step > s.num ? <Check size={12} /> : s.num}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider hidden sm:block ${
                      step >= s.num ? "text-slate-800 dark:text-white" : "text-slate-400 dark:text-zinc-600"
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < 1 && (
                    <div className={`flex-1 max-w-[60px] h-0.5 rounded-full transition-all duration-300 ${step >= s.num + 1 ? "bg-[#C1121F]" : "bg-slate-200 dark:bg-zinc-800"}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ── STEP 1: Faculty Enrollment ────────────────────────────── */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] p-6 md:p-8 max-w-xl mx-auto"
            >
              <div className="pb-5 border-b border-slate-100 dark:border-zinc-800 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mb-3 border border-rose-100/50 dark:border-rose-900/30">
                  <User className="text-[#C1121F]" size={18} />
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Faculty Enrollment</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                  Verify your identity to submit software requirements for your laboratory sessions.
                </p>
              </div>

              <form onSubmit={handleStep1Submit} className="space-y-4">
                {[
                  { label: "Full Name", field: "name" as const, type: "text", placeholder: "Dr. / Mr. / Ms. Your Name", Icon: User },
                  { label: "Symbiosis Email", field: "email" as const, type: "email", placeholder: "name@suas.ac.in", Icon: Mail },
                  { label: "Mobile Number", field: "mobile" as const, type: "tel", placeholder: "+91 99999 99999", Icon: Phone },
                ].map(({ label, field, type, placeholder, Icon }) => (
                  <div key={field} className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                      {label} <span className="text-[#C1121F]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={facultyData[field]}
                        onChange={e => setFacultyData({ ...facultyData, [field]: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400/50 transition"
                      />
                      <Icon className="absolute left-3.5 top-[14px] text-slate-400 dark:text-zinc-600" size={15} />
                    </div>
                    {errors[field] && <span className="text-[10px] text-rose-500 font-bold">{errors[field]}</span>}
                  </div>
                ))}

                <button
                  type="submit"
                  className="w-full py-3 bg-[#C1121F] hover:bg-rose-700 text-white font-extrabold rounded-xl text-[11px] uppercase tracking-widest shadow-md shadow-rose-500/20 hover:shadow-rose-500/35 transition duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <span>Continue to Software List</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 2: Software Specification Builder ────────────────── */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* Faculty Badge */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200/60 dark:border-zinc-800/60 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center font-black text-sm border border-emerald-100/50 dark:border-emerald-900/30">✓</div>
                  <div>
                    <p className="text-[11px] font-black text-slate-800 dark:text-white">{facultyData.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{facultyData.email} · {facultyData.mobile}</p>
                  </div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-[10px] font-black uppercase text-[#C1121F] dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30 px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                >
                  Edit Details
                </button>
              </div>

              {/* Smart Extraction Panel */}
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 border border-violet-200/50 dark:border-violet-900/30 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <Wand2 size={13} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Smart Software Extraction</p>
                      <p className="text-[9px] text-slate-500 dark:text-zinc-500 font-medium">Paste text from any document — AI auto-detects all software names, versions & frameworks</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowExtractor(!showExtractor)}
                    className="text-[10px] font-black uppercase text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900/40 px-3 py-1.5 rounded-xl hover:bg-violet-100/50 dark:hover:bg-violet-950/30 transition cursor-pointer flex items-center gap-1.5"
                  >
                    {showExtractor ? <X size={11} /> : <Upload size={11} />}
                    {showExtractor ? "Close" : "Open Extractor"}
                  </button>
                </div>

                <AnimatePresence>
                  {showExtractor && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 border-t border-violet-200/40 dark:border-violet-900/20 space-y-3">
                        <div className="flex gap-3 items-center">
                          <div className="flex-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Default Semester for Extraction</label>
                            <select
                              value={extractSemester}
                              onChange={e => setExtractSemester(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                            >
                              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                            Paste Text / Document Content
                          </label>
                          <textarea
                            placeholder={`Paste syllabus, course material, or lab requirements here...\n\nExample:\nPython 3.12 with Django framework\nJava JDK 21, Spring Boot\nMySQL 8.0 database server\nDockerDesktop v26.1\nSemester III: React 19, Node.js 20`}
                            value={extractText}
                            onChange={e => setExtractText(e.target.value)}
                            rows={6}
                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-slate-700 dark:text-zinc-200 placeholder-slate-400/60 dark:placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none leading-relaxed"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleExtract}
                            disabled={extractLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-black uppercase rounded-xl transition duration-200 cursor-pointer disabled:opacity-60 shadow-md shadow-violet-500/25"
                          >
                            {extractLoading ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
                            {extractLoading ? "Analyzing..." : "Extract Software"}
                          </button>
                          {extractText && (
                            <button
                              type="button"
                              onClick={() => { setExtractText(""); setExtractPreview([]); }}
                              className="px-4 py-2.5 text-[11px] font-black uppercase border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Extracted Preview */}
                        {extractPreview.length > 0 && (
                          <div className="border border-violet-200/60 dark:border-violet-900/30 rounded-2xl overflow-hidden">
                            <div className="px-4 py-2.5 bg-violet-50 dark:bg-violet-950/20 border-b border-violet-200/40 dark:border-violet-900/20 flex justify-between items-center">
                              <span className="text-[10px] font-black text-violet-700 dark:text-violet-300 uppercase tracking-wider">
                                {extractPreview.length} items detected — Review & Edit before importing
                              </span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-zinc-900">
                              {extractPreview.map((row, idx) => (
                                <div key={row.id} className={`px-4 py-3 bg-white dark:bg-zinc-950 ${row.needsReview ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
                                  <div className="flex items-start gap-2 mb-2">
                                    <span className="text-[9px] font-black text-slate-400 mt-0.5 w-4 shrink-0">#{idx + 1}</span>
                                    {row.needsReview && (
                                      <span className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30 shrink-0">Review</span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div>
                                      <p className="text-[9px] text-slate-400 font-bold mb-0.5">Semester</p>
                                      <select
                                        value={row.semester}
                                        onChange={e => updateExtractedRow(row.id, "semester", e.target.value)}
                                        className="w-full px-2 py-1.5 text-[10px] font-semibold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
                                      >
                                        {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <p className="text-[9px] text-slate-400 font-bold mb-0.5">Software Name <span className="text-rose-400">*</span></p>
                                      <input
                                        value={row.softwareName}
                                        onChange={e => updateExtractedRow(row.id, "softwareName", e.target.value)}
                                        className="w-full px-2 py-1.5 text-[10px] font-semibold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
                                      />
                                    </div>
                                    <div>
                                      <p className="text-[9px] text-slate-400 font-bold mb-0.5">Version <span className="text-rose-400">*</span></p>
                                      <input
                                        value={row.version}
                                        onChange={e => updateExtractedRow(row.id, "version", e.target.value)}
                                        placeholder="e.g. 3.12"
                                        className={`w-full px-2 py-1.5 text-[10px] font-semibold bg-slate-50 dark:bg-zinc-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400 ${!row.version ? "border-amber-300 dark:border-amber-700" : "border-slate-200 dark:border-zinc-800"}`}
                                      />
                                    </div>
                                    <div>
                                      <p className="text-[9px] text-slate-400 font-bold mb-0.5">Framework</p>
                                      <input
                                        value={row.framework}
                                        onChange={e => updateExtractedRow(row.id, "framework", e.target.value)}
                                        placeholder="Optional"
                                        className="w-full px-2 py-1.5 text-[10px] font-semibold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="px-4 py-3 bg-violet-50/50 dark:bg-violet-950/10 border-t border-violet-200/40 dark:border-violet-900/20 flex gap-2 justify-end">
                              <button
                                onClick={() => { setExtractPreview([]); setExtractText(""); }}
                                className="px-4 py-2 text-[10px] font-black uppercase border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleConfirmExtracted}
                                disabled={extractPreview.some(r => !r.softwareName.trim())}
                                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black uppercase rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-violet-500/20"
                              >
                                <Check size={11} />
                                Import {extractPreview.length} Row(s)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Manual Entry Panel */}
              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.15)] overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
                    <BookOpen size={13} className="text-[#C1121F]" />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      {editingRowId ? "Edit Software Row" : "Manual Entry"}
                    </h3>
                    <p className="text-[9px] text-slate-400 font-semibold">Add individual software requirements one by one</p>
                  </div>
                </div>

                <div className="p-5 md:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Semester */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Semester <span className="text-[#C1121F]">*</span></label>
                      <div className="relative">
                        <select
                          value={currSemester}
                          onChange={e => setCurrSemester(e.target.value)}
                          className="w-full px-3 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400/50 transition appearance-none pr-9 cursor-pointer"
                        >
                          {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={13} className="absolute right-3 top-[14px] text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Software Name with Suggestions */}
                    <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
                      <label className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Software Name <span className="text-[#C1121F]">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Python, Java JDK, MySQL"
                        value={currSoftware}
                        onChange={e => { setCurrSoftware(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400/50 transition"
                      />
                      {errors.software && <span className="text-[10px] text-rose-500 font-bold">{errors.software}</span>}
                      <AnimatePresence>
                        {showSuggestions && filteredPresets.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-52 overflow-y-auto rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl py-1"
                          >
                            {filteredPresets.map(preset => (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => selectPreset(preset)}
                                className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-between transition cursor-pointer gap-2"
                              >
                                <span className="font-black text-slate-800 dark:text-zinc-100">{preset.name}</span>
                                <span className="text-slate-400 font-mono text-[9px]">v{preset.version} · {preset.framework}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Version */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Version <span className="text-[#C1121F]">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. 3.12, 21.0.1, R2024b"
                        value={currVersion}
                        onChange={e => setCurrVersion(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400/50 transition font-mono"
                      />
                      {errors.version && <span className="text-[10px] text-rose-500 font-bold">{errors.version}</span>}
                    </div>

                    {/* Framework */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                        Framework / Library <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Django, Spring Boot, TensorFlow"
                        value={currFramework}
                        onChange={e => setCurrFramework(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400/50 transition"
                      />
                    </div>

                    {/* Framework Version */}
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                        Framework Version <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 5.0.3, 3.3"
                          value={currFrameworkVersion}
                          onChange={e => setCurrFrameworkVersion(e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400/50 transition font-mono"
                        />
                        {editingRowId && (
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-4 py-3 text-[11px] font-black uppercase border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAddRow}
                          className="px-6 py-3 bg-[#C1121F] hover:bg-rose-700 text-white text-[11px] font-black uppercase rounded-xl transition duration-200 shrink-0 cursor-pointer shadow-md shadow-rose-500/20 flex items-center gap-1.5"
                        >
                          {editingRowId ? <><Save size={12} /> Update</> : <><Plus size={12} /> Add Row</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Software List Table */}
              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.15)] overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center">
                      <Layers size={13} className="text-slate-500" />
                    </div>
                    <h3 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Software Requirements ({softwareList.length})
                    </h3>
                  </div>
                  {softwareList.some(r => r.needsReview) && (
                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30 flex items-center gap-1">
                      <AlertCircle size={9} />
                      {softwareList.filter(r => r.needsReview).length} need review
                    </span>
                  )}
                </div>

                {softwareList.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-3 border border-slate-200/50 dark:border-zinc-800/50">
                      <Package size={20} className="text-slate-300 dark:text-zinc-700" />
                    </div>
                    <p className="text-xs text-slate-400 dark:text-zinc-600 font-semibold">No software requirements added yet.</p>
                    <p className="text-[10px] text-slate-300 dark:text-zinc-700 mt-1">Use the extractor or add manually above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-zinc-900/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-zinc-800">
                          <th className="px-5 py-3">#</th>
                          <th className="px-5 py-3">Semester</th>
                          <th className="px-5 py-3">Software Name</th>
                          <th className="px-5 py-3">Version</th>
                          <th className="px-5 py-3">Framework</th>
                          <th className="px-5 py-3">Fw. Version</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-zinc-900">
                        {softwareList.map((row, idx) => (
                          <tr key={row.id} className={`transition hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 ${editingRowId === row.id ? "bg-rose-50/30 dark:bg-rose-950/10" : ""}`}>
                            <td className="px-5 py-3 text-slate-400 font-black">{idx + 1}</td>
                            <td className="px-5 py-3">
                              <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-rose-50 dark:bg-rose-950/20 text-[#C1121F] dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30">
                                {row.semester}
                              </span>
                            </td>
                            <td className="px-5 py-3 font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              {row.softwareName}
                              {row.needsReview && <AlertCircle size={11} className="text-amber-500 shrink-0" />}
                            </td>
                            <td className="px-5 py-3 font-mono text-slate-600 dark:text-zinc-300">{row.version || <span className="text-slate-300 dark:text-zinc-700 italic">—</span>}</td>
                            <td className="px-5 py-3 text-slate-500 dark:text-zinc-400">{row.framework || <span className="text-slate-300 dark:text-zinc-700 italic">—</span>}</td>
                            <td className="px-5 py-3 font-mono text-slate-400 dark:text-zinc-500">{row.frameworkVersion || <span className="text-slate-300 dark:text-zinc-700 italic">—</span>}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleEditRow(row)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition cursor-pointer"
                                  title="Edit row"
                                >
                                  <Edit3 size={12} />
                                </button>
                                <button
                                  onClick={() => handleRemoveRow(row.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                                  title="Remove row"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-black border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <button
                    disabled={softwareList.length === 0}
                    onClick={() => setShowReviewModal(true)}
                    className={`flex items-center gap-1.5 px-6 py-2.5 text-[11px] font-black uppercase rounded-xl transition duration-200 ${
                      softwareList.length > 0
                        ? "bg-[#C1121F] hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 cursor-pointer"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    Review & Submit ({softwareList.length})
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Submission Receipt ─────────────────────────────── */}
          {step === 3 && submitResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] p-8 max-w-xl mx-auto text-center space-y-6 relative overflow-hidden"
            >
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-500/5 dark:bg-rose-500/8 rounded-full blur-3xl pointer-events-none" />
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100/50 dark:border-emerald-900/30 shadow-md shadow-emerald-500/10">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Request Submitted!</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium leading-relaxed">
                  Your software requirements are securely logged in the SCSIT LabOS database and assigned for review.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200/60 dark:border-zinc-800/60 text-left space-y-3">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50 dark:border-zinc-800/50">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Reference ID</span>
                    <span className="font-mono text-sm font-black text-slate-900 dark:text-white select-all">{submitResult.submissionId}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Timestamp</span>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{new Date(submitResult.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</span>
                  <span className="px-3 py-1 text-[10px] font-black rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 inline-flex items-center gap-1.5 animate-pulse">
                    ⏳ Pending Review by Lab Assistant
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed pt-1 border-t border-slate-200/50 dark:border-zinc-800/50">
                  Save this Reference ID to track your software installation status from the Track tab above.
                </p>
              </div>
              <button
                onClick={() => { setStep(1); setSubmitResult(null); }}
                className="px-6 py-2.5 bg-[#C1121F] hover:bg-rose-700 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition duration-200 cursor-pointer shadow-md shadow-rose-500/20 inline-flex items-center gap-2"
              >
                Submit Another Requirement
              </button>
            </motion.div>
          )}
        </main>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TRACK TAB
      ───────────────────────────────────────────────────────────────── */}
      {portalTab === "track" && (
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 md:px-6 py-8 pb-16 no-print">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] p-6 md:p-8 space-y-6"
          >
            {settings.installation_status_enabled === "true" ? (
              <>
                <div className="text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mx-auto border border-rose-100/50 dark:border-rose-900/30">
                    <Search size={16} className="text-[#C1121F]" />
                  </div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wide">Track Request Status</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
                    Enter your reference ID or registered <strong className="text-slate-700 dark:text-zinc-200">@suas.ac.in</strong> email to track your software deployment status.
                  </p>
                </div>
                <form onSubmit={handleTrackSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Reference ID or email@suas.ac.in"
                    value={trackQuery}
                    onChange={e => setTrackQuery(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition"
                  />
                  <button
                    type="submit"
                    disabled={isTrackingLoading}
                    className="px-5 py-3 bg-[#C1121F] hover:bg-rose-700 text-white font-black text-[11px] uppercase rounded-xl transition shrink-0 cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-md shadow-rose-500/20"
                  >
                    {isTrackingLoading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                    {isTrackingLoading ? "Searching…" : "Search"}
                  </button>
                </form>

                {trackError && (
                  <div className="p-3.5 text-xs font-semibold rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-[#C1121F] dark:text-rose-400 border border-rose-150 dark:border-rose-900/30 flex items-center gap-2">
                    <ShieldAlert size={14} />
                    <span>{trackError}</span>
                  </div>
                )}

                {trackingResults && (
                  <div className="space-y-4 border-t border-slate-100 dark:border-zinc-800 pt-5">
                    <h4 className="text-[11px] font-black text-slate-600 dark:text-zinc-300 uppercase tracking-wider">Results ({trackingResults.length})</h4>
                    <div className="space-y-3">
                      {trackingResults.map(record => (
                        <div key={record.submissionId} className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800/60 space-y-3">
                          <div className="flex justify-between items-start border-b border-slate-200/50 dark:border-zinc-800/50 pb-2.5">
                            <div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Reference</span>
                              <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">{record.submissionId}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Date</span>
                              <span className="text-[10px] font-bold text-slate-500">{new Date(record.createdAt).toLocaleDateString("en-IN")}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {record.subjects?.map((subj: any) => {
                              const softs = subj.softwares || [];
                              if (softs.length === 0 && subj.softwareName) {
                                softs.push({ semester: subj.semesters?.[0] || "—", softwareName: subj.softwareName, version: subj.softwareVersion || "—", framework: subj.framework || "" });
                              }
                              const stat = getStatusIndicator(subj.status);
                              return (
                                <div key={subj.id} className="flex justify-between items-start gap-3 p-3 rounded-xl bg-white dark:bg-zinc-950/60 border border-slate-200/40 dark:border-zinc-900/50">
                                  <div className="space-y-0.5">
                                    {softs.map((s: any, i: number) => (
                                      <p key={i} className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 leading-tight">
                                        <span className="text-[#C1121F] dark:text-rose-400 mr-1.5">[{s.semester}]</span>
                                        {s.softwareName}
                                        <span className="font-mono text-slate-400 ml-1.5">v{s.version}</span>
                                        {s.framework && <span className="text-slate-400 font-normal"> · {s.framework}</span>}
                                      </p>
                                    ))}
                                    {subj.remarks && <p className="text-[10px] text-slate-500 italic mt-1 leading-relaxed">Remarks: {subj.remarks}</p>}
                                  </div>
                                  <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full shrink-0 ${stat.class}`}>{stat.dot}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-10 space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600 flex items-center justify-center mx-auto border border-slate-200 dark:border-zinc-800">
                  <Search size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-700 dark:text-zinc-200 uppercase tracking-wider">Status Tracking is Offline</h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                    Status tracking is currently disabled by the SCSIT IT Department. Please contact the Lab Assistant directly for updates.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </main>
      )}

      {/* ── Review & Sign Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/85 backdrop-blur-md no-print">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 max-w-2xl w-full rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
              {/* ── Branded Header ─────── */}
              <div id="print-area" className="space-y-5">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-200/60 dark:border-zinc-800 justify-between">
                  <div className="flex items-center gap-3">
                    <img src="/img/symbiosis-university-of-applied-sciences-logo.jpg" alt="Logo" className="w-11 h-11 object-contain rounded-xl border border-slate-200/30" />
                    <div>
                      <h2 className="text-[11px] font-black text-[#C1121F] uppercase tracking-tight">Symbiosis University of Applied Sciences</h2>
                      <h3 className="text-[9px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">School of Computer Science & Information Technology (SCSIT)</h3>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">SCSIT LabOS — Software Requirement Form</p>
                    </div>
                  </div>
                  <button onClick={() => setShowReviewModal(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer">
                    <X size={16} />
                  </button>
                </div>

                {/* Faculty Details */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800/50 space-y-2">
                  <h4 className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Faculty Verification Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {[
                      { label: "Full Name", value: facultyData.name },
                      { label: "Email", value: facultyData.email },
                      { label: "Mobile", value: facultyData.mobile },
                    ].map(d => (
                      <div key={d.label}>
                        <span className="text-[9px] font-bold text-slate-400 block">{d.label}</span>
                        <span className="font-black text-slate-800 dark:text-white break-all">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Software Table */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Software Requirements List ({softwareList.length} items)</h4>
                  <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-zinc-900/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-zinc-800">
                          {["#", "Semester", "Software", "Version", "Framework", "Fw. Ver"].map(h => (
                            <th key={h} className="px-3.5 py-2.5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                        {softwareList.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-3.5 py-2.5 text-slate-400 font-black">{idx + 1}</td>
                            <td className="px-3.5 py-2.5 text-[#C1121F] dark:text-rose-400 font-black">{row.semester}</td>
                            <td className="px-3.5 py-2.5 font-black text-slate-900 dark:text-white">{row.softwareName}</td>
                            <td className="px-3.5 py-2.5 font-mono text-slate-600 dark:text-zinc-300">{row.version}</td>
                            <td className="px-3.5 py-2.5 text-slate-500">{row.framework || "—"}</td>
                            <td className="px-3.5 py-2.5 font-mono text-slate-400">{row.frameworkVersion || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signature */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Digital E-Signature Verification</h4>
                  <SignaturePad onChange={setSignature} savedSignature={signature} />
                  {signature && (
                    <div className="flex items-start gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="sig-confirm"
                        checked={isSignatureConfirmed}
                        onChange={e => setIsSignatureConfirmed(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-[#C1121F] focus:ring-rose-500 dark:bg-zinc-900 dark:border-zinc-800"
                      />
                      <label htmlFor="sig-confirm" className="text-[10px] font-bold text-slate-600 dark:text-slate-400 select-none cursor-pointer leading-relaxed">
                        I verify that the above software specification list is accurate and required for SCSIT laboratory academic sessions.
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200/50 dark:border-zinc-800 gap-2 no-print">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2.5 text-[11px] font-black uppercase border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Edit Details
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2.5 border border-rose-200 dark:border-rose-900/40 text-[#C1121F] dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[11px] font-black uppercase rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={12} />
                    Save PDF
                  </button>
                  <button
                    disabled={isSubmitting || !signature || !isSignatureConfirmed}
                    onClick={handleFinalSubmit}
                    className="px-6 py-2.5 bg-[#C1121F] hover:bg-rose-700 text-white text-[11px] font-black uppercase rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/20"
                  >
                    {isSubmitting ? (
                      <><RefreshCw size={12} className="animate-spin" /> Submitting…</>
                    ) : (
                      <><Check size={12} /> Submit Request</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Printable version ───────────────────────────────────────── */}
      <div className="print-only hidden font-sans p-8 space-y-6">
        <div className="flex items-center gap-4 border-b-2 border-black pb-4">
          <img src="/img/symbiosis-university-of-applied-sciences-logo.jpg" alt="Logo" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="text-xl font-bold uppercase text-[#C1121F]">Symbiosis University of Applied Sciences, Indore</h1>
            <h2 className="text-sm uppercase font-bold text-black mt-0.5">School of Computer Science & Information Technology (SCSIT)</h2>
            <p className="text-[10px] text-gray-600 mt-1 font-semibold uppercase tracking-wider">SCSIT LabOS — Laboratory Software Requirements Verification Sheet</p>
          </div>
        </div>

        <div className="space-y-1 border border-gray-200 rounded p-3">
          <h3 className="text-xs font-bold uppercase text-gray-700 mb-2">Faculty Details</h3>
          <p className="text-xs"><strong>Name:</strong> {facultyData.name}</p>
          <p className="text-xs"><strong>Email:</strong> {facultyData.email}</p>
          <p className="text-xs"><strong>Mobile:</strong> {facultyData.mobile}</p>
          <p className="text-xs"><strong>Department:</strong> School of Computer Science & Information Technology (SCSIT)</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase text-gray-700">Required Software Specifications</h3>
          <table className="w-full text-left border border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 border border-gray-300">
                <th className="p-2 border border-gray-300">#</th>
                <th className="p-2 border border-gray-300">Semester</th>
                <th className="p-2 border border-gray-300">Software Name</th>
                <th className="p-2 border border-gray-300">Version</th>
                <th className="p-2 border border-gray-300">Framework</th>
                <th className="p-2 border border-gray-300">Framework Version</th>
              </tr>
            </thead>
            <tbody>
              {softwareList.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="p-2 border border-gray-300">{idx + 1}</td>
                  <td className="p-2 border border-gray-300">{row.semester}</td>
                  <td className="p-2 border border-gray-300 font-bold">{row.softwareName}</td>
                  <td className="p-2 border border-gray-300 font-mono">{row.version}</td>
                  <td className="p-2 border border-gray-300">{row.framework || "—"}</td>
                  <td className="p-2 border border-gray-300 font-mono">{row.frameworkVersion || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {signature && (
          <div className="pt-8 flex justify-between items-end">
            <p className="text-[10px] text-gray-500">Generated: {new Date().toLocaleString("en-IN")} · SCSIT LabOS</p>
            <div className="text-center">
              <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Faculty Digital Signature</p>
              <div className="border border-gray-300 p-2 inline-block">
                <img src={signature} alt="Signature" className="h-14 w-auto max-w-[220px]" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{facultyData.name} · {facultyData.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/60 dark:border-zinc-900/60 py-8 text-center no-print">
        <p className="text-[10px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-widest">SCSIT LabOS · Laboratory Operating System</p>
        <p className="text-[9px] font-bold text-slate-300 dark:text-zinc-700 uppercase tracking-wider mt-1">School of Computer Science & Information Technology · Symbiosis University of Applied Sciences, Indore</p>
        <p className="text-[8px] text-slate-200 dark:text-zinc-800 uppercase tracking-widest mt-1.5">© 2026 SCSIT Lab IT Team</p>
      </footer>
    </div>
  );
}
