"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, BookOpen, Server, FileCode, Activity, Layers, Calendar,
  ShieldCheck, FileText, Bell, History, Settings, Plus, Edit, Trash2,
  Download, Search, Check, X, FileSpreadsheet, AlertCircle, File, Lock, ChevronDown
} from "lucide-react";

/* ── Prop Type declarations ────────────────────────────────────────────────── */
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

interface LmsPanelsProps {
  activeTab: string;
  departmentDetails: DepartmentDetails | null;
  submissions: SubmissionRecord[];
  laboratories: Laboratory[];
  labSoftwares: LabSoftware[];
  maintenanceLogs: MaintenanceLog[];
  inventoryItems: InventoryItem[];
  assetLifecycles: AssetLifecycleRecord[];
  naacDocsList: NaacDoc[];
  ieeeRecords: IeeeComplianceRecord[];
  documentRepoList: DocumentRepoItem[];
  auditLogsList: AuditLog[];
  modulesStatus: Record<string, boolean>;
  activeAdmin: AdminUser | null;
  fetchData: () => void;
  showToast: (msg: string) => void;

  /* Callbacks */
  onSaveLab: (e: React.FormEvent, data: any) => void;
  onDeleteLab: (id: number) => void;
  onSaveSoftware: (e: React.FormEvent, data: any) => void;
  onDeleteSoftware: (id: number) => void;
  onSaveMaintenance: (e: React.FormEvent, data: any) => void;
  onDeleteMaintenance: (id: number) => void;
  onSaveInventory: (e: React.FormEvent, data: any) => void;
  onDeleteInventory: (id: number) => void;
  onSaveLifecycle: (e: React.FormEvent, data: any) => void;
  onDeleteLifecycle: (id: number) => void;
  onUploadNaac: (e: React.FormEvent) => void;
  onDeleteNaac: (id: number) => void;
  onSaveIeee: (e: React.FormEvent, data: any) => void;
  onDeleteIeee: (id: number) => void;
  onUploadRepoDoc: (e: React.FormEvent) => void;
  onDeleteRepoDoc: (id: number) => void;
  onSaveDepartment: (e: React.FormEvent, data: any) => void;
  onClearLogs: () => void;

  /* States trackers for edit modal launchers */
  showLabModal: boolean;
  setShowLabModal: (show: boolean) => void;
  editingLab: Laboratory | null;
  setEditingLab: (lab: Laboratory | null) => void;

  showSoftwareModal: boolean;
  setShowSoftwareModal: (show: boolean) => void;
  editingSoftware: LabSoftware | null;
  setEditingSoftware: (soft: LabSoftware | null) => void;

  showMaintenanceModal: boolean;
  setShowMaintenanceModal: (show: boolean) => void;
  editingMaintenance: MaintenanceLog | null;
  setEditingMaintenance: (maint: MaintenanceLog | null) => void;

  showInventoryModal: boolean;
  setShowInventoryModal: (show: boolean) => void;
  editingInventory: InventoryItem | null;
  setEditingInventory: (item: InventoryItem | null) => void;

  showLifecycleModal: boolean;
  setShowLifecycleModal: (show: boolean) => void;
  editingLifecycle: AssetLifecycleRecord | null;
  setEditingLifecycle: (record: AssetLifecycleRecord | null) => void;

  showNaacModal: boolean;
  setShowNaacModal: (show: boolean) => void;
  naacLabId: string;
  setNaacLabId: (val: string) => void;
  naacDocType: string;
  setNaacDocType: (val: string) => void;
  naacDocName: string;
  setNaacDocName: (val: string) => void;
  naacFileBase64: string;
  setNaacFileBase64: (val: string) => void;
  naacRemarks: string;
  setNaacRemarks: (val: string) => void;

  showIeeeModal: boolean;
  setShowIeeeModal: (show: boolean) => void;
  editingIeee: IeeeComplianceRecord | null;
  setEditingIeee: (record: IeeeComplianceRecord | null) => void;

  showDocRepoModal: boolean;
  setShowDocRepoModal: (show: boolean) => void;
  repoCategory: string;
  setRepoCategory: (val: string) => void;
  repoDocName: string;
  setRepoDocName: (val: string) => void;
  repoFileBase64: string;
  setRepoFileBase64: (val: string) => void;
  repoAssociatedId: string;
  setRepoAssociatedId: (val: string) => void;
  repoRemarks: string;
  setRepoRemarks: (val: string) => void;

  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => void;
  onUpdateClass: (
    submissionId: number,
    classId: string,
    nextStatus: any,
    nextRemarks: string,
    licenseType?: string,
    labSelection?: string | null
  ) => void;
  onDeleteSubmission: (id: number) => void;
  onOpenCreateModal: () => void;
  onNavigateToTab: (tab: string) => void;
}

export default function LmsPanels({
  activeTab, departmentDetails, submissions, laboratories, labSoftwares, maintenanceLogs,
  inventoryItems, assetLifecycles, naacDocsList, ieeeRecords, documentRepoList,
  auditLogsList, modulesStatus, activeAdmin, fetchData, showToast,
  onSaveLab, onDeleteLab, onSaveSoftware, onDeleteSoftware, onSaveMaintenance,
  onDeleteMaintenance, onSaveInventory, onDeleteInventory, onSaveLifecycle,
  onDeleteLifecycle, onUploadNaac, onDeleteNaac, onSaveIeee, onDeleteIeee,
  onUploadRepoDoc, onDeleteRepoDoc, onSaveDepartment, onClearLogs,
  showLabModal, setShowLabModal, editingLab, setEditingLab,
  showSoftwareModal, setShowSoftwareModal, editingSoftware, setEditingSoftware,
  showMaintenanceModal, setShowMaintenanceModal, editingMaintenance, setEditingMaintenance,
  showInventoryModal, setShowInventoryModal, editingInventory, setEditingInventory,
  showLifecycleModal, setShowLifecycleModal, editingLifecycle, setEditingLifecycle,
  showNaacModal, setShowNaacModal, naacLabId, setNaacLabId, naacDocType, setNaacDocType,
  naacDocName, setNaacDocName, naacFileBase64, setNaacFileBase64, naacRemarks, setNaacRemarks,
  showIeeeModal, setShowIeeeModal, editingIeee, setEditingIeee,
  showDocRepoModal, setShowDocRepoModal, repoCategory, setRepoCategory,
  repoDocName, setRepoDocName, repoFileBase64, setRepoFileBase64,
  repoAssociatedId, setRepoAssociatedId, repoRemarks, setRepoRemarks,
  handleFileChange, onUpdateClass, onDeleteSubmission, onOpenCreateModal, onNavigateToTab
}: LmsPanelsProps) {

  const isSuperAdmin = activeAdmin?.role === "Director Admin";
  const isWriteAllowed = activeAdmin?.role === "Director Admin" || 
                         activeAdmin?.role === "IT Person" || 
                         activeAdmin?.role === "Trainer of Practice" || 
                         activeAdmin?.role === "Lab Assistant";

  /* ── FILTER STATES FOR PANELS ── */
  const [labFilter, setLabFilter] = useState("All");
  const [softFilter, setSoftFilter] = useState("All");
  const [maintLabFilter, setMaintLabFilter] = useState("All");
  const [maintStatusFilter, setMaintStatusFilter] = useState("All");
  const [invTypeFilter, setInvTypeFilter] = useState("All");
  const [invLabFilter, setInvLabFilter] = useState("All");
  const [docRepoCatFilter, setDocRepoCatFilter] = useState("All");
  const [globalSearch, setGlobalSearch] = useState("");

  /* ── MAINTENANCE BULK ADD STATES ── */
  const [maintSearch, setMaintSearch] = useState("");
  const [maintDateFilter, setMaintDateFilter] = useState("");
  const [maintPeriod, setMaintPeriod] = useState("All");
  const [maintTechFilter, setMaintTechFilter] = useState("All");
  const [maintMakeFilter, setMaintMakeFilter] = useState("All");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [stagingRecords, setStagingRecords] = useState<any[]>([]);
  const [stagingLabId, setStagingLabId] = useState("");
  const [newEntry, setNewEntry] = useState({
    pc_number: "", system_make: "", system_model: "", serial_number: "",
    date: new Date().toISOString().split("T")[0],
    time_stamp: new Date().toTimeString().slice(0, 5),
    issue_description: "", reason_for_damage: "",
    action_taken: "", technician_name: "", status: "Pending", completion_date: "", remarks: ""
  });


  /* ── LAB ASSIGNMENT OPTIONS ── */
  const LAB_NAMES = useMemo(() => laboratories.map(l => l.name), [laboratories]);

  /* ── Dynamic Local Form States for Create/Edit Modals ── */
  const [labForm, setLabForm] = useState<Laboratory>({
    name: "", code: "", building: "", floor: "", location: "",
    seating_capacity: 35, total_computers: 35, operating_system: "Windows 11",
    primary_purpose: "General Programming", lab_in_charge: "", lab_assistant: "", status: "Active"
  });

  const [softForm, setSoftForm] = useState<any>({
    lab_id: "", software_name: "", version: "", framework: "",
    framework_version: "", license_type: "FOSS / Open Source",
    installation_date: new Date().toISOString().split("T")[0],
    installed_by: activeAdmin?.name || "", axn_request_id: "", remarks: ""
  });

  const [maintForm, setMaintForm] = useState<any>({
    lab_id: "", pc_number: "", system_make: "", system_model: "", serial_number: "",
    date: new Date().toISOString().split("T")[0], time_stamp: new Date().toTimeString().slice(0, 5),
    issue_description: "", reason_for_damage: "", action_taken: "", technician_name: "",
    status: "Pending", completion_date: "", remarks: ""
  });

  const [invForm, setInvForm] = useState<any>({
    lab_id: "", device_type: "Desktop", asset_number: "", cpu: "", ram: "", storage: "",
    monitor: "", printer_details: "", projector_details: "", ups_details: "", network_details: "",
    purchase_date: new Date().toISOString().split("T")[0], warranty_details: "", vendor_details: "", status: "Active"
  });

  const [lifecycleForm, setLifecycleForm] = useState<any>({
    inventory_id: "", purchase_date: new Date().toISOString().split("T")[0],
    warranty_expiry: "", amc_details: "", last_maintenance: "", next_maintenance: "",
    current_condition: "Good", replacement_recommendation: ""
  });

  const [ieeeForm, setIeeeForm] = useState<any>({
    lab_id: "", compliance_type: "Laboratory SOPs", title: "", content_text: "",
    file_url: "", last_reviewed_date: new Date().toISOString().split("T")[0], status: "Draft"
  });

  const [deptForm, setDeptForm] = useState<any>({
    department_name: "SCSIT",
    academic_year: "July-Dec 2026",
    coordinator_name: "Dr. Karan Mishra",
    lab_coordinator_name: "Monark Raikwar",
    total_labs: 9
  });

  /* Initializer hooks for Edit Modals */
  React.useEffect(() => {
    if (editingLab) setLabForm(editingLab);
    else setLabForm({
      name: "", code: "", building: "", floor: "", location: "",
      seating_capacity: 35, total_computers: 35, operating_system: "Windows 11",
      primary_purpose: "General Programming", lab_in_charge: "", lab_assistant: "", status: "Active"
    });
  }, [editingLab, showLabModal]);

  React.useEffect(() => {
    if (editingSoftware) setSoftForm(editingSoftware);
    else setSoftForm({
      lab_id: laboratories[0]?.id || "", software_name: "", version: "", framework: "",
      framework_version: "", license_type: "FOSS / Open Source",
      installation_date: new Date().toISOString().split("T")[0],
      installed_by: activeAdmin?.name || "", axn_request_id: "", remarks: ""
    });
  }, [editingSoftware, showSoftwareModal, laboratories, activeAdmin]);

  React.useEffect(() => {
    if (editingMaintenance) setMaintForm(editingMaintenance);
    else setMaintForm({
      lab_id: laboratories[0]?.id || "", pc_number: "", system_make: "", system_model: "", serial_number: "",
      date: new Date().toISOString().split("T")[0], time_stamp: new Date().toTimeString().slice(0, 5),
      issue_description: "", reason_for_damage: "", action_taken: "", technician_name: "",
      status: "Pending", completion_date: "", remarks: ""
    });
  }, [editingMaintenance, showMaintenanceModal, laboratories]);

  React.useEffect(() => {
    if (editingInventory) setInvForm(editingInventory);
    else setInvForm({
      lab_id: laboratories[0]?.id || "", device_type: "Desktop", asset_number: "", cpu: "Intel i5", ram: "16 GB", storage: "512 GB SSD",
      monitor: '21" IPS', printer_details: "", projector_details: "", ups_details: "", network_details: "",
      purchase_date: new Date().toISOString().split("T")[0], warranty_details: "3 Years Manufacturer Warranty", vendor_details: "", status: "Active"
    });
  }, [editingInventory, showInventoryModal, laboratories]);

  React.useEffect(() => {
    if (editingLifecycle) setLifecycleForm(editingLifecycle);
    else setLifecycleForm({
      inventory_id: inventoryItems[0]?.id || "", purchase_date: new Date().toISOString().split("T")[0],
      warranty_expiry: new Date(Date.now() + 365*24*60*60*1000).toISOString().split("T")[0], 
      amc_details: "", last_maintenance: "", next_maintenance: "",
      current_condition: "Good", replacement_recommendation: ""
    });
  }, [editingLifecycle, showLifecycleModal, inventoryItems]);

  React.useEffect(() => {
    if (editingIeee) setIeeeForm(editingIeee);
    else setIeeeForm({
      lab_id: laboratories[0]?.id || "", compliance_type: "Laboratory SOPs", title: "", content_text: "",
      file_url: "", last_reviewed_date: new Date().toISOString().split("T")[0], status: "Draft"
    });
  }, [editingIeee, showIeeeModal, laboratories]);

  React.useEffect(() => {
    if (departmentDetails) {
      setDeptForm(departmentDetails);
    }
  }, [departmentDetails]);

  /* ========================================================================
     EXCEL EXPORTER (CSV formatting)
     ======================================================================== */
  const handleExportExcel = (reportType: string) => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = reportType;

    if (reportType === "laboratories") {
      headers = ["Lab Name", "Code", "Building", "Floor", "Location", "Seating Capacity", "Computers", "OS", "Purpose", "In-Charge", "Technician", "Status"];
      rows = laboratories.map(l => [l.name, l.code, l.building, l.floor, l.location, l.seating_capacity, l.total_computers, l.operating_system, l.primary_purpose, l.lab_in_charge, l.lab_assistant, l.status]);
    } else if (reportType === "software") {
      headers = ["Software Name", "Version", "Lab Code", "Framework", "License", "Installation Date", "Installed By", "AXN Request", "Remarks"];
      rows = labSoftwares.map(s => [s.software_name, s.version, s.lab_code || "", s.framework || "", s.license_type, s.installation_date, s.installed_by, s.axn_request_id || "", s.remarks || ""]);
    } else if (reportType === "maintenance") {
      headers = ["ID", "Laboratory", "Date", "Description", "Action Taken", "Technician", "Status", "Completion Date"];
      rows = maintenanceLogs.map(m => [m.maintenance_id, m.lab_name || "", m.date, m.issue_description, m.action_taken || "", m.technician_name, m.status, m.completion_date || ""]);
    } else if (reportType === "inventory") {
      headers = ["Asset Number", "Lab Code", "Type", "Specs (CPU/RAM/SSD)", "Warranty Details", "Purchase Date", "Status"];
      rows = inventoryItems.map(i => [i.asset_number, i.lab_code || "", i.device_type, `CPU: ${i.cpu || ""}, RAM: ${i.ram || ""}, Disk: ${i.storage || ""}`, i.warranty_details || "", i.purchase_date, i.status]);
    } else if (reportType === "requests") {
      headers = ["Ref No", "Faculty", "Email", "Date Submitted", "Status"];
      rows = submissions.map(s => [
        s.submissionId, s.facultyName, s.facultyEmail, new Date(s.createdAt).toLocaleDateString("en-IN"),
        s.subjects.map(c => `${c.subjectName}: ${c.status}`).join(" | ")
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SCSIT_LMS_${filename}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`${filename.toUpperCase()} report exported successfully to Excel.`);
  };

  /* ========================================================================
     PDF RECEIPT / REPORT PRINTER (Window Print Layout)
     ======================================================================== */
  const handlePrintReceipt = (sub: SubmissionRecord, cls: ClassItem) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const classSoftwares = cls.softwares && Array.isArray(cls.softwares)
      ? cls.softwares.map(s => `${s.softwareName}${s.version ? ' v' + s.version : ''}`).join(', ')
      : `${cls.softwareName || ''} ${cls.softwareVersion ? 'v' + cls.softwareVersion : ''}`.trim();

    const html = `
      <html>
        <head>
          <title>Software Installation Receipt - ${sub.submissionId}</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; color: #333; padding: 40px; line-height: 1.5; }
            .receipt-container { border: 2px solid #E11D48; border-radius: 12px; padding: 30px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #f1f1f1; padding-bottom: 20px; margin-bottom: 35px; }
            .logo { font-size: 24px; font-weight: 800; color: #E11D48; margin: 0; }
            .title { font-size: 14px; text-transform: uppercase; font-weight: 700; color: #666; margin-top: 5px; }
            .meta-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .meta-col { flex: 1; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 13px; }
            .table th { background: #f9f9f9; font-weight: 700; }
            .signature-block { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; border-top: 1px solid #f1f1f1; }
            .sig-field { text-align: center; }
            .sig-line { width: 180px; border-bottom: 1px dashed #666; margin-bottom: 5px; }
            .footer { text-align: center; font-size: 11px; color: #999; margin-top: 40px; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="receipt-container">
            <div class="header">
              <h1 class="logo">SYMBIOSIS UNIVERSITY OF APPLIED SCIENCES</h1>
              <div class="title">School of Computer Science & IT (SCSIT) - Lab Installation Receipt</div>
            </div>
            
            <div class="meta-grid">
              <div class="meta-col">
                <strong>Faculty Details:</strong><br/>
                Name: ${sub.facultyName}<br/>
                Email: ${sub.facultyEmail}<br/>
                Dept: ${sub.department}
              </div>
              <div class="meta-col" style="text-align: right;">
                <strong>AXN Details:</strong><br/>
                AXN ID: <strong>${sub.submissionId}</strong><br/>
                Date: ${new Date(sub.createdAt).toLocaleString("en-IN")}<br/>
                Session: ${departmentDetails?.academic_year || "2026-2027"}
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Subject Details</th>
                  <th>Software Installed</th>
                  <th>Framework</th>
                  <th>Target Lab</th>
                  <th>License Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${cls.subjectCode}</strong> - ${cls.subjectName}<br/>Semesters: ${cls.semesters ? cls.semesters.join(', ') : sub.semester}</td>
                  <td>${classSoftwares}</td>
                  <td>${cls.framework || "None"}</td>
                  <td>${cls.labSelection || "Allocated Post-Review"}</td>
                  <td>${cls.licenseType || "FOSS / Open Source"}</td>
                  <td><strong>${cls.status}</strong></td>
                </tr>
              </tbody>
            </table>

            <div style="font-size:12px; margin-bottom: 30px;">
              <strong>Remarks:</strong> ${cls.remarks || "No administrative remarks logged."}
            </div>

            <div class="signature-block">
              <div class="sig-field">
                <div class="sig-line"></div>
                <div style="font-size:11px; font-weight:bold; color:#666;">Lab In-Charge Signature</div>
              </div>
              <div class="sig-field">
                <div style="font-size:11px; font-weight:bold; font-family: monospace;">${sub.signatureData ? "[Signed Digitally]" : ""}</div>
                <div class="sig-line"></div>
                <div style="font-size:11px; font-weight:bold; color:#666;">Faculty Signature</div>
              </div>
            </div>

            <div class="footer">
              Generated dynamically on ${new Date().toLocaleString("en-IN")} via SCSIT LMS.
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintPDFReport = (reportType: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let title = "";
    let columns: string[] = [];
    let tableRowsHtml = "";

    if (reportType === "laboratories") {
      title = "SCSIT - Laboratory Details Report";
      columns = ["Lab Name", "Code", "Building", "Location", "Computers", "Lab In-Charge", "Status"];
      tableRowsHtml = laboratories.map(l => `
        <tr>
          <td><strong>${l.name}</strong></td>
          <td>${l.code}</td>
          <td>${l.building}</td>
          <td>${l.location}</td>
          <td>${l.total_computers}</td>
          <td>${l.lab_in_charge}</td>
          <td>${l.status}</td>
        </tr>
      `).join("");
    } else if (reportType === "software") {
      title = "SCSIT - Installed Lab Software Inventory";
      columns = ["Software Name", "Version", "Lab Code", "License Type", "Installation Date", "Remarks"];
      tableRowsHtml = labSoftwares.map(s => `
        <tr>
          <td><strong>${s.software_name}</strong></td>
          <td>${s.version}</td>
          <td>${s.lab_code || "N/A"}</td>
          <td>${s.license_type}</td>
          <td>${s.installation_date}</td>
          <td>${s.remarks || "-"}</td>
        </tr>
      `).join("");
    } else if (reportType === "maintenance") {
      title = "SCSIT - Maintenance Activity Log History";
      columns = ["MNT ID", "Lab Code", "Date", "Issue Description", "Technician", "Status", "Completion Date"];
      tableRowsHtml = maintenanceLogs.map(m => `
        <tr>
          <td><strong>${m.maintenance_id}</strong></td>
          <td>${m.lab_code || "N/A"}</td>
          <td>${m.date}</td>
          <td>${m.issue_description}</td>
          <td>${m.technician_name}</td>
          <td>${m.status}</td>
          <td>${m.completion_date || "-"}</td>
        </tr>
      `).join("");
    } else if (reportType === "inventory") {
      title = "SCSIT - Physical Lab Inventory Report";
      columns = ["Asset Number", "Type", "Lab Code", "CPU / RAM Specs", "Monitor", "Warranty Details"];
      tableRowsHtml = inventoryItems.map(i => `
        <tr>
          <td><strong>${i.asset_number}</strong></td>
          <td>${i.device_type}</td>
          <td>${i.lab_code || "N/A"}</td>
          <td>CPU: ${i.cpu || ""}, RAM: ${i.ram || ""}</td>
          <td>${i.monitor || "-"}</td>
          <td>${i.warranty_details || "-"}</td>
        </tr>
      `).join("");
    } else if (reportType === "requests") {
      title = "SCSIT - Faculty Software Installation Requests Summary";
      columns = ["AXN Reference", "Faculty Name", "Target Semester", "Request Detail Summary", "Status"];
      tableRowsHtml = submissions.map(s => `
        <tr>
          <td><strong>${s.submissionId}</strong></td>
          <td>${s.facultyName}</td>
          <td>${s.semester}</td>
          <td>${s.subjects.map(c => `${c.subjectCode} - ${c.subjectName} (${c.status})`).join("<br/>")}</td>
          <td>Active</td>
        </tr>
      `).join("");
    }

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Inter, sans-serif; color: #333; padding: 30px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #E11D48; padding-bottom: 15px; }
            .title { font-size: 18px; font-weight: 800; color: #E11D48; text-transform: uppercase; margin: 0; }
            .subtitle { font-size: 11px; text-transform: uppercase; color: #666; font-weight: 700; margin-top: 4px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .table th, .table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .table th { background: #f8f9fa; font-weight: 800; font-size: 10px; text-transform: uppercase; color: #444; }
            .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div class="title">SYMBIOSIS UNIVERSITY OF APPLIED SCIENCES</div>
            <div class="subtitle">School of Computer Science & Information Technology (SCSIT)</div>
            <h2 style="margin: 15px 0 0 0; font-size: 14px; color: #333;">${title}</h2>
            <div style="font-size: 10px; margin-top: 5px; color:#777;">Academic session: ${departmentDetails?.academic_year || "2026"} | Date generated: ${new Date().toLocaleString("en-IN")}</div>
          </div>
          
          <table class="table">
            <thead>
              <tr>
                ${columns.map(col => `<th>${col}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="footer">
            SCSIT Modular Laboratory Management System (LMS) - Report Print
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    showToast(`PDF print dialog opened for ${reportType} report.`);
  };

  /* ========================================================================
     LMS MODULE 11: NOTIFICATION ALERT ENGINE
     ======================================================================== */
  const systemAlerts = useMemo(() => {
    const alerts: { id: string; category: string; title: string; message: string; severity: "high" | "medium" | "low" }[] = [];

    // 1. Pending Software Requests
    const pendingRequests = submissions.filter(s => s.subjects.some(c => c.status === "Pending")).length;
    if (pendingRequests > 0) {
      alerts.push({
        id: `pend_req_${Date.now()}`,
        category: "Software Request",
        title: `${pendingRequests} Pending Installation Requests`,
        message: `There are ${pendingRequests} class requirement requests awaiting lab allocations and administrative approval.`,
        severity: "high"
      });
    }

    // 2. Pending Maintenance Logs
    const pendingMaint = maintenanceLogs.filter(m => m.status === "Pending" || m.status === "In Progress").length;
    if (pendingMaint > 0) {
      alerts.push({
        id: `pend_maint_${Date.now()}`,
        category: "Maintenance",
        title: `${pendingMaint} Open Maintenance Issues`,
        message: `There are ${pendingMaint} unresolved laboratory hardware/software complaints logged in the register.`,
        severity: "high"
      });
    }

    // 3. Warranty Expiry Alerts
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    const expiringWarranties = assetLifecycles.filter(a => {
      const expDate = new Date(a.warranty_expiry);
      return expDate > today && expDate <= thirtyDaysFromNow;
    });
    expiringWarranties.forEach(a => {
      alerts.push({
        id: `war_exp_${a.id}`,
        category: "Warranty",
        title: `Asset ${a.asset_number} Warranty Expiring Soon`,
        message: `The manufacturer warranty for asset ${a.asset_number} (${a.device_type}) expires on ${a.warranty_expiry}.`,
        severity: "medium"
      });
    });

    // 4. AMC Renewal Alerts
    const expiringAMC = assetLifecycles.filter(a => {
      if (!a.amc_details) return false;
      // Search for date structures in amc_details
      const match = a.amc_details.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        const amcDate = new Date(match[1]);
        return amcDate > today && amcDate <= thirtyDaysFromNow;
      }
      return false;
    });
    expiringAMC.forEach(a => {
      alerts.push({
        id: `amc_ren_${a.id}`,
        category: "AMC Renewal",
        title: `Asset ${a.asset_number} AMC Renewal Required`,
        message: `Annual Maintenance Contract (AMC) for asset ${a.asset_number} is due for renewal soon. Details: ${a.amc_details}`,
        severity: "medium"
      });
    });

    // 5. NAAC Documentation gaps
    laboratories.forEach(l => {
      const hasDocs = naacDocsList.some(d => d.lab_id === l.id);
      if (!hasDocs) {
        alerts.push({
          id: `naac_gap_${l.id}`,
          category: "NAAC Gaps",
          title: `No NAAC Records for ${l.name}`,
          message: `Accreditation audit: ${l.name} does not have any utilization, photographs, or verification sheets uploaded.`,
          severity: "low"
        });
      }
    });

    return alerts;
  }, [submissions, maintenanceLogs, assetLifecycles, laboratories, naacDocsList]);

  /* ========================================================================
     LMS MODULE 12: GLOBAL SEARCH ENGINE
     ======================================================================== */
  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim()) return null;
    const query = globalSearch.trim().toLowerCase();
    const results: { category: string; text: string; tab: string }[] = [];

    // Search labs
    laboratories.forEach(l => {
      if (l.name.toLowerCase().includes(query) || l.code.toLowerCase().includes(query) || l.primary_purpose.toLowerCase().includes(query) || l.lab_in_charge.toLowerCase().includes(query)) {
        results.push({ category: "Laboratory Details", text: `🏢 [${l.code}] ${l.name} - In-charge: ${l.lab_in_charge} (${l.status})`, tab: "laboratory_management" });
      }
    });

    // Search requests
    submissions.forEach(s => {
      if (s.submissionId.toLowerCase().includes(query) || s.facultyName.toLowerCase().includes(query) || s.facultyEmail.toLowerCase().includes(query)) {
        results.push({ category: "Faculty Request", text: `📩 [${s.submissionId}] ${s.facultyName} - Email: ${s.facultyEmail}`, tab: "faculty_software_requests" });
      }
    });

    // Search installed software
    labSoftwares.forEach(s => {
      if (s.software_name.toLowerCase().includes(query) || s.version.toLowerCase().includes(query) || (s.framework && s.framework.toLowerCase().includes(query))) {
        results.push({ category: "Software Install", text: `💿 ${s.software_name} v${s.version} in ${s.lab_name || "Lab"} (License: ${s.license_type})`, tab: "laboratory_software_records" });
      }
    });

    // Search maintenance
    maintenanceLogs.forEach(m => {
      if (m.maintenance_id.toLowerCase().includes(query) || m.issue_description.toLowerCase().includes(query) || m.technician_name.toLowerCase().includes(query)) {
        results.push({ category: "Maintenance Register", text: `🛠️ [${m.maintenance_id}] Issue in ${m.lab_name} - Tech: ${m.technician_name} (${m.status})`, tab: "maintenance_register" });
      }
    });

    // Search inventory
    inventoryItems.forEach(i => {
      if (i.asset_number.toLowerCase().includes(query) || i.device_type.toLowerCase().includes(query) || (i.cpu && i.cpu.toLowerCase().includes(query))) {
        results.push({ category: "Lab Inventory", text: `📦 Asset ${i.asset_number} (${i.device_type}) in ${i.lab_name || "Lab"} - CPU: ${i.cpu}`, tab: "laboratory_inventory" });
      }
    });

    return results;
  }, [globalSearch, laboratories, submissions, labSoftwares, maintenanceLogs, inventoryItems]);


  return (
    <div className="space-y-6">
      {/* 1. Reports and Dashboard panel (Module 9) */}
      {activeTab === "reports_dashboard" && (
        <div className="space-y-6 animate-float-up text-left">
          {/* Dashboard Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Labs", val: laboratories.length, bg: "bg-rose-50 dark:bg-rose-950/20 text-suas-ruby", border: "border-rose-100 dark:border-rose-900/20" },
              { label: "Total Computers", val: laboratories.reduce((sum, l) => sum + (l.total_computers || 0), 0), bg: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600", border: "border-emerald-100 dark:border-emerald-900/20" },
              { label: "Installed Softwares", val: labSoftwares.length, bg: "bg-blue-50 dark:bg-blue-950/20 text-blue-600", border: "border-blue-100 dark:border-blue-900/20" },
              { label: "Pending Requests", val: submissions.filter(s => s.subjects.some(c => c.status === "Pending")).length, bg: "bg-amber-50 dark:bg-amber-950/20 text-amber-600", border: "border-amber-100 dark:border-amber-900/20" }
            ].map((stat, idx) => (
              <div key={idx} className={`glass-card p-5 border ${stat.border} ${stat.bg} flex items-center justify-between`}>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{stat.label}</span>
                  <span className="text-2xl font-black block mt-1">{stat.val}</span>
                </div>
                <div className="p-3 bg-white/70 dark:bg-zinc-900/60 rounded-xl shadow-sm">
                  {idx === 0 ? <Server size={18} /> : idx === 1 ? <Layers size={18} /> : idx === 2 ? <FileCode size={18} /> : <BookOpen size={18} />}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Report Panel */}
            <div className="lg:col-span-2 glass-card p-6 border border-slate-200/50 dark:border-zinc-800/50 space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet size={15} className="text-suas-ruby" /> LMS Departmental Reports Generation
                </h3>
                <p className="text-[10px] text-slate-455">Download CSV tables formatted for Excel, or open beautifully formatted report sheets print dialogs directly from the client.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { type: "laboratories", name: "Laboratory Directory Details", desc: "Detailed listing of buildings, seating capacities, OS configurations, coordinator heads, and active statuses." },
                  { type: "software", name: "Installed Software Inventory", desc: "Overview of software titles, version details, license types, install logs, and related AXN reference linkages." },
                  { type: "maintenance", name: "Maintenance Activity Logs", desc: "Comprehensive log records of hardware problems, descriptions, actions, tech names, and logs status." },
                  { type: "inventory", name: "Physical Hardware Inventory", desc: "Device types (laptops, ups, projectors), specific specs, asset numbers, purchase dates, and warranties.", lock: !modulesStatus.laboratory_inventory },
                  { type: "requests", name: "Faculty Class Requirements", desc: "Aggregated listing of all faculty installation forms submitted, signature data, and completion status." }
                ].map(rep => (
                  <div key={rep.type} className="p-4 rounded-xl border border-slate-100 dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950 flex flex-col justify-between gap-3">
                    <div>
                      <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                        {rep.name}
                        {rep.lock && <span className="text-[8px] font-black uppercase text-amber-500">Locked</span>}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal">{rep.desc}</p>
                    </div>
                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-100/55 dark:border-zinc-900">
                      <button
                        onClick={() => rep.lock ? alert("Unlock Inventory Management module first.") : handleExportExcel(rep.type)}
                        className="px-2.5 py-1 text-[10px] bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-700 dark:text-slate-350 font-bold transition flex items-center gap-1 uppercase tracking-wider"
                      >
                        <Download size={10} /> Excel
                      </button>
                      <button
                        onClick={() => rep.lock ? alert("Unlock Inventory Management module first.") : handlePrintPDFReport(rep.type)}
                        className="px-2.5 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-bold transition flex items-center gap-1 uppercase tracking-wider"
                      >
                        <File size={10} /> Print PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General Department Details view */}
            <div className="glass-card p-6 border border-slate-200/50 dark:border-zinc-800/50 space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Server size={15} className="text-suas-ruby" /> SCSIT Department Info
                </h3>
                <p className="text-[10px] text-slate-455">Overview parameters of the SCSIT computer application department for the active academic session.</p>
              </div>

              {departmentDetails ? (
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-zinc-850">
                    <span className="font-semibold text-slate-500">Department Name:</span>
                    <span className="font-black text-slate-805 dark:text-slate-200">{departmentDetails.department_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-zinc-850">
                    <span className="font-semibold text-slate-500">Active Academic Year:</span>
                    <span className="font-black text-slate-805 dark:text-slate-200">{departmentDetails.academic_year}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-zinc-850">
                    <span className="font-semibold text-slate-500">Department Coordinator:</span>
                    <span className="font-black text-slate-805 dark:text-slate-200">{departmentDetails.coordinator_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-zinc-850">
                    <span className="font-semibold text-slate-500">Lab Coordinator:</span>
                    <span className="font-black text-slate-805 dark:text-slate-200">{departmentDetails.lab_coordinator_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-zinc-850">
                    <span className="font-semibold text-slate-500">Total System Laboratories:</span>
                    <span className="font-black text-slate-855 dark:text-slate-200">{departmentDetails.total_labs} Laboratories</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-6">Department Details are not initialized. Initialize them in Department & Labs panel.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Faculty Requests Panel (Module 1) */}
      {activeTab === "faculty_software_requests" && (
        <div className="space-y-6 animate-float-up text-left">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-855 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen size={15} className="text-suas-ruby" /> Faculty Software Requests Dashboard
              </h3>
              <p className="text-[10px] text-slate-455">Assign laboratory resources, change statuses, remarks, and print receipts for requests.</p>
            </div>
            {isWriteAllowed && (
              <button
                onClick={onOpenCreateModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl transition duration-200 shrink-0 shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Create Manual Request
              </button>
            )}
          </div>

          {/* Render standard faculty request lists */}
          <div className="glass-card p-5 border border-slate-200/50 dark:border-zinc-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-850 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-2">Ref ID</th>
                    <th className="py-3 px-2">Faculty Info</th>
                    <th className="py-3 px-2">Subjects & Requirements</th>
                    <th className="py-3 px-2">Lab Assigned</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 font-semibold text-slate-700 dark:text-slate-350">
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 italic">No faculty software requests submitted yet.</td>
                    </tr>
                  ) : (
                    submissions.map(sub => (
                      <React.Fragment key={sub.id}>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                          <td className="py-3 px-2 font-mono font-black text-slate-900 dark:text-white">{sub.submissionId}</td>
                          <td className="py-3 px-2">
                            <div className="font-bold text-slate-900 dark:text-white">{sub.facultyName}</div>
                            <div className="text-[10px] text-slate-500">{sub.facultyEmail}</div>
                          </td>
                          <td className="py-3 px-2 space-y-2 max-w-[280px]">
                            {sub.subjects.map(cls => (
                              <div key={cls.id} className="p-2 bg-slate-50 dark:bg-zinc-950 rounded-lg border border-slate-100 dark:border-zinc-900">
                                <div className="font-bold text-slate-800 dark:text-slate-200">{cls.subjectCode} - {cls.subjectName}</div>
                                <div className="text-[10px] text-slate-550 mt-0.5">
                                  Softwares: {cls.softwares ? cls.softwares.map(sw => `${sw.softwareName} (v${sw.version})`).join(", ") : cls.softwareName}
                                </div>
                                <div className="flex gap-2 items-center mt-2 pt-1 border-t border-slate-100/50 dark:border-zinc-900">
                                  <span className="text-[9px] font-black text-slate-400 uppercase">License: {cls.licenseType || "FOSS"}</span>
                                </div>
                              </div>
                            ))}
                          </td>
                          <td className="py-3 px-2">
                            {sub.subjects.map(cls => (
                              <div key={cls.id} className="py-1">
                                {isWriteAllowed ? (
                                  <select
                                    value={cls.labSelection || ""}
                                    onChange={(e) => onUpdateClass(sub.id, cls.id, cls.status, cls.remarks, cls.licenseType, e.target.value || null)}
                                    className="px-2 py-1 text-[10px] border border-slate-250 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 text-slate-800 dark:text-white outline-none"
                                  >
                                    <option value="">Pending Allocation</option>
                                    {LAB_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                                  </select>
                                ) : (
                                  <span className="text-[10px] font-black bg-rose-50 dark:bg-rose-950/20 text-suas-ruby px-1.5 py-0.5 rounded">
                                    {cls.labSelection || "Pending"}
                                  </span>
                                )}
                              </div>
                            ))}
                          </td>
                          <td className="py-3 px-2">
                            {sub.subjects.map(cls => (
                              <div key={cls.id} className="py-1">
                                {isWriteAllowed ? (
                                  <select
                                    value={cls.status}
                                    onChange={(e) => onUpdateClass(sub.id, cls.id, e.target.value as any, cls.remarks, cls.licenseType, cls.labSelection)}
                                    className={`px-2 py-1 text-[10px] border rounded font-black cursor-pointer bg-white dark:bg-zinc-950 outline-none ${
                                      cls.status === "Installed" ? "text-emerald-600 border-emerald-200"
                                    : cls.status === "In Progress" ? "text-amber-600 border-amber-200"
                                    : "text-slate-600 border-slate-200"
                                    }`}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Installed">Installed</option>
                                  </select>
                                ) : (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                    cls.status === "Installed" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600"
                                  : cls.status === "In Progress" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600"
                                  : "bg-slate-50 dark:bg-zinc-900 text-slate-600"
                                  }`}>
                                    {cls.status}
                                  </span>
                                )}
                              </div>
                            ))}
                          </td>
                          <td className="py-3 px-2 text-right space-y-1.5">
                            {sub.subjects.map(cls => (
                              <div key={cls.id} className="flex justify-end gap-1 items-center">
                                <button
                                  onClick={() => handlePrintReceipt(sub, cls)}
                                  className="px-2.5 py-1 text-[9px] bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-black text-slate-700 dark:text-slate-350 tracking-wider uppercase transition flex items-center gap-0.5 cursor-pointer"
                                  title="Print Receipt"
                                >
                                  Receipt
                                </button>
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => onDeleteSubmission(sub.id)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded cursor-pointer"
                                    title="Delete Submission Record"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Department and Labs panel (Module 2) */}
      {activeTab === "laboratory_management" && (
        <div className="space-y-6 animate-float-up text-left">
          {/* Department setup form */}
          <div className="glass-card p-6 border border-slate-200/50 dark:border-zinc-800/50 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Server size={15} className="text-suas-ruby" /> Update Department Coordinators &amp; Details
              </h3>
              <p className="text-[10px] text-slate-455">Specify coordinator names and institutional metadata settings representing SCSIT.</p>
            </div>
            
            <form onSubmit={(e) => onSaveDepartment(e, deptForm)} className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-end text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-405 block">Dept Name</label>
                <input
                  type="text"
                  value={deptForm.department_name}
                  onChange={(e) => setDeptForm({ ...deptForm, department_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-405 block">Academic Year</label>
                <input
                  type="text"
                  value={deptForm.academic_year}
                  onChange={(e) => setDeptForm({ ...deptForm, academic_year: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-405 block">Coordinator</label>
                <input
                  type="text"
                  value={deptForm.coordinator_name}
                  onChange={(e) => setDeptForm({ ...deptForm, coordinator_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-405 block">Lab Head</label>
                <input
                  type="text"
                  value={deptForm.lab_coordinator_name}
                  onChange={(e) => setDeptForm({ ...deptForm, lab_coordinator_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none text-slate-800 dark:text-white"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!isWriteAllowed}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Details
              </button>
            </form>
          </div>

          {/* Laboratories CRUD list */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider">Laboratories Directory</h3>
                <p className="text-[10px] text-slate-455">Maintain detailed records of physical computing laboratories.</p>
              </div>
              {isWriteAllowed && (
                <button
                  onClick={() => { setEditingLab(null); setShowLabModal(true); }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Add Laboratory
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {laboratories.map(lab => (
                <div key={lab.id} className="glass-card p-5 border border-slate-200/50 dark:border-zinc-800/50 space-y-4 flex flex-col justify-between hover-3d">
                  <div>
                    <div className="flex justify-between items-start border-b border-slate-100 dark:border-zinc-850 pb-2 mb-3">
                      <div>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/20 text-suas-ruby">{lab.code}</span>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white mt-1">{lab.name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wider ${
                        lab.status === "Active" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600"
                      : lab.status === "Under Maintenance" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600"
                      : "bg-slate-100 dark:bg-zinc-900 text-slate-500"
                      }`}>
                        {lab.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-655 dark:text-slate-350">
                      <div>🏢 <strong>Building:</strong> {lab.building} ({lab.floor}, {lab.location})</div>
                      <div>👥 <strong>Capacity:</strong> {lab.seating_capacity} seats / {lab.total_computers} computer stations</div>
                      <div>🖥️ <strong>OS:</strong> {lab.operating_system}</div>
                      <div>🚀 <strong>Purpose:</strong> {lab.primary_purpose}</div>
                      <div className="pt-2 border-t border-slate-100/50 dark:border-zinc-850 mt-2">
                        🧑‍🏫 <strong>In-Charge:</strong> {lab.lab_in_charge} | 🛠️ <strong>Assistant:</strong> {lab.lab_assistant}
                      </div>
                    </div>
                  </div>

                  {isWriteAllowed && (
                    <div className="flex gap-2 justify-end pt-3 border-t border-slate-100/50 dark:border-zinc-850 mt-3">
                      <button
                        onClick={() => { setEditingLab(lab); setShowLabModal(true); }}
                        className="px-2.5 py-1 text-[10px] border border-slate-200 dark:border-zinc-800 rounded bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-slate-300 font-bold transition flex items-center gap-1 uppercase cursor-pointer"
                      >
                        <Edit size={10} /> Edit
                      </button>
                      <button
                        onClick={() => lab.id && onDeleteLab(lab.id)}
                        className="px-2.5 py-1 text-[10px] border border-rose-200 dark:border-rose-900/30 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition flex items-center gap-1 uppercase cursor-pointer"
                      >
                        <Trash2 size={10} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* LAB CREATE / EDIT MODAL */}
          {showLabModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 max-w-lg w-full rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto relative text-left"
              >
                <button onClick={() => setShowLabModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition"><X size={18} /></button>
                <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 mb-4">
                  <h4 className="text-base font-black text-slate-805 dark:text-white font-display">
                    {editingLab ? "Edit Laboratory Details" : "Register New Laboratory"}
                  </h4>
                </div>

                <form onSubmit={(e) => onSaveLab(e, labForm)} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-305">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Lab Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Lab A"
                        value={labForm.name}
                        onChange={(e) => setLabForm({ ...labForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Code</label>
                      <input
                        type="text"
                        placeholder="e.g. LA"
                        value={labForm.code}
                        onChange={(e) => setLabForm({ ...labForm, code: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Building</label>
                      <input
                        type="text"
                        placeholder="e.g. Main Building"
                        value={labForm.building}
                        onChange={(e) => setLabForm({ ...labForm, building: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Floor</label>
                      <input
                        type="text"
                        placeholder="e.g. First Floor"
                        value={labForm.floor}
                        onChange={(e) => setLabForm({ ...labForm, floor: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Room Location</label>
                      <input
                        type="text"
                        placeholder="e.g. G-01"
                        value={labForm.location}
                        onChange={(e) => setLabForm({ ...labForm, location: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Seating Capacity</label>
                      <input
                        type="number"
                        value={labForm.seating_capacity}
                        onChange={(e) => setLabForm({ ...labForm, seating_capacity: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Total Computer Stations</label>
                      <input
                        type="number"
                        value={labForm.total_computers}
                        onChange={(e) => setLabForm({ ...labForm, total_computers: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Operating System</label>
                      <input
                        type="text"
                        placeholder="e.g. Windows 11 / Ubuntu"
                        value={labForm.operating_system}
                        onChange={(e) => setLabForm({ ...labForm, operating_system: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Lab Primary Purpose</label>
                      <input
                        type="text"
                        placeholder="e.g. AI/ML, Programming"
                        value={labForm.primary_purpose}
                        onChange={(e) => setLabForm({ ...labForm, primary_purpose: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Lab In-Charge (Professor)</label>
                      <input
                        type="text"
                        value={labForm.lab_in_charge}
                        onChange={(e) => setLabForm({ ...labForm, lab_in_charge: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Lab Technician / Assistant</label>
                      <input
                        type="text"
                        value={labForm.lab_assistant}
                        onChange={(e) => setLabForm({ ...labForm, lab_assistant: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">Status</label>
                    <select
                      value={labForm.status}
                      onChange={(e) => setLabForm({ ...labForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-855 dark:text-slate-255"
                    >
                      <option value="Active">Active</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition shadow-md cursor-pointer"
                  >
                    {editingLab ? "Update Laboratory Info" : "Register Laboratory"}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* 4. Software Records Panel (Module 3) */}
      {activeTab === "laboratory_software_records" && (
        <div className="space-y-6 animate-float-up text-left">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileCode size={15} className="text-suas-ruby" /> Laboratory Installed Software Records
              </h3>
              <p className="text-[10px] text-slate-455">Logs of all softwares installed in the systems of various department labs.</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-48">
                <select
                  value={softFilter}
                  onChange={(e) => setSoftFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl outline-none appearance-none bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-350 pr-8"
                >
                  <option value="All">All Laboratories</option>
                  {LAB_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-[10px] text-slate-400 pointer-events-none" />
              </div>
              {isWriteAllowed && (
                <button
                  onClick={() => { setEditingSoftware(null); setShowSoftwareModal(true); }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus size={14} /> Log Installation
                </button>
              )}
            </div>
          </div>

          {/* Softwares listing table */}
          <div className="glass-card p-5 border border-slate-200/50 dark:border-zinc-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-850 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-2">Software Details</th>
                    <th className="py-3 px-2">Lab Code</th>
                    <th className="py-3 px-2">License Type</th>
                    <th className="py-3 px-2">Installation Date</th>
                    <th className="py-3 px-2">Installer Head</th>
                    <th className="py-3 px-2">Related AXN</th>
                    <th className="py-3 px-2">Remarks</th>
                    {isWriteAllowed && <th className="py-3 px-2 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 font-semibold text-slate-700 dark:text-slate-300">
                  {labSoftwares.filter(s => softFilter === "All" || s.lab_name === softFilter).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 italic">No software installations logged for this filter.</td>
                    </tr>
                  ) : (
                    labSoftwares.filter(s => softFilter === "All" || s.lab_name === softFilter).map(soft => (
                      <tr key={soft.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                        <td className="py-3 px-2">
                          <div className="font-bold text-slate-900 dark:text-white">{soft.software_name}</div>
                          <div className="text-[10px] text-slate-550">v{soft.version} {soft.framework ? `| Framework: ${soft.framework} (v${soft.framework_version})` : ""}</div>
                        </td>
                        <td className="py-3 px-2 font-mono uppercase text-suas-ruby">{soft.lab_code}</td>
                        <td className="py-3 px-2">{soft.license_type}</td>
                        <td className="py-3 px-2">{soft.installation_date}</td>
                        <td className="py-3 px-2">{soft.installed_by}</td>
                        <td className="py-3 px-2 font-mono text-slate-500">{soft.axn_request_id || "Direct Install"}</td>
                        <td className="py-3 px-2 max-w-[140px] truncate" title={soft.remarks}>{soft.remarks || "-"}</td>
                        {isWriteAllowed && (
                          <td className="py-3 px-2 text-right space-x-1">
                            <button
                              onClick={() => { setEditingSoftware(soft); setShowSoftwareModal(true); }}
                              className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => soft.id && onDeleteSoftware(soft.id)}
                              className="p-1 text-rose-600 hover:text-rose-850 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SOFTWARE LOG INSTALLATION MODAL */}
          {showSoftwareModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800/50 max-w-lg w-full rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto relative text-left"
              >
                <button onClick={() => setShowSoftwareModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition"><X size={18} /></button>
                <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 mb-4">
                  <h4 className="text-base font-black text-slate-805 dark:text-white font-display">
                    {editingSoftware ? "Edit Software Installation Record" : "Log New Laboratory Software Installation"}
                  </h4>
                </div>

                <form onSubmit={(e) => onSaveSoftware(e, softForm)} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-305">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">Target Laboratory</label>
                    <select
                      value={softForm.lab_id}
                      onChange={(e) => setSoftForm({ ...softForm, lab_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white"
                      required
                    >
                      <option value="">Select Laboratory</option>
                      {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name} ({lab.code})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Software Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Visual Studio Code"
                        value={softForm.software_name}
                        onChange={(e) => setSoftForm({ ...softForm, software_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Version</label>
                      <input
                        type="text"
                        placeholder="e.g. 1.88.0"
                        value={softForm.version}
                        onChange={(e) => setSoftForm({ ...softForm, version: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Framework (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. .NET / JDK"
                        value={softForm.framework}
                        onChange={(e) => setSoftForm({ ...softForm, framework: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Framework Version</label>
                      <input
                        type="text"
                        placeholder="e.g. 8.0 / 21"
                        value={softForm.framework_version}
                        onChange={(e) => setSoftForm({ ...softForm, framework_version: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">License Type</label>
                      <input
                        type="text"
                        placeholder="FOSS, Proprietary, Academic..."
                        value={softForm.license_type}
                        onChange={(e) => setSoftForm({ ...softForm, license_type: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Installation Date</label>
                      <input
                        type="date"
                        value={softForm.installation_date}
                        onChange={(e) => setSoftForm({ ...softForm, installation_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Installed By</label>
                      <input
                        type="text"
                        value={softForm.installed_by}
                        onChange={(e) => setSoftForm({ ...softForm, installed_by: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Linked AXN Request (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. AXN000001"
                        value={softForm.axn_request_id}
                        onChange={(e) => setSoftForm({ ...softForm, axn_request_id: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">Remarks / Documentation Notes</label>
                    <textarea
                      placeholder="Add software details or license keys..."
                      value={softForm.remarks}
                      onChange={(e) => setSoftForm({ ...softForm, remarks: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white h-20 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition shadow-md cursor-pointer"
                  >
                    Save Installation Record
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* 5. Maintenance Register Panel (Module 4) — Enhanced */}
      {activeTab === "maintenance_register" && (() => {
        /* ── Local filter/search state via useMemo derived values ── */
        const [maintSearch, setMaintSearch] = React.useState("");
        const [maintDateFilter, setMaintDateFilter] = React.useState("");
        const [maintPeriod, setMaintPeriod] = React.useState("All"); // All | Week | Month | Year
        const [maintTechFilter, setMaintTechFilter] = React.useState("All");
        const [maintMakeFilter, setMaintMakeFilter] = React.useState("All");
        const [showBulkModal, setShowBulkModal] = React.useState(false);
        const [showConfirmModal, setShowConfirmModal] = React.useState(false);
        const [stagingRecords, setStagingRecords] = React.useState<any[]>([]);
        const [stagingLabId, setStagingLabId] = React.useState(laboratories[0]?.id?.toString() || "");
        const [newEntry, setNewEntry] = React.useState({
          pc_number: "", system_make: "", system_model: "", serial_number: "",
          date: new Date().toISOString().split("T")[0],
          time_stamp: new Date().toTimeString().slice(0, 5),
          issue_description: "", reason_for_damage: "",
          action_taken: "", technician_name: "", status: "Pending", completion_date: "", remarks: ""
        });

        /* Unique values for filter dropdowns */
        const uniqueTechs = Array.from(new Set(maintenanceLogs.map(m => m.technician_name).filter(Boolean)));
        const uniqueMakes = Array.from(new Set(maintenanceLogs.map(m => (m as any).system_make).filter(Boolean)));

        /* Period filter helper */
        const now = new Date();
        const filtered = maintenanceLogs.filter(m => {
          if (maintLabFilter !== "All" && m.lab_name !== maintLabFilter) return false;
          if (maintStatusFilter !== "All" && m.status !== maintStatusFilter) return false;
          if (maintTechFilter !== "All" && m.technician_name !== maintTechFilter) return false;
          if (maintMakeFilter !== "All" && (m as any).system_make !== maintMakeFilter) return false;
          if (maintDateFilter && m.date !== maintDateFilter) return false;
          if (maintPeriod !== "All") {
            const d = new Date(m.date);
            if (maintPeriod === "Week") {
              const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
              if (d < weekAgo) return false;
            } else if (maintPeriod === "Month") {
              if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
            } else if (maintPeriod === "Year") {
              if (d.getFullYear() !== now.getFullYear()) return false;
            }
          }
          if (maintSearch.trim()) {
            const q = maintSearch.toLowerCase();
            return (
              m.maintenance_id.toLowerCase().includes(q) ||
              m.issue_description.toLowerCase().includes(q) ||
              m.technician_name.toLowerCase().includes(q) ||
              (m.lab_name || "").toLowerCase().includes(q) ||
              ((m as any).system_make || "").toLowerCase().includes(q) ||
              ((m as any).pc_number || "").toLowerCase().includes(q)
            );
          }
          return true;
        });

        const totalCount = maintenanceLogs.length;
        const pendingCount = maintenanceLogs.filter(m => m.status === "Pending").length;
        const inProgressCount = maintenanceLogs.filter(m => m.status === "In Progress").length;
        const completedCount = maintenanceLogs.filter(m => m.status === "Completed").length;

        /* Lab-wise aggregation for chart */
        const labWiseCounts: Record<string, number> = {};
        maintenanceLogs.forEach(m => { const k = m.lab_name || "Unknown"; labWiseCounts[k] = (labWiseCounts[k] || 0) + 1; });
        const maxLabCount = Math.max(1, ...Object.values(labWiseCounts));

        /* PDF report generator */
        const handlePrintMaintReport = (scope: string) => {
          const printData = scope === "all" ? maintenanceLogs :
            scope === "lab" ? maintenanceLogs.filter(m => m.lab_name === maintLabFilter) :
            filtered;
          const pw = window.open("", "_blank");
          if (!pw) return;
          const scopeLabel = scope === "all" ? "All Laboratories" : scope === "lab" ? (maintLabFilter === "All" ? "All Labs" : maintLabFilter) : "Filtered Records";
          const periodLabel = maintPeriod === "All" ? "Complete Records" : `${maintPeriod}ly Report`;
          pw.document.write(`<!DOCTYPE html><html><head><title>SCSIT Maintenance Report</title><style>
            *{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#111;padding:24px;}
            .hdr{text-align:center;border-bottom:3px solid #E11D48;padding-bottom:14px;margin-bottom:18px;}
            .inst{font-size:16px;font-weight:900;color:#E11D48;letter-spacing:1px;}
            .dept{font-size:10px;text-transform:uppercase;color:#555;font-weight:700;margin-top:3px;}
            .title{font-size:13px;font-weight:800;color:#333;margin-top:8px;}
            .meta{display:flex;justify-content:space-between;font-size:10px;color:#666;margin-bottom:14px;}
            table{width:100%;border-collapse:collapse;font-size:10px;}
            th{background:#111;color:#fff;padding:7px 6px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.5px;}
            td{padding:6px 6px;border-bottom:1px solid #e5e5e5;vertical-align:top;}
            tr:nth-child(even) td{background:#fafafa;}
            .badge{display:inline-block;padding:2px 6px;border-radius:4px;font-weight:800;font-size:8px;text-transform:uppercase;}
            .p{background:#FEE2E2;color:#DC2626;}.ip{background:#FEF3C7;color:#D97706;}.c{background:#D1FAE5;color:#059669;}
            .sig{display:flex;justify-content:space-between;margin-top:32px;padding-top:14px;border-top:1px solid #ddd;}
            .sig-box{text-align:center;width:180px;}
            .sig-line{border-bottom:1px dashed #999;height:35px;margin-bottom:5px;}
            .footer{text-align:center;font-size:9px;color:#999;margin-top:24px;}
          </style></head><body onload="window.print();">
          <div class="hdr">
            <div class="inst">SYMBIOSIS UNIVERSITY OF APPLIED SCIENCES</div>
            <div class="dept">School of Computer Science &amp; Information Technology (SCSIT)</div>
            <div class="title">Laboratory Maintenance Register — ${scopeLabel}</div>
          </div>
          <div class="meta">
            <span><strong>Scope:</strong> ${scopeLabel} | <strong>Period:</strong> ${periodLabel}</span>
            <span><strong>Generated:</strong> ${new Date().toLocaleString("en-IN")} | <strong>Total Records:</strong> ${printData.length}</span>
          </div>
          <table><thead><tr>
            <th>#</th><th>MNT ID</th><th>Lab</th><th>PC No.</th><th>Make / Model</th>
            <th>Date &amp; Time</th><th>Issue Description</th><th>Reason</th>
            <th>Technician</th><th>Status</th><th>Action Taken</th><th>Remarks</th>
          </tr></thead><tbody>
          ${printData.map((m, i) => `<tr>
            <td>${i + 1}</td>
            <td><strong>${m.maintenance_id}</strong></td>
            <td>${m.lab_name || ""}</td>
            <td>${(m as any).pc_number || "-"}</td>
            <td>${(m as any).system_make || ""}${(m as any).system_model ? " / " + (m as any).system_model : ""}</td>
            <td>${m.date}${(m as any).time_stamp ? " " + (m as any).time_stamp : ""}</td>
            <td>${m.issue_description}</td>
            <td>${(m as any).reason_for_damage || "-"}</td>
            <td>${m.technician_name}</td>
            <td><span class="badge ${m.status === "Completed" ? "c" : m.status === "In Progress" ? "ip" : "p"}">${m.status}</span></td>
            <td>${m.action_taken || "-"}</td>
            <td>${m.remarks || "-"}</td>
          </tr>`).join("")}
          </tbody></table>
          <div class="sig">
            <div class="sig-box"><div class="sig-line"></div><div style="font-size:10px;font-weight:700;color:#555;">Lab In-Charge Signature</div></div>
            <div class="sig-box"><div class="sig-line"></div><div style="font-size:10px;font-weight:700;color:#555;">Lab Coordinator Signature</div></div>
            <div class="sig-box"><div class="sig-line"></div><div style="font-size:10px;font-weight:700;color:#555;">Director / HOD Signature</div></div>
          </div>
          <div class="footer">SCSIT Modular LMS — Maintenance Register Report | ${new Date().toLocaleDateString("en-IN")}</div>
          </body></html>`);
          pw.document.close();
          showToast("PDF report print dialog opened.");
        };

        const handleAddToStaging = () => {
          if (!newEntry.issue_description.trim()) { showToast("Issue description is required."); return; }
          if (!newEntry.technician_name.trim()) { showToast("Technician name is required."); return; }
          setStagingRecords(prev => [...prev, { ...newEntry, _sno: prev.length + 1 }]);
          setNewEntry({
            pc_number: "", system_make: newEntry.system_make, system_model: newEntry.system_model,
            serial_number: "", date: newEntry.date, time_stamp: new Date().toTimeString().slice(0, 5),
            issue_description: "", reason_for_damage: "",
            action_taken: "", technician_name: newEntry.technician_name, status: "Pending", completion_date: "", remarks: ""
          });
        };

        const handleSubmitBulk = async () => {
          if (stagingRecords.length === 0) return;
          if (!stagingLabId) { showToast("Please select a laboratory."); return; }
          for (const rec of stagingRecords) {
            await onSaveMaintenance(new Event("submit") as any, { ...rec, lab_id: stagingLabId });
          }
          setStagingRecords([]);
          setShowConfirmModal(false);
          setShowBulkModal(false);
          showToast(`${stagingRecords.length} maintenance records submitted successfully.`);
          fetchData();
        };

        return (
          <div className="space-y-6 animate-float-up text-left">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-855 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity size={15} className="text-suas-ruby" /> Laboratory Maintenance Register
                </h3>
                <p className="text-[10px] text-slate-455 mt-0.5">Register hardware faults, system repairs, PC-wise interventions, and lab complaint history.</p>
              </div>
              {isWriteAllowed && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowBulkModal(true); setStagingRecords([]); }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus size={14} /> Add Maintenance Records
                  </button>
                  <button
                    onClick={() => { setEditingMaintenance(null); setShowMaintenanceModal(true); }}
                    className="px-4 py-2 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-zinc-900 text-xs font-black rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer hover:border-suas-ruby"
                    title="Quick add single record"
                  >
                    <Edit size={14} /> Quick Entry
                  </button>
                </div>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Records", val: totalCount, color: "text-slate-800 dark:text-white", bg: "bg-slate-50 dark:bg-zinc-900/40", border: "border-slate-200/60 dark:border-zinc-800/60" },
                { label: "Pending Issues", val: pendingCount, color: "text-suas-ruby", bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-100 dark:border-rose-900/20" },
                { label: "In Progress", val: inProgressCount, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-100 dark:border-amber-900/20" },
                { label: "Completed", val: completedCount, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-100 dark:border-emerald-900/20" },
              ].map((card, i) => (
                <div key={i} className={`glass-card p-5 border ${card.border} ${card.bg} flex items-center justify-between`}>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{card.label}</span>
                    <span className={`text-3xl font-black block mt-1 ${card.color}`}>{card.val}</span>
                  </div>
                  <Activity size={22} className={`${card.color} opacity-30`} />
                </div>
              ))}
            </div>

            {/* Analytics: Lab-wise bar chart */}
            {Object.keys(labWiseCounts).length > 0 && (
              <div className="glass-card p-5 border border-slate-200/50 dark:border-zinc-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">Laboratory-wise Issue Distribution</h4>
                  <div className="flex gap-2">
                    {[{label:"All", v:"all"},{label:"Lab Report", v:"lab"},{label:"Filtered", v:"filtered"}].map(b => (
                      <button key={b.v} onClick={() => handlePrintMaintReport(b.v)} className="px-2.5 py-1 text-[9px] font-black uppercase border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition flex items-center gap-1 cursor-pointer">
                        <Download size={9} /> {b.label} PDF
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(labWiseCounts).sort((a, b) => b[1] - a[1]).map(([lab, cnt]) => (
                    <div key={lab} className="flex items-center gap-3 text-xs">
                      <span className="w-14 font-black text-slate-700 dark:text-slate-300 shrink-0 truncate">{lab}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-suas-ruby transition-all duration-700"
                          style={{ width: `${(cnt / maxLabCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right font-black text-slate-500">{cnt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Filters */}
            <div className="glass-card p-4 border border-slate-200/50 dark:border-zinc-800/50">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 items-end">
                <div className="lg:col-span-2 relative">
                  <Search size={12} className="absolute left-3 top-[11px] text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search MNT ID, PC, issue, tech…"
                    value={maintSearch}
                    onChange={e => setMaintSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-300 outline-none"
                  />
                </div>
                <div className="relative">
                  <select value={maintLabFilter} onChange={e => setMaintLabFilter(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl outline-none appearance-none border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-300 pr-6">
                    <option value="All">All Labs</option>
                    {LAB_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-[11px] text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={maintStatusFilter} onChange={e => setMaintStatusFilter(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl outline-none appearance-none border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-300 pr-6">
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-[11px] text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={maintPeriod} onChange={e => setMaintPeriod(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl outline-none appearance-none border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-300 pr-6">
                    <option value="All">All Time</option>
                    <option value="Week">This Week</option>
                    <option value="Month">This Month</option>
                    <option value="Year">This Year</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-[11px] text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={maintTechFilter} onChange={e => setMaintTechFilter(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl outline-none appearance-none border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-300 pr-6">
                    <option value="All">All Technicians</option>
                    {uniqueTechs.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-[11px] text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={maintMakeFilter} onChange={e => setMaintMakeFilter(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl outline-none appearance-none border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-300 pr-6">
                    <option value="All">All Makes</option>
                    {uniqueMakes.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-[11px] text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <input type="date" value={maintDateFilter} onChange={e => setMaintDateFilter(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-300 outline-none" />
                </div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-slate-500 font-semibold">{filtered.length} record{filtered.length !== 1 ? "s" : ""} shown</span>
                <button onClick={() => { setMaintSearch(""); setMaintLabFilter("All"); setMaintStatusFilter("All"); setMaintPeriod("All"); setMaintTechFilter("All"); setMaintMakeFilter("All"); setMaintDateFilter(""); }} className="text-[10px] font-black text-suas-ruby hover:underline cursor-pointer">Clear Filters</button>
              </div>
            </div>

            {/* Maintenance Records Table */}
            <div className="glass-card border border-slate-200/50 dark:border-zinc-800/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-850 text-slate-400 font-black uppercase text-[9px] tracking-wide">
                      <th className="py-3 px-3">S.No</th>
                      <th className="py-3 px-3">MNT ID</th>
                      <th className="py-3 px-3">Laboratory</th>
                      <th className="py-3 px-3">PC Number</th>
                      <th className="py-3 px-3">System Make / Model</th>
                      <th className="py-3 px-3">Serial No.</th>
                      <th className="py-3 px-3">Date &amp; Time</th>
                      <th className="py-3 px-3 min-w-[180px]">Issue Description</th>
                      <th className="py-3 px-3">Reason</th>
                      <th className="py-3 px-3">Technician</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Action Taken</th>
                      <th className="py-3 px-3">Completed On</th>
                      <th className="py-3 px-3">Remarks</th>
                      {isWriteAllowed && <th className="py-3 px-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 font-semibold text-slate-700 dark:text-slate-300">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="py-10 text-center text-slate-500 italic">
                          No maintenance records match your current filters.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((log, idx) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/30 transition">
                          <td className="py-2.5 px-3 text-slate-400 font-black">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-black text-slate-900 dark:text-white text-[10px]">{log.maintenance_id}</td>
                          <td className="py-2.5 px-3 font-bold">{log.lab_name}</td>
                          <td className="py-2.5 px-3 font-mono">{(log as any).pc_number || <span className="text-slate-400">—</span>}</td>
                          <td className="py-2.5 px-3">
                            {(log as any).system_make ? (
                              <div>
                                <div className="font-bold text-slate-800 dark:text-white">{(log as any).system_make}</div>
                                <div className="text-[10px] text-slate-500">{(log as any).system_model || ""}</div>
                              </div>
                            ) : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{(log as any).serial_number || "—"}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div>{log.date}</div>
                            {(log as any).time_stamp && <div className="text-[10px] text-slate-500">{(log as any).time_stamp}</div>}
                          </td>
                          <td className="py-2.5 px-3 max-w-[200px]">
                            <span title={log.issue_description} className="line-clamp-2">{log.issue_description}</span>
                          </td>
                          <td className="py-2.5 px-3 max-w-[120px] truncate text-slate-500" title={(log as any).reason_for_damage}>{(log as any).reason_for_damage || "—"}</td>
                          <td className="py-2.5 px-3 font-bold">{log.technician_name}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap ${
                              log.status === "Completed" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600"
                              : log.status === "In Progress" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600"
                              : "bg-rose-50 dark:bg-rose-950/20 text-suas-ruby"
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-[140px] truncate text-slate-500" title={log.action_taken}>{log.action_taken || "—"}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{log.completion_date || "—"}</td>
                          <td className="py-2.5 px-3 max-w-[120px] truncate text-slate-500">{log.remarks || "—"}</td>
                          {isWriteAllowed && (
                            <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                              <button onClick={() => { setEditingMaintenance(log); setShowMaintenanceModal(true); }} className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition"><Edit size={12} /></button>
                              <button onClick={() => log.id && onDeleteMaintenance(log.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer rounded-lg transition"><Trash2 size={12} /></button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BULK ADD MODAL */}
            {showBulkModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto relative text-left">
                  <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-850 p-6 pb-4 flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-black text-slate-800 dark:text-white">Add Maintenance Records</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Fill details and click <strong>+ Add</strong> for each PC. Then click <strong>Submit</strong> to save all.</p>
                    </div>
                    <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-700 transition cursor-pointer"><X size={18} /></button>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Lab selector */}
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-black text-slate-400 block">Target Laboratory <span className="text-suas-ruby">*</span></label>
                      <select value={stagingLabId} onChange={e => setStagingLabId(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 text-slate-800 dark:text-white outline-none">
                        <option value="">Select Laboratory</option>
                        {laboratories.map(lab => <option key={lab.id} value={lab.id?.toString()}>{lab.name} ({lab.code})</option>)}
                      </select>
                    </div>

                    {/* Entry form grid */}
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/20 space-y-3">
                      <span className="text-[10px] font-black uppercase text-slate-500">New Record Entry</span>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-semibold">
                        {[
                          { label: "PC Number", key: "pc_number", placeholder: "e.g. PC-12" },
                          { label: "System Make", key: "system_make", placeholder: "e.g. Dell, HP, Lenovo" },
                          { label: "System Model", key: "system_model", placeholder: "e.g. OptiPlex 7080" },
                          { label: "Serial Number", key: "serial_number", placeholder: "Optional" },
                          { label: "Technician Name", key: "technician_name", placeholder: "e.g. Nitin Panchal" },
                        ].map(f => (
                          <div key={f.key} className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider text-slate-400 block">{f.label}</label>
                            <input type="text" placeholder={f.placeholder} value={(newEntry as any)[f.key]} onChange={e => setNewEntry({ ...newEntry, [f.key]: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white" />
                          </div>
                        ))}
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider text-slate-400 block">Date <span className="text-suas-ruby">*</span></label>
                          <input type="date" value={newEntry.date} onChange={e => setNewEntry({ ...newEntry, date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white" required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider text-slate-400 block">Time</label>
                          <input type="time" value={newEntry.time_stamp} onChange={e => setNewEntry({ ...newEntry, time_stamp: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider text-slate-400 block">Status</label>
                          <select value={newEntry.status} onChange={e => setNewEntry({ ...newEntry, status: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white">
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-semibold">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider text-slate-400 block">Issue / Problem Description <span className="text-suas-ruby">*</span></label>
                          <textarea value={newEntry.issue_description} onChange={e => setNewEntry({ ...newEntry, issue_description: e.target.value })} placeholder="Describe the hardware fault or software issue…" className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white h-16 resize-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider text-slate-400 block">Reason for Damage</label>
                          <textarea value={newEntry.reason_for_damage} onChange={e => setNewEntry({ ...newEntry, reason_for_damage: e.target.value })} placeholder="Physical damage, water, overheating, etc…" className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white h-16 resize-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider text-slate-400 block">Action Taken</label>
                          <textarea value={newEntry.action_taken} onChange={e => setNewEntry({ ...newEntry, action_taken: e.target.value })} placeholder="Steps taken, replacements done…" className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white h-16 resize-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider text-slate-400 block">Remarks</label>
                          <textarea value={newEntry.remarks} onChange={e => setNewEntry({ ...newEntry, remarks: e.target.value })} placeholder="Additional notes…" className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white h-16 resize-none" />
                        </div>
                      </div>
                      <button onClick={handleAddToStaging} className="w-full py-2 bg-slate-800 hover:bg-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2">
                        <Plus size={14} /> Add to Batch
                      </button>
                    </div>

                    {/* Staging List */}
                    {stagingRecords.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-slate-800 dark:text-white">{stagingRecords.length} Record{stagingRecords.length > 1 ? "s" : ""} Staged</span>
                          <span className="text-[10px] text-slate-500">Review before submitting</span>
                        </div>
                        <div className="space-y-1.5 max-h-52 overflow-y-auto">
                          {stagingRecords.map((r, i) => (
                            <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 flex items-start justify-between gap-3 text-xs">
                              <div className="space-y-0.5 flex-1 min-w-0">
                                <div className="font-black text-slate-800 dark:text-white">S.No {i + 1} — {r.pc_number || "PC"} {r.system_make ? `| ${r.system_make}` : ""} {r.system_model ? `/ ${r.system_model}` : ""}</div>
                                <div className="text-slate-500 truncate">{r.issue_description}</div>
                                <div className="flex gap-3 text-[10px] text-slate-400"><span>Tech: {r.technician_name}</span><span>{r.date} {r.time_stamp}</span>
                                  <span className={`font-black ${r.status === "Completed" ? "text-emerald-600" : r.status === "In Progress" ? "text-amber-600" : "text-suas-ruby"}`}>{r.status}</span>
                                </div>
                              </div>
                              <button onClick={() => setStagingRecords(prev => prev.filter((_, j) => j !== i))} className="text-rose-500 hover:text-rose-700 cursor-pointer shrink-0"><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="sticky bottom-0 bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-850 p-5 flex gap-3 justify-end">
                    <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 text-xs font-black rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900 transition cursor-pointer">Cancel</button>
                    <button
                      onClick={() => { if (stagingRecords.length === 0) { showToast("Add at least one record first."); return; } setShowConfirmModal(true); }}
                      disabled={stagingRecords.length === 0}
                      className="px-6 py-2 bg-suas-ruby hover:bg-rose-700 text-white text-xs font-black rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Check size={14} /> Submit {stagingRecords.length > 0 ? `${stagingRecords.length} Records` : ""}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* CONFIRMATION POPUP */}
            {showConfirmModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-7 max-w-sm w-full text-left">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                    <AlertCircle size={16} className="text-suas-ruby" /> Confirm Submission
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                    You are about to save <strong>{stagingRecords.length}</strong> maintenance record{stagingRecords.length > 1 ? "s" : ""} for <strong>{laboratories.find(l => l.id?.toString() === stagingLabId)?.name || "selected lab"}</strong>. This action will add them to the register permanently.
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto mb-5">
                    {stagingRecords.map((r, i) => (
                      <div key={i} className="text-[10px] text-slate-600 dark:text-slate-400 flex gap-2 items-center">
                        <span className="font-black text-slate-800 dark:text-white w-5">{i+1}.</span>
                        <span>{r.pc_number || "PC"} — {r.issue_description.slice(0, 50)}{r.issue_description.length > 50 ? "…" : ""}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 text-xs font-black rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900 transition cursor-pointer">Go Back</button>
                    <button onClick={handleSubmitBulk} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-2">
                      <Check size={14} /> Confirm & Save
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* QUICK ENTRY MODAL (single record) */}
            {showMaintenanceModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800/50 max-w-2xl w-full rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto relative text-left">
                  <button onClick={() => setShowMaintenanceModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition"><X size={18} /></button>
                  <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 mb-5">
                    <h4 className="text-base font-black text-slate-805 dark:text-white">
                      {editingMaintenance ? "Edit Maintenance Record" : "Quick Add Maintenance Record"}
                    </h4>
                  </div>

                  <form onSubmit={(e) => onSaveMaintenance(e, maintForm)} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-305">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">Laboratory <span className="text-suas-ruby">*</span></label>
                        <select value={maintForm.lab_id} onChange={e => setMaintForm({ ...maintForm, lab_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white" required>
                          <option value="">Select Lab</option>
                          {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name} ({lab.code})</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">PC Number</label>
                        <input type="text" placeholder="e.g. PC-07" value={maintForm.pc_number || ""} onChange={e => setMaintForm({ ...maintForm, pc_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">System Make</label>
                        <input type="text" placeholder="e.g. Dell" value={maintForm.system_make || ""} onChange={e => setMaintForm({ ...maintForm, system_make: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">System Model</label>
                        <input type="text" placeholder="e.g. OptiPlex 7080" value={maintForm.system_model || ""} onChange={e => setMaintForm({ ...maintForm, system_model: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">Serial Number</label>
                        <input type="text" placeholder="Optional" value={maintForm.serial_number || ""} onChange={e => setMaintForm({ ...maintForm, serial_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">Date <span className="text-suas-ruby">*</span></label>
                        <input type="date" value={maintForm.date} onChange={e => setMaintForm({ ...maintForm, date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-805 dark:text-white" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">Time Stamp</label>
                        <input type="time" value={maintForm.time_stamp || ""} onChange={e => setMaintForm({ ...maintForm, time_stamp: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-805 dark:text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">Technician <span className="text-suas-ruby">*</span></label>
                        <input type="text" placeholder="Technician name" value={maintForm.technician_name} onChange={e => setMaintForm({ ...maintForm, technician_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">Status</label>
                        <select value={maintForm.status} onChange={e => setMaintForm({ ...maintForm, status: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-855 dark:text-slate-250">
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Issue / Problem Description <span className="text-suas-ruby">*</span></label>
                      <textarea placeholder="Describe the fault, system crash, hardware failure…" value={maintForm.issue_description} onChange={e => setMaintForm({ ...maintForm, issue_description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white h-20 resize-none" required />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">Reason for Damage</label>
                        <textarea placeholder="Physical damage, power surge, wear…" value={maintForm.reason_for_damage || ""} onChange={e => setMaintForm({ ...maintForm, reason_for_damage: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white h-16 resize-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">Action Taken</label>
                        <textarea placeholder="Repair steps, component replacements…" value={maintForm.action_taken} onChange={e => setMaintForm({ ...maintForm, action_taken: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white h-16 resize-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">Completion Date</label>
                        <input type="date" value={maintForm.completion_date} onChange={e => setMaintForm({ ...maintForm, completion_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-805 dark:text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">Remarks</label>
                        <input type="text" placeholder="Optional notes…" value={maintForm.remarks} onChange={e => setMaintForm({ ...maintForm, remarks: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white" />
                      </div>
                    </div>

                    <button type="submit" className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition shadow-md cursor-pointer">
                      {editingMaintenance ? "Update Maintenance Record" : "Save Maintenance Record"}
                    </button>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      );
    })()}

      {/* 6. Inventory Panel (Module 5) [Lockable] */}
      {activeTab === "laboratory_inventory" && modulesStatus.laboratory_inventory && (
        <div className="space-y-6 animate-float-up text-left">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Layers size={15} className="text-suas-ruby" /> Physical Laboratory Inventory Directory
              </h3>
              <p className="text-[10px] text-slate-455">Manage workstation assets: CPUs, RAM counts, disks, projectors, UPS, and printers.</p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-36">
                <select
                  value={invLabFilter}
                  onChange={(e) => setInvLabFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl outline-none appearance-none bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-350 pr-8"
                >
                  <option value="All">All Labs</option>
                  {LAB_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-[10px] text-slate-400 pointer-events-none" />
              </div>
              <div className="relative flex-1 md:w-36">
                <select
                  value={invTypeFilter}
                  onChange={(e) => setInvTypeFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl outline-none appearance-none bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-350 pr-8"
                >
                  <option value="All">All Types</option>
                  <option value="Desktop">Desktop PCs</option>
                  <option value="Laptop">Laptops</option>
                  <option value="Printer">Printers</option>
                  <option value="Projector">Projectors</option>
                  <option value="UPS">UPS Units</option>
                  <option value="Network Device">Network Devices</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-[10px] text-slate-400 pointer-events-none" />
              </div>

              {isWriteAllowed && (
                <button
                  onClick={() => { setEditingInventory(null); setShowInventoryModal(true); }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus size={14} /> Add Asset
                </button>
              )}
            </div>
          </div>

          {/* Inventory table */}
          <div className="glass-card p-5 border border-slate-200/50 dark:border-zinc-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-850 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-2">Asset Number</th>
                    <th className="py-3 px-2">Lab</th>
                    <th className="py-3 px-2">Type</th>
                    <th className="py-3 px-2">System Specs (CPU/RAM/Storage)</th>
                    <th className="py-3 px-2">Monitor / Peripherals</th>
                    <th className="py-3 px-2">Purchase Date</th>
                    <th className="py-3 px-2">Warranty details</th>
                    <th className="py-3 px-2">Status</th>
                    {isWriteAllowed && <th className="py-3 px-2 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 font-semibold text-slate-700 dark:text-slate-300">
                  {inventoryItems.filter(i => (invLabFilter === "All" || i.lab_name === invLabFilter) && (invTypeFilter === "All" || i.device_type === invTypeFilter)).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 italic">No inventory items registered matching filter criteria.</td>
                    </tr>
                  ) : (
                    inventoryItems.filter(i => (invLabFilter === "All" || i.lab_name === invLabFilter) && (invTypeFilter === "All" || i.device_type === invTypeFilter)).map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                        <td className="py-3 px-2 font-mono font-black text-slate-900 dark:text-white">{item.asset_number}</td>
                        <td className="py-3 px-2">🏢 {item.lab_name}</td>
                        <td className="py-3 px-2">{item.device_type}</td>
                        <td className="py-3 px-2">
                          {item.device_type === "Desktop" || item.device_type === "Laptop" ? (
                            <span>{item.cpu} | {item.ram} | {item.storage}</span>
                          ) : (
                            <span className="text-slate-400 italic">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {item.device_type === "Desktop" ? `Monitor: ${item.monitor || "-"}` 
                          : item.device_type === "Printer" ? item.printer_details 
                          : item.device_type === "Projector" ? item.projector_details 
                          : item.device_type === "UPS" ? item.ups_details
                          : item.device_type === "Network Device" ? item.network_details : "-"}
                        </td>
                        <td className="py-3 px-2">{item.purchase_date}</td>
                        <td className="py-3 px-2 max-w-[120px] truncate" title={item.warranty_details}>{item.warranty_details || "-"}</td>
                        <td className="py-3 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            item.status === "Active" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600"
                          : "bg-rose-50 dark:bg-rose-950/20 text-suas-ruby"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        {isWriteAllowed && (
                          <td className="py-3 px-2 text-right space-x-1">
                            <button
                              onClick={() => { setEditingInventory(item); setShowInventoryModal(true); }}
                              className="p-1 text-slate-400 hover:text-slate-805 dark:hover:text-white cursor-pointer"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => item.id && onDeleteInventory(item.id)}
                              className="p-1 text-rose-600 hover:text-rose-850 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* INVENTORY CREATE / EDIT MODAL */}
          {showInventoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800/50 max-w-lg w-full rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto relative text-left"
              >
                <button onClick={() => setShowInventoryModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition"><X size={18} /></button>
                <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 mb-4">
                  <h4 className="text-base font-black text-slate-805 dark:text-white font-display">
                    {editingInventory ? "Edit Inventory Asset details" : "Register New Equipment / Asset"}
                  </h4>
                </div>

                <form onSubmit={(e) => onSaveInventory(e, invForm)} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-305">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Target Laboratory</label>
                      <select
                        value={invForm.lab_id}
                        onChange={(e) => setInvForm({ ...invForm, lab_id: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      >
                        <option value="">Select Laboratory</option>
                        {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name} ({lab.code})</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Device Type</label>
                      <select
                        value={invForm.device_type}
                        onChange={(e) => setInvForm({ ...invForm, device_type: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-855 dark:text-slate-255"
                      >
                        <option value="Desktop">Desktop PC</option>
                        <option value="Laptop">Laptop</option>
                        <option value="Printer">Printer</option>
                        <option value="Projector">Projector</option>
                        <option value="UPS">UPS Unit</option>
                        <option value="Network Device">Network Device</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Asset Number (Unique ID)</label>
                      <input
                        type="text"
                        placeholder="e.g. SUAS-COMP-101"
                        value={invForm.asset_number}
                        onChange={(e) => setInvForm({ ...invForm, asset_number: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Purchase Date</label>
                      <input
                        type="date"
                        value={invForm.purchase_date}
                        onChange={(e) => setInvForm({ ...invForm, purchase_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  {(invForm.device_type === "Desktop" || invForm.device_type === "Laptop") && (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider block text-slate-400">CPU Specs</label>
                          <input
                            type="text"
                            placeholder="e.g. Intel i7"
                            value={invForm.cpu}
                            onChange={(e) => setInvForm({ ...invForm, cpu: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider block text-slate-400">RAM Size</label>
                          <input
                            type="text"
                            placeholder="e.g. 16 GB"
                            value={invForm.ram}
                            onChange={(e) => setInvForm({ ...invForm, ram: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider block text-slate-400">Storage Size</label>
                          <input
                            type="text"
                            placeholder="e.g. 1 TB SSD"
                            value={invForm.storage}
                            onChange={(e) => setInvForm({ ...invForm, storage: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider block text-slate-400">Monitor Specifications</label>
                        <input
                          type="text"
                          placeholder="e.g. HP 22inch Full HD Monitor"
                          value={invForm.monitor}
                          onChange={(e) => setInvForm({ ...invForm, monitor: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-805 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  {invForm.device_type === "Printer" && (
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Printer Details</label>
                      <input
                        type="text"
                        placeholder="e.g. Canon Laser LBP2900B"
                        value={invForm.printer_details}
                        onChange={(e) => setInvForm({ ...invForm, printer_details: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                      />
                    </div>
                  )}

                  {invForm.device_type === "Projector" && (
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Projector Details</label>
                      <input
                        type="text"
                        placeholder="e.g. Epson EB-E01 ceiling projector"
                        value={invForm.projector_details}
                        onChange={(e) => setInvForm({ ...invForm, projector_details: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                      />
                    </div>
                  )}

                  {invForm.device_type === "UPS" && (
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">UPS Unit Details</label>
                      <input
                        type="text"
                        placeholder="e.g. APC Smart-UPS 5KVA"
                        value={invForm.ups_details}
                        onChange={(e) => setInvForm({ ...invForm, ups_details: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                      />
                    </div>
                  )}

                  {invForm.device_type === "Network Device" && (
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Network Switch / Router Details</label>
                      <input
                        type="text"
                        placeholder="e.g. Cisco 24-Port Gigabit Switch"
                        value={invForm.network_details}
                        onChange={(e) => setInvForm({ ...invForm, network_details: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Warranty Details</label>
                      <input
                        type="text"
                        placeholder="e.g. 3 Years Warranty"
                        value={invForm.warranty_details}
                        onChange={(e) => setInvForm({ ...invForm, warranty_details: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-805 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Vendor Details</label>
                      <input
                        type="text"
                        placeholder="Name, Contact, Invoice No..."
                        value={invForm.vendor_details}
                        onChange={(e) => setInvForm({ ...invForm, vendor_details: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-805 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">Asset Status</label>
                    <select
                      value={invForm.status}
                      onChange={(e) => setInvForm({ ...invForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-855 dark:text-slate-250"
                    >
                      <option value="Active">Active</option>
                      <option value="Under Repair">Under Repair</option>
                      <option value="Scrapped">Scrapped</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition shadow-md cursor-pointer"
                  >
                    Save Asset Record
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* 7. Asset Lifecycle Panel (Module 6) [Lockable] */}
      {activeTab === "asset_management" && modulesStatus.asset_management && (
        <div className="space-y-6 animate-float-up text-left">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar size={15} className="text-suas-ruby" /> Asset Lifecycle Management &amp; AMCs
              </h3>
              <p className="text-[10px] text-slate-455">Maintain AMC details, warranty expiry reviews, and replacement projections.</p>
            </div>
            
            {isWriteAllowed && (
              <button
                onClick={() => { setEditingLifecycle(null); setShowLifecycleModal(true); }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Add Lifecycle Log
              </button>
            )}
          </div>

          {/* Asset lifecycle table listing */}
          <div className="glass-card p-5 border border-slate-200/50 dark:border-zinc-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-855 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-2">Asset ID</th>
                    <th className="py-3 px-2">Lab</th>
                    <th className="py-3 px-2">Type</th>
                    <th className="py-3 px-2">Purchase Date</th>
                    <th className="py-3 px-2">Warranty Expiry</th>
                    <th className="py-3 px-2">AMC Details</th>
                    <th className="py-3 px-2">Last Mnt</th>
                    <th className="py-3 px-2">Next Mnt</th>
                    <th className="py-3 px-2">Condition</th>
                    <th className="py-3 px-2">Replacement Rec</th>
                    {isWriteAllowed && <th className="py-3 px-2 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 font-semibold text-slate-700 dark:text-slate-300">
                  {assetLifecycles.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-500 italic">No asset lifecycle records logged yet. Create some from the inventory registry.</td>
                    </tr>
                  ) : (
                    assetLifecycles.map(asset => (
                      <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                        <td className="py-3 px-2 font-mono font-black text-slate-900 dark:text-white">{asset.asset_number}</td>
                        <td className="py-3 px-2">{asset.lab_name}</td>
                        <td className="py-3 px-2">{asset.device_type}</td>
                        <td className="py-3 px-2">{asset.purchase_date}</td>
                        <td className="py-3 px-2 font-black text-slate-900 dark:text-white">{asset.warranty_expiry}</td>
                        <td className="py-3 px-2 max-w-[120px] truncate" title={asset.amc_details}>{asset.amc_details || "-"}</td>
                        <td className="py-3 px-2">{asset.last_maintenance || "-"}</td>
                        <td className="py-3 px-2">{asset.next_maintenance || "-"}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            asset.current_condition === "Excellent" || asset.current_condition === "Good" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600"
                          : asset.current_condition === "Needs Repair" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600"
                          : "bg-rose-50 dark:bg-rose-950/20 text-suas-ruby"
                          }`}>
                            {asset.current_condition}
                          </span>
                        </td>
                        <td className="py-3 px-2 max-w-[120px] truncate" title={asset.replacement_recommendation}>{asset.replacement_recommendation || "-"}</td>
                        {isWriteAllowed && (
                          <td className="py-3 px-2 text-right space-x-1">
                            <button
                              onClick={() => { setEditingLifecycle(asset); setShowLifecycleModal(true); }}
                              className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => asset.id && onDeleteLifecycle(asset.id)}
                              className="p-1 text-rose-600 hover:text-rose-850 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* LIFECYCLE LOG MODAL */}
          {showLifecycleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800/50 max-w-lg w-full rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto relative text-left"
              >
                <button onClick={() => setShowLifecycleModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition"><X size={18} /></button>
                <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 mb-4">
                  <h4 className="text-base font-black text-slate-805 dark:text-white font-display">
                    {editingLifecycle ? "Edit Asset Lifecycle details" : "Register Asset Lifecycle Details"}
                  </h4>
                </div>

                <form onSubmit={(e) => onSaveLifecycle(e, lifecycleForm)} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-303">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">Select Equipment Asset</label>
                    <select
                      value={lifecycleForm.inventory_id}
                      onChange={(e) => setLifecycleForm({ ...lifecycleForm, inventory_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-805 dark:text-white"
                      required
                    >
                      <option value="">Select Asset (Asset Number)</option>
                      {inventoryItems.map(item => (
                        <option key={item.id} value={item.id}>[{item.lab_code}] {item.device_type} - {item.asset_number}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Purchase Date</label>
                      <input
                        type="date"
                        value={lifecycleForm.purchase_date}
                        onChange={(e) => setLifecycleForm({ ...lifecycleForm, purchase_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Warranty Expiry Date</label>
                      <input
                        type="date"
                        value={lifecycleForm.warranty_expiry}
                        onChange={(e) => setLifecycleForm({ ...lifecycleForm, warranty_expiry: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-805 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">AMC details (Contract Info / Renewal Dates)</label>
                    <input
                      type="text"
                      placeholder="e.g. AMC Contract ref SUAS-2026-901, renew on 2026-12-15"
                      value={lifecycleForm.amc_details}
                      onChange={(e) => setLifecycleForm({ ...lifecycleForm, amc_details: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Last Maintenance Date</label>
                      <input
                        type="date"
                        value={lifecycleForm.last_maintenance}
                        onChange={(e) => setLifecycleForm({ ...lifecycleForm, last_maintenance: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Next Scheduled Maintenance Date</label>
                      <input
                        type="date"
                        value={lifecycleForm.next_maintenance}
                        onChange={(e) => setLifecycleForm({ ...lifecycleForm, next_maintenance: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Current Asset Condition</label>
                      <select
                        value={lifecycleForm.current_condition}
                        onChange={(e) => setLifecycleForm({ ...lifecycleForm, current_condition: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-855 dark:text-slate-250"
                      >
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Needs Repair">Needs Repair</option>
                        <option value="Scrapped">Scrapped</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Replacement Recommendation</label>
                      <input
                        type="text"
                        placeholder="e.g. Schedule replace by 2028"
                        value={lifecycleForm.replacement_recommendation}
                        onChange={(e) => setLifecycleForm({ ...lifecycleForm, replacement_recommendation: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition shadow-md cursor-pointer"
                  >
                    Save Asset Details
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* 8. NAAC Documentation Panel (Module 7) [Lockable] */}
      {activeTab === "naac_documentation" && modulesStatus.naac_documentation && (
        <div className="space-y-6 animate-float-up text-left">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={15} className="text-suas-ruby" /> NAAC Documentation Registry
              </h3>
              <p className="text-[10px] text-slate-455">Maintain official institutional records (utilization reports, stock verification sheets, laboratory photographs).</p>
            </div>
            
            {isWriteAllowed && (
              <button
                onClick={() => setShowNaacModal(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Upload NAAC Doc
              </button>
            )}
          </div>

          {/* List of NAAC records */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {naacDocsList.map(doc => (
              <div key={doc.id} className="glass-card p-4 border border-slate-100 dark:border-zinc-850 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-600 flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white">{doc.document_name}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Type: {doc.document_type} | Lab: {doc.lab_name || "General"}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Uploaded by: {doc.uploaded_by} | Date: {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : ""}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={doc.file_url}
                    download={doc.document_name}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-black text-[9px] tracking-wider uppercase text-slate-700 dark:text-slate-350 cursor-pointer"
                  >
                    Download
                  </a>
                  {isWriteAllowed && (
                    <button
                      onClick={() => doc.id && onDeleteNaac(doc.id)}
                      className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* NAAC UPLOAD MODAL */}
          {showNaacModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800/50 max-w-lg w-full rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto relative text-left"
              >
                <button onClick={() => setShowNaacModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition"><X size={18} /></button>
                <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 mb-4">
                  <h4 className="text-base font-black text-slate-805 dark:text-white font-display">
                    Upload NAAC Accreditation Audit Record
                  </h4>
                </div>

                <form onSubmit={onUploadNaac} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Associated Laboratory</label>
                      <select
                        value={naacLabId}
                        onChange={(e) => setNaacLabId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-805 dark:text-white"
                      >
                        <option value="">Department Level (General)</option>
                        {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name} ({lab.code})</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Document Type</label>
                      <select
                        value={naacDocType}
                        onChange={(e) => setNaacDocType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-855 dark:text-slate-250"
                      >
                        <option value="Laboratory Utilization Reports">Laboratory Utilization Reports</option>
                        <option value="Annual Stock Verification">Annual Stock Verification</option>
                        <option value="Laboratory Photographs">Laboratory Photographs</option>
                        <option value="Annual Laboratory Report">Annual Laboratory Report</option>
                        <option value="Supporting Documents">Supporting Documents</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">Document Title / File Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Stock Verification Audit Jan 2026"
                      value={naacDocName}
                      onChange={(e) => setNaacDocName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">Select Document File (PDF, DOCX, XLSX, Images)</label>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(e, setNaacFileBase64)}
                      className="w-full px-3 py-2 border border-dashed border-slate-250 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">Remarks / Description</label>
                    <input
                      type="text"
                      placeholder="Remarks..."
                      value={naacRemarks}
                      onChange={(e) => setNaacRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-805 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition shadow-md cursor-pointer"
                  >
                    Upload Document
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* 9. IEEE Compliance Panel (Module 8) [Lockable] */}
      {activeTab === "ieee_compliance" && modulesStatus.ieee_compliance && (
        <div className="space-y-6 animate-float-up text-left">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileText size={15} className="text-suas-ruby" /> IEEE-Recommended Laboratory Management Guidelines
              </h3>
              <p className="text-[10px] text-slate-455">Maintain Standard Operating Procedures (SOPs), safety policies, backup routines, and inspections.</p>
            </div>
            
            {isWriteAllowed && (
              <button
                onClick={() => { setEditingIeee(null); setShowIeeeModal(true); }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Add Guideline
              </button>
            )}
          </div>

          {/* List of guidelines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ieeeRecords.map(rec => (
              <div key={rec.id} className="glass-card p-5 border border-slate-200/50 dark:border-zinc-800/50 space-y-3 flex flex-col justify-between hover-3d">
                <div>
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-zinc-850 pb-2 mb-2">
                    <div>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 uppercase tracking-wider">{rec.compliance_type}</span>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white mt-1">{rec.title}</h4>
                    </div>
                    <span className="text-[10px] text-slate-400">Lab: {rec.lab_name || "All"}</span>
                  </div>
                  <p className="text-[11px] text-slate-655 dark:text-slate-350 whitespace-pre-line leading-normal">{rec.content_text}</p>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-zinc-855">
                  <span className="text-[9px] text-slate-400">Reviewed by {rec.reviewed_by} on {rec.last_reviewed_date}</span>
                  {isWriteAllowed && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditingIeee(rec); setShowIeeeModal(true); }}
                        className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => rec.id && onDeleteIeee(rec.id)}
                        className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* IEEE COMPLIANCE MODAL */}
          {showIeeeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800/50 max-w-lg w-full rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto relative text-left"
              >
                <button onClick={() => setShowIeeeModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition"><X size={18} /></button>
                <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 mb-4">
                  <h4 className="text-base font-black text-slate-805 dark:text-white font-display">
                    {editingIeee ? "Edit IEEE Compliance Record" : "Register IEEE Laboratory Guideline"}
                  </h4>
                </div>

                <form onSubmit={(e) => onSaveIeee(e, ieeeForm)} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-305">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Associated Lab</label>
                      <select
                        value={ieeeForm.lab_id}
                        onChange={(e) => setIeeeForm({ ...ieeeForm, lab_id: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-805 dark:text-white"
                      >
                        <option value="">Department Wide (General)</option>
                        {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name} ({lab.code})</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Guideline / SOP Type</label>
                      <select
                        value={ieeeForm.compliance_type}
                        onChange={(e) => setIeeeForm({ ...ieeeForm, compliance_type: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-855 dark:text-slate-255"
                      >
                        <option value="Laboratory SOPs">Laboratory SOPs</option>
                        <option value="Maintenance Schedule">Maintenance Schedule</option>
                        <option value="Software Version Records">Software Version Records</option>
                        <option value="Backup Policy">Backup Policy</option>
                        <option value="Security Policy">Security Policy</option>
                        <option value="Safety Checklist">Safety Checklist</option>
                        <option value="Preventive Maintenance Checklist">Preventive Maintenance Checklist</option>
                        <option value="Inspection Reports">Inspection Reports</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">Guideline Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Standard Operating Procedure for Program Execution"
                      value={ieeeForm.title}
                      onChange={(e) => setIeeeForm({ ...ieeeForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-805 dark:text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">Guideline Policy Content (Detailed Text)</label>
                    <textarea
                      placeholder="Enter policy text guidelines..."
                      value={ieeeForm.content_text}
                      onChange={(e) => setIeeeForm({ ...ieeeForm, content_text: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-805 dark:text-white h-24 resize-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Review Date</label>
                      <input
                        type="date"
                        value={ieeeForm.last_reviewed_date}
                        onChange={(e) => setIeeeForm({ ...ieeeForm, last_reviewed_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Status</label>
                      <select
                        value={ieeeForm.status}
                        onChange={(e) => setIeeeForm({ ...ieeeForm, status: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-855 dark:text-slate-250"
                      >
                        <option value="Active">Active / Approved</option>
                        <option value="Draft">Draft</option>
                        <option value="Review Required">Review Required</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition shadow-md cursor-pointer"
                  >
                    Save Compliance Guideline
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* 10. Document Repository Panel (Module 10) [Lockable] */}
      {activeTab === "document_repository" && modulesStatus.document_repository && (
        <div className="space-y-6 animate-float-up text-left">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Layers size={15} className="text-suas-ruby" /> Centralized Document Repository Archive
              </h3>
              <p className="text-[10px] text-slate-455">File storage folder logs for software licenses, purchase invoices, vendor details, and AMC agreements.</p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-48">
                <select
                  value={docRepoCatFilter}
                  onChange={(e) => setDocRepoCatFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl outline-none appearance-none bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-350 pr-8"
                >
                  <option value="All">All Categories</option>
                  <option value="Software Licenses">Software Licenses</option>
                  <option value="Warranty Documents">Warranty Documents</option>
                  <option value="AMC Agreements">AMC Agreements</option>
                  <option value="Purchase Invoices">Purchase Invoices</option>
                  <option value="Vendor Documents">Vendor Documents</option>
                  <option value="Inspection Reports">Inspection Reports</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-[10px] text-slate-400 pointer-events-none" />
              </div>
              {isWriteAllowed && (
                <button
                  onClick={() => setShowDocRepoModal(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus size={14} /> Upload Doc
                </button>
              )}
            </div>
          </div>

          {/* List of files in Repository */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {documentRepoList.filter(d => docRepoCatFilter === "All" || d.category === docRepoCatFilter).length === 0 ? (
              <p className="col-span-3 text-xs text-slate-500 italic text-center py-8">No documents uploaded under this category filter.</p>
            ) : (
              documentRepoList.filter(d => docRepoCatFilter === "All" || d.category === docRepoCatFilter).map(doc => (
                <div key={doc.id} className="glass-card p-4 border border-slate-100 dark:border-zinc-850 flex flex-col justify-between gap-3 text-xs hover-3d">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-purple-50 dark:bg-purple-950/20 text-purple-600 uppercase tracking-wider">{doc.category}</span>
                      <span className="text-[9px] text-slate-400">{doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : ""}</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white mt-2 flex items-center gap-1.5">
                      <File size={13} className="text-suas-ruby" /> {doc.document_name}
                    </h4>
                    <p className="text-[10px] text-slate-550 mt-1 leading-normal">Remarks: {doc.remarks || "N/A"} {doc.associated_id ? `| Asset ID: ${doc.associated_id}` : ""}</p>
                    <p className="text-[9px] text-slate-400 mt-1">Uploaded by: {doc.uploaded_by}</p>
                  </div>

                  <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-zinc-900">
                    <a
                      href={doc.file_url}
                      download={doc.document_name}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-black text-[9px] tracking-wider uppercase text-slate-700 dark:text-slate-350 cursor-pointer"
                    >
                      Download
                    </a>
                    {isWriteAllowed && (
                      <button
                        onClick={() => doc.id && onDeleteRepoDoc(doc.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DOCUMENT REPO MODAL */}
          {showDocRepoModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800/50 max-w-lg w-full rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto relative text-left"
              >
                <button onClick={() => setShowDocRepoModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition"><X size={18} /></button>
                <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 mb-4">
                  <h4 className="text-base font-black text-slate-805 dark:text-white font-display">
                    Upload Document to Repository
                  </h4>
                </div>

                <form onSubmit={onUploadRepoDoc} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Document Category</label>
                      <select
                        value={repoCategory}
                        onChange={(e) => setRepoCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-855 dark:text-slate-250"
                      >
                        <option value="Software Licenses">Software Licenses</option>
                        <option value="Warranty Documents">Warranty Documents</option>
                        <option value="AMC Agreements">AMC Agreements</option>
                        <option value="Purchase Invoices">Purchase Invoices</option>
                        <option value="Vendor Documents">Vendor Documents</option>
                        <option value="Inspection Reports">Inspection Reports</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider block text-slate-400">Linked Asset ID (If applicable)</label>
                      <input
                        type="text"
                        placeholder="e.g. SUAS-COMP-101"
                        value={repoAssociatedId}
                        onChange={(e) => setRepoAssociatedId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">Document Name / File Title</label>
                    <input
                      type="text"
                      placeholder="e.g. VS Code Enterprise License 2026"
                      value={repoDocName}
                      onChange={(e) => setRepoDocName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">Select File Document (PDF, Word, Excel, Images)</label>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(e, setRepoFileBase64)}
                      className="w-full px-3 py-2 border border-dashed border-slate-250 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider block text-slate-400">Remarks / Description</label>
                    <textarea
                      placeholder="Add document details, vendor info or remarks..."
                      value={repoRemarks}
                      onChange={(e) => setRepoRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-805 dark:text-white h-20 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition shadow-md cursor-pointer"
                  >
                    Save Document
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* 11. Notifications Panel (Module 11) [Lockable] */}
      {activeTab === "notifications" && modulesStatus.notifications && (
        <div className="space-y-6 animate-float-up text-left">
          <div>
            <h3 className="text-sm font-black text-slate-855 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Bell size={15} className="text-suas-ruby" /> Active Laboratory System Notifications
            </h3>
            <p className="text-[10px] text-slate-455">System-generated warnings regarding due maintenance, warranty expiries, pending software setups, and documentation gaps.</p>
          </div>

          <div className="space-y-3">
            {systemAlerts.length === 0 ? (
              <div className="glass-card p-6 border border-slate-200 dark:border-zinc-800 text-center italic text-xs text-slate-550">
                🎉 No active system notifications or action items! Your laboratory parameters are all in check.
              </div>
            ) : (
              systemAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex gap-3 items-start transition ${
                    alert.severity === "high" ? "bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-200"
                  : alert.severity === "medium" ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-200"
                  : "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/30 text-blue-800 dark:text-blue-200"
                  }`}
                >
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-wider border px-1 rounded block w-max mb-1">
                      {alert.category}
                    </span>
                    <h4 className="text-xs font-black">{alert.title}</h4>
                    <p className="text-[10px] mt-1 leading-normal opacity-90">{alert.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 12. Search & Audit Logs Panel (Module 12) [Lockable] */}
      {activeTab === "search_audit_logs" && modulesStatus.search_audit_logs && (
        <div className="space-y-6 animate-float-up text-left">
          {/* Advanced Global Search bar */}
          <div className="glass-card p-6 border border-slate-200/50 dark:border-zinc-800/50 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Search size={15} className="text-suas-ruby" /> Advanced Global System Query Search
              </h3>
              <p className="text-[10px] text-slate-455">Search across laboratories, faculty requests, installed softwares, maintenance sheets, and inventories.</p>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Type query to search databases (e.g. Monark, Lab A, Java, VS Code, MNT)..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 outline-none text-slate-800 dark:text-white pl-10 pr-8"
              />
              <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
              {globalSearch && <button onClick={() => setGlobalSearch("")} className="absolute right-3 top-3 text-slate-400 hover:text-slate-655"><X size={13} /></button>}
            </div>

            {globalSearchResults && (
              <div className="border border-slate-100 dark:border-zinc-850 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
                <div className="bg-slate-50 dark:bg-zinc-900 px-3 py-2 border-b border-slate-100 dark:border-zinc-850">
                  <span className="text-[10px] font-black uppercase text-slate-400">Search Results ({globalSearchResults.length} matches)</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-zinc-850 text-xs">
                  {globalSearchResults.length === 0 ? (
                    <p className="p-4 italic text-slate-555 text-center">No record matches your search query term.</p>
                  ) : (
                    globalSearchResults.map((res, idx) => (
                      <div key={idx} className="p-3 hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 flex justify-between items-center gap-4">
                        <div>
                          <span className="text-[9px] font-black uppercase text-suas-ruby border border-rose-200/50 dark:border-rose-900/30 px-1 rounded mr-2">{res.category}</span>
                          <span className="font-semibold text-slate-850 dark:text-slate-250">{res.text}</span>
                        </div>
                        <button
                          onClick={() => onNavigateToTab(res.tab)}
                          className="px-2.5 py-1 text-[9px] bg-slate-900 hover:bg-slate-805 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Go to module
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Audit Logs tab */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider">System Activity Audit Log</h3>
                <p className="text-[10px] text-slate-455">Chronological timeline of system changes: record creations, updates, deletes, and status logs.</p>
              </div>
              {isSuperAdmin && (
                <button
                  onClick={onClearLogs}
                  className="px-3 py-1.5 border border-rose-200 dark:border-rose-900/30 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
                >
                  Clear Logs
                </button>
              )}
            </div>

            <div className="glass-card p-5 border border-slate-200/50 dark:border-zinc-800/50 overflow-hidden">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-zinc-850 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-3 px-2">Timestamp</th>
                      <th className="py-3 px-2">User</th>
                      <th className="py-3 px-2">Action</th>
                      <th className="py-3 px-2">Table Name</th>
                      <th className="py-3 px-2">Record ID</th>
                      <th className="py-3 px-2">Previous Value / Change Detail</th>
                      <th className="py-3 px-2">Updated Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 font-semibold text-slate-700 dark:text-slate-350">
                    {auditLogsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic">No audit log records written yet.</td>
                      </tr>
                    ) : (
                      auditLogsList.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                          <td className="py-3 px-2 font-mono text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString("en-IN")}</td>
                          <td className="py-3 px-2 font-bold text-slate-800 dark:text-white">🧑‍💻 {log.username}</td>
                          <td className="py-3 px-2">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                              log.action_performed.startsWith("CREATE") ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200/30"
                            : log.action_performed.startsWith("DELETE") ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200/30"
                            : "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-200/30"
                            }`}>
                              {log.action_performed}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-mono text-[10px]">{log.table_name}</td>
                          <td className="py-3 px-2 font-mono text-[10px]">{log.record_id}</td>
                          <td className="py-3 px-2 max-w-[200px] truncate" title={log.previous_value}>{log.previous_value || "-"}</td>
                          <td className="py-3 px-2 max-w-[200px] truncate" title={log.updated_value}>{log.updated_value || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
