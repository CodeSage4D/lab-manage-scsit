"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Download, Trash2, Calendar, BookOpen,
  User, Database, Server, RefreshCw, BarChart3, ChevronDown,
  ChevronUp, Sun, Moon, ShieldCheck, LogOut, ShieldAlert,
  KeyRound, Filter, X, FileSpreadsheet, FileText, CheckCircle2,
  Edit, Plus, ToggleLeft, ToggleRight, Phone, Mail, Image as ImageIcon, Check, Sparkles, Save,
  Lock, Unlock, Bell, Activity, Layers, FileCode, History, Settings, Monitor, ClipboardList, Users, Camera
} from "lucide-react";
import LmsPanels from "../../components/LmsPanels";
import {
  getSubmissions,
  deleteSubmission,
  updateClassStatusAndRemarks,
  getSettings,
  updateSetting,
  getAdmins,
  saveAdmin,
  deleteAdmin,
  adminCreateSubmission,
  getDepartmentDetails,
  updateDepartmentDetails,
  getLaboratories,
  saveLaboratory,
  deleteLaboratory,
  getLabSoftwares,
  saveLabSoftware,
  deleteLabSoftware,
  getMaintenanceLogs,
  saveMaintenanceLog,
  deleteMaintenanceLog,
  getInventory,
  saveInventoryItem,
  deleteInventoryItem,
  getAssetLifecycle,
  saveAssetLifecycle,
  deleteAssetLifecycle,
  getNaacDocs,
  saveNaacDoc,
  deleteNaacDoc,
  getIeeeCompliance,
  saveIeeeCompliance,
  deleteIeeeCompliance,
  getDocumentRepo,
  saveDocument,
  deleteDocument,
  getAuditLogs,
  clearAuditLogs,
  logAdminLogout
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

interface DepartmentDetails {
  id: number;
  department_name: string;
  academic_year: string;
  coordinator_name: string;
  lab_coordinator_name: string;
  total_labs: number;
}

interface Laboratory {
  id?: number;
  name: string;
  code: string;
  building: string;
  floor: string;
  location: string;
  seating_capacity: number;
  total_computers: number;
  operating_system: string;
  primary_purpose: string;
  lab_in_charge: string;
  lab_assistant: string;
  status: "Active" | "Under Maintenance" | "Closed";
  created_at?: string;
}

interface LabSoftware {
  id?: number;
  lab_id: number;
  software_name: string;
  version: string;
  framework?: string;
  framework_version?: string;
  license_type: string;
  installation_date: string;
  last_updated_date: string;
  installed_by: string;
  axn_request_id?: string;
  remarks?: string;
  lab_name?: string;
  lab_code?: string;
}

interface MaintenanceLog {
  id?: number;
  maintenance_id: string;
  lab_id: number;
  pc_number?: string;
  system_make?: string;
  system_model?: string;
  serial_number?: string;
  date: string;
  time_stamp?: string;
  issue_description: string;
  reason_for_damage?: string;
  action_taken?: string;
  technician_name: string;
  status: "Pending" | "In Progress" | "Completed";
  completion_date?: string;
  remarks?: string;
  lab_name?: string;
  lab_code?: string;
}

interface InventoryItem {
  id?: number;
  lab_id: number;
  device_type: string;
  asset_number: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  monitor?: string;
  printer_details?: string;
  projector_details?: string;
  ups_details?: string;
  network_details?: string;
  purchase_date: string;
  warranty_details?: string;
  vendor_details?: string;
  status: string;
  lab_name?: string;
  lab_code?: string;
}

interface AssetLifecycleRecord {
  id?: number;
  inventory_id: number;
  purchase_date: string;
  warranty_expiry: string;
  amc_details?: string;
  last_maintenance?: string;
  next_maintenance?: string;
  current_condition: string;
  replacement_recommendation?: string;
  asset_number?: string;
  device_type?: string;
  warranty_details?: string;
  lab_name?: string;
}

interface NaacDoc {
  id?: number;
  lab_id?: number;
  document_type: string;
  document_name: string;
  file_url: string;
  upload_date?: string;
  uploaded_by?: string;
  remarks?: string;
  lab_name?: string;
}

interface IeeeComplianceRecord {
  id?: number;
  lab_id?: number;
  compliance_type: string;
  title: string;
  content_text: string;
  file_url?: string;
  last_reviewed_date: string;
  reviewed_by?: string;
  status: string;
  lab_name?: string;
}

interface DocumentRepoItem {
  id?: number;
  category: string;
  document_name: string;
  file_url: string;
  associated_id?: string;
  upload_date?: string;
  uploaded_by?: string;
  remarks?: string;
}

interface AuditLog {
  id?: number;
  username: string;
  action_performed: string;
  table_name: string;
  record_id: string;
  previous_value?: string;
  updated_value?: string;
  timestamp: string;
}

const LABS = ["Computer Center", "Basic Programming - I", "Basic Programming - II", "Advanced Cloud Computing", "Web Technologies", "Mobile Computing", "Mathamatics Simulation and Sumulation", "Computer Lab", "IOT Lab"];
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
  const [activeTab, setActiveTab] = useState<string>("reports_dashboard");
  const [editingClasses, setEditingClasses] = useState<Record<string, ClassItem>>({});

  /* Modular LMS Data States */
  const [departmentDetails, setDepartmentDetails] = useState<DepartmentDetails | null>(null);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [labSoftwares, setLabSoftwares] = useState<LabSoftware[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [assetLifecycles, setAssetLifecycles] = useState<AssetLifecycleRecord[]>([]);
  const [naacDocsList, setNaacDocsList] = useState<NaacDoc[]>([]);
  const [ieeeRecords, setIeeeRecords] = useState<IeeeComplianceRecord[]>([]);
  const [documentRepoList, setDocumentRepoList] = useState<DocumentRepoItem[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<AuditLog[]>([]);

  /* Modules Status Tracker (computed from settings) */
  const modulesStatus = useMemo(() => {
    const status: Record<string, boolean> = {};
    const lmsModules = [
      "faculty_software_requests",
      "laboratory_management",
      "laboratory_software_records",
      "maintenance_register",
      "reports_dashboard",
      "laboratory_inventory",
      "asset_management",
      "notifications",
      "naac_documentation",
      "ieee_compliance",
      "document_repository",
      "search_audit_logs",
      "asset_capture"
    ];
    lmsModules.forEach(mod => {
      const key = `module_${mod}`;
      const isEnabledByDefault = [
        "faculty_software_requests",
        "laboratory_management",
        "laboratory_software_records",
        "maintenance_register",
        "reports_dashboard",
        "asset_capture"
      ].includes(mod);
      status[mod] = settings[key] !== undefined ? settings[key] === "true" : isEnabledByDefault;
    });
    return status;
  }, [settings]);

  /* Redirect if current tab gets disabled */
  useEffect(() => {
    if (activeTab !== "module_settings" && !modulesStatus[activeTab]) {
      const lmsModules = [
        "reports_dashboard",
        "faculty_software_requests",
        "laboratory_management",
        "laboratory_software_records",
        "maintenance_register",
        "laboratory_inventory",
        "asset_management",
        "naac_documentation",
        "ieee_compliance",
        "document_repository",
        "notifications",
        "search_audit_logs",
        "asset_capture"
      ];
      const firstEnabled = lmsModules.find(m => modulesStatus[m]);
      if (firstEnabled) {
        setActiveTab(firstEnabled);
      } else {
        setActiveTab("module_settings");
      }
    }
  }, [activeTab, modulesStatus]);

  /* Modals and editing states for Modules */
  const [showLabModal, setShowLabModal] = useState(false);
  const [editingLab, setEditingLab] = useState<Laboratory | null>(null);

  const [showSoftwareModal, setShowSoftwareModal] = useState(false);
  const [editingSoftware, setEditingSoftware] = useState<LabSoftware | null>(null);

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceLog | null>(null);

  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);

  const [showLifecycleModal, setShowLifecycleModal] = useState(false);
  const [editingLifecycle, setEditingLifecycle] = useState<AssetLifecycleRecord | null>(null);

  const [showNaacModal, setShowNaacModal] = useState(false);
  const [naacLabId, setNaacLabId] = useState("");
  const [naacDocType, setNaacDocType] = useState("Laboratory Utilization Reports");
  const [naacDocName, setNaacDocName] = useState("");
  const [naacFileBase64, setNaacFileBase64] = useState("");
  const [naacRemarks, setNaacRemarks] = useState("");

  const [showIeeeModal, setShowIeeeModal] = useState(false);
  const [editingIeee, setEditingIeee] = useState<IeeeComplianceRecord | null>(null);

  const [showDocRepoModal, setShowDocRepoModal] = useState(false);
  const [repoCategory, setRepoCategory] = useState("Software Licenses");
  const [repoDocName, setRepoDocName] = useState("");
  const [repoFileBase64, setRepoFileBase64] = useState("");
  const [repoAssociatedId, setRepoAssociatedId] = useState("");
  const [repoRemarks, setRepoRemarks] = useState("");

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

      // Modular LMS Data Fetches
      const deptRes = await getDepartmentDetails();
      if (deptRes.success && deptRes.data) {
        setDepartmentDetails(deptRes.data as DepartmentDetails);
      }

      const labsRes = await getLaboratories();
      if (labsRes.success && labsRes.data) {
        setLaboratories(labsRes.data as Laboratory[]);
      }

      const softRes = await getLabSoftwares();
      if (softRes.success && softRes.data) {
        setLabSoftwares(softRes.data as LabSoftware[]);
      }

      const maintRes = await getMaintenanceLogs();
      if (maintRes.success && maintRes.data) {
        setMaintenanceLogs(maintRes.data as MaintenanceLog[]);
      }

      const invRes = await getInventory();
      if (invRes.success && invRes.data) {
        setInventoryItems(invRes.data as InventoryItem[]);
      }

      const lifecycleRes = await getAssetLifecycle();
      if (lifecycleRes.success && lifecycleRes.data) {
        setAssetLifecycles(lifecycleRes.data as AssetLifecycleRecord[]);
      }

      const naacDocsRes = await getNaacDocs();
      if (naacDocsRes.success && naacDocsRes.data) {
        setNaacDocsList(naacDocsRes.data as NaacDoc[]);
      }

      const ieeeRes = await getIeeeCompliance();
      if (ieeeRes.success && ieeeRes.data) {
        setIeeeRecords(ieeeRes.data as IeeeComplianceRecord[]);
      }

      const docRepoRes = await getDocumentRepo();
      if (docRepoRes.success && docRepoRes.data) {
        setDocumentRepoList(docRepoRes.data as DocumentRepoItem[]);
      }

      const auditRes = await getAuditLogs();
      if (auditRes.success && auditRes.data) {
        setAuditLogsList(auditRes.data as AuditLog[]);
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

  /* ========================================================================
     MODULAR LMS frontend handlers
     ======================================================================== */

  const handleToggleModule = async (moduleId: string) => {
    const key = `module_${moduleId}`;
    const nextVal = modulesStatus[moduleId] ? "false" : "true";
    try {
      const res = await updateSetting(key, nextVal);
      if (res.success) {
        setSettings(prev => ({ ...prev, [key]: nextVal }));
        showToast(`Module "${moduleId.replace(/_/g, ' ').toUpperCase()}" ${nextVal === "true" ? "ENABLED" : "LOCKED/DISABLED"}.`);
      } else {
        showToast("Failed to update module status.");
      }
    } catch (e) {
      console.error(e);
      showToast("Error updating module status.");
    }
  };

  const handleSaveDepartmentDetails = async (e: React.FormEvent, deptData: any) => {
    e.preventDefault();
    try {
      const res = await updateDepartmentDetails(deptData, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("Department details updated successfully.");
        fetchData();
      } else {
        alert("Failed to save department details: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveLab = async (e: React.FormEvent, labData: any) => {
    e.preventDefault();
    try {
      const res = await saveLaboratory(labData, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast(`Laboratory ${labData.id ? "updated" : "created"} successfully.`);
        setShowLabModal(false);
        setEditingLab(null);
        fetchData();
      } else {
        alert("Failed to save laboratory: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLab = async (id: number) => {
    if (!confirm("Are you sure you want to delete this laboratory? All associated software, inventory, and maintenance records will be affected.")) return;
    try {
      const res = await deleteLaboratory(id, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("Laboratory record deleted.");
        fetchData();
      } else {
        alert("Failed to delete laboratory: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSoftwareRecord = async (e: React.FormEvent, softData: any) => {
    e.preventDefault();
    try {
      const res = await saveLabSoftware(softData, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("Software installation record saved.");
        setShowSoftwareModal(false);
        setEditingSoftware(null);
        fetchData();
      } else {
        alert("Failed to save software record: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSoftwareRecord = async (id: number) => {
    if (!confirm("Delete this software installation record?")) return;
    try {
      const res = await deleteLabSoftware(id, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("Software installation record deleted.");
        fetchData();
      } else {
        alert("Failed to delete record: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMaintenanceRecord = async (e: React.FormEvent, maintData: any) => {
    e.preventDefault();
    try {
      const res = await saveMaintenanceLog(maintData, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("Maintenance record saved.");
        setShowMaintenanceModal(false);
        setEditingMaintenance(null);
        fetchData();
      } else {
        alert("Failed to save maintenance record: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMaintenanceRecord = async (id: number) => {
    if (!confirm("Delete this maintenance record?")) return;
    try {
      const res = await deleteMaintenanceLog(id, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("Maintenance record deleted.");
        fetchData();
      } else {
        alert("Failed to delete record: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveInventoryRecord = async (e: React.FormEvent, invData: any) => {
    e.preventDefault();
    try {
      const res = await saveInventoryItem(invData, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("Inventory item saved successfully.");
        setShowInventoryModal(false);
        setEditingInventory(null);
        fetchData();
      } else {
        alert("Failed to save inventory item: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInventoryRecord = async (id: number) => {
    if (!confirm("Delete this inventory item?")) return;
    try {
      const res = await deleteInventoryItem(id, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("Inventory item deleted.");
        fetchData();
      } else {
        alert("Failed to delete item: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAssetLifecycleRecord = async (e: React.FormEvent, lifeData: any) => {
    e.preventDefault();
    try {
      const res = await saveAssetLifecycle(lifeData, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("Asset lifecycle record saved.");
        setShowLifecycleModal(false);
        setEditingLifecycle(null);
        fetchData();
      } else {
        alert("Failed to save lifecycle details: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAssetLifecycleRecord = async (id: number) => {
    if (!confirm("Delete this asset lifecycle record?")) return;
    try {
      const res = await deleteAssetLifecycle(id, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("Asset lifecycle record deleted.");
        fetchData();
      } else {
        alert("Failed to delete record: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadNaacDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naacDocName.trim()) { alert("Document Name is required."); return; }
    if (!naacFileBase64) { alert("Please select a file to upload."); return; }
    try {
      const payload = {
        lab_id: naacLabId ? parseInt(naacLabId) : null,
        document_type: naacDocType,
        document_name: naacDocName.trim(),
        file_url: naacFileBase64,
        remarks: naacRemarks
      };
      const res = await saveNaacDoc(payload, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("NAAC Document uploaded successfully.");
        setShowNaacModal(false);
        setNaacDocName("");
        setNaacRemarks("");
        setNaacFileBase64("");
        fetchData();
      } else {
        alert("Upload failed: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNaacDoc = async (id: number) => {
    if (!confirm("Permanently delete this NAAC document?")) return;
    try {
      const res = await deleteNaacDoc(id, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("NAAC Document deleted.");
        fetchData();
      } else {
        alert("Delete failed: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveIeeeComplianceRecord = async (e: React.FormEvent, ieeeData: any) => {
    e.preventDefault();
    try {
      const res = await saveIeeeCompliance(ieeeData, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("IEEE compliance record saved.");
        setShowIeeeModal(false);
        setEditingIeee(null);
        fetchData();
      } else {
        alert("Failed to save IEEE compliance record: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteIeeeComplianceRecord = async (id: number) => {
    if (!confirm("Delete this IEEE compliance record?")) return;
    try {
      const res = await deleteIeeeCompliance(id, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("IEEE compliance record deleted.");
        fetchData();
      } else {
        alert("Failed to delete record: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadRepoDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoDocName.trim()) { alert("Document Name is required."); return; }
    if (!repoFileBase64) { alert("Please select a file to upload."); return; }
    try {
      const payload = {
        category: repoCategory,
        document_name: repoDocName.trim(),
        file_url: repoFileBase64,
        associated_id: repoAssociatedId || null,
        remarks: repoRemarks
      };
      const res = await saveDocument(payload, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("Document saved to repository.");
        setShowDocRepoModal(false);
        setRepoDocName("");
        setRepoFileBase64("");
        setRepoAssociatedId("");
        setRepoRemarks("");
        fetchData();
      } else {
        alert("Upload failed: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRepoDoc = async (id: number) => {
    if (!confirm("Permanently delete this document from repository?")) return;
    try {
      const res = await deleteDocument(id, activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("Document deleted from repository.");
        fetchData();
      } else {
        alert("Delete failed: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearLogs = async () => {
    if (!isSuperAdmin) {
      alert("Access Denied: Only Director Admin can clear audit logs.");
      return;
    }
    if (!confirm("Permanently clear all system audit logs?")) return;
    try {
      const res = await clearAuditLogs(activeAdmin?.name || "Admin");
      if (res.success) {
        showToast("All system audit logs cleared.");
        fetchData();
      } else {
        alert("Clear failed: " + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
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

  const handleLogout = React.useCallback(() => {
    const adminId = localStorage.getItem("admin_id") || "Unknown";
    const adminName = localStorage.getItem("admin_name") || "Unknown";
    logAdminLogout(adminId, adminName).catch(err => console.error(err));

    localStorage.removeItem("admin_auth");
    localStorage.removeItem("admin_name");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_id");
    localStorage.removeItem("admin_email");
    localStorage.removeItem("admin_mobile");
    localStorage.removeItem("admin_assigned_labs");
    localStorage.removeItem("admin_profile_photo");
    router.push("/admin/login");
  }, [router]);

  // Auto logout on inactivity (5 minutes)
  useEffect(() => {
    if (!authorized) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        // Trigger alert via native alert or state indicator
        console.log("Session expired due to inactivity");
      }, 5 * 60 * 1000); // 5 minutes inactivity
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [authorized, handleLogout]);

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
  const isWriteAllowed = activeAdmin?.role === "Director Admin" || 
                         activeAdmin?.role === "IT Person" || 
                         activeAdmin?.role === "Trainer of Practice" || 
                         activeAdmin?.role === "Lab Assistant";

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
      {/* ── Enterprise Institutional Header (Two-tier) ── */}
      <header className="sticky top-0 z-40 no-print bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-slate-200/60 dark:border-zinc-900/60 transition-all duration-300 shadow-[0_1px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.35)]">

        {/* TIER 1: Institutional Branding Strip */}
        <div className="border-b border-slate-100/80 dark:border-zinc-900/80 bg-gradient-to-r from-white via-rose-50/10 to-white dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
            {/* Logo — prominent display */}
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#C1121F] to-rose-600 opacity-10 blur-md" />
              <img
                src="/img/symbiosis-university-of-applied-sciences-logo.jpg"
                alt="Symbiosis University of Applied Sciences"
                className="w-12 h-12 md:w-[52px] md:h-[52px] object-contain rounded-2xl bg-white relative border border-slate-200/40 shadow-sm"
              />
            </div>
            {/* Full institution name block */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[13px] md:text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                  Symbiosis University of Applied Sciences
                </h1>
                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-gradient-to-r from-[#C1121F] to-rose-600 text-white shadow-sm shadow-rose-500/25 border border-rose-700/20 hidden sm:inline-flex">
                  SCSIT-OS
                </span>
              </div>
              <p className="text-[10px] md:text-[11px] font-extrabold text-[#C1121F] dark:text-rose-400 uppercase tracking-widest leading-none mt-1">
                School of Computer Science &amp; Information Technology (SCSIT)
              </p>
              <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest leading-none mt-0.5 hidden md:block">
                Laboratory Operating System &nbsp;·&nbsp; Admin Workspace &nbsp;·&nbsp; Indore, Madhya Pradesh
              </p>
            </div>
          </div>
        </div>

        {/* TIER 2: Navigation / Action Strip */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-[48px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/"
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900/50 dark:hover:bg-zinc-800 border border-slate-200/40 dark:border-zinc-800/40 text-slate-500 hover:text-[#C1121F] dark:hover:text-rose-400 transition duration-200 flex items-center justify-center"
              title="Return to Faculty Portal">
              <ArrowLeft size={14} />
            </a>
            <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />
            <span className="text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest hidden sm:block">Admin Workspace</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Session selector */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200/40 dark:border-zinc-800/40 rounded-xl hover:border-rose-300/45 dark:hover:border-rose-900/40 transition duration-200">
              <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:block">Session:</span>
              <select
                value={activeSession}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="bg-transparent text-[10px] font-extrabold text-slate-800 dark:text-slate-200 outline-none cursor-pointer border-none p-0 pr-4 appearance-none focus:ring-0"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'none\'%3E%3Cpath d=\'M7 9l3 3 3-3\' stroke=\'%23e11d48\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")', backgroundPosition: 'right center', backgroundRepeat: 'no-repeat', backgroundSize: '0.8rem' }}
              >
                <option value="July-Dec 2026">July-Dec 2026</option>
                <option value="Jan-Jun 2027">Jan-Jun 2027</option>
                <option value="July-Dec 2027">July-Dec 2027</option>
                <option value="Jan-Jun 2028">Jan-Jun 2028</option>
                <option value="Custom...">Custom...</option>
              </select>
            </div>

            {/* Admin profile chip */}
            {activeAdmin && (
              <button
                onClick={() => setShowProfileModal(true)}
                title="Edit your profile details"
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 border border-slate-200/45 dark:border-zinc-800/40 rounded-xl transition duration-200 text-left"
              >
                {activeAdmin.profile_photo ? (
                  <img src={activeAdmin.profile_photo} alt="P" className="w-6 h-6 rounded-full object-cover border border-slate-200/30" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-rose-50 dark:bg-rose-950/20 text-[#C1121F] font-black text-xs flex items-center justify-center border border-rose-100/40">
                    {activeAdmin.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-800 dark:text-zinc-200 leading-tight truncate max-w-[100px]">{activeAdmin.name}</p>
                  <p className="text-[8px] font-black text-[#C1121F] dark:text-rose-400 uppercase tracking-wider leading-none mt-0.5">{activeAdmin.role}</p>
                </div>
              </button>
            )}

            <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

            <button onClick={toggleTheme} title="Toggle Theme"
              className="p-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900/40 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200/40 dark:border-zinc-800/40 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 transition duration-200">
              {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            <button onClick={fetchData} title="Sync Database"
              className="p-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900/40 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200/40 dark:border-zinc-800/40 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 transition duration-200">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={handleLogout} title="Logout"
              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-200/30 dark:border-rose-900/30 text-rose-600 hover:text-rose-500 transition duration-200">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
        
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Collapsible Sidebar Navigation Panel */}
          <aside className="lg:col-span-1 space-y-4 no-print text-left">
            <div className="bg-white/80 dark:bg-zinc-950/40 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-900/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.25)] rounded-3xl p-5 space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-2 px-1">SCSIT LabOS · Workspace</h3>
              <nav className="space-y-1.5">
                {[
                  { id: "reports_dashboard", name: "Dashboard & Reports", icon: <BarChart3 size={14} /> },
                  { id: "faculty_software_requests", name: "Faculty Requests", icon: <BookOpen size={14} /> },
                  { id: "computers_register", name: "Computers Register", icon: <Monitor size={14} />, path: "/admin/computers" },
                  { id: "laboratory_management", name: "Department & Labs", icon: <Server size={14} />, path: "/admin/labs" },
                  { id: "laboratory_software_records", name: "Software Records", icon: <FileCode size={14} />, path: "/admin/software" },
                  { id: "maintenance_register", name: "Maintenance Logs", icon: <Activity size={14} />, path: "/admin/maintenance" },
                  { id: "laboratory_inventory", name: "Hardware Inventory", icon: <Layers size={14} />, path: "/admin/inventory" },
                  { id: "asset_management", name: "Asset Lifecycle", icon: <Calendar size={14} />, path: "/admin/inventory" },
                  { id: "lab_bookings", name: "Lab Bookings", icon: <Calendar size={14} />, path: "/admin/bookings" },
                  { id: "visitor_register", name: "Visitor Register", icon: <User size={14} />, path: "/admin/visitors" },
                  { id: "daily_work_register", name: "Daily Work Register", icon: <ClipboardList size={14} />, path: "/admin/daily-work" },
                  { id: "staff_workspace", name: "Staff Profile Workspace", icon: <Users size={14} />, path: "/admin/staff" },
                  { id: "asset_capture", name: "IT Asset Capture", icon: <Camera size={14} />, path: "/admin/asset-capture" },
                  { id: "naac_documentation", name: "NAAC Documentation", icon: <ShieldCheck size={14} /> },
                  { id: "ieee_compliance", name: "IEEE Guidelines", icon: <FileText size={14} /> },
                  { id: "document_repository", name: "Doc Repository", icon: <FileText size={14} /> },
                  { id: "notifications", name: "System Alerts", icon: <Bell size={14} /> },
                  { id: "search_audit_logs", name: "Search & Audit Logs", icon: <History size={14} /> }
                ].map(item => {
                  const isEnabled = item.id.endsWith("_register") || item.id === "lab_bookings" || item.id === "computers_register" || item.id === "staff_workspace" || modulesStatus[item.id];
                  if (!isEnabled) return null;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.path) {
                          router.push(item.path);
                        } else {
                          setActiveTab(item.id);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-2xl transition-all duration-200 text-left cursor-pointer border ${
                        isActive
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 shadow-[0_4px_20px_rgba(225,29,72,0.05)] scale-[1.01]"
                          : "text-slate-550 border-transparent dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900/40 hover:border-slate-200/40 dark:hover:border-zinc-850/40"
                      }`}
                    >
                      <span className={`transition-transform duration-200 ${isActive ? "scale-110 text-suas-ruby dark:text-suas-ruby-neon" : ""}`}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </button>
                  );
                })}
                
                {/* Module Settings (always visible) */}
                <button
                  onClick={() => setActiveTab("module_settings")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-2xl transition-all duration-200 mt-4 border border-dashed text-left cursor-pointer ${
                    activeTab === "module_settings"
                      ? "bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 shadow-[0_4px_20px_rgba(225,29,72,0.05)] scale-[1.01]"
                      : "text-slate-500 border-slate-200/50 hover:border-rose-200/45 dark:border-zinc-850 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                  }`}
                >
                  <Settings size={14} className={activeTab === "module_settings" ? "text-suas-ruby dark:text-suas-ruby-neon" : ""} />
                  <span>Module Settings</span>
                </button>
              </nav>
            </div>

            {/* Quick stats on sidebar */}
            {activeTab !== "reports_dashboard" && (
              <div className="glass-card p-5 border border-slate-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/30 text-xs space-y-3 hidden lg:block">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Quick Summary</span>
                <div className="space-y-2 font-bold">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Labs:</span>
                    <span className="text-suas-ruby">{laboratories.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Softwares:</span>
                    <span className="text-slate-800 dark:text-white">{labSoftwares.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Open Complaints:</span>
                    <span className="text-amber-500">{maintenanceLogs.filter(x => x.status !== "Completed").length}</span>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Main Action Work Area Content */}
          <main className="lg:col-span-3">
            {activeTab === "module_settings" ? (
              /* System and Module management panel */
              <div className="space-y-6 animate-float-up text-left">
                {/* Title */}
                <div>
                  <h3 className="text-sm font-black text-slate-855 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Settings size={15} className="text-suas-ruby" /> SCSIT LabOS · Module Configuration
                  </h3>
                  <p className="text-[10px] text-slate-455 font-medium">Configure active workspace modules, department settings, scrolling announcements, and administrator accounts.</p>
                </div>

                {/* Module Settings Grid */}
                <div className="glass-card p-6 border border-slate-200/50 dark:border-zinc-800/50 space-y-4">
                  <div className="pb-3 border-b border-slate-105 dark:border-zinc-850">
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">Active Core &amp; Phased Modules</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Toggle status switches to dynamically disable/hide modules. Data records are preserved across toggles.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: "reports_dashboard", name: "Module 9: Dashboard & Reports", desc: "Overview analytics graphs, data CSV and print report tools.", core: true },
                      { id: "faculty_software_requests", name: "Module 1: Faculty Software Requests", desc: "AXN tracking, status updaters, lab allocator dropdowns, receipt generator.", core: true },
                      { id: "laboratory_management", name: "Module 2: Department & Laboratory Management", desc: "CRUD setups for building laboratories, seat counts, coordinates.", core: true },
                      { id: "laboratory_software_records", name: "Module 3: Lab Software Installed Records", desc: "Log software presets, license types, stacks installed in computers.", core: true },
                      { id: "maintenance_register", name: "Module 4: Maintenance Register Log", desc: "Technical interventions record sheet, technician logs, statuses.", core: true },
                      { id: "laboratory_inventory", name: "Module 5: Laboratory Inventory System", desc: "Asset directory tracking computers, switches, ups, and printer specifications.", phase: 2 },
                      { id: "asset_management", name: "Module 6: Asset Lifecycle & AMCs", desc: "Warranty expiry checker notifications, AMC contract registers.", phase: 2 },
                      { id: "naac_documentation", name: "Module 7: NAAC Accreditation Docs", desc: "Base64 document uploads: utilization reports, stocks verifications, photos.", phase: 3 },
                      { id: "ieee_compliance", name: "Module 8: IEEE Guidelines", desc: "Guidelines record database, safety inspection logs, SOP document templates.", phase: 3 },
                      { id: "document_repository", name: "Module 10: Document Repository Archive", desc: "Categorized central download vault for invoices, licenses, and contracts.", phase: 3 },
                      { id: "notifications", name: "Module 11: Warnings Alert Center", desc: "AMC expiry indicators, software demand warnings, maintenance alerts.", phase: 2 },
                      { id: "search_audit_logs", name: "Module 12: Search & Audit timelines", desc: "Advanced cross-module quick queries search, operator action timeline.", phase: 3 },
                      { id: "asset_capture", name: "Module 13: IT Asset Scanner", desc: "Capture CPU barcodes, monitor QR codes, and run text OCR scanner on device camera.", phase: 2 }
                    ].map(mod => {
                      const isEnabled = modulesStatus[mod.id];
                      return (
                        <div key={mod.id} className="p-4 rounded-xl border border-slate-100 dark:border-zinc-850/60 bg-slate-50/30 dark:bg-zinc-950/20 flex items-center justify-between gap-4 text-xs">
                          <div className="space-y-0.5 text-left">
                            <span className="font-extrabold text-slate-800 dark:text-slate-205 block">{mod.name}</span>
                            <span className="text-[10px] text-slate-500 leading-normal block">{mod.desc}</span>
                            <div className="flex gap-2 items-center mt-1">
                              {mod.core ? (
                                <span className="text-[8px] font-black uppercase text-suas-ruby bg-rose-50 dark:bg-rose-955/20 px-1.5 py-0.5 rounded">Core Feature</span>
                              ) : (
                                <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Phase {mod.phase}</span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleModule(mod.id)}
                            disabled={!isSuperAdmin}
                            className="p-1 rounded-full hover:bg-white dark:hover:bg-zinc-900 transition duration-200 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title={isEnabled ? "Lock/Disable Module" : "Unlock/Enable Module"}
                          >
                            {isEnabled ? (
                              <ToggleRight size={38} className="text-suas-ruby-neon" />
                            ) : (
                              <ToggleLeft size={38} className="text-slate-350 dark:text-zinc-800" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Faculty Portal Configuration Controls */}
                <div className="glass-card p-6 border border-slate-205 dark:border-zinc-800/50 space-y-4">
                  <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">Faculty Portal Features</h4>
                    <span className="text-[9px] text-slate-400 uppercase font-black">Dynamic toggles</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-150 dark:border-zinc-850">
                      <div>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 block">Faculty Status Tracking Widget</span>
                        <span className="text-[10px] text-slate-500 font-semibold">Enable system tracking status indicators inside faculty submission portal.</span>
                      </div>
                      <button
                        onClick={handleToggleTrackingConfig}
                        disabled={!isWriteAllowed}
                        className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition duration-200 cursor-pointer disabled:opacity-50"
                      >
                        {settings.installation_status_enabled === "true" ? (
                          <ToggleRight size={38} className="text-suas-ruby-neon" />
                        ) : (
                          <ToggleLeft size={38} className="text-slate-400 dark:text-zinc-700" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-150 dark:border-zinc-855">
                      <div>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 block">Faculty Lab Allocation Selection</span>
                        <span className="text-[10px] text-slate-500 font-semibold">Allow faculty to request/select target computing laboratories directly.</span>
                      </div>
                      <button
                        onClick={handleToggleLabSelectionConfig}
                        disabled={!isWriteAllowed}
                        className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition duration-200 cursor-pointer disabled:opacity-50"
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
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-850 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div className="md:col-span-1 space-y-0.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">Scrolling Notice Text</label>
                      <p className="text-[10px] text-slate-455 font-medium">Displays on the Faculty Portal marquee.</p>
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
                        disabled={!isWriteAllowed}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl transition duration-200 shrink-0 shadow-sm cursor-pointer"
                      >
                        Save Notice
                      </button>
                    </div>
                  </div>
                </div>

                {/* General assistant profiles crud list */}
                <div className="glass-card p-6 border border-slate-200/50 dark:border-zinc-800/50 space-y-4">
                  <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-805 dark:text-white font-display">Authorized Administrator Profiles</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Role-based accounts managing computing centers resource allocations.</p>
                    </div>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleOpenAdminModal("add")}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold uppercase text-[9px] tracking-wider transition cursor-pointer"
                      >
                        + Add Admin
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {adminsList.map(admin => (
                      <div
                        key={admin.id}
                        className="p-4 rounded-xl border border-slate-105 dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/20 flex items-center justify-between gap-4 text-xs font-bold"
                      >
                        <div className="flex items-center gap-3">
                          {admin.profile_photo ? (
                            <img src={admin.profile_photo} alt="P" className="w-10 h-10 rounded-full object-cover border border-slate-205 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-955/20 text-suas-ruby font-black text-sm flex items-center justify-center border border-rose-100 shrink-0">
                              {admin.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="text-left">
                            <span className="text-slate-855 dark:text-white block">{admin.name} <span className="font-mono text-[9px] text-slate-400 font-normal">({admin.id})</span></span>
                            <span className="text-[9px] text-suas-ruby font-black uppercase block mt-0.5">{admin.role}</span>
                            <span className="text-[10px] text-slate-550 font-semibold block mt-0.5">Assigned: {admin.assigned_labs || "All Labs"}</span>
                          </div>
                        </div>

                        {isSuperAdmin && admin.id !== "admin" && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenAdminModal("edit", admin)}
                              className="p-1.5 text-slate-400 hover:text-suas-ruby transition cursor-pointer"
                              title="Edit Admin Account"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteAdminAccount(admin.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/25 rounded-lg transition cursor-pointer"
                              title="Delete Admin Account"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Render SCSIT LabOS workspace panels */
              <LmsPanels
                activeTab={activeTab}
                departmentDetails={departmentDetails}
                submissions={submissions}
                laboratories={laboratories}
                labSoftwares={labSoftwares}
                maintenanceLogs={maintenanceLogs}
                inventoryItems={inventoryItems}
                assetLifecycles={assetLifecycles}
                naacDocsList={naacDocsList}
                ieeeRecords={ieeeRecords}
                documentRepoList={documentRepoList}
                auditLogsList={auditLogsList}
                modulesStatus={modulesStatus}
                activeAdmin={activeAdmin}
                fetchData={fetchData}
                showToast={showToast}
                onSaveLab={handleSaveLab}
                onDeleteLab={handleDeleteLab}
                onSaveSoftware={handleSaveSoftwareRecord}
                onDeleteSoftware={handleDeleteSoftwareRecord}
                onSaveMaintenance={handleSaveMaintenanceRecord}
                onDeleteMaintenance={handleDeleteMaintenanceRecord}
                onSaveInventory={handleSaveInventoryRecord}
                onDeleteInventory={handleDeleteInventoryRecord}
                onSaveLifecycle={handleSaveAssetLifecycleRecord}
                onDeleteLifecycle={handleDeleteAssetLifecycleRecord}
                onUploadNaac={handleUploadNaacDoc}
                onDeleteNaac={handleDeleteNaacDoc}
                onSaveIeee={handleSaveIeeeComplianceRecord}
                onDeleteIeee={handleDeleteIeeeComplianceRecord}
                onUploadRepoDoc={handleUploadRepoDoc}
                onDeleteRepoDoc={handleDeleteRepoDoc}
                onSaveDepartment={handleSaveDepartmentDetails}
                onClearLogs={handleClearLogs}
                showLabModal={showLabModal}
                setShowLabModal={setShowLabModal}
                editingLab={editingLab}
                setEditingLab={setEditingLab}
                showSoftwareModal={showSoftwareModal}
                setShowSoftwareModal={setShowSoftwareModal}
                editingSoftware={editingSoftware}
                setEditingSoftware={setEditingSoftware}
                showMaintenanceModal={showMaintenanceModal}
                setShowMaintenanceModal={setShowMaintenanceModal}
                editingMaintenance={editingMaintenance}
                setEditingMaintenance={setEditingMaintenance}
                showInventoryModal={showInventoryModal}
                setShowInventoryModal={setShowInventoryModal}
                editingInventory={editingInventory}
                setEditingInventory={setEditingInventory}
                showLifecycleModal={showLifecycleModal}
                setShowLifecycleModal={setShowLifecycleModal}
                editingLifecycle={editingLifecycle}
                setEditingLifecycle={setEditingLifecycle}
                showNaacModal={showNaacModal}
                setShowNaacModal={setShowNaacModal}
                naacLabId={naacLabId}
                setNaacLabId={setNaacLabId}
                naacDocType={naacDocType}
                setNaacDocType={setNaacDocType}
                naacDocName={naacDocName}
                setNaacDocName={setNaacDocName}
                naacFileBase64={naacFileBase64}
                setNaacFileBase64={setNaacFileBase64}
                naacRemarks={naacRemarks}
                setNaacRemarks={setNaacRemarks}
                showIeeeModal={showIeeeModal}
                setShowIeeeModal={setShowIeeeModal}
                editingIeee={editingIeee}
                setEditingIeee={setEditingIeee}
                showDocRepoModal={showDocRepoModal}
                setShowDocRepoModal={setShowDocRepoModal}
                repoCategory={repoCategory}
                setRepoCategory={setRepoCategory}
                repoDocName={repoDocName}
                setRepoDocName={setRepoDocName}
                repoFileBase64={repoFileBase64}
                setRepoFileBase64={setRepoFileBase64}
                repoAssociatedId={repoAssociatedId}
                setRepoAssociatedId={setRepoAssociatedId}
                repoRemarks={repoRemarks}
                setRepoRemarks={setRepoRemarks}
                handleFileChange={handleFileChange}
                onUpdateClass={handleUpdateClass}
                onDeleteSubmission={handleDeleteSubmission}
                onOpenCreateModal={() => setShowCreateModal(true)}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}
          </main>
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
