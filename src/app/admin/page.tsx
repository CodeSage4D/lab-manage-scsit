"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Download, Trash2, Calendar, BookOpen,
  User, Database, Server, RefreshCw, BarChart3, ChevronDown,
  ChevronUp, Sun, Moon, ShieldCheck, LogOut, ShieldAlert,
  KeyRound, Filter, X, FileSpreadsheet, FileText, CheckCircle2,
  Edit, Plus, ToggleLeft, ToggleRight, Phone, Mail, Image as ImageIcon, Check, Sparkles, Save
} from "lucide-react";
import {
  getSubmissions,
  deleteSubmission,
  updateClassStatusAndRemarks,
  getSettings,
  updateSetting,
  getAdmins,
  saveAdmin,
  deleteAdmin,
  adminCreateSubmission
} from "../actions";

/* ── Type definitions ─────────────────────────────────────────────────────── */
interface SoftwareEntry {
  id: string;
  semester: string;
  softwareName: string;
  version: string;
  framework?: string;
  frameworkVersion?: string;
}

interface ClassItem {
  id: string;
  subjectCode: string;
  subjectName: string;
  semesters: string[];
  softwares: SoftwareEntry[];
  softwareName?: string;
  softwareVersion?: string;
  framework: string;
  labSelection: string | null;
  status: "Pending" | "In Progress" | "Installed";
  remarks: string;
  licenseType?: string;
}

interface SubmissionRecord {
  id: number;
  submissionId: string;
  facultyName: string;
  facultyEmail: string;
  facultyMobile: string;
  department: string;
  semester: string;
  subjects: ClassItem[];
  signatureData: string;
  createdAt: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  assigned_labs: string;
  role: string;
  profile_photo?: string;
}

const LABS = ["Lab A","Lab B","Lab C","Lab D","Lab E","Lab F","Lab G","Lab H","Lab I"];
const SEMESTERS = ["Semester I","Semester II","Semester III","Semester IV","Semester V","Semester VI","Semester VII","Semester VIII"];

/* ── Chart bar row helper ─────────────────────────────────────────── */
function BarRow({ label, count, max, color = "ruby" }: { label:string; count:number; max:number; color?:"ruby"|"green"|"yellow" }) {
  const pct = max > 0 ? Math.min(100, (count / max) * 100) : 0;
  const fill = color === "green" ? "bg-emerald-500"
             : color === "yellow" ? "bg-amber-500"
             : "bg-rose-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
        <span className="truncate max-w-[140px]">{label}</span>
        <span className="shrink-0 ml-2">{count}</span>
      </div>
      <div className="progress-bar-track">
        <motion.div
          className={`h-full rounded-full ${fill}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();

  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({
    installation_status_enabled: "true"
  });
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [theme, setTheme] = useState<"light"|"dark">("light");

  /* Active logged-in admin session details */
  const [activeAdmin, setActiveAdmin] = useState<AdminUser | null>(null);

  /* New settings & NAAC Tab state variables */
  const [activeSession, setActiveSession] = useState("July-Dec 2026");
  const [noticeInput, setNoticeInput] = useState("");
  const [activeTab, setActiveTab] = useState<"requests" | "naac">("requests");
  const [editingClasses, setEditingClasses] = useState<Record<string, ClassItem>>({});

  const handleToggleLabSelectionConfig = async () => {
    const nextVal = settings.faculty_lab_selection_enabled === "true" ? "false" : "true";
    try {
      const res = await updateSetting("faculty_lab_selection_enabled", nextVal);
      if (res.success) {
        setSettings(prev => ({ ...prev, faculty_lab_selection_enabled: nextVal }));
        showToast(`Faculty Lab Selection is now ${nextVal === "true" ? "ENABLED" : "DISABLED"}.`);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to update portal settings.");
    }
  };
  const [filterLicenseType, setFilterLicenseType] = useState("All");

  /* Modal state */
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminModalMode, setAdminModalMode] = useState<"add" | "edit">("add");
  const [toastMessage, setToastMessage] = useState("");

  /* Manual Request Creation States */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReqFacultyName, setNewReqFacultyName] = useState("");
  const [newReqFacultyEmail, setNewReqFacultyEmail] = useState("");
  const [newReqFacultyMobile, setNewReqFacultyMobile] = useState("");
  const [newReqSemester, setNewReqSemester] = useState("Semester I");
  const [newReqSoftwares, setNewReqSoftwares] = useState<SoftwareEntry[]>([]);
  const [newReqSoftName, setNewReqSoftName] = useState("");
  const [newReqSoftVersion, setNewReqSoftVersion] = useState("");
  const [newReqSoftFramework, setNewReqSoftFramework] = useState("");
  const [newReqSoftFrameworkVersion, setNewReqSoftFrameworkVersion] = useState("");

  /* Admin Form state */
  const [adminFormId, setAdminFormId] = useState("");
  const [adminFormName, setAdminFormName] = useState("");
  const [adminFormEmail, setAdminFormEmail] = useState("");
  const [adminFormMobile, setAdminFormMobile] = useState("");
  const [adminFormPassword, setAdminFormPassword] = useState("");
  const [adminFormRole, setAdminFormRole] = useState("IT Person");
  const [adminFormPhoto, setAdminFormPhoto] = useState("");
  const [adminFormLabs, setAdminFormLabs] = useState<string[]>([]);
  const [adminFormError, setAdminFormError] = useState("");

  /* Profile Form state */
  const [profileFormName, setProfileFormName] = useState("");
  const [profileFormEmail, setProfileFormEmail] = useState("");
  const [profileFormMobile, setProfileFormMobile] = useState("");
  const [profileFormPhoto, setProfileFormPhoto] = useState("");
  const [profileFormLabs, setProfileFormLabs] = useState<string[]>([]);
  const [profileFormError, setProfileFormError] = useState("");

  /* ── Filter state ─────────────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("All");
  const [filterSemester, setFilterSemester] = useState("All");
  const [filterLab, setFilterLab] = useState("All");
  const [filterSoftware, setFilterSoftware] = useState("All");
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  /* Toast Helper */
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  }, []);

  /* ── Check Auth & Fetch Data ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const submissionsRes = await getSubmissions();
      if (submissionsRes.success && submissionsRes.data) {
        setSubmissions(submissionsRes.data as SubmissionRecord[]);
      }
      
      const settingsRes = await getSettings();
      if (settingsRes.success && settingsRes.settings) {
        setSettings(settingsRes.settings);
        setActiveSession(settingsRes.settings.active_session || "July-Dec 2026");
        setNoticeInput(settingsRes.settings.notice_text || "");
      }

      const adminsRes = await getAdmins();
      if (adminsRes.success && adminsRes.data) {
        setAdminsList(adminsRes.data as AdminUser[]);
      }
    } catch (e) {
      console.error(e);
      showToast("Error querying backend database.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleSessionChange = async (nextSession: string) => {
    let sessionName = nextSession;
    if (nextSession === "Custom...") {
      const customVal = prompt("Enter Custom Academic Session Name (e.g. July-Dec 2026):");
      if (!customVal || !customVal.trim()) return;
      sessionName = customVal.trim();
    }
    
    try {
      const res = await updateSetting("active_session", sessionName);
      if (res.success) {
        setActiveSession(sessionName);
        setSettings(prev => ({ ...prev, active_session: sessionName }));
        showToast(`Active academic session changed to: ${sessionName}`);
      } else {
        showToast("Failed to update session: " + res.error);
      }
    } catch (e) {
      console.error(e);
      showToast("Error updating academic session.");
    }
  };

  const handleSaveNotice = async () => {
    try {
      const res = await updateSetting("notice_text", noticeInput.trim());
      if (res.success) {
        setSettings(prev => ({ ...prev, notice_text: noticeInput.trim() }));
        showToast("Scrolling announcement text updated successfully.");
      } else {
        showToast("Failed to save notice: " + res.error);
      }
    } catch (e) {
      console.error(e);
      showToast("Error updating notice text.");
    }
  };

  const handleUpdateLicenseType = async (submissionId: number, classId: string, currentStatus: any, currentRemarks: string, nextLicenseType: string) => {
    try {
      const res = await updateClassStatusAndRemarks(submissionId, classId, currentStatus, currentRemarks, nextLicenseType);
      if (res.success) {
        setSubmissions(prev => prev.map(s => {
          if (s.id === submissionId) {
            const updatedSubjects = s.subjects.map(c => {
              if (c.id === classId) {
                return { ...c, licenseType: nextLicenseType };
              }
              return c;
            });
            return { ...s, subjects: updatedSubjects };
          }
          return s;
        }));
        showToast("Software license type saved for NAAC audit.");
      } else {
        showToast("Failed to update license type.");
      }
    } catch (e) {
      console.error(e);
      showToast("Error updating license type.");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isAuth = localStorage.getItem("admin_auth") === "true";
    if (!isAuth) {
      router.replace("/admin/login");
      return;
    }

    setAuthorized(true);
    // Load logged-in admin data
    const labsRaw = localStorage.getItem("admin_assigned_labs") || "";
    const currentAdminUser: AdminUser = {
      id: localStorage.getItem("admin_id") || "admin",
      name: localStorage.getItem("admin_name") || "Administrator",
      email: localStorage.getItem("admin_email") || "",
      mobile: localStorage.getItem("admin_mobile") || "",
      assigned_labs: labsRaw,
      role: localStorage.getItem("admin_role") || "IT Person",
      profile_photo: localStorage.getItem("admin_profile_photo") || undefined
    };
    setActiveAdmin(currentAdminUser);

    // Initialize Profile Form state
    setProfileFormName(currentAdminUser.name);
    setProfileFormEmail(currentAdminUser.email);
    setProfileFormMobile(currentAdminUser.mobile);
    setProfileFormPhoto(currentAdminUser.profile_photo || "");
    setProfileFormLabs(labsRaw ? labsRaw.split(",").map(l => l.trim()) : []);

    // Load Theme
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setTheme(isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);

    fetchData();
  }, [router, fetchData]);

  const handleLogout = () => {
    localStorage.removeItem("admin_auth");
    localStorage.removeItem("admin_name");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_id");
    localStorage.removeItem("admin_email");
    localStorage.removeItem("admin_mobile");
    localStorage.removeItem("admin_assigned_labs");
    localStorage.removeItem("admin_profile_photo");
    router.push("/admin/login");
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  /* ── Filter logic ── */
  const uniqueFaculty = useMemo(() => Array.from(new Set(submissions.map(s => s.facultyName))), [submissions]);
  const uniqueSoftwares = useMemo(() => Array.from(
    new Set(submissions.flatMap(s => s.subjects.flatMap(c => {
      if (c.softwares && Array.isArray(c.softwares)) {
        return c.softwares.map(soft => soft.softwareName);
      }
      return c.softwareName ? [c.softwareName] : [];
    })))
  ), [submissions]);
  const uniqueSubjects = useMemo(() => Array.from(
    new Set(submissions.flatMap(s => s.subjects.map(c => c.subjectName)))
  ), [submissions]);

  const filteredSubmissions = useMemo(() => {
    let res = submissions;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      res = res.filter(s =>
        s.facultyName.toLowerCase().includes(q) ||
        s.submissionId.toLowerCase().includes(q) ||
        s.subjects.some(c => c.subjectName.toLowerCase().includes(q) || c.subjectCode.toLowerCase().includes(q))
      );
    }

    if (filterFaculty !== "All") res = res.filter(s => s.facultyName === filterFaculty);
    if (filterSemester !== "All") {
      res = res.filter(s =>
        (s.semester && s.semester.includes(filterSemester)) ||
        s.subjects.some(c => c.semesters && c.semesters.includes(filterSemester))
      );
    }
    if (filterLab !== "All") res = res.filter(s => s.subjects.some(c => c.labSelection === filterLab));
    if (filterSoftware !== "All") {
      res = res.filter(s => s.subjects.some(c => {
        if (c.softwares && Array.isArray(c.softwares)) {
          return c.softwares.some(soft => soft.softwareName === filterSoftware);
        }
        return c.softwareName === filterSoftware;
      }));
    }
    if (filterSubject !== "All") res = res.filter(s => s.subjects.some(c => c.subjectName === filterSubject));
    
    if (filterDateFrom) {
      const from = new Date(filterDateFrom + "T00:00:00");
      res = res.filter(s => new Date(s.createdAt) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo + "T23:59:59");
      res = res.filter(s => new Date(s.createdAt) <= to);
    }

    return res;
  }, [submissions, searchQuery, filterFaculty, filterSemester, filterLab, filterSoftware, filterSubject, filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterFaculty("All");
    setFilterSemester("All");
    setFilterLab("All");
    setFilterSoftware("All");
    setFilterSubject("All");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterLicenseType("All");
  };

  /* Flat rows for NAAC Audit Center sheet */
  const naacRows = useMemo(() => {
    const list: {
      submissionId: string;
      facultyName: string;
      facultyEmail: string;
      semester: string;
      classItem: ClassItem;
      dbId: number;
    }[] = [];
    
    // We flatten submissions into subject/class requirements
    filteredSubmissions.forEach(sub => {
      sub.subjects.forEach(c => {
        list.push({
          submissionId: sub.submissionId,
          facultyName: sub.facultyName,
          facultyEmail: sub.facultyEmail,
          semester: sub.semester,
          classItem: c,
          dbId: sub.id
        });
      });
    });
    return list;
  }, [filteredSubmissions]);

  const filteredNaacRows = useMemo(() => {
    let res = naacRows;
    if (filterLicenseType !== "All") {
      res = res.filter(r => (r.classItem.licenseType || "FOSS/Open Source") === filterLicenseType);
    }
    return res;
  }, [naacRows, filterLicenseType]);

  /* ── Calculations & Metrics ── */
  const totalClassesCount = useMemo(() => submissions.reduce((sum, s) => sum + s.subjects.length, 0), [submissions]);
  const activeFiltersCount = [
    filterFaculty !== "All", filterSemester !== "All", filterLab !== "All",
    filterSoftware !== "All", filterSubject !== "All", !!filterDateFrom, !!filterDateTo,
  ].filter(Boolean).length;

  const labCounts = useMemo(() => {
    const m: Record<string, number> = {};
    submissions.forEach(s => s.subjects.forEach(c => {
      const lab = c.labSelection || "Pending Allocation";
      m[lab] = (m[lab] || 0) + 1;
    }));
    return m;
  }, [submissions]);

  const semesterCounts = useMemo(() => {
    const m: Record<string, number> = {};
    submissions.forEach(s => s.subjects.forEach(c => {
      if (c.semesters && Array.isArray(c.semesters)) {
        c.semesters.forEach(sem => {
          m[sem] = (m[sem] || 0) + 1;
        });
      } else if (s.semester) {
        s.semester.split(',').map(x => x.trim()).forEach(sem => {
          if (sem) m[sem] = (m[sem] || 0) + 1;
        });
      }
    }));
    return m;
  }, [submissions]);

  const softwareCounts = useMemo(() => {
    const m: Record<string, number> = {};
    submissions.forEach(s => s.subjects.forEach(c => {
      if (c.softwares && Array.isArray(c.softwares)) {
        c.softwares.forEach(soft => {
          const name = soft.softwareName.trim();
          if (name) m[name] = (m[name] || 0) + 1;
        });
      } else {
        const name = (c.softwareName || "").trim();
        if (name) m[name] = (m[name] || 0) + 1;
      }
    }));
    return m;
  }, [submissions]);

  const topSoftwares = useMemo(() =>
    Object.entries(softwareCounts).sort((a, b) => b[1] - a[1]).slice(0, 5), [softwareCounts]);

  /* ── RBAC Checks ── */
  const isSuperAdmin = activeAdmin?.role === "Director Admin";
  const isWriteAllowed = activeAdmin?.role === "Director Admin" || activeAdmin?.role === "IT Person";

  /* ── Create Manual Request ── */
  const handleAddNewReqSoft = () => {
    if (!newReqSoftName.trim()) { alert("Software Name is required"); return; }
    if (!newReqSoftVersion.trim()) { alert("Version is required"); return; }
    
    const newSoft: SoftwareEntry = {
      id: String(Date.now()),
      semester: newReqSemester,
      softwareName: newReqSoftName.trim(),
      version: newReqSoftVersion.trim(),
      framework: newReqSoftFramework.trim(),
      frameworkVersion: newReqSoftFrameworkVersion.trim()
    };
    
    setNewReqSoftwares(prev => [...prev, newSoft]);
    setNewReqSoftName("");
    setNewReqSoftVersion("");
    setNewReqSoftFramework("");
    setNewReqSoftFrameworkVersion("");
  };

  const handleRemoveNewReqSoft = (id: string) => {
    setNewReqSoftwares(prev => prev.filter(s => s.id !== id));
  };

  const handleCreateManualSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqFacultyName.trim()) { alert("Faculty Name is required."); return; }
    if (!newReqFacultyEmail.trim()) { alert("Faculty Email is required."); return; }
    if (!newReqFacultyMobile.trim()) { alert("Faculty Mobile is required."); return; }
    if (newReqSoftwares.length === 0) { alert("Please add at least one software requirement."); return; }

    try {
      const subjects = [{
        id: String(Date.now()),
        subjectCode: "REQ",
        subjectName: "Lab Specifications Request",
        semesters: Array.from(new Set(newReqSoftwares.map(s => s.semester))),
        softwares: newReqSoftwares,
        framework: newReqSoftwares[0]?.framework || "",
        labSelection: null,
        status: "Pending" as const,
        remarks: ""
      }];

      const res = await adminCreateSubmission(
        {
          name: newReqFacultyName.trim(),
          email: newReqFacultyEmail.trim(),
          mobile: newReqFacultyMobile.trim(),
          department: "SCSIT",
          semester: newReqSemester
        },
        subjects,
        "ADMIN_MANUAL_ENTRY"
      );

      if (res.success) {
        showToast("Manual request submission created successfully.");
        setShowCreateModal(false);
        // Reset states
        setNewReqFacultyName("");
        setNewReqFacultyEmail("");
        setNewReqFacultyMobile("");
        setNewReqSoftwares([]);
        setNewReqSoftName("");
        setNewReqSoftVersion("");
        setNewReqSoftFramework("");
        setNewReqSoftFrameworkVersion("");
        
        // Sync database/fetch data
        fetchData();
      } else {
        alert(res.error || "Failed to create manual submission.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while creating manual submission.");
    }
  };

  /* ── Delete Faculty Submission ── */
  const handleDeleteSubmission = async (id: number) => {
    if (!isWriteAllowed) {
      alert("Access Denied: restricted to IT Personnel and Directors.");
      return;
    }
    if (!confirm("Permanently delete this faculty request record?")) return;
    try {
      const res = await deleteSubmission(id);
      if (res.success) {
        setSubmissions(prev => prev.filter(s => s.id !== id));
        showToast("Submission record deleted.");
      } else {
        alert("Delete failed: " + res.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  /* ── Update Class Details ── */
  const handleUpdateClass = async (
    submissionId: number,
    classId: string,
    nextStatus: any,
    nextRemarks: string,
    licenseType?: string,
    labSelection?: string | null,
    subjectCode?: string,
    subjectName?: string,
    framework?: string,
    semesters?: string[],
    softwares?: any[]
  ) => {
    try {
      const res = await updateClassStatusAndRemarks(
        submissionId,
        classId,
        nextStatus,
        nextRemarks,
        licenseType,
        labSelection,
        subjectCode,
        subjectName,
        framework,
        semesters,
        softwares
      );
      if (res.success) {
        setSubmissions(prev => prev.map(s => {
          if (s.id === submissionId) {
            const updatedSubjects = s.subjects.map(c => {
              if (c.id === classId) {
                return {
                  ...c,
                  status: nextStatus !== undefined ? nextStatus : c.status,
                  remarks: nextRemarks !== undefined ? nextRemarks : c.remarks,
                  licenseType: licenseType !== undefined ? licenseType : c.licenseType,
                  labSelection: labSelection !== undefined ? labSelection : c.labSelection,
                  subjectCode: subjectCode !== undefined ? subjectCode : c.subjectCode,
                  subjectName: subjectName !== undefined ? subjectName : c.subjectName,
                  framework: framework !== undefined ? framework : c.framework,
                  semesters: semesters !== undefined ? semesters : c.semesters,
                  softwares: softwares !== undefined ? softwares : c.softwares
                };
              }
              return c;
            });
            return { ...s, subjects: updatedSubjects };
          }
          return s;
        }));
        showToast("Class installation details updated.");
      } else {
        showToast("Failed to update: " + res.error);
      }
    } catch (e) {
      console.error(e);
      showToast("Network error during update.");
    }
  };

  /* ── Toggle Configuration Settings ── */
  const handleToggleTrackingConfig = async () => {
    const nextVal = settings.installation_status_enabled === "true" ? "false" : "true";
    try {
      const res = await updateSetting("installation_status_enabled", nextVal);
      if (res.success) {
        setSettings(prev => ({ ...prev, installation_status_enabled: nextVal }));
        showToast(`Installation tracking is now ${nextVal === "true" ? "ENABLED" : "DISABLED"} for Faculty.`);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to update config settings.");
    }
  };

  /* ── Edit Logged-in Admin Profile ── */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFormError("");
    if (!profileFormName.trim() || !profileFormEmail.trim() || !profileFormMobile.trim()) {
      setProfileFormError("Name, Email, and Mobile are required.");
      return;
    }

    if (!activeAdmin) return;

    const payload: AdminUser = {
      id: activeAdmin.id,
      name: profileFormName.trim(),
      email: profileFormEmail.trim(),
      mobile: profileFormMobile.trim(),
      assigned_labs: profileFormLabs.join(","),
      role: activeAdmin.role,
      profile_photo: profileFormPhoto.trim() || undefined
    };

    try {
      const res = await saveAdmin(payload);
      if (res.success) {
        localStorage.setItem("admin_name", payload.name);
        localStorage.setItem("admin_email", payload.email);
        localStorage.setItem("admin_mobile", payload.mobile);
        localStorage.setItem("admin_assigned_labs", payload.assigned_labs);
        if (payload.profile_photo) {
          localStorage.setItem("admin_profile_photo", payload.profile_photo);
        } else {
          localStorage.removeItem("admin_profile_photo");
        }
        
        setActiveAdmin(payload);
        setShowProfileModal(false);
        showToast("Your administrator profile has been updated.");
        fetchData();
      } else {
        setProfileFormError(res.error || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      setProfileFormError("Network error updating profile.");
    }
  };

  /* ── Admin Management Modal open ── */
  const handleOpenAdminModal = (mode: "add" | "edit", adminToEdit?: AdminUser) => {
    setAdminFormError("");
    setAdminModalMode(mode);
    if (mode === "edit" && adminToEdit) {
      setAdminFormId(adminToEdit.id);
      setAdminFormName(adminToEdit.name);
      setAdminFormEmail(adminToEdit.email);
      setAdminFormMobile(adminToEdit.mobile);
      setAdminFormRole(adminToEdit.role);
      setAdminFormPhoto(adminToEdit.profile_photo || "");
      setAdminFormLabs(adminToEdit.assigned_labs ? adminToEdit.assigned_labs.split(",").map(l => l.trim()) : []);
      setAdminFormPassword(""); // leave password blank
      setShowAdminModal(true);
    } else {
      setAdminFormId("");
      setAdminFormName("");
      setAdminFormEmail("");
      setAdminFormMobile("");
      setAdminFormRole("IT Person");
      setAdminFormPhoto("");
      setAdminFormLabs([]);
      setAdminFormPassword("");
      setShowAdminModal(true);
    }
  };

  /* ── Save Admin Account (Super Admin operation) ── */
  const handleSaveAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFormError("");

    if (!adminFormId.trim() || !adminFormName.trim() || !adminFormEmail.trim() || !adminFormMobile.trim()) {
      setAdminFormError("All profile fields are required.");
      return;
    }
    if (adminModalMode === "add" && !adminFormPassword) {
      setAdminFormError("Password is required for new accounts.");
      return;
    }

    const payload: any = {
      id: adminFormId.trim().toLowerCase(),
      name: adminFormName.trim(),
      email: adminFormEmail.trim(),
      mobile: adminFormMobile.trim(),
      role: adminFormRole,
      assigned_labs: adminFormLabs.join(","),
      profile_photo: adminFormPhoto.trim() || null
    };
    if (adminFormPassword) {
      payload.password = adminFormPassword;
    }

    try {
      const res = await saveAdmin(payload);
      if (res.success) {
        setShowAdminModal(false);
        showToast(`Admin account "${payload.name}" successfully saved.`);
        fetchData();
      } else {
        setAdminFormError(res.error || "Failed to save admin account.");
      }
    } catch (err) {
      console.error(err);
      setAdminFormError("Network error saving admin account.");
    }
  };

  /* ── Delete Admin Account ── */
  const handleDeleteAdminAccount = async (id: string) => {
    if (id === "admin") {
      alert("Cannot delete the root System Director account.");
      return;
    }
    if (id === activeAdmin?.id) {
      alert("Cannot delete your own logged-in admin account.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete admin account "${id}"?`)) return;

    try {
      const res = await deleteAdmin(id);
      if (res.success) {
        showToast("Admin account deleted.");
        fetchData();
      } else {
        alert("Failed to delete admin: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* ── CSV Export ── */
  const exportCSV = (rows: SubmissionRecord[], filename: string) => {
    const headers = ["Submission ID","Faculty Name","Email","Mobile","Semester",
      "Subject Code","Subject Name","Requested Lab","Software Requirement","Framework","Status","Remarks","Created At"];
    
    const data = rows.flatMap(sub =>
      sub.subjects.map(c => {
        const classSemesters = c.semesters && Array.isArray(c.semesters) ? c.semesters.join('; ') : sub.semester;
        const classSoftwares = c.softwares && Array.isArray(c.softwares)
          ? c.softwares.map(s => `${s.softwareName}${s.version ? ' v' + s.version : ''}`).join('; ')
          : `${c.softwareName || ''} ${c.softwareVersion ? 'v' + c.softwareVersion : ''}`.trim();

        return [
          sub.submissionId, sub.facultyName, sub.facultyEmail, sub.facultyMobile, classSemesters,
          c.subjectCode, c.subjectName, c.labSelection || "Pending Allocation", classSoftwares, c.framework || "None", c.status, c.remarks || "",
          new Date(sub.createdAt).toLocaleString("en-IN"),
        ].map(v => `"${String(v).replace(/"/g,'""')}"`);
      })
    );

    const csv = [headers.join(","), ...data.map(r => r.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectCls = "px-3 py-2 text-xs rounded-xl outline-none appearance-none bg-slate-50/80 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-suas-ruby/30 transition duration-150 pr-8 w-full";

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <RefreshCw size={24} className="animate-spin text-suas-ruby" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Fixed header with session details ── */}
      <header className="glass-header sticky top-0 z-40 no-print">
        <div className="h-[95px] max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <a href="/"
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-suas-ruby dark:hover:text-suas-ruby-neon transition"
              title="Return to Faculty Portal">
              <ArrowLeft size={16} />
            </a>
            <img
              src="/img/symbiosis-university-of-applied-sciences-logo.jpg"
              alt="SUAS Logo"
              className="w-9 h-9 sm:w-11 sm:h-11 object-contain rounded bg-white hidden sm:block shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-slate-800 dark:text-white leading-tight font-display flex items-center gap-1.5">
                <ShieldCheck className="text-suas-ruby dark:text-suas-ruby-neon shrink-0" size={15} />
                <span className="truncate max-w-[140px] sm:max-w-none">SCSIT Admin Dashboard</span>
              </h1>
              <p className="text-[8px] sm:text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5 truncate max-w-[170px] sm:max-w-none">
                Role-Based Resource &amp; Software Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Session selector dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-150/40 dark:border-rose-900/30 rounded-xl">
              <span className="text-[9px] font-extrabold text-suas-ruby dark:text-suas-ruby-neon uppercase tracking-wider hidden sm:block">Session:</span>
              <select
                value={activeSession}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 dark:text-slate-200 outline-none cursor-pointer border-none p-0 pr-4 appearance-none relative"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'none\'%3E%3Cpath d=\'M7 9l3 3 3-3\' stroke=\'%23e11d48\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")', backgroundPosition: 'right center', backgroundRepeat: 'no-repeat', backgroundSize: '1rem' }}
              >
                <option value="July-Dec 2026">July-Dec 2026</option>
                <option value="Jan-Jun 2027">Jan-Jun 2027</option>
                <option value="July-Dec 2027">July-Dec 2027</option>
                <option value="Jan-Jun 2028">Jan-Jun 2028</option>
                <option value="Custom...">Custom...</option>
              </select>
            </div>
            {/* Active Session details at the top */}
            {activeAdmin && (
              <button
                onClick={() => setShowProfileModal(true)}
                title="Edit your profile details"
                className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-xl hover:border-suas-ruby/40 transition text-left"
              >
                {activeAdmin.profile_photo ? (
                  <img src={activeAdmin.profile_photo} alt="P" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/20 text-suas-ruby font-bold text-xs flex items-center justify-center border border-rose-100">
                    {activeAdmin.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-slate-800 dark:text-white leading-tight truncate max-w-[120px]">{activeAdmin.name}</p>
                  <p className="text-[9px] font-bold text-suas-ruby dark:text-suas-ruby-neon uppercase tracking-wide leading-none mt-0.5">{activeAdmin.role}</p>
                </div>
              </button>
            )}

            <button onClick={toggleTheme} title="Toggle Theme"
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-850 transition">
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <button onClick={fetchData} title="Sync Database"
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-850 transition">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={handleLogout} title="Logout"
              className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8 space-y-8">
        
        {/* Toast alerts */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold rounded-2xl shadow-xl no-print"
            >
              <Sparkles size={14} className="text-suas-ruby-neon shrink-0 animate-pulse" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* System Settings & Installation status Config Controls */}
        <section className="glass-card p-5 border border-slate-200/50 dark:border-zinc-800/50 space-y-4 no-print shadow-sm animate-float-up">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-zinc-850">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <KeyRound size={15} className="text-suas-ruby" /> Portal Configuration Settings
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Manage Faculty Portal features, status tracking widgets, scrolling notices, and active academic sessions.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                Faculty Status Tracking Widget:
              </span>
              <button
                onClick={handleToggleTrackingConfig}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition duration-200"
                title={settings.installation_status_enabled === "true" ? "Disable Tracking" : "Enable Tracking"}
              >
                {settings.installation_status_enabled === "true" ? (
                  <ToggleRight size={38} className="text-suas-ruby-neon" />
                ) : (
                  <ToggleLeft size={38} className="text-slate-400 dark:text-zinc-700" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-3 shrink-0 self-end md:self-auto border-l border-slate-200/50 dark:border-zinc-800/50 pl-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                Faculty Lab Selection:
              </span>
              <button
                onClick={handleToggleLabSelectionConfig}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition duration-200"
                title={settings.faculty_lab_selection_enabled === "true" ? "Disable Lab Selection" : "Enable Lab Selection"}
              >
                {settings.faculty_lab_selection_enabled === "true" ? (
                  <ToggleRight size={38} className="text-suas-ruby-neon" />
                ) : (
                  <ToggleLeft size={38} className="text-slate-400 dark:text-zinc-700" />
                )}
              </button>
            </div>
          </div>

          {/* Announcement notice editor */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="md:col-span-1 space-y-0.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">Scrolling Notice Text</label>
              <p className="text-[10px] text-slate-455">Displays on the Faculty Portal marquee.</p>
            </div>
            <div className="md:col-span-3 flex gap-2 w-full">
              <input
                type="text"
                placeholder="Notice: Enter scrolling notice here..."
                value={noticeInput}
                onChange={(e) => setNoticeInput(e.target.value)}
                className="field-input text-xs flex-1"
              />
              <button
                onClick={handleSaveNotice}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl transition duration-200 shrink-0 shadow-sm"
              >
                Save Notice
              </button>
            </div>
          </div>
        </section>

        {/* ── TOP STAT CARDS ── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 no-print">
          {[
            { icon: <Database size={16}/>, label:"Total Responses", val: loading?"…": submissions.length },
            { icon: <User size={16}/>,     label:"Total Faculty",   val: loading?"…": uniqueFaculty.length },
            { icon: <BookOpen size={16}/>, label:"Total Classes",  val: loading?"…": totalClassesCount },
            { icon: <Server size={16}/>,   label:"Labs Utilised",   val: loading?"…": Object.keys(labCounts).length },
            { icon: <BarChart3 size={16}/>,label:"Software Presets",val: loading?"…": uniqueSoftwares.length },
          ].map((item, idx) => (
            <div key={idx} className="glass-card p-4 flex items-center gap-3 bg-white/70 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850/60 shadow-sm hover-3d">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-rose-50 dark:bg-rose-950/20 text-suas-ruby">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{item.label}</p>
                <p className="font-black text-slate-800 dark:text-white mt-0.5 text-lg leading-none">{item.val}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Main Section layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left / Center Submissions section */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tab navigation for Requests vs NAAC reports */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2 no-print">
              <button
                onClick={() => setActiveTab("requests")}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${
                  activeTab === "requests"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-900"
                }`}
              >
                Faculty Class Requests
              </button>
              <button
                onClick={() => setActiveTab("naac")}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 ${
                  activeTab === "naac"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-900"
                }`}
              >
                <ShieldCheck size={13} className="text-suas-ruby" />
                NAAC Accreditation Audit Sheet
              </button>
            </div>

            {activeTab === "requests" ? (
              <>
                {/* Sticky Filter controls */}
                <div className="sticky top-[100px] z-30 no-print p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/90 border border-slate-200/60 dark:border-zinc-800/60 shadow-md backdrop-blur-md space-y-3.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search by faculty, subject name, code..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="field-input !pl-10 pr-9 py-2 text-xs"
                  />
                  <Search className="absolute left-3.5 top-[10px] text-suas-ruby dark:text-suas-ruby-neon shrink-0" size={14} />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-655 transition">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl bg-rose-50 dark:bg-rose-950/20 text-suas-ruby dark:text-suas-ruby-neon border border-rose-200 dark:border-rose-900/20 hover:bg-rose-100 transition shrink-0"
                  >
                    <Filter size={11} /> Clear ({activeFiltersCount})
                  </button>
                )}
              </div>

              {/* Advanced filter dropdown selectors */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="relative">
                  <select value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} className={selectCls}>
                    <option value="All">All Faculty</option>
                    {uniqueFaculty.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className={selectCls}>
                    <option value="All">All Semesters</option>
                    {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select value={filterLab} onChange={e => setFilterLab(e.target.value)} className={selectCls}>
                    <option value="All">All Labs</option>
                    {LABS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select value={filterSoftware} onChange={e => setFilterSoftware(e.target.value)} className={selectCls}>
                    <option value="All">All Software</option>
                    {uniqueSoftwares.map(sw => <option key={sw} value={sw}>{sw}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className={selectCls}>
                    <option value="All">All Subjects</option>
                    {uniqueSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Submissions list table */}
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950 shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-20 text-center flex flex-col items-center gap-3 text-slate-400">
                  <RefreshCw size={22} className="animate-spin text-suas-ruby" />
                  <span className="text-xs font-bold">Querying PostgreSQL database...</span>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="py-16 text-center text-slate-400 italic text-xs font-medium">
                  No submissions match the current filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-zinc-900/50 text-[9px] font-extrabold text-slate-450 dark:text-slate-550 uppercase tracking-widest border-b border-slate-200 dark:border-zinc-800">
                        <th className="px-5 py-3">Submission ID</th>
                        <th className="px-5 py-3">Faculty</th>
                        <th className="px-5 py-3">Semester</th>
                        <th className="px-5 py-3 text-center">Classes</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3 text-right no-print">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                      {filteredSubmissions.map(sub => (
                        <React.Fragment key={sub.id}>
                          <tr className="hover:bg-slate-50/30 dark:hover:bg-zinc-900/10 transition">
                            <td className="px-5 py-3.5 font-bold font-mono text-suas-ruby dark:text-suas-ruby-neon">
                              <button
                                onClick={() => setExpandedRow(expandedRow === sub.id ? null : sub.id)}
                                className="flex items-center gap-1.5 text-left"
                              >
                                {expandedRow === sub.id ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                                {sub.submissionId}
                              </button>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-extrabold text-slate-800 dark:text-slate-200">{sub.facultyName}</p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{sub.facultyEmail}</p>
                            </td>
                            <td className="px-5 py-3.5 font-semibold text-slate-655 dark:text-slate-400">{sub.semester}</td>
                            <td className="px-5 py-3.5 text-center font-black text-slate-700 dark:text-slate-350">{sub.subjects.length}</td>
                            <td className="px-5 py-3.5 text-slate-500">
                              {new Date(sub.createdAt).toLocaleDateString("en-IN")}
                            </td>
                            <td className="px-5 py-3.5 text-right no-print">
                              {isWriteAllowed ? (
                                <button
                                  onClick={() => handleDeleteSubmission(sub.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                                  title="Delete Record"
                                >
                                  <Trash2 size={14} />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Read-only</span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Row: shows individual classes status management */}
                          <AnimatePresence>
                            {expandedRow === sub.id && (
                              <tr>
                                <td colSpan={6} className="p-0">
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden bg-slate-50/30 dark:bg-zinc-950/25 px-5 py-4 space-y-4"
                                  >
                                    {/* Faculty Contact Details */}
                                    <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-200/50 dark:border-zinc-800/50 text-[11px] font-semibold text-slate-550 dark:text-slate-450">
                                      <p>Email: {sub.facultyEmail} | Phone: {sub.facultyMobile} | Dept: {sub.department}</p>
                                      <p>Submitted: {new Date(sub.createdAt).toLocaleString("en-IN")}</p>
                                    </div>

                                    {/* Classes Status Controls */}
                                    <div className="space-y-3">
                                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Class Setup &amp; Status Management</p>
                                      
                                      {sub.subjects.map((c, idx) => {
                                         const draftClass = editingClasses[c.id] || c;
                                         return (
                                           <div
                                             key={c.id}
                                             className="p-5 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/30 border border-slate-200/60 dark:border-zinc-800/60 flex flex-col gap-4"
                                           >
                                             <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-zinc-800/40 pb-2.5">
                                               <div className="flex items-center gap-2">
                                                 <span className="text-[10px] font-black bg-slate-200 dark:bg-zinc-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-350">
                                                   Class #{idx + 1}
                                                 </span>
                                                 <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                   ID: <span className="font-mono text-[10px]">{c.id}</span>
                                                 </span>
                                               </div>
                                               {editingClasses[c.id] && (
                                                 <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider flex items-center gap-1 animate-pulse">
                                                   ⚠️ Unsaved Changes
                                                 </span>
                                               )}
                                             </div>

                                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                               {/* Subject Code */}
                                               <div className="flex flex-col gap-1.5">
                                                 <label className="text-[9px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                                                   Subject Code
                                                 </label>
                                                 <input
                                                   type="text"
                                                   disabled={!isWriteAllowed}
                                                   value={draftClass.subjectCode}
                                                   onChange={(e) => {
                                                     setEditingClasses(prev => ({
                                                       ...prev,
                                                       [c.id]: { ...draftClass, subjectCode: e.target.value.toUpperCase() }
                                                     }));
                                                   }}
                                                   className="px-3 py-2 text-xs rounded-xl outline-none bg-white dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-200 font-bold"
                                                 />
                                               </div>

                                               {/* Subject Name */}
                                               <div className="flex flex-col gap-1.5">
                                                 <label className="text-[9px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                                                   Subject Name
                                                 </label>
                                                 <input
                                                   type="text"
                                                   disabled={!isWriteAllowed}
                                                   value={draftClass.subjectName}
                                                   onChange={(e) => {
                                                     setEditingClasses(prev => ({
                                                       ...prev,
                                                       [c.id]: { ...draftClass, subjectName: e.target.value }
                                                     }));
                                                   }}
                                                   className="px-3 py-2 text-xs rounded-xl outline-none bg-white dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-200 font-bold"
                                                 />
                                               </div>

                                               {/* Lab Allocation */}
                                               <div className="flex flex-col gap-1.5">
                                                 <label className="text-[9px] font-extrabold text-slate-455 dark:text-slate-500 uppercase tracking-widest">
                                                   Laboratory Allocation
                                                 </label>
                                                 <div className="relative">
                                                   <select
                                                     disabled={!isWriteAllowed}
                                                     value={draftClass.labSelection || "null"}
                                                     onChange={(e) => {
                                                       const val = e.target.value === "null" ? null : e.target.value;
                                                       setEditingClasses(prev => ({
                                                         ...prev,
                                                         [c.id]: { ...draftClass, labSelection: val }
                                                       }));
                                                     }}
                                                     className="w-full px-3 py-2 text-xs rounded-xl border outline-none bg-white dark:bg-zinc-955 border-slate-200 dark:border-zinc-805 text-slate-800 dark:text-slate-200 appearance-none pr-8 font-bold"
                                                   >
                                                     <option value="null">⚠️ Pending Allocation (None)</option>
                                                     {LABS.map(lab => (
                                                       <option key={lab} value={lab}>💻 {lab}</option>
                                                     ))}
                                                   </select>
                                                   <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                                                 </div>
                                               </div>

                                               {/* Status Selector */}
                                               <div className="flex flex-col gap-1.5">
                                                 <label className="text-[9px] font-extrabold text-slate-450 dark:text-slate-550 uppercase tracking-widest">
                                                   Status
                                                 </label>
                                                 <div className="relative">
                                                   <select
                                                     disabled={!isWriteAllowed}
                                                     value={draftClass.status}
                                                     onChange={(e) => {
                                                       setEditingClasses(prev => ({
                                                         ...prev,
                                                         [c.id]: { ...draftClass, status: e.target.value as any }
                                                       }));
                                                     }}
                                                     className={`w-full px-3 py-2 text-xs font-bold rounded-xl border outline-none appearance-none cursor-pointer ${
                                                       draftClass.status === "Installed" ? "neon-glow-green" : draftClass.status === "In Progress" ? "neon-glow-yellow" : "neon-glow-ruby"
                                                     }`}
                                                   >
                                                     <option value="Pending">🔴 Pending</option>
                                                     <option value="In Progress">🟡 In Progress</option>
                                                     <option value="Installed">🟢 Installed</option>
                                                   </select>
                                                   <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                                                 </div>
                                               </div>

                                               {/* Remarks */}
                                               <div className="flex flex-col gap-1.5 sm:col-span-2">
                                                 <label className="text-[9px] font-extrabold text-slate-455 dark:text-slate-550 uppercase tracking-widest">
                                                   Remarks / Notes
                                                 </label>
                                                 <input
                                                   type="text"
                                                   disabled={!isWriteAllowed}
                                                   value={draftClass.remarks || ""}
                                                   onChange={(e) => {
                                                     setEditingClasses(prev => ({
                                                       ...prev,
                                                       [c.id]: { ...draftClass, remarks: e.target.value }
                                                     }));
                                                   }}
                                                   placeholder="Remarks..."
                                                   className="px-3 py-2 text-xs rounded-xl outline-none bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-200"
                                                 />
                                               </div>

                                               {/* Software Requirements List & Inline Builder */}
                                               <div className="flex flex-col gap-2.5 sm:col-span-3 p-4 rounded-xl bg-white dark:bg-zinc-955 border border-slate-205 dark:border-zinc-800/80 mt-2">
                                                 <div className="flex justify-between items-center">
                                                   <span className="text-[9px] font-extrabold text-slate-450 dark:text-slate-550 uppercase tracking-widest">
                                                     Software Requirements List
                                                   </span>
                                                   <span className="text-[8px] font-bold text-slate-400">
                                                     Total: {draftClass.softwares ? draftClass.softwares.length : 0}
                                                   </span>
                                                 </div>

                                                 <div className="space-y-1.5">
                                                   {draftClass.softwares && draftClass.softwares.length > 0 ? (
                                                     <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                                                       <table className="w-full text-left border-collapse text-[11px]">
                                                         <thead>
                                                           <tr className="bg-slate-50 dark:bg-zinc-900/50 text-[9px] font-extrabold text-slate-450 uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                                                             <th className="px-4 py-2">Semester</th>
                                                             <th className="px-4 py-2">Software</th>
                                                             <th className="px-4 py-2">Version</th>
                                                             <th className="px-4 py-2">Framework / Stack</th>
                                                             <th className="px-4 py-2 text-right">Actions</th>
                                                           </tr>
                                                         </thead>
                                                         <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                                                           {draftClass.softwares.map((s, sIdx) => {
                                                             return (
                                                               <tr key={s.id || sIdx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/10 transition text-slate-750 dark:text-slate-300 font-bold">
                                                                 <td className="px-4 py-2 text-suas-ruby dark:text-suas-ruby-neon">
                                                                   <select
                                                                     disabled={!isWriteAllowed}
                                                                     value={s.semester}
                                                                     onChange={(e) => {
                                                                       const updatedSofts = draftClass.softwares.map(item =>
                                                                         item.id === s.id ? { ...item, semester: e.target.value } : item
                                                                       );
                                                                       setEditingClasses(prev => ({
                                                                         ...prev,
                                                                         [c.id]: { ...draftClass, semesters: Array.from(new Set(updatedSofts.map(x => x.semester))), softwares: updatedSofts }
                                                                       }));
                                                                     }}
                                                                     className="bg-transparent text-[11px] font-bold outline-none border border-transparent hover:border-slate-300 focus:border-slate-350 dark:hover:border-zinc-700 px-1 py-0.5 rounded cursor-pointer text-suas-ruby dark:text-suas-ruby-neon"
                                                                   >
                                                                     {SEMESTERS.map(sem => <option key={sem} value={sem}>{sem}</option>)}
                                                                   </select>
                                                                 </td>
                                                                 <td className="px-4 py-2">
                                                                   <input
                                                                     type="text"
                                                                     disabled={!isWriteAllowed}
                                                                     value={s.softwareName}
                                                                     onChange={(e) => {
                                                                       const updatedSofts = draftClass.softwares.map(item =>
                                                                         item.id === s.id ? { ...item, softwareName: e.target.value } : item
                                                                       );
                                                                       setEditingClasses(prev => ({
                                                                         ...prev,
                                                                         [c.id]: { ...draftClass, softwares: updatedSofts }
                                                                       }));
                                                                     }}
                                                                     className="bg-transparent text-[11px] font-bold outline-none border border-transparent hover:border-slate-300 focus:border-slate-350 dark:hover:border-zinc-700 px-1 py-0.5 rounded w-full text-slate-900 dark:text-white"
                                                                   />
                                                                 </td>
                                                                 <td className="px-4 py-2">
                                                                   <input
                                                                     type="text"
                                                                     disabled={!isWriteAllowed}
                                                                     value={s.version || ""}
                                                                     onChange={(e) => {
                                                                       const updatedSofts = draftClass.softwares.map(item =>
                                                                         item.id === s.id ? { ...item, version: e.target.value } : item
                                                                       );
                                                                       setEditingClasses(prev => ({
                                                                         ...prev,
                                                                         [c.id]: { ...draftClass, softwares: updatedSofts }
                                                                       }));
                                                                     }}
                                                                     className="bg-transparent text-[11px] font-mono outline-none border border-transparent hover:border-slate-300 focus:border-slate-350 dark:hover:border-zinc-700 px-1 py-0.5 rounded w-full text-slate-700 dark:text-slate-300"
                                                                   />
                                                                 </td>
                                                                 <td className="px-4 py-2">
                                                                   <input
                                                                     type="text"
                                                                     disabled={!isWriteAllowed}
                                                                     value={s.framework || ""}
                                                                     onChange={(e) => {
                                                                       const updatedSofts = draftClass.softwares.map(item =>
                                                                         item.id === s.id ? { ...item, framework: e.target.value } : item
                                                                       );
                                                                       setEditingClasses(prev => ({
                                                                         ...prev,
                                                                         [c.id]: { ...draftClass, softwares: updatedSofts }
                                                                       }));
                                                                     }}
                                                                     className="bg-transparent text-[11px] outline-none border border-transparent hover:border-slate-300 focus:border-slate-350 dark:hover:border-zinc-700 px-1 py-0.5 rounded w-full text-slate-500"
                                                                   />
                                                                 </td>
                                                                 <td className="px-4 py-2 text-right">
                                                                   <button
                                                                     type="button"
                                                                     disabled={!isWriteAllowed}
                                                                     onClick={() => {
                                                                       const updatedSofts = draftClass.softwares.filter(item => item.id !== s.id);
                                                                       setEditingClasses(prev => ({
                                                                         ...prev,
                                                                         [c.id]: { ...draftClass, semesters: Array.from(new Set(updatedSofts.map(x => x.semester))), softwares: updatedSofts }
                                                                       }));
                                                                     }}
                                                                     className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-105 dark:hover:bg-zinc-800 transition"
                                                                   >
                                                                     <X size={12} />
                                                                   </button>
                                                                 </td>
                                                               </tr>
                                                             );
                                                           })}
                                                         </tbody>
                                                       </table>
                                                     </div>
                                                   ) : (
                                                     <p className="text-[11px] text-slate-400 italic py-2 text-center bg-slate-50 dark:bg-zinc-900 rounded-lg">
                                                       No software requirements added. Add a row below.
                                                     </p>
                                                   )}
                                                 </div>

                                                 {isWriteAllowed && (
                                                   <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center mt-1 border-t border-slate-100 dark:border-zinc-850 pt-2.5">
                                                     {/* New Row: Semester */}
                                                     <div className="relative">
                                                       <select
                                                         id={`new-soft-sem-${c.id}`}
                                                         className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-800 text-suas-ruby dark:text-suas-ruby-neon font-bold appearance-none pr-6"
                                                       >
                                                         {SEMESTERS.map(sem => <option key={sem} value={sem}>{sem}</option>)}
                                                       </select>
                                                       <ChevronDown size={12} className="absolute right-2 top-2 pointer-events-none text-slate-400" />
                                                     </div>

                                                     {/* New Row: Software Name */}
                                                     <input
                                                       type="text"
                                                       id={`new-soft-name-${c.id}`}
                                                       placeholder="Software Name"
                                                       className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-800 text-slate-805 dark:text-slate-200"
                                                     />

                                                     {/* New Row: Version */}
                                                     <input
                                                       type="text"
                                                       id={`new-soft-ver-${c.id}`}
                                                       placeholder="Version"
                                                       className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-805 text-slate-805 dark:text-slate-200"
                                                     />

                                                     {/* New Row: Stack / Framework */}
                                                     <div className="flex gap-2">
                                                       <input
                                                         type="text"
                                                         id={`new-soft-framework-${c.id}`}
                                                         placeholder="Framework"
                                                         className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-800 text-slate-805 dark:text-slate-200"
                                                       />
                                                       <button
                                                         type="button"
                                                         onClick={() => {
                                                           const semSelect = document.getElementById(`new-soft-sem-${c.id}`) as HTMLSelectElement;
                                                           const nameInput = document.getElementById(`new-soft-name-${c.id}`) as HTMLInputElement;
                                                           const verInput = document.getElementById(`new-soft-ver-${c.id}`) as HTMLInputElement;
                                                           const frameInput = document.getElementById(`new-soft-framework-${c.id}`) as HTMLInputElement;
                                                           
                                                           if (nameInput && nameInput.value.trim()) {
                                                             const newSoft = {
                                                               id: Math.random().toString(36).substring(2, 15),
                                                               semester: semSelect.value,
                                                               softwareName: nameInput.value.trim(),
                                                               version: verInput.value.trim(),
                                                               framework: frameInput.value.trim()
                                                             };
                                                             const currentSoftwares = draftClass.softwares || [];
                                                             if (currentSoftwares.some(item => item.semester === newSoft.semester && item.softwareName.toLowerCase() === newSoft.softwareName.toLowerCase())) {
                                                               showToast("Software already in list for this semester.");
                                                               return;
                                                             }
                                                             const nextSoftwares = [...currentSoftwares, newSoft];
                                                             setEditingClasses(prev => ({
                                                               ...prev,
                                                               [c.id]: {
                                                                 ...draftClass,
                                                                 semesters: Array.from(new Set(nextSoftwares.map(x => x.semester))),
                                                                 softwares: nextSoftwares
                                                               }
                                                             }));
                                                             nameInput.value = "";
                                                             verInput.value = "";
                                                             frameInput.value = "";
                                                           }
                                                         }}
                                                         className="px-2.5 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase rounded hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition duration-200 shrink-0"
                                                       >
                                                         + Add
                                                       </button>
                                                     </div>
                                                   </div>
                                                 )}
                                               </div>
                                             </div>

                                             {/* Actions: Save changes button */}
                                             {isWriteAllowed && (
                                               <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-zinc-850/60 pt-2.5">
                                                 {editingClasses[c.id] && (
                                                   <button
                                                     type="button"
                                                     onClick={() => {
                                                       setEditingClasses(prev => {
                                                         const next = { ...prev };
                                                         delete next[c.id];
                                                         return next;
                                                       });
                                                     }}
                                                     className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-400 text-[10px] font-black rounded-lg transition"
                                                   >
                                                     Reset
                                                   </button>
                                                 )}
                                                 <button
                                                   type="button"
                                                   onClick={() => handleUpdateClass(
                                                     sub.id,
                                                     c.id,
                                                     draftClass.status,
                                                     draftClass.remarks,
                                                     draftClass.licenseType,
                                                     draftClass.labSelection,
                                                     draftClass.subjectCode,
                                                     draftClass.subjectName,
                                                     draftClass.framework || draftClass.softwares[0]?.framework || "",
                                                     draftClass.semesters || Array.from(new Set(draftClass.softwares.map(x => x.semester))),
                                                     draftClass.softwares
                                                   )}
                                                   className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white text-[10px] font-black rounded-lg transition flex items-center gap-1 shadow-sm"
                                                 >
                                                   <Save size={12} /> Save Changes
                                                 </button>
                                               </div>
                                             )}
                                           </div>
                                         );
                                       })}

                                    </div>

                                    {/* Signature Verification visual */}
                                    {sub.signatureData && (
                                      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-zinc-850/60">
                                        <div className="text-center">
                                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Faculty Verification Signature</p>
                                          <div className="bg-white border border-slate-200 rounded-xl p-1.5 inline-block shadow-sm">
                                            <img src={sub.signatureData} alt="Sig" className="h-8 w-auto max-w-[140px] object-contain" />
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            
            {/* NAAC Header Information Block (visible in print mode) */}
            <div className="hidden print-only block p-6 border-b-2 border-slate-900 text-center mb-6">
              <h1 className="text-xl font-bold tracking-tight uppercase">SYMBIOSIS UNIVERSITY OF APPLIED SCIENCES, INDORE</h1>
              <h2 className="text-sm font-semibold tracking-wider uppercase mt-1">School of Computer Science and Information Technology (SCSIT)</h2>
              <h3 className="text-xs font-semibold uppercase tracking-wider mt-1 text-slate-500">Laboratory Software Installation &amp; Utilization Audit Report (NAAC Criteria 4.3.1)</h3>
              <div className="flex justify-between text-[11px] font-bold mt-4 pt-2 border-t border-slate-200">
                <span>Academic Session: {settings.active_session || "July-Dec 2026"}</span>
                <span>Report Generation Date: {new Date().toLocaleDateString("en-IN")}</span>
              </div>
            </div>

            {/* NAAC audit intro and filters */}
            <div className="glass-card p-5 border border-slate-200/50 dark:border-zinc-800/50 space-y-4 shadow-sm no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black text-slate-805 dark:text-white">NAAC Accreditation Resource Logging (Criteria 4.3.1)</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    A flat audit ledger of all requested lab softwares, target labs, and digital signatures.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gradient-to-r from-suas-ruby to-suas-ruby-neon text-white text-xs font-black uppercase tracking-wider rounded-xl hover:shadow-lg transition shrink-0"
                >
                  Print official Report
                </button>
              </div>

              {/* License and Lab Filtering */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="relative">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Filter by License Type</label>
                  <select value={filterLicenseType} onChange={e => setFilterLicenseType(e.target.value)} className={selectCls}>
                    <option value="All">All Licenses</option>
                    <option value="FOSS/Open Source">FOSS / Open Source</option>
                    <option value="Licensed/Proprietary">Licensed / Proprietary</option>
                    <option value="Freeware">Freeware</option>
                    <option value="Shareware/Academic">Shareware / Academic</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-[23px] text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Filter by Lab Location</label>
                  <select value={filterLab} onChange={e => setFilterLab(e.target.value)} className={selectCls}>
                    <option value="All">All Labs</option>
                    {LABS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-[23px] text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Filter by Semester</label>
                  <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className={selectCls}>
                    <option value="All">All Semesters</option>
                    {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-[23px] text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Audit Table Sheet */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
              {filteredNaacRows.length === 0 ? (
                <p className="py-12 text-center text-slate-400 italic text-xs font-semibold">No records match the active criteria.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/60 dark:bg-zinc-900/50 text-[9px] font-extrabold text-slate-455 dark:text-slate-550 uppercase tracking-widest border-b border-slate-200 dark:border-zinc-800">
                        <th className="px-4 py-3 text-center">S.No</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Subject / Code</th>
                        <th className="px-4 py-3">Software Requirement</th>
                        <th className="px-4 py-3">License Type</th>
                        <th className="px-4 py-3">Faculty / Sign Status</th>
                        <th className="px-4 py-3 text-center">Audit Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                      {filteredNaacRows.map((row, index) => {
                        const c = row.classItem;
                        const isInstalled = c.status === "Installed";
                        const isInProgress = c.status === "In Progress";
                        const statusClass = isInstalled ? "text-emerald-600 dark:text-emerald-400"
                                            : isInProgress ? "text-amber-600 dark:text-amber-400"
                                            : "text-rose-600 dark:text-rose-400";
                        return (
                          <tr key={index} className="hover:bg-slate-50/20 dark:hover:bg-zinc-900/15 transition">
                            <td className="px-4 py-3 text-center font-bold text-slate-400">#{index + 1}</td>
                            <td className="px-4 py-3 font-extrabold text-slate-700 dark:text-slate-350">{c.labSelection}</td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-800 dark:text-slate-200">{c.subjectName}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{c.subjectCode}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-805 dark:text-slate-200">{c.softwareName}</span>
                              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-100 dark:bg-zinc-800 text-slate-500">v{c.softwareVersion}</span>
                              {c.framework && <p className="text-[9px] text-slate-400 mt-0.5">Stack: {c.framework}</p>}
                            </td>
                            <td className="px-4 py-3">
                              {/* License type selector (editable by admin inline, hidden on print for clean look) */}
                              <div className="relative no-print">
                                <select
                                  value={c.licenseType || "FOSS/Open Source"}
                                  disabled={!isWriteAllowed}
                                  onChange={(e) => handleUpdateLicenseType(row.dbId, c.id, c.status, c.remarks, e.target.value)}
                                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-750 dark:text-slate-300 outline-none cursor-pointer pr-6"
                                >
                                  <option value="FOSS/Open Source">FOSS/Open Source</option>
                                  <option value="Licensed/Proprietary">Licensed/Proprietary</option>
                                  <option value="Freeware">Freeware</option>
                                  <option value="Shareware/Academic">Shareware/Academic</option>
                                </select>
                              </div>
                              {/* Plain text shown for print mode only */}
                              <span className="hidden print-only font-bold text-slate-700">{c.licenseType || "FOSS/Open Source"}</span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-750 dark:text-slate-350">{row.facultyName}</p>
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-455 font-extrabold flex items-center gap-0.5 mt-0.5">
                                Verified Signature ✅
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-black uppercase tracking-wider text-[10px] ${statusClass}`}>
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Print Signatures (visible only on print mode) */}
            <div className="hidden print-only grid grid-cols-2 gap-12 mt-16 text-center text-xs font-bold font-sans">
              <div className="space-y-12">
                <div className="h-10 border-b border-slate-400 w-48 mx-auto" />
                <p>IT Lab Coordinator / Technician</p>
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">SCSIT Laboratory Infrastructure Committee</p>
              </div>
              <div className="space-y-12">
                <div className="h-10 border-b border-slate-400 w-48 mx-auto" />
                <p>Director / Head of SCSIT</p>
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">Symbiosis University of Applied Sciences</p>
              </div>
            </div>
          </div>
        )}
      </div>

          {/* Right sidebar column for export center, admins account, analytics */}
          <div className="space-y-6 no-print">
            
            {/* Create Manual Request Action */}
            {isWriteAllowed && (
              <div className="glass-card p-5 bg-white/70 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850/60 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-705 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <Plus size={14} className="text-suas-ruby" /> Actions
                </h3>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 dark:bg-white hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white text-white dark:text-slate-900 text-xs font-extrabold rounded-xl shadow-md transition duration-200 cursor-pointer"
                >
                  <Plus size={13} /> Create Manual Request
                </button>
              </div>
            )}

            {/* Export Center */}
            <div className="glass-card p-5 bg-white/70 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850/60 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-705 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <Download size={14} className="text-suas-ruby" /> Export Center
              </h3>
              <div className="grid gap-2">
                <button
                  onClick={() => exportCSV(filteredSubmissions, "SCSIT_All_Requirements")}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200/60 dark:border-zinc-800 transition cursor-pointer"
                >
                  <FileSpreadsheet size={13} /> Export filtered CSV
                </button>
                <button
                  onClick={() => exportCSV(submissions, "SCSIT_Complete_Database")}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50/50 dark:bg-rose-950/10 hover:bg-rose-100/60 dark:hover:bg-rose-900/20 text-suas-ruby dark:text-suas-ruby-neon text-xs font-extrabold rounded-xl border border-rose-250/20 dark:border-rose-900/20 transition cursor-pointer"
                >
                  <FileSpreadsheet size={13} /> Export all data (CSV)
                </button>
              </div>
            </div>

            {/* Admin accounts manager listing */}
            <div className="glass-card p-5 bg-white/70 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850/60 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-705 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} className="text-suas-ruby" /> Administrator Profiles
                </h3>
                {isSuperAdmin && (
                  <button
                    onClick={() => handleOpenAdminModal("add")}
                    className="p-1 rounded-lg text-suas-ruby hover:bg-rose-50 dark:hover:bg-zinc-800 transition"
                    title="Add new administrator"
                  >
                    <Plus size={15} />
                  </button>
                )}
              </div>

              {/* Admin profile list */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {adminsList.map(admin => (
                  <div
                    key={admin.id}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-50/80 dark:bg-zinc-950/30 border border-slate-200/50 dark:border-zinc-850/60 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {admin.profile_photo ? (
                        <img src={admin.profile_photo} alt="P" className="w-8 h-8 rounded-full object-cover border" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center">
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-slate-205">
                          {admin.name} <span className="font-mono text-[9px] text-slate-400 font-normal">({admin.id})</span>
                        </p>
                        <p className="text-[9px] font-bold text-suas-ruby dark:text-suas-ruby-neon uppercase mt-0.5">{admin.role}</p>
                      </div>
                    </div>
                    {isSuperAdmin && admin.id !== "admin" && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenAdminModal("edit", admin)}
                          className="p-1 text-slate-400 hover:text-suas-ruby transition"
                          title="Edit Account"
                        >
                          <Edit size={11} />
                        </button>
                        <button
                          onClick={() => handleDeleteAdminAccount(admin.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition"
                          title="Delete Account"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Lab Distribution Allocation bar chart summary */}
            <div className="glass-card p-5 bg-white/70 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850/60 shadow-sm space-y-3.5">
              <h3 className="text-xs font-black text-slate-705 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <Server size={14} className="text-suas-ruby" /> Laboratory Allocation
              </h3>
              {totalClassesCount === 0 ? (
                <p className="text-xs text-slate-400 italic">No allocation data yet.</p>
              ) : (
                <div className="space-y-2">
                  {LABS.map(lab => (
                    <BarRow key={lab} label={lab} count={labCounts[lab] || 0} max={totalClassesCount} />
                  ))}
                </div>
              )}
            </div>

            {/* Semester distribution load bar chart summary */}
            <div className="glass-card p-5 bg-white/70 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850/60 shadow-sm space-y-3.5">
              <h3 className="text-xs font-black text-slate-705 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <BookOpen size={14} className="text-suas-ruby" /> Semester Load Distribution
              </h3>
              {totalClassesCount === 0 ? (
                <p className="text-xs text-slate-400 italic">No load data yet.</p>
              ) : (
                <div className="space-y-2">
                  {SEMESTERS.map(sem => (
                    <BarRow key={sem} label={sem} count={semesterCounts[sem] || 0} max={totalClassesCount} color="green" />
                  ))}
                </div>
              )}
            </div>

            {/* Software demand ranking */}
            <div className="glass-card p-5 bg-white/70 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850/60 shadow-sm space-y-3.5">
              <h3 className="text-xs font-black text-slate-750 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={14} className="text-suas-ruby" /> Top Requested Software
              </h3>
              {topSoftwares.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No requests recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {topSoftwares.map(([swName, count]) => (
                    <BarRow key={swName} label={swName} count={count} max={Math.max(...topSoftwares.map(s => s[1]))} color="yellow" />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── PROFILE MODAL (EDIT ACTIVE ADMIN PROFILE) ── */}
      <AnimatePresence>
        {showProfileModal && activeAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 max-w-md w-full rounded-2xl p-6 shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>

              <div className="pb-3 border-b border-slate-100 dark:border-zinc-850">
                <h4 className="text-base font-black text-slate-805 dark:text-white">Edit Your Profile details</h4>
                <p className="text-xs text-slate-400 mt-0.5">Manage your details. Assigned Role: {activeAdmin.role}</p>
              </div>

              {profileFormError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-suas-ruby text-xs rounded-xl border border-rose-200/50">
                  {profileFormError}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Full Name</label>
                  <input
                    type="text"
                    value={profileFormName}
                    onChange={(e) => setProfileFormName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    value={profileFormEmail}
                    onChange={(e) => setProfileFormEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Mobile Number</label>
                  <input
                    type="tel"
                    value={profileFormMobile}
                    onChange={(e) => setProfileFormMobile(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Profile Photo (optional URL)</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="https://example.com/photo.png"
                      value={profileFormPhoto}
                      onChange={(e) => setProfileFormPhoto(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                    />
                    <ImageIcon className="absolute left-3 top-2.5 text-slate-450" size={13} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Assigned Labs Management</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LABS.map(lab => {
                      const isChecked = profileFormLabs.includes(lab);
                      return (
                        <button
                          key={lab}
                          type="button"
                          disabled // Role based - manageable by super admin only
                          className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold text-center cursor-not-allowed transition ${
                            isChecked ? "bg-rose-50 border-rose-205 text-suas-ruby" : "bg-slate-50/50 border-slate-200 text-slate-400"
                          }`}
                        >
                          {lab}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[9px] text-slate-400 italic">Labs managed is manageable by Director Admin.</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADMIN CRUD MODAL (ADD / EDIT ADMINISTRATORS - SUPER ADMIN ONLY) ── */}
      <AnimatePresence>
        {showAdminModal && isSuperAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 max-w-md w-full rounded-2xl p-6 shadow-2xl relative space-y-4 overflow-y-auto max-h-[90vh]"
            >
              <button
                onClick={() => setShowAdminModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>

              <div className="pb-3 border-b border-slate-100 dark:border-zinc-850">
                <h4 className="text-base font-black text-slate-800 dark:text-white">
                  {adminModalMode === "add" ? "Register New administrator Account" : "Modify administrator Profile"}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Define account identifiers, assigned labs, and system roles.</p>
              </div>

              {adminFormError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-suas-ruby text-xs rounded-xl border border-rose-200/50">
                  {adminFormError}
                </div>
              )}

              <form onSubmit={handleSaveAdminAccount} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Admin ID / Login ID</label>
                    <input
                      type="text"
                      placeholder="e.g. staff.lab"
                      disabled={adminModalMode === "edit"}
                      value={adminFormId}
                      onChange={(e) => setAdminFormId(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border outline-none text-slate-800 dark:text-white ${adminModalMode === "edit" ? "cursor-not-allowed bg-slate-100 text-slate-450 dark:bg-zinc-900 border-zinc-800" : "dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus:ring-1 focus:ring-suas-ruby"}`}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Full Name</label>
                    <input
                      type="text"
                      value={adminFormName}
                      onChange={(e) => setAdminFormName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Password</label>
                    <input
                      type="password"
                      placeholder={adminModalMode === "edit" ? "Leave blank to keep current" : "Set password"}
                      value={adminFormPassword}
                      onChange={(e) => setAdminFormPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                      required={adminModalMode === "add"}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Email Address</label>
                    <input
                      type="email"
                      value={adminFormEmail}
                      onChange={(e) => setAdminFormEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Mobile Number</label>
                    <input
                      type="tel"
                      value={adminFormMobile}
                      onChange={(e) => setAdminFormMobile(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Profile Role</label>
                    <div className="relative">
                      <select
                        value={adminFormRole}
                        onChange={(e) => setAdminFormRole(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl outline-none appearance-none bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-850 dark:text-slate-250 w-full focus:ring-1 focus:ring-suas-ruby pr-8"
                      >
                        <option>Director Admin</option>
                        <option>IT Person</option>
                        <option>Trainer of Practice</option>
                        <option>Lab Assistant</option>
                      </select>
                      <ChevronDown size={13} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Photo URL (optional)</label>
                    <input
                      type="text"
                      placeholder="https://example.com/photo.png"
                      value={adminFormPhoto}
                      onChange={(e) => setAdminFormPhoto(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                    />
                  </div>
                </div>

                {/* Lab allocation selection checkboxes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Assigned Labs Management</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LABS.map(lab => {
                      const isChecked = adminFormLabs.includes(lab);
                      return (
                        <button
                          key={lab}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setAdminFormLabs(prev => prev.filter(l => l !== lab));
                            } else {
                              setAdminFormLabs(prev => [...prev, lab]);
                            }
                          }}
                          className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold text-center cursor-pointer transition ${
                            isChecked ? "bg-rose-50 dark:bg-rose-950/20 border-suas-ruby text-suas-ruby dark:text-suas-ruby-neon" : "bg-slate-50/50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-550 dark:text-slate-400"
                          }`}
                        >
                          {lab}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition cursor-pointer shadow-md"
                >
                  {adminModalMode === "add" ? "Create Admin Profile" : "Save Admin Changes"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* ── CREATE MANUAL REQUEST MODAL (CRUD - CREATE) ── */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 max-w-lg w-full rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto relative text-left"
            >
              {/* Close button */}
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 mb-4">
                <h4 className="text-base font-black text-slate-805 dark:text-white font-display">
                  Create Manual Software Request
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Manually submit a lab requirement request on behalf of a faculty member.</p>
              </div>

              <form onSubmit={handleCreateManualSubmission} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Faculty Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={newReqFacultyName}
                    onChange={(e) => setNewReqFacultyName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-905 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Faculty Email</label>
                    <input
                      type="email"
                      placeholder="name@suas.ac.in"
                      value={newReqFacultyEmail}
                      onChange={(e) => setNewReqFacultyEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-905 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Mobile Number</label>
                    <input
                      type="tel"
                      placeholder="10-digit number"
                      value={newReqFacultyMobile}
                      onChange={(e) => setNewReqFacultyMobile(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-905 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Target Semester</label>
                  <div className="relative">
                    <select
                      value={newReqSemester}
                      onChange={(e) => setNewReqSemester(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl outline-none appearance-none bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-850 dark:text-slate-250 w-full focus:ring-1 focus:ring-suas-ruby pr-8 animate-none"
                    >
                      {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Requirement specifications list */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-905/30 border border-slate-200 dark:border-zinc-800/60 space-y-3">
                  <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">Add Software Row</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Software name"
                      value={newReqSoftName}
                      onChange={(e) => setNewReqSoftName(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-900 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                    />
                    <input
                      type="text"
                      placeholder="Version (e.g. 3.1)"
                      value={newReqSoftVersion}
                      onChange={(e) => setNewReqSoftVersion(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-900 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                    />
                    <input
                      type="text"
                      placeholder="Framework (optional)"
                      value={newReqSoftFramework}
                      onChange={(e) => setNewReqSoftFramework(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-900 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Frame version (optional)"
                        value={newReqSoftFrameworkVersion}
                        onChange={(e) => setNewReqSoftFrameworkVersion(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-900 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-suas-ruby"
                      />
                      <button
                        type="button"
                        onClick={handleAddNewReqSoft}
                        className="px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black rounded-lg cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Added software table list */}
                  {newReqSoftwares.length > 0 && (
                    <div className="border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-zinc-900 text-[9px] font-bold text-slate-450 uppercase border-b border-slate-200 dark:border-zinc-800">
                            <th className="p-2">Sem</th>
                            <th className="p-2">Software</th>
                            <th className="p-2">Version</th>
                            <th className="p-2 text-right">Delete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-slate-750 dark:text-slate-350 font-semibold">
                          {newReqSoftwares.map(item => (
                            <tr key={item.id}>
                              <td className="p-2">{item.semester}</td>
                              <td className="p-2 text-slate-900 dark:text-white">{item.softwareName}</td>
                              <td className="p-2 font-mono">{item.version}</td>
                              <td className="p-2 text-right font-bold">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveNewReqSoft(item.id)}
                                  className="text-suas-ruby hover:text-rose-600 font-bold px-1.5 cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition cursor-pointer shadow-md"
                >
                  Create Request
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="w-full py-8 mt-12 border-t border-slate-200/60 dark:border-zinc-850/60 text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold no-print flex flex-col items-center gap-1.5">
        <p className="uppercase tracking-widest">SCSIT Laboratory Requirement &amp; Installation Portal</p>
        <p className="text-xs font-black text-slate-655 dark:text-slate-350 tracking-wide font-display">School of Computer Science and Information Technology (SCSIT)</p>
        <p className="uppercase tracking-wider text-[9px]">Symbiosis University of Applied Sciences, Indore</p>
        <div className="flex flex-col sm:flex-row items-center gap-1.5 mt-2">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-extrabold">@ SCSIT Lab IT Team 2026</span>
          <span className="hidden sm:inline text-slate-200 dark:text-zinc-800">|</span>
          <span className="text-[7.5px] tracking-[0.35em] font-extrabold uppercase text-sky-200/15 dark:text-sky-955/10 select-none pointer-events-none hover:text-suas-ruby dark:hover:text-suas-ruby-neon hover:opacity-100 transition duration-700 cursor-default">
            registered with aurxon
          </span>
        </div>
      </footer>
    </div>
  );
}
