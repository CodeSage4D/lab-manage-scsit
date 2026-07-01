"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, BookOpen, Server, FileCode, Activity, Layers, Calendar,
  ShieldCheck, FileText, Bell, History, Settings, Plus, Edit, Trash2,
  Download, Search, Check, X, FileSpreadsheet, AlertCircle, File, Lock, ChevronDown,
  Camera, Upload, RefreshCw, Printer
} from "lucide-react";
import * as XLSX from "xlsx";
import { importAssetsBulk, getImportLogs } from "../app/actions";

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

export function Code39Barcode({ value }: { value: string }) {
  const CODE39_MAP: Record<string, string> = {
    '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
    '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
    '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
    'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
    'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
    'K': '110101010011', 'L': '101101001001', 'M': '110110101001', 'N': '101011010011',
    'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
    'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
    'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
    '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101',
    '$': '100100100101', '/': '100100101001', '+': '100101001001', '%': '101001001001'
  };

  const clean = (value || "").toUpperCase().replace(/[^A-Z0-9\-\.\ \*\$\/\+\%]/g, "");
  const formatted = `*${clean}*`;
  
  let pattern = "";
  for (let i = 0; i < formatted.length; i++) {
    const char = formatted[i];
    const pat = CODE39_MAP[char] || CODE39_MAP['*'];
    pattern += pat + "0"; // space
  }

  const width = pattern.length * 2;
  const height = 40;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="max-w-[240px] mx-auto">
      {pattern.split("").map((bit, idx) => {
        if (bit === "1") {
          return <rect key={idx} x={idx * 2} y={0} width={2} height={height} fill="black" />;
        }
        return null;
      })}
    </svg>
  );
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

  const isSuperAdmin = activeAdmin?.role === "Director Admin" || activeAdmin?.role === "Super Admin";
  const isWriteAllowed = activeAdmin?.role === "Director Admin" || 
                         activeAdmin?.role === "Super Admin" ||
                         activeAdmin?.role === "IT Admin" ||
                         activeAdmin?.role === "Lab Admin" ||
                         activeAdmin?.role === "IT Person" || 
                         activeAdmin?.role === "Trainer of Practice" || 
                         activeAdmin?.role === "Lab Assistant";

  /* ── ITAM DYNAMIC SCRIPTS & SCANNING STATES ── */
  const [tesseractReady, setTesseractReady] = useState(false);
  const [html5QrcodeReady, setHtml5QrcodeReady] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState("");
  const [activeModalTab, setActiveModalTab] = useState<"basic" | "network" | "peripherals" | "photos">("basic");
  
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSize, setPrintSize] = useState<"small" | "medium" | "large">("medium");
  const [printAsset, setPrintAsset] = useState<any>(null);
  const [batchPrintSelect, setBatchPrintSelect] = useState<string[]>([]); // Array of global_asset_ids
  
  const [webcamScanning, setWebcamScanning] = useState(false);
  const [expandedAssetRow, setExpandedAssetRow] = useState<string | null>(null); // UUID

  // Dynamic script loader for Tesseract and Scanner
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load HTML5 QR Code Scanner from CDN
    if (!window.hasOwnProperty("Html5Qrcode")) {
      const qrcodeScript = document.createElement("script");
      qrcodeScript.src = "https://unpkg.com/html5-qrcode";
      qrcodeScript.async = true;
      qrcodeScript.onload = () => setHtml5QrcodeReady(true);
      document.body.appendChild(qrcodeScript);
    } else {
      setHtml5QrcodeReady(true);
    }

    // Load Tesseract.js from CDN
    if (!window.hasOwnProperty("Tesseract")) {
      const tesseractScript = document.createElement("script");
      tesseractScript.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      tesseractScript.async = true;
      tesseractScript.onload = () => setTesseractReady(true);
      document.body.appendChild(tesseractScript);
    } else {
      setTesseractReady(true);
    }
  }, []);

  // Global Keyboard listener for rapid USB Hardware Barcode Scanners
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      
      // USB scanners usually send keys rapidly (e.g. interval < 50ms)
      if (now - lastKeyTime > 50) {
        buffer = ""; // Clear stale inputs
      }
      
      lastKeyTime = now;

      // Ignore modifiers
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt") {
        return;
      }

      if (e.key === "Enter") {
        if (buffer.length > 3) {
          // Rapid input ending with Enter. This is a barcode scan!
          // We search for this barcode among inventory assets
          const cleanCode = buffer.trim();
          const matched: any = (inventoryItems as any[]).find((item: any) => 
            (item.barcode_data && item.barcode_data.toUpperCase() === cleanCode.toUpperCase()) ||
            (item.lab_asset_id && item.lab_asset_id.toUpperCase() === cleanCode.toUpperCase()) ||
            (item.global_asset_id && item.global_asset_id.toUpperCase() === cleanCode.toUpperCase()) ||
            (item.serial_number && item.serial_number.toUpperCase() === cleanCode.toUpperCase())
          );

          if (matched) {
            showToast(`USB Barcode Scanned: Matched Asset ${matched.global_asset_id} (${matched.brand} ${matched.model_number || ""})`);
            // Set search queries to highlight
            setGlobalSearch(cleanCode);
            // Locate to correct tab
            onNavigateToTab("laboratory_inventory");
          } else {
            showToast(`USB Barcode Scanned: "${cleanCode}" - No matching asset found in directory.`);
          }
          buffer = "";
        }
      } else {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [inventoryItems, onNavigateToTab, showToast]);

  /* ── FILTER STATES FOR PANELS ── */
  const [labFilter, setLabFilter] = useState("All");
  const [softFilter, setSoftFilter] = useState("All");
  const [maintLabFilter, setMaintLabFilter] = useState("All");
  const [maintStatusFilter, setMaintStatusFilter] = useState("All");
  const [invTypeFilter, setInvTypeFilter] = useState("All");
  const [invLabFilter, setInvLabFilter] = useState("All");
  const [docRepoCatFilter, setDocRepoCatFilter] = useState("All");
  const [globalSearch, setGlobalSearch] = useState("");

  // Auto-expand details drawer if search query matches exactly one asset's unique ID
  useEffect(() => {
    if (globalSearch.trim()) {
      const q = globalSearch.trim().toLowerCase();
      const matched = (inventoryItems as any[]).filter(item => 
        (item.lab_asset_id && item.lab_asset_id.toLowerCase() === q) ||
        (item.global_asset_id && item.global_asset_id.toLowerCase() === q) ||
        (item.asset_number && item.asset_number.toLowerCase() === q)
      );
      if (matched.length === 1) {
        setExpandedAssetRow(matched[0].uuid || matched[0].id);
      }
    }
  }, [globalSearch, inventoryItems]);

  /* ── MAINTENANCE BULK ADD STATES ── */
  const [maintSearch, setMaintSearch] = useState("");
  const [maintDateFilter, setMaintDateFilter] = useState("");
  const [maintPeriod, setMaintPeriod] = useState("All");
  const [maintTechFilter, setMaintTechFilter] = useState("All");
  const [maintMakeFilter, setMaintMakeFilter] = useState("All");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [stagingRecords, setStagingRecords] = useState<any[]>([]);
  const [stagingLabId, setStagingLabId] = useState(laboratories[0]?.id?.toString() || "");
  const [newEntry, setNewEntry] = useState({
    pc_number: "", system_make: "", system_model: "", serial_number: "",
    date: new Date().toISOString().split("T")[0],
    time_stamp: new Date().toTimeString().slice(0, 5),
    issue_description: "", reason_for_damage: "",
    action_taken: "", technician_name: "", status: "Pending", completion_date: "", remarks: ""
  });

  /* ── SMART EXCEL IMPORT WIZARD STATES ── */
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importLogs, setImportLogs] = useState<any[]>([]);
  const [loadingImportLogs, setLoadingImportLogs] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [parsedRecords, setParsedRecords] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState("");
  const [importSummary, setImportSummary] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);

  const [importWizardOptions, setImportWizardOptions] = useState({
    importNewOnly: true,
    updateExisting: false,
    skipDuplicates: false,
    generateQr: true,
    generateLabId: true,
    generateGlobalId: true,
    validateOnly: false
  });

  const fetchImportLogs = async () => {
    setLoadingImportLogs(true);
    try {
      const res = await getImportLogs();
      if (res.success && res.data) {
        setImportLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingImportLogs(false);
    }
  };

  useEffect(() => {
    if (showImportWizard) {
      fetchImportLogs();
    }
  }, [showImportWizard]);

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "lab_name": "Computer Center",
        "asset_type": "CPU",
        "brand": "Dell",
        "model_number": "OptiPlex 7090",
        "serial_number": "ABC123456",
        "service_tag": "ST12345",
        "mac_address": "AA:BB:CC:DD:EE:FF",
        "ipv4": "192.168.1.10",
        "computer_name": "LAB-A-PC01",
        "hostname": "lms-pc01.suas",
        "processor": "Intel Core i7",
        "ram": "16 GB",
        "storage": "512 GB SSD",
        "storage_type": "SSD",
        "operating_system": "Windows 11 Pro",
        "purchase_date": "2026-01-15",
        "warranty_end": "2029-01-15",
        "status": "Working",
        "lab_asset_id": "",
        "global_asset_id": ""
      }
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, "Assets Template");
    XLSX.writeFile(wb, "SCSIT_Assets_Import_Template.xlsx");
    showToast("Excel Template downloaded successfully.");
  };

  const handleDownloadFailedRecords = () => {
    if (!importSummary || !importSummary.errors || importSummary.errors.length === 0) return;
    const failedData = importSummary.errors.map((err: any) => {
      const originalRow = parsedRecords[err.row - 2] || {};
      return {
        ...originalRow,
        "Import Error Reason": err.error
      };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(failedData);
    XLSX.utils.book_append_sheet(wb, ws, "Correction Sheet");
    XLSX.writeFile(wb, "Failed_Import_Records_Correct_Me.xlsx");
    showToast("Correction worksheet downloaded.");
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;
      try {
        const workbook = XLSX.read(data, { type: "array", cellDates: true, raw: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        if (json.length === 0) {
          showToast("Excel spreadsheet is empty.");
          return;
        }

        const headers = Object.keys(json[0]);
        setExcelHeaders(headers);
        setParsedRecords(json);
        
        // Auto-mapping columns logic
        const initialMappings: Record<string, string> = {};
        headers.forEach(h => {
          const norm = h.toLowerCase().trim().replace(/[\s_\-]/g, "");
          if (norm === "lab" || norm === "laboratory" || norm === "labname" || norm === "location") {
            initialMappings[h] = "lab_name";
          } else if (norm === "pcnumber" || norm === "systemnumber" || norm === "computerno" || norm === "labassetid" || norm === "labassetnumber") {
            initialMappings[h] = "lab_asset_id";
          } else if (norm === "globalassetid" || norm === "globalid" || norm === "assetid") {
            initialMappings[h] = "global_asset_id";
          } else if (norm === "device" || norm === "devicetype" || norm === "assettype") {
            initialMappings[h] = "asset_type";
          } else if (norm === "brand" || norm === "cpubrand") {
            initialMappings[h] = "brand";
          } else if (norm === "model" || norm === "modelnumber" || norm === "systemmodel") {
            initialMappings[h] = "model_number";
          } else if (norm === "serial" || norm === "serialnumber" || norm === "cpuserial" || norm === "sn") {
            initialMappings[h] = "serial_number";
          } else if (norm === "servicetag" || norm === "st" || norm === "tag") {
            initialMappings[h] = "service_tag";
          } else if (norm === "ip" || norm === "ipv4" || norm === "ipaddress" || norm === "ipv4address") {
            initialMappings[h] = "ipv4";
          } else if (norm === "mac" || norm === "macaddress" || norm === "lanmac") {
            initialMappings[h] = "mac_address";
          } else if (norm === "computername") {
            initialMappings[h] = "computer_name";
          } else if (norm === "hostname") {
            initialMappings[h] = "hostname";
          } else if (norm === "cpu" || norm === "processor") {
            initialMappings[h] = "processor";
          } else if (norm === "ram" || norm === "memory") {
            initialMappings[h] = "ram";
          } else if (norm === "storage" || norm === "disk" || norm === "hdd" || norm === "ssd") {
            initialMappings[h] = "storage";
          } else if (norm === "storagetype" || norm === "disktype") {
            initialMappings[h] = "storage_type";
          } else if (norm === "os" || norm === "operatingsystem") {
            initialMappings[h] = "operating_system";
          } else if (norm === "purchasedate" || norm === "purchase") {
            initialMappings[h] = "purchase_date";
          } else if (norm === "warranty" || norm === "warrantyend" || norm === "warrantyexpiry") {
            initialMappings[h] = "warranty_end";
          } else if (norm === "status" || norm === "assetstatus" || norm === "condition") {
            initialMappings[h] = "status";
          } else {
            initialMappings[h] = "";
          }
        });
        setColumnMappings(initialMappings);
        setWizardStep(2);
        showToast(`Parsed ${json.length} rows successfully.`);
      } catch (err) {
        console.error(err);
        showToast("Error parsing Excel file. Check format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => {
    setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const getMappedRecords = () => {
    return parsedRecords.map((row, idx) => {
      const mappedRow: any = { __rowNum__: idx + 2 };
      Object.entries(columnMappings).forEach(([excelHeader, systemField]) => {
        if (systemField) {
          mappedRow[systemField] = row[excelHeader];
        }
      });
      return mappedRow;
    });
  };

  const executeBulkImport = async () => {
    setIsImporting(true);
    setImportProgress(10);
    setEstimatedTime("Calculating...");
    
    const progressTimer = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressTimer);
          return 90;
        }
        const nextProg = prev + Math.floor(Math.random() * 8) + 3;
        const totalRows = parsedRecords.length;
        const remRows = Math.max(0, Math.ceil(totalRows * (1 - nextProg / 100)));
        const estSec = Math.max(1, Math.ceil(remRows * 0.005));
        setEstimatedTime(`${estSec}s remaining`);
        return nextProg;
      });
    }, 150);

    try {
      const mapped = getMappedRecords();
      const res = await importAssetsBulk(mapped, importWizardOptions, fileName, activeAdmin?.name || "Admin");
      clearInterval(progressTimer);
      setImportProgress(100);
      setEstimatedTime("0s");
      setIsImporting(false);
      setImportSummary(res.summary || {
        total: mapped.length,
        imported: res.success ? mapped.length : 0,
        updated: 0,
        skipped: 0,
        failed: res.success ? 0 : mapped.length,
        errors: res.success ? [] : [{ row: "All", error: res.error || "Transaction error" }]
      });
      if (res.success) {
        showToast(res.message || "Import completed successfully!");
      } else {
        showToast(res.error || "Import failed. Transaction rolled back.");
      }
      setWizardStep(4);
      fetchData();
      fetchImportLogs();
    } catch (err: any) {
      clearInterval(progressTimer);
      setIsImporting(false);
      setImportProgress(0);
      setEstimatedTime("");
      showToast(err.message || "Critical connection error.");
    }
  };

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

  const resetInvForm = () => {
    setInvForm({
      lab_id: laboratories[0]?.id?.toString() || "",
      device_type: "CPU",
      brand: "",
      manufacturer: "",
      model_number: "",
      serial_number: "",
      service_tag: "",
      express_service_code: "",
      mtm: "",
      product_number: "",
      manufacture_date: "",
      purchase_date: new Date().toISOString().split("T")[0],
      invoice_number: "",
      warranty_start: "",
      warranty_end: "",
      vendor: "",
      status: "Installed",
      parent_cpu_id: "",
      computer_name: "",
      hostname: "",
      ipv4: "",
      ipv6: "",
      mac_address: "",
      wifi_mac: "",
      lan_mac: "",
      gateway: "",
      dns: "",
      ip_type: "DHCP",
      domain: "",
      workgroup: "",
      processor: "",
      ram: "",
      storage: "",
      storage_type: "SSD",
      gpu: "",
      motherboard: "",
      bios_version: "",
      operating_system: "Windows 11",
      office_version: "",
      screen_size: "",
      resolution: "",
      barcode_data: "",
      attachments: []
    });
  };

  const populateInvForm = (item: any) => {
    setInvForm({
      id: item.uuid || item.id,
      lab_id: item.lab_id?.toString() || "",
      device_type: item.device_type || item.asset_type || "CPU",
      brand: item.brand || "",
      manufacturer: item.manufacturer || "",
      model_number: item.model_number || "",
      serial_number: item.serial_number || "",
      service_tag: item.service_tag || "",
      express_service_code: item.express_service_code || "",
      mtm: item.mtm || "",
      product_number: item.product_number || "",
      manufacture_date: item.manufacture_date ? new Date(item.manufacture_date).toISOString().split('T')[0] : "",
      purchase_date: item.purchase_date ? new Date(item.purchase_date).toISOString().split('T')[0] : "",
      invoice_number: item.invoice_number || "",
      warranty_start: item.warranty_start ? new Date(item.warranty_start).toISOString().split('T')[0] : "",
      warranty_end: item.warranty_end ? new Date(item.warranty_end).toISOString().split('T')[0] : "",
      vendor: item.vendor || item.vendor_details || "",
      status: item.status || "Installed",
      parent_cpu_id: item.parent_cpu_id || "",
      computer_name: item.computer_name || "",
      hostname: item.hostname || "",
      ipv4: item.ipv4 || "",
      ipv6: item.ipv6 || "",
      mac_address: item.mac_address || "",
      wifi_mac: item.wifi_mac || "",
      lan_mac: item.lan_mac || "",
      gateway: item.gateway || "",
      dns: item.dns || "",
      ip_type: item.ip_type || "DHCP",
      domain: item.domain || "",
      workgroup: item.workgroup || "",
      processor: item.cpu || item.processor || "",
      ram: item.ram || "",
      storage: item.storage || "",
      storage_type: item.storage_type || "SSD",
      gpu: item.gpu || "",
      motherboard: item.motherboard || "",
      bios_version: item.bios_version || "",
      operating_system: item.operating_system || "Windows 11",
      office_version: item.office_version || "",
      screen_size: item.monitor || item.screen_size || "",
      resolution: item.resolution || "",
      barcode_data: item.barcode_data || "",
      attachments: item.attachments || [],
      version: item.version
    });
  };

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
        /* Use top-level component hooks directly to adhere to the Rules of Hooks */


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
                          { label: "PC Number", key: "pc_number", placeholder: "e.g. LBA-021" },
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
                        <input type="text" placeholder="e.g. LBA-021" value={maintForm.pc_number || ""} onChange={e => setMaintForm({ ...maintForm, pc_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none text-slate-800 dark:text-white" />
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

      {activeTab === "laboratory_inventory" && modulesStatus.laboratory_inventory && (() => {
        const assetsList = inventoryItems as any[];
        // Computed stats for ITAM Dashboard
        const totalAssets = assetsList.length;
        const workingAssets = assetsList.filter(i => i.status === "Working" || i.status === "Active" || i.status === "Installed").length;
        const faultyAssets = assetsList.filter(i => i.status === "Faulty" || i.status === "Damaged").length;
        const repairAssets = assetsList.filter(i => i.status === "Under Repair" || i.status === "Maintenance").length;
        const spareAssets = assetsList.filter(i => i.status === "Spare").length;

        // Warranty alerts (upcoming)
        let expiry30 = 0, expiry15 = 0, expiry7 = 0, expired = 0;
        const now = Date.now();
        assetsList.forEach(i => {
          const expDate = i.warranty_end || i.warranty_details;
          if (expDate) {
            const expTime = new Date(expDate).getTime();
            if (!isNaN(expTime)) {
              const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
              if (diffDays < 0) expired++;
              else if (diffDays <= 7) expiry7++;
              else if (diffDays <= 15) expiry15++;
              else if (diffDays <= 30) expiry30++;
            }
          }
        });

        // Network Status
        const networkOnline = assetsList.filter(i => i.network_status === "Online").length;
        const networkOffline = assetsList.filter(i => i.network_status === "Offline").length;

        // Local Duplicate warnings checker
        const localWarnings = (() => {
          const warnings: string[] = [];
          if (!showInventoryModal) return warnings;
          
          const cleanSerial = (invForm.serial_number || "").trim().toLowerCase();
          const cleanTag = (invForm.service_tag || "").trim().toLowerCase();
          const cleanIp = (invForm.ipv4 || "").trim().toLowerCase();
          const cleanMac = (invForm.mac_address || "").trim().toLowerCase();
          const cleanHostname = (invForm.hostname || "").trim().toLowerCase();
          const cleanBarcode = (invForm.barcode_data || "").trim().toLowerCase();

          const editingId = invForm.id || invForm.uuid;

          assetsList.forEach((item: any) => {
            const itemId = item.uuid || item.id;
            if (editingId && itemId === editingId) return;

            if (cleanSerial && (item.serial_number || "").toLowerCase() === cleanSerial) {
              warnings.push(`Duplicate Serial: "${item.serial_number}" already belongs to asset ${item.global_asset_id}`);
            }
            if (cleanTag && (item.service_tag || "").toLowerCase() === cleanTag) {
              warnings.push(`Duplicate Service Tag: "${item.service_tag}" already belongs to asset ${item.global_asset_id}`);
            }
            if (cleanIp && cleanIp !== "127.0.0.1" && cleanIp !== "0.0.0.0" && (item.ipv4 || "").toLowerCase() === cleanIp) {
              warnings.push(`Duplicate IP Address: "${item.ipv4}" already belongs to asset ${item.global_asset_id}`);
            }
            if (cleanMac && (item.mac_address || "").toLowerCase() === cleanMac) {
              warnings.push(`Duplicate MAC Address: "${item.mac_address}" already belongs to asset ${item.global_asset_id}`);
            }
            if (cleanHostname && (item.hostname || "").toLowerCase() === cleanHostname) {
              warnings.push(`Duplicate Hostname: "${item.hostname}" already belongs to asset ${item.global_asset_id}`);
            }
            if (cleanBarcode && (item.barcode_data || "").toLowerCase() === cleanBarcode) {
              warnings.push(`Duplicate Barcode: "${item.barcode_data}" already belongs to asset ${item.global_asset_id}`);
            }
          });
          return warnings;
        })();

        // Filter assets list
        const filteredAssets = assetsList.filter(item => {
          if (invLabFilter !== "All" && item.lab_name !== invLabFilter) return false;
          if (invTypeFilter !== "All" && item.device_type !== invTypeFilter) return false;
          if (globalSearch.trim()) {
            const q = globalSearch.toLowerCase();
            return (
              (item.global_asset_id || "").toLowerCase().includes(q) ||
              (item.lab_asset_id || item.asset_number || "").toLowerCase().includes(q) ||
              (item.serial_number || "").toLowerCase().includes(q) ||
              (item.service_tag || "").toLowerCase().includes(q) ||
              (item.ipv4 || "").toLowerCase().includes(q) ||
              (item.mac_address || "").toLowerCase().includes(q) ||
              (item.brand || "").toLowerCase().includes(q) ||
              (item.model_number || "").toLowerCase().includes(q) ||
              (item.hostname || "").toLowerCase().includes(q) ||
              (item.computer_name || "").toLowerCase().includes(q)
            );
          }
          return true;
        });

        // Start HTML5 camera QR scanner
        const startScanner = () => {
          setWebcamScanning(true);
          setTimeout(() => {
            // @ts-ignore
            if (window.Html5QrcodeScanner) {
              // @ts-ignore
              const scanner = new window.Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
              scanner.render((decodedText: string) => {
                scanner.clear();
                setWebcamScanning(false);
                showToast(`QR Code Scanned: "${decodedText}"`);
                try {
                  const parsed = JSON.parse(decodedText);
                  setGlobalSearch(parsed.AssetID || parsed.AssetID || decodedText);
                } catch (e) {
                  setGlobalSearch(decodedText);
                }
              }, (err: any) => {});
            }
          }, 400);
        };

        // Client-side OCR file handler
        const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setOcrLoading(true);
          setOcrResult("");
          try {
            // @ts-ignore
            if (window.Tesseract) {
              // @ts-ignore
              const { data: { text, confidence } } = await window.Tesseract.recognize(file, 'eng');
              
              // Regex selectors
              let brand = "";
              const brands = ["Dell", "HP", "Lenovo", "Acer", "Asus", "MSI", "Samsung", "LG"];
              for (const b of brands) {
                if (new RegExp(b, "i").test(text)) {
                  brand = b;
                  break;
                }
              }
              const serialMatch = text.match(/S\/N\s*[:\s]+([A-Z0-9]+)/i) || text.match(/Serial\s*[:\s]+([A-Z0-9]+)/i) || text.match(/Serial\s*No[:\s]+([A-Z0-9]+)/i);
              const tagMatch = text.match(/Service\s*Tag\s*[:\s]+([A-Z0-9]+)/i) || text.match(/S\/T\s*[:\s]+([A-Z0-9]+)/i);
              const modelMatch = text.match(/Model\s*[:\s]+([A-Z0-9\-]+)/i) || text.match(/Model\s*No[:\s]+([A-Z0-9\-]+)/i);

              const serial = serialMatch ? serialMatch[1].trim() : "";
              const tag = tagMatch ? tagMatch[1].trim() : "";
              const model = modelMatch ? modelMatch[1].trim() : "";

              setInvForm((prev: any) => ({
                ...prev,
                brand: brand || prev.brand,
                serial_number: serial || prev.serial_number,
                service_tag: tag || prev.service_tag,
                model_number: model || prev.model_number
              }));
              setOcrResult(`Parsed Sticker! Brand: ${brand || "Not parsed"}, Serial: ${serial || "Not parsed"}, Tag: ${tag || "Not parsed"}. Confidence: ${confidence}%`);
            } else {
              setOcrResult("OCR dynamic module loading. Please try again in a few seconds.");
            }
          } catch (err: any) {
            console.error(err);
            setOcrResult("OCR error. Please manually enter specs.");
          } finally {
            setOcrLoading(false);
          }
        };

        // Open print label popup
        const triggerPrintLabel = (asset: any) => {
          setPrintAsset(asset);
          setShowPrintModal(true);
        };

        return (
          <div className="space-y-6 animate-float-up text-left">
            {/* ITAM Metrics Board */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 border border-slate-200/50 dark:border-zinc-800/50 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Active Assets</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalAssets}</span>
                <div className="flex gap-2 mt-2 text-[9px] font-semibold text-slate-400">
                  <span>Working: {workingAssets}</span>
                  <span>Spares: {spareAssets}</span>
                </div>
              </div>
              
              <div className="glass-card p-4 border border-slate-200/50 dark:border-zinc-800/50 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Faulty & Repair Status</span>
                <span className="text-2xl font-black text-rose-600 dark:text-rose-500 mt-1">{faultyAssets + repairAssets}</span>
                <div className="flex gap-2 mt-2 text-[9px] font-semibold text-slate-400">
                  <span>Damaged: {faultyAssets}</span>
                  <span>In Repair: {repairAssets}</span>
                </div>
              </div>

              <div className="glass-card p-4 border border-slate-200/50 dark:border-zinc-800/50 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Network Connectivity</span>
                <span className="text-2xl font-black text-emerald-500 mt-1">{networkOnline} <span className="text-xs text-slate-400 font-bold">Online</span></span>
                <div className="flex gap-2 mt-2 text-[9px] font-semibold text-slate-400">
                  <span>Offline: {networkOffline}</span>
                </div>
              </div>

              <div className="glass-card p-4 border border-slate-200/50 dark:border-zinc-800/50 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Warranty Alerts</span>
                <span className="text-2xl font-black text-amber-500 mt-1">{expired} <span className="text-xs text-slate-400 font-bold">Expired</span></span>
                <div className="flex gap-2 mt-2 text-[9px] font-semibold text-amber-500">
                  <span>7D Expiry: {expiry7}</span>
                  <span>30D Expiry: {expiry30}</span>
                </div>
              </div>
            </div>

            {/* Lab Slots Occupancy Dashboard */}
            <div className="glass-card p-4 border border-slate-200/50 dark:border-zinc-800/50">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">Laboratories Slots & Capacity Utilization</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(laboratories as any[]).map(lab => {
                  const occupied = assetsList.filter(i => i.lab_id === lab.id).length;
                  const capacity = lab.max_capacity || 60;
                  const available = Math.max(0, capacity - occupied);
                  return (
                    <div key={lab.id} className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800">
                      <div className="flex justify-between text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                        <span>🏢 {lab.name} ({lab.code})</span>
                        <span>{occupied} / {capacity}</span>
                      </div>
                      <div className="progress-bar-track mt-1.5 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(100, (occupied / capacity) * 100)}%` }} 
                          className={`h-full rounded-full transition-all ${occupied >= capacity ? "bg-rose-500" : available <= 5 ? "bg-amber-500" : "bg-emerald-500"}`}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-semibold items-center">
                        <span>Available: {available} slots</span>
                        <span className="flex items-center gap-1 font-black">
                          <span className={`w-1.5 h-1.5 rounded-full ${occupied >= capacity ? "bg-red-500 animate-pulse" : available <= 5 ? "bg-amber-500" : "bg-emerald-500"}`} />
                          <span className={occupied >= capacity ? "text-red-500" : available <= 5 ? "text-amber-500" : "text-emerald-500"}>
                            {occupied >= capacity ? "Full" : available <= 5 ? "Nearly Full" : "Available"}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Toolbar Filters & Action Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Search field */}
                <div className="relative w-full md:w-48">
                  <input
                    type="text"
                    placeholder="Search serial, IP, IDs..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl outline-none bg-white dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300"
                  />
                  <Search size={13} className="absolute left-2.5 top-[10px] text-slate-400" />
                  {globalSearch && (
                    <button onClick={() => setGlobalSearch("")} className="absolute right-2.5 top-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-white">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="relative md:w-36">
                  <select
                    value={invLabFilter}
                    onChange={(e) => setInvLabFilter(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl outline-none appearance-none bg-white dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 text-slate-750 dark:text-slate-350 pr-8"
                  >
                    <option value="All">All Labs</option>
                    {LAB_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-[10px] text-slate-400 pointer-events-none" />
                </div>
                <div className="relative md:w-36">
                  <select
                    value={invTypeFilter}
                    onChange={(e) => setInvTypeFilter(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl outline-none appearance-none bg-white dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 text-slate-750 dark:text-slate-350 pr-8"
                  >
                    <option value="All">All Types</option>
                    <option value="CPU">CPU Workstation</option>
                    <option value="Monitor">Monitor screen</option>
                    <option value="Laptop">Laptop PC</option>
                    <option value="Printer">Printer unit</option>
                    <option value="Projector">Projector</option>
                    <option value="UPS">UPS Battery</option>
                    <option value="Keyboard">Keyboard</option>
                    <option value="Mouse">Mouse</option>
                    <option value="Webcam">Webcam</option>
                    <option value="Speakers">Speakers</option>
                    <option value="Network Device">Network Switch</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-[10px] text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Advanced triggers */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={startScanner}
                  className="px-3.5 py-1.8 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera size={14} /> Scan Label
                </button>
                {isWriteAllowed && (
                  <>
                    <button
                      onClick={() => {
                        setShowImportWizard(true);
                        setWizardStep(1);
                        setFileName("");
                        setParsedRecords([]);
                        setImportSummary(null);
                        setImportProgress(0);
                        setEstimatedTime("");
                      }}
                      className="px-3.5 py-1.8 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet size={14} /> Import Wizard
                    </button>
                    <button
                      onClick={() => {
                        resetInvForm();
                        setEditingInventory(null);
                        setShowInventoryModal(true);
                        setActiveModalTab("basic");
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} /> Add Asset
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Webcam scanning view drawer */}
            {webcamScanning && (
              <div className="p-4 bg-slate-100 dark:bg-zinc-900 rounded-2xl flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-3">
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Camera Scan Portal</span>
                  <button onClick={() => setWebcamScanning(false)} className="p-1 rounded-lg bg-rose-50 text-suas-ruby hover:bg-rose-100 cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
                <div id="reader" className="w-full max-w-[300px] overflow-hidden rounded-xl border border-slate-300 dark:border-zinc-800"></div>
                <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-wider text-center">Place barcode or QR in window box to scan</p>
              </div>
            )}

            {/* Assets Inventory List Table */}
            <div className="glass-card p-5 border border-slate-200/50 dark:border-zinc-800/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-zinc-850 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="sticky left-0 bg-slate-50 dark:bg-zinc-900/60 z-20 min-w-[130px] py-3 px-2 border-b border-slate-200 dark:border-zinc-850">Global Asset ID</th>
                      <th className="sticky left-[130px] bg-slate-50 dark:bg-zinc-900/60 z-20 min-w-[110px] py-3 px-2 border-b border-slate-200 dark:border-zinc-850">Lab Asset ID</th>
                      <th className="py-3 px-2 min-w-[140px]">Lab / Purpose</th>
                      <th className="py-3 px-2 min-w-[110px]">Device Type</th>
                      <th className="py-3 px-2 min-w-[150px]">Brand &amp; Model</th>
                      <th className="py-3 px-2 min-w-[160px]">Serial / Service Tag</th>
                      <th className="py-3 px-2 min-w-[110px]">Network Status</th>
                      <th className="sticky right-[120px] bg-slate-50 dark:bg-zinc-900/60 z-20 min-w-[100px] py-3 px-2 border-b border-slate-200 dark:border-zinc-850">Status</th>
                      <th className="sticky right-0 bg-slate-50 dark:bg-zinc-900/60 z-20 min-w-[120px] py-3 px-2 border-b border-slate-200 dark:border-zinc-850 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 font-semibold text-slate-700 dark:text-slate-300">
                    {filteredAssets.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500 italic">No inventory assets matched your search parameters.</td>
                      </tr>
                    ) : (
                      filteredAssets.map((item: any) => {
                        const isExpanded = expandedAssetRow === item.uuid;
                        return (
                          <React.Fragment key={item.uuid || item.id}>
                            <tr className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 group transition">
                              <td className="sticky left-0 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900/50 z-10 transition-all py-3 px-2 font-mono font-black text-slate-900 dark:text-white">{item.global_asset_id || "N/A"}</td>
                              <td className="sticky left-[130px] bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900/50 z-10 transition-all py-3 px-2 font-mono font-black text-suas-ruby dark:text-suas-ruby-neon">{item.lab_asset_id || item.asset_number}</td>
                              <td className="py-3 px-2">🏢 {item.lab_name}</td>
                              <td className="py-3 px-2">{item.device_type}</td>
                              <td className="py-3 px-2">{item.brand} {item.model_number}</td>
                              <td className="py-3 px-2 font-mono text-[10px]">{item.serial_number || item.service_tag ? `${item.serial_number || "-"}/${item.service_tag || "-"}` : "-"}</td>
                              <td className="py-3 px-2">
                                <span className={`inline-flex items-center gap-1 text-[9px] ${item.network_status === "Online" ? "text-emerald-500" : "text-slate-400"}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${item.network_status === "Online" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                                  {item.network_status || "Offline"}
                                </span>
                              </td>
                              <td className="sticky right-[120px] bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900/50 z-10 transition-all py-3 px-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                  item.status === "Working" || item.status === "Active" || item.status === "Installed" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600"
                                : item.status === "Spare" ? "bg-slate-50 dark:bg-zinc-900 text-slate-500"
                                : item.status === "Under Repair" || item.status === "Maintenance" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600"
                                : "bg-rose-50 dark:bg-rose-950/20 text-suas-ruby"
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="sticky right-0 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900/50 z-10 transition-all py-3 px-2 text-right space-x-1.5">
                                <button
                                  onClick={() => setExpandedAssetRow(isExpanded ? null : item.uuid)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-350 text-[10px] rounded-lg cursor-pointer"
                                >
                                  Details
                                </button>
                                {isWriteAllowed && (
                                  <>
                                    <button
                                      onClick={() => {
                                        populateInvForm(item);
                                        setEditingInventory(item);
                                        setShowInventoryModal(true);
                                        setActiveModalTab("basic");
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-805 dark:hover:text-white cursor-pointer inline-block align-middle"
                                      title="Edit specifications"
                                    >
                                      <Edit size={13} />
                                    </button>
                                    <button
                                      onClick={() => triggerPrintLabel(item)}
                                      className="p-1 text-slate-400 hover:text-slate-805 dark:hover:text-white cursor-pointer inline-block align-middle"
                                      title="Print Label"
                                    >
                                      <Printer size={13} />
                                    </button>
                                    <button
                                      onClick={() => item.uuid && onDeleteInventory(item.id || item.uuid)}
                                      className="p-1 text-rose-600 hover:text-rose-850 cursor-pointer inline-block align-middle"
                                      title="Delete"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                            
                            {/* Expanded Details Drawer */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={9} className="bg-slate-50/50 dark:bg-zinc-900/20 p-4 border-t border-b border-slate-100 dark:border-zinc-800">
                                  <div className="mb-3 pb-2 border-b border-slate-200 dark:border-zinc-800/60">
                                    <h4 className="text-xs font-black text-suas-ruby dark:text-suas-ruby-neon uppercase tracking-wider">{item.display_name || `${item.lab_name} - ${item.asset_number}`}</h4>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Column 1: Hardware & Network details */}
                                    <div className="space-y-2">
                                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Device Specifications &amp; Config</h5>
                                      <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                                        <div><span className="font-bold">Model Number:</span> {item.model_number || "-"}</div>
                                        <div><span className="font-bold">Processor Specs:</span> {item.processor || "-"}</div>
                                        <div><span className="font-bold">RAM Memory:</span> {item.ram || "-"}</div>
                                        <div><span className="font-bold">HDD/SSD Storage:</span> {item.storage || "-"} ({item.storage_type || "-"})</div>
                                        <div><span className="font-bold">OS Version:</span> {item.operating_system || "-"}</div>
                                        <div><span className="font-bold">IPv4 Address:</span> {item.ipv4 || "DHCP Auto"} ({item.ip_type || "DHCP"})</div>
                                        <div><span className="font-bold">MAC Address:</span> {item.mac_address || "-"}</div>
                                        <div><span className="font-bold">Computer Hostname:</span> {item.hostname || "-"}</div>
                                        {item.parent_cpu_lab_asset_id && (
                                          <div><span className="font-bold text-rose-500">Chained to CPU:</span> {item.parent_cpu_lab_asset_id}</div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Column 2: Attachments / Photos */}
                                    <div className="space-y-2">
                                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-display">Asset Sticker Stickers &amp; Position</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {item.attachments && item.attachments.length > 0 ? (
                                          item.attachments.map((att: any, idx: number) => (
                                            <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800">
                                              <img src={att.image_url} alt={att.image_type} className="w-full h-full object-cover" />
                                              <span className="absolute bottom-0 inset-x-0 text-[8px] bg-slate-900/70 text-white font-extrabold p-0.5 text-center uppercase truncate">{att.image_type}</span>
                                            </div>
                                          ))
                                        ) : (
                                          <span className="text-[11px] text-slate-400 italic">No attachments uploaded yet.</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Column 3: Lifecycle Timeline Events */}
                                    <div className="space-y-2">
                                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Asset Lifecycle Timeline (Append-only)</h5>
                                      <div className="relative pl-3 border-l border-slate-200 dark:border-zinc-800 space-y-3 max-h-[140px] overflow-y-auto">
                                        {item.lifecycle && item.lifecycle.length > 0 ? (
                                          item.lifecycle.map((ev: any, idx: number) => (
                                            <div key={idx} className="relative text-[10px]">
                                              <span className="absolute -left-[16px] top-[2px] w-2.5 h-2.5 rounded-full bg-suas-ruby border-2 border-white dark:border-zinc-950" />
                                              <div className="font-extrabold text-slate-800 dark:text-white uppercase text-[8px]">{ev.event_type}</div>
                                              <div className="text-slate-500 dark:text-slate-400">{ev.details}</div>
                                              <div className="text-[8px] text-slate-400 font-bold">{new Date(ev.created_at).toLocaleString()} by {ev.created_by}</div>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="text-[11px] text-slate-400 italic">No timeline logs found.</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* STICKER PRINT MODAL */}
            {showPrintModal && printAsset && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm print:p-0 print:bg-white print:dark:bg-white">
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 max-w-sm w-full rounded-2xl shadow-2xl p-6 print:border-0 print:shadow-none print:w-auto print:max-w-none print:p-0 print:rounded-none">
                  {/* size selection for screen only */}
                  <div className="print:hidden">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-zinc-850">
                      <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-display">Print Asset Label</h4>
                      <button onClick={() => setShowPrintModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    </div>

                    <div className="flex gap-2 bg-slate-100 dark:bg-zinc-900 p-1 rounded-lg mb-4">
                      {["small", "medium", "large"].map(sz => (
                        <button
                          key={sz}
                          onClick={() => setPrintSize(sz as any)}
                          className={`flex-1 py-1 text-[9px] uppercase tracking-wider font-black rounded ${printSize === sz ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow" : "text-slate-400"}`}
                        >
                          {sz === "small" ? "30x20 mm" : sz === "medium" ? "50x30 mm" : "100x50 mm"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Print Sticker Frame */}
                  <div 
                    id="sticker-label"
                    className={`mx-auto bg-white border border-slate-350 p-3 text-slate-900 text-left flex flex-col justify-between ${
                      printSize === "small" ? "w-[240px] h-[160px] text-[8px]" 
                    : printSize === "medium" ? "w-[360px] h-[220px] text-[10px]" 
                    : "w-[500px] h-[300px] text-xs p-6"
                    }`}
                  >
                    <div className="flex justify-between items-start pb-1.5 border-b border-slate-300">
                      <div>
                        <div className="font-extrabold text-[10px] uppercase tracking-wider text-rose-700">SCSIT</div>
                        <div className="text-[8px] font-bold text-slate-500 uppercase">{printAsset.lab_name}</div>
                      </div>
                      <div className="text-right text-[8px] text-slate-400">Printed: {new Date().toLocaleDateString()}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 my-2 items-center">
                      <div className="col-span-2 space-y-1">
                        <div><span className="font-extrabold block text-[8px] uppercase text-slate-400">Lab Asset ID</span> <span className="font-black text-rose-600 text-xs font-mono">{printAsset.lab_asset_id || printAsset.asset_number}</span></div>
                        <div><span className="font-extrabold block text-[8px] uppercase text-slate-400">Asset ID</span> <span className="font-bold text-slate-800 font-mono">{printAsset.global_asset_id}</span></div>
                        <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                          <div><span className="font-extrabold block text-[8px] uppercase text-slate-400">Device</span> {printAsset.device_type}</div>
                          <div><span className="font-extrabold block text-[8px] uppercase text-slate-400">Brand</span> {printAsset.brand}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                          <div><span className="font-extrabold block text-[8px] uppercase text-slate-400">Model</span> {printAsset.model_number}</div>
                          <div><span className="font-extrabold block text-[8px] uppercase text-slate-400">Serial</span> {printAsset.serial_number || "N/A"}</div>
                        </div>
                      </div>
                      
                      {/* QR code */}
                      <div className="w-full flex items-center justify-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                            JSON.stringify({
                              AssetID: printAsset.global_asset_id,
                              LabAssetID: printAsset.lab_asset_id || printAsset.asset_number,
                              Lab: printAsset.lab_name,
                              AssetType: printAsset.device_type,
                              Brand: printAsset.brand,
                              Model: printAsset.model_number,
                              Serial: printAsset.serial_number,
                              Status: printAsset.status
                            })
                          )}`} 
                          alt="Sticker QR" 
                          className="w-20 h-20 object-contain border border-slate-100 p-0.5 rounded"
                        />
                      </div>
                    </div>

                    {/* Code39 Barcode rendering */}
                    <div className="mt-1 border-t border-slate-200 pt-2 text-center">
                      <Code39Barcode value={printAsset.lab_asset_id || printAsset.asset_number} />
                      <div className="text-[8px] font-mono tracking-widest uppercase mt-0.5 text-center">{printAsset.lab_asset_id || printAsset.asset_number}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="w-full mt-4 py-2 bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl print:hidden hover:bg-rose-600 transition cursor-pointer"
                  >
                    Print Sticker Label
                  </button>
                </div>
              </div>
            )}

            {/* SMART EXCEL IMPORT WIZARD MODAL */}
            {showImportWizard && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800/50 max-w-4xl w-full rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto relative text-left"
                >
                  <button
                    onClick={() => { if (!isImporting) setShowImportWizard(false); }}
                    disabled={isImporting}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <X size={18} />
                  </button>

                  <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 mb-5">
                    <h4 className="text-base font-black text-slate-800 dark:text-white font-display uppercase tracking-wider flex items-center gap-2">
                      <FileSpreadsheet className="text-emerald-500" size={18} /> Smart Excel Import Wizard
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Bulk migrate and synchronize computer assets from spreadsheets securely.</p>
                  </div>

                  {/* STEPPER PROGRESS INDICATOR */}
                  <div className="grid grid-cols-4 gap-2 mb-6 text-center text-[9px] font-black uppercase tracking-wider text-slate-400">
                    {[
                      { step: 1, label: "1. Upload File" },
                      { step: 2, label: "2. Column Mapping" },
                      { step: 3, label: "3. Preview & Run" },
                      { step: 4, label: "4. Final Summary" }
                    ].map(s => (
                      <div
                        key={s.step}
                        className={`py-1.5 rounded-lg border transition ${
                          wizardStep === s.step 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/40" 
                            : wizardStep > s.step 
                              ? "bg-slate-50 border-slate-250 text-slate-600 dark:bg-zinc-900 dark:border-zinc-800" 
                              : "border-slate-100 dark:border-zinc-900 text-slate-350"
                        }`}
                      >
                        {s.label}
                      </div>
                    ))}
                  </div>

                  {/* PROGRESS BAR OVERLAY */}
                  {isImporting && (
                    <div className="mb-6 p-5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-700 dark:text-slate-350 flex items-center gap-2">
                          <RefreshCw size={14} className="animate-spin text-emerald-500" />
                          Processing database transaction batch...
                        </span>
                        <span className="font-black text-emerald-600 font-mono">{importProgress}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-zinc-850 rounded-full overflow-hidden">
                        <div style={{ width: `${importProgress}%` }} className="h-full bg-emerald-500 rounded-full transition-all duration-150" />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Do not close this window or refresh the browser.</span>
                        <span className="font-bold">{estimatedTime}</span>
                      </div>
                    </div>
                  )}

                  {/* STEP 1: UPLOAD SCREEN */}
                  {wizardStep === 1 && (
                    <div className="space-y-6">
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition ${
                          dragOver 
                            ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10" 
                            : "border-slate-200 dark:border-zinc-800 hover:border-slate-350 bg-slate-50/50 dark:bg-zinc-900/20"
                        }`}
                        onClick={() => document.getElementById("excel-wizard-file")?.click()}
                      >
                        <input
                          id="excel-wizard-file"
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                          className="hidden"
                        />
                        <Upload className="text-slate-400 mb-3" size={32} />
                        <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider block">Drag &amp; Drop Spreadsheet File</span>
                        <span className="text-[10px] text-slate-455 mt-1 block">Supports Microsoft Excel (.xlsx, .xls) and standard comma-separated CSV values.</span>
                        <button className="mt-4 px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl hover:border-slate-350 cursor-pointer shadow-sm">
                          Browse Files
                        </button>
                      </div>

                      <div className="flex justify-between items-center p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 rounded-xl">
                        <div className="space-y-0.5 text-xs text-left">
                          <div className="font-extrabold text-amber-800 dark:text-amber-300">Need the standard migration spreadsheet layout?</div>
                          <div className="text-[10px] text-slate-500">Download our formatted template matching all system metadata fields.</div>
                        </div>
                        <button
                          onClick={handleDownloadTemplate}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl cursor-pointer transition flex items-center gap-1.5 shrink-0 shadow-sm"
                        >
                          <Download size={14} /> Template
                        </button>
                      </div>

                      {/* PREVIOUS RUNS HISTORICAL LOGS */}
                      <div className="space-y-2 text-left">
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Previous Import Logs Run</h5>
                        <div className="border border-slate-150 dark:border-zinc-850 rounded-xl overflow-hidden text-xs">
                          {loadingImportLogs ? (
                            <div className="p-8 text-center text-slate-500 italic">Loading logs list...</div>
                          ) : importLogs.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 italic">No previous Excel imports recorded in database logs.</div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50/80 dark:bg-zinc-900/50 border-b border-slate-150 dark:border-zinc-850 text-[9px] uppercase tracking-wider font-bold text-slate-400">
                                    <th className="py-2 px-3">Date</th>
                                    <th className="py-2 px-3">File Name</th>
                                    <th className="py-2 px-3">User</th>
                                    <th className="py-2 px-3 text-center">Imported</th>
                                    <th className="py-2 px-3 text-center">Updated</th>
                                    <th className="py-2 px-3 text-center">Skipped</th>
                                    <th className="py-2 px-3 text-center">Failed</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 font-semibold text-slate-700 dark:text-slate-300">
                                  {importLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/30 dark:hover:bg-zinc-900/20">
                                      <td className="py-2 px-3 font-mono text-[10px]">{new Date(log.created_at).toLocaleString("en-IN")}</td>
                                      <td className="py-2 px-3 max-w-[150px] truncate" title={log.file_name}>{log.file_name}</td>
                                      <td className="py-2 px-3">{log.imported_by}</td>
                                      <td className="py-2 px-3 text-center font-bold text-emerald-600">{log.imported}</td>
                                      <td className="py-2 px-3 text-center font-bold text-blue-500">{log.updated}</td>
                                      <td className="py-2 px-3 text-center font-bold text-slate-400">{log.skipped}</td>
                                      <td className="py-2 px-3 text-center font-bold text-rose-500">{log.failed}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: COLUMN MAPPING SCREEN */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl text-[10px] text-slate-550 border border-slate-150 dark:border-zinc-850 text-left">
                        <span className="font-extrabold block text-slate-750 dark:text-white uppercase mb-1">Verify Automatic Matches</span>
                        We parsed the column headers of <strong className="text-slate-800 dark:text-white">{fileName}</strong>. Confirm the binding schema details below. Unbound Excel headers will be ignored.
                      </div>

                      <div className="border border-slate-150 dark:border-zinc-850 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-150 dark:border-zinc-850 text-[9px] uppercase tracking-wider font-bold text-slate-400">
                              <th className="py-2.5 px-4">Excel Column Header Name</th>
                              <th className="py-2.5 px-4">Maps to Database Field</th>
                              <th className="py-2.5 px-4 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 font-semibold text-slate-700 dark:text-slate-350">
                            {excelHeaders.map(hdr => (
                              <tr key={hdr} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/10">
                                <td className="py-2.5 px-4 font-bold">{hdr}</td>
                                <td className="py-2.5 px-4">
                                  <select
                                    value={columnMappings[hdr] || ""}
                                    onChange={e => setColumnMappings({ ...columnMappings, [hdr]: e.target.value })}
                                    className="px-2 py-1 text-xs border border-slate-200 dark:border-zinc-850 rounded-lg bg-white dark:bg-zinc-900 outline-none text-slate-800 dark:text-white font-bold w-48 focus:ring-1 focus:ring-emerald-500"
                                  >
                                    <option value="">Ignore Column</option>
                                    <option value="lab_name">Laboratory Name</option>
                                    <option value="lab_asset_id">Lab Asset ID (Visible)</option>
                                    <option value="global_asset_id">Global Asset ID (Permanent)</option>
                                    <option value="asset_type">Asset Device Type (e.g. CPU)</option>
                                    <option value="brand">Brand Manufacturer</option>
                                    <option value="model_number">Model Number</option>
                                    <option value="serial_number">Serial Number / Service Tag</option>
                                    <option value="service_tag">Dell Service Tag</option>
                                    <option value="ipv4">IPv4 IP Address</option>
                                    <option value="mac_address">MAC Address</option>
                                    <option value="computer_name">Computer Name</option>
                                    <option value="hostname">Hostname Domain</option>
                                    <option value="processor">Processor CPU Specs</option>
                                    <option value="ram">RAM Memory Capacity</option>
                                    <option value="storage">Storage Drive Capacity</option>
                                    <option value="storage_type">Storage Media Type (HDD/SSD)</option>
                                    <option value="operating_system">Operating System</option>
                                    <option value="purchase_date">Purchase Date (YYYY-MM-DD)</option>
                                    <option value="warranty_end">Warranty Expiry Date</option>
                                    <option value="status">Status (Working/Faulty/Repair)</option>
                                  </select>
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  {columnMappings[hdr] ? (
                                    <span className="px-2 py-0.5 rounded-full text-[8px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 font-black uppercase whitespace-nowrap">Mapped</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[8px] bg-slate-100 text-slate-500 dark:bg-zinc-900 font-black uppercase whitespace-nowrap">Ignored</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-100 dark:border-zinc-850 pt-4">
                        <button
                          onClick={() => setWizardStep(1)}
                          className="px-4 py-2 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 text-xs font-black rounded-xl hover:bg-slate-50 cursor-pointer transition"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => setWizardStep(3)}
                          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-sm"
                        >
                          Validate &amp; Preview
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: PREVIEW & RUN SCREEN */}
                  {wizardStep === 3 && (() => {
                    const mapped = getMappedRecords();
                    const totalRows = mapped.length;

                    // Simple client-side validation analysis
                    const errorsList: { row: number; error: string }[] = [];
                    let validCount = 0;
                    let dupCount = 0;

                    const seenSerials = new Set();
                    const seenIps = new Set();

                    mapped.forEach((item, idx) => {
                      const rowNum = idx + 2;
                      if (!item.lab_name) {
                        errorsList.push({ row: rowNum, error: "Missing Laboratory Name parameter." });
                      } else {
                        // Check if lab name matches seeded values
                        const labMatch = laboratories.find(l => 
                          l.name.toLowerCase() === String(item.lab_name).trim().toLowerCase() ||
                          l.code.toLowerCase() === String(item.lab_name).trim().toLowerCase()
                        );
                        if (!labMatch) {
                          errorsList.push({ row: rowNum, error: `Laboratory name '${item.lab_name}' does not match any system values.` });
                        }
                      }
                      if (!item.asset_type) {
                        errorsList.push({ row: rowNum, error: "Missing Asset Device Type parameter." });
                      }

                      // Check sheet duplicates
                      if (item.serial_number) {
                        const serialClean = String(item.serial_number).trim().toLowerCase();
                        if (seenSerials.has(serialClean)) {
                          dupCount++;
                          errorsList.push({ row: rowNum, error: `Spreadsheet duplicate: Serial Number '${item.serial_number}' repeated.` });
                        } else {
                          seenSerials.add(serialClean);
                        }
                      }

                      if (item.ipv4 && String(item.ipv4).trim().toLowerCase() !== "dhcp") {
                        const ipClean = String(item.ipv4).trim().toLowerCase();
                        if (seenIps.has(ipClean)) {
                          dupCount++;
                          errorsList.push({ row: rowNum, error: `Spreadsheet duplicate: IP Address '${item.ipv4}' repeated.` });
                        } else {
                          seenIps.add(ipClean);
                        }
                      }
                    });

                    validCount = totalRows - errorsList.length;

                    return (
                      <div className="space-y-5 text-left">
                        {/* Statistics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                          <div className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850 rounded-xl">
                            <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Total Parse Rows</div>
                            <div className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{totalRows}</div>
                          </div>
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/20 rounded-xl">
                            <div className="text-[9px] uppercase tracking-wider font-bold text-emerald-600">Valid Rows</div>
                            <div className="text-xl font-black text-emerald-600 mt-0.5">{validCount}</div>
                          </div>
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-150 dark:border-amber-900/20 rounded-xl">
                            <div className="text-[9px] uppercase tracking-wider font-bold text-amber-600">Sheet Duplicates</div>
                            <div className="text-xl font-black text-amber-600 mt-0.5">{dupCount}</div>
                          </div>
                          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/20 rounded-xl">
                            <div className="text-[9px] uppercase tracking-wider font-bold text-rose-600">Validation Failures</div>
                            <div className="text-xl font-black text-rose-600 mt-0.5">{errorsList.length}</div>
                          </div>
                        </div>

                        {/* Error warnings preview drawer */}
                        {errorsList.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-rose-600 flex items-center gap-1"><AlertCircle size={12} /> Excel Validation Warnings ({errorsList.length})</span>
                            <div className="border border-rose-150 dark:border-rose-950/40 rounded-xl bg-rose-50/20 dark:bg-rose-950/5 max-h-40 overflow-y-auto p-3.5 text-[11px] font-semibold text-rose-700 space-y-1">
                              {errorsList.slice(0, 10).map((err, i) => (
                                <div key={i}>Row {err.row}: <span className="font-extrabold">{err.error}</span></div>
                              ))}
                              {errorsList.length > 10 && (
                                <div className="text-slate-500 italic pt-1">...and {errorsList.length - 10} more rows have errors. Download failed spreadsheet or correct headers.</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* OPTIONS PANEL CHECKBOXES */}
                        <div className="p-4 rounded-xl border border-slate-150 dark:border-zinc-850 bg-slate-50/40 dark:bg-zinc-900/20 space-y-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Conflict Resolution &amp; Importer Options</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={importWizardOptions.importNewOnly}
                                onChange={e => setImportWizardOptions({ 
                                  ...importWizardOptions, 
                                  importNewOnly: e.target.checked,
                                  updateExisting: e.target.checked ? false : importWizardOptions.updateExisting
                                })}
                                className="w-3.5 h-3.5 accent-emerald-500"
                              />
                              <span>Import New Records Only</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={importWizardOptions.updateExisting}
                                onChange={e => setImportWizardOptions({ 
                                  ...importWizardOptions, 
                                  updateExisting: e.target.checked,
                                  importNewOnly: e.target.checked ? false : importWizardOptions.importNewOnly,
                                  skipDuplicates: e.target.checked ? false : importWizardOptions.skipDuplicates
                                })}
                                className="w-3.5 h-3.5 accent-emerald-500"
                              />
                              <span>Update Existing Records</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={importWizardOptions.skipDuplicates}
                                onChange={e => setImportWizardOptions({ 
                                  ...importWizardOptions, 
                                  skipDuplicates: e.target.checked,
                                  updateExisting: e.target.checked ? false : importWizardOptions.updateExisting
                                })}
                                className="w-3.5 h-3.5 accent-emerald-500"
                              />
                              <span>Skip Duplicate Records</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={importWizardOptions.generateQr}
                                className="w-3.5 h-3.5 accent-emerald-500"
                                disabled
                              />
                              <span className="text-slate-400">Generate QR Codes &amp; Labels</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={importWizardOptions.generateLabId}
                                onChange={e => setImportWizardOptions({ ...importWizardOptions, generateLabId: e.target.checked })}
                                className="w-3.5 h-3.5 accent-emerald-500"
                              />
                              <span>Auto-Generate Missing Lab IDs</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={importWizardOptions.generateGlobalId}
                                onChange={e => setImportWizardOptions({ ...importWizardOptions, generateGlobalId: e.target.checked })}
                                className="w-3.5 h-3.5 accent-emerald-500"
                              />
                              <span>Auto-Generate Missing Global IDs</span>
                            </label>
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-100 dark:border-zinc-850 pt-4">
                          <button
                            onClick={() => setWizardStep(2)}
                            disabled={isImporting}
                            className="px-4 py-2 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 text-xs font-black rounded-xl hover:bg-slate-50 cursor-pointer transition disabled:opacity-30"
                          >
                            Back
                          </button>
                          
                          <button
                            onClick={executeBulkImport}
                            disabled={isImporting || errorsList.length > 0}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-zinc-800 dark:disabled:text-slate-500 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-sm flex items-center gap-1.5"
                          >
                            {isImporting ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                            {errorsList.length > 0 ? "Resolve Validation Errors First" : "Start Database Transaction"}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* STEP 4: FINAL SUMMARY SCREEN */}
                  {wizardStep === 4 && importSummary && (
                    <div className="space-y-5 text-left">
                      <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                        importSummary.failed > 0 
                          ? "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40" 
                          : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                      }`}>
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-900">
                          {importSummary.failed > 0 ? (
                            <AlertCircle className="text-rose-500" size={24} />
                          ) : (
                            <Check className="text-emerald-500" size={24} />
                          )}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                            {importSummary.failed > 0 ? "Import Failed (Transaction Rolled Back)" : "Import Executed Successfully!"}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {importSummary.failed > 0 
                              ? "Database transaction rolled back to protect schema integrity. Correct spreadsheet rows and re-upload."
                              : "All verified changes have been successfully committed to database."
                            }
                          </p>
                        </div>
                      </div>

                      {/* Summary Table Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs font-semibold">
                        <div className="p-3.5 rounded-xl border border-slate-150 dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-900/40">
                          <span className="text-slate-450 block uppercase text-[8px] font-black tracking-wider">Total Rows</span>
                          <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{importSummary.total}</span>
                        </div>
                        <div className="p-3.5 rounded-xl border border-emerald-150 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-950/5 text-emerald-600">
                          <span className="text-emerald-555 block uppercase text-[8px] font-black tracking-wider">Imported</span>
                          <span className="text-xl font-black mt-1 block">{importSummary.imported}</span>
                        </div>
                        <div className="p-3.5 rounded-xl border border-blue-150 dark:border-blue-900/20 bg-blue-50/10 dark:bg-blue-950/5 text-blue-500">
                          <span className="text-blue-555 block uppercase text-[8px] font-black tracking-wider">Updated</span>
                          <span className="text-xl font-black mt-1 block">{importSummary.updated}</span>
                        </div>
                        <div className="p-3.5 rounded-xl border border-rose-150 dark:border-rose-900/20 bg-rose-50/10 dark:bg-rose-950/5 text-rose-600">
                          <span className="text-rose-555 block uppercase text-[8px] font-black tracking-wider">Failed</span>
                          <span className="text-xl font-black mt-1 block">{importSummary.failed}</span>
                        </div>
                      </div>

                      {/* Failed rows reason logging list */}
                      {importSummary.failed > 0 && importSummary.errors && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-slate-650 dark:text-slate-350">Failed Row Reasons ({importSummary.failed})</span>
                            <button
                              onClick={handleDownloadFailedRecords}
                              className="text-[10px] font-black text-rose-600 hover:text-rose-700 underline flex items-center gap-1 cursor-pointer"
                            >
                              <Download size={12} /> Download Failed Records xlsx
                            </button>
                          </div>
                          <div className="border border-rose-150 dark:border-rose-950/50 rounded-xl bg-rose-50/10 dark:bg-rose-950/5 max-h-48 overflow-y-auto p-4 text-[11px] font-semibold text-rose-700 space-y-1.5">
                            {importSummary.errors.slice(0, 20).map((err: any, i: number) => (
                              <div key={i}>Row {err.row}: <span className="font-extrabold">{err.error}</span></div>
                            ))}
                            {importSummary.errors.length > 20 && (
                              <div className="text-slate-550 font-black italic">...and {importSummary.errors.length - 20} more rows failed.</div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end border-t border-slate-100 dark:border-zinc-850 pt-4">
                        <button
                          onClick={() => {
                            setShowImportWizard(false);
                            setWizardStep(1);
                            setImportSummary(null);
                          }}
                          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-sm"
                        >
                          Close Wizard
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            {/* INVENTORY CREATE / EDIT COMPREHENSIVE MODAL */}
            {showInventoryModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800/50 max-w-xl w-full rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto relative text-left"
                >
                  <button onClick={() => setShowInventoryModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition"><X size={18} /></button>
                  <div className="pb-3 border-b border-slate-100 dark:border-zinc-850 mb-4">
                    <h4 className="text-base font-black text-slate-800 dark:text-white font-display uppercase tracking-wider">
                      {editingInventory ? `Edit Asset: ${invForm.global_asset_id || "Active record"}` : "Deploy New IT Equipment Asset"}
                    </h4>
                  </div>

                  {/* Duplicate warning banners */}
                  {localWarnings.length > 0 && (
                    <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-250 text-amber-700 dark:text-amber-400 text-[10px] space-y-1 font-bold">
                      <div className="uppercase tracking-widest text-[9px] flex items-center gap-1.5">
                        <AlertCircle size={12} /> Smart Duplicate Warning
                      </div>
                      {localWarnings.map((w, idx) => <div key={idx}>- {w}</div>)}
                    </div>
                  )}

                  {/* Form tab navbar */}
                  <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl mb-4">
                    {["basic", "network", "peripherals", "photos"].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setActiveModalTab(t as any)}
                        className={`flex-1 py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all cursor-pointer ${
                          activeModalTab === t 
                            ? "bg-white dark:bg-zinc-800 text-slate-905 dark:text-white shadow" 
                            : "text-slate-400 hover:text-slate-655"
                        }`}
                      >
                        {t === "basic" ? "Basic Specs" : t === "network" ? "Network & HW" : t === "peripherals" ? "Peripherals" : "OCR & Sticker"}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={(e) => onSaveInventory(e, invForm)} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    
                    {/* TAB 1: BASIC SPECS */}
                    {activeModalTab === "basic" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Target Laboratory</label>
                            <select
                              value={invForm.lab_id}
                              onChange={(e) => setInvForm({ ...invForm, lab_id: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              required
                            >
                              <option value="">Select Lab</option>
                              {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name} ({lab.code})</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Device Type</label>
                            <select
                              value={invForm.device_type}
                              onChange={(e) => setInvForm({ ...invForm, device_type: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            >
                              <option value="CPU">CPU Workstation</option>
                              <option value="Monitor">Monitor screen</option>
                              <option value="Laptop">Laptop PC</option>
                              <option value="Printer">Printer unit</option>
                              <option value="Projector">Projector</option>
                              <option value="UPS">UPS battery</option>
                              <option value="Keyboard">Keyboard</option>
                              <option value="Mouse">Mouse</option>
                              <option value="Webcam">Webcam</option>
                              <option value="Speakers">Speakers</option>
                              <option value="Network Device">Network Switch</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Brand</label>
                            <input
                              type="text"
                              value={invForm.brand}
                              onChange={(e) => setInvForm({ ...invForm, brand: e.target.value })}
                              placeholder="e.g. Dell, HP"
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Model Name/Number</label>
                            <input
                              type="text"
                              value={invForm.model_number}
                              onChange={(e) => setInvForm({ ...invForm, model_number: e.target.value })}
                              placeholder="e.g. OptiPlex 7090"
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Manufacturer</label>
                            <input
                              type="text"
                              value={invForm.manufacturer}
                              onChange={(e) => setInvForm({ ...invForm, manufacturer: e.target.value })}
                              placeholder="e.g. Dell Inc."
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Serial Number (S/N)</label>
                            <input
                              type="text"
                              value={invForm.serial_number}
                              onChange={(e) => setInvForm({ ...invForm, serial_number: e.target.value })}
                              placeholder="Required for duplication check"
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Service Tag / Asset Code</label>
                            <input
                              type="text"
                              value={invForm.service_tag}
                              onChange={(e) => setInvForm({ ...invForm, service_tag: e.target.value })}
                              placeholder="Required for vendor warranty"
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Express Service Code</label>
                            <input
                              type="text"
                              value={invForm.express_service_code || ""}
                              onChange={(e) => setInvForm({ ...invForm, express_service_code: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">MTM Code</label>
                            <input
                              type="text"
                              value={invForm.mtm || ""}
                              onChange={(e) => setInvForm({ ...invForm, mtm: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Product Number</label>
                            <input
                              type="text"
                              value={invForm.product_number || ""}
                              onChange={(e) => setInvForm({ ...invForm, product_number: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Manufacture Date</label>
                            <input
                              type="date"
                              value={invForm.manufacture_date || ""}
                              onChange={(e) => setInvForm({ ...invForm, manufacture_date: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Purchase Date</label>
                            <input
                              type="date"
                              value={invForm.purchase_date}
                              onChange={(e) => setInvForm({ ...invForm, purchase_date: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Invoice Number</label>
                            <input
                              type="text"
                              value={invForm.invoice_number || ""}
                              onChange={(e) => setInvForm({ ...invForm, invoice_number: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Warranty Start</label>
                            <input
                              type="date"
                              value={invForm.warranty_start || ""}
                              onChange={(e) => setInvForm({ ...invForm, warranty_start: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Warranty End</label>
                            <input
                              type="date"
                              value={invForm.warranty_end || ""}
                              onChange={(e) => setInvForm({ ...invForm, warranty_end: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Vendor / Dealer</label>
                            <input
                              type="text"
                              value={invForm.vendor}
                              onChange={(e) => setInvForm({ ...invForm, vendor: e.target.value })}
                              placeholder="Seller details"
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Barcode Value</label>
                            <input
                              type="text"
                              value={invForm.barcode_data || ""}
                              onChange={(e) => setInvForm({ ...invForm, barcode_data: e.target.value })}
                              placeholder="Scan barcode directly here"
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Deploy Status</label>
                            <select
                              value={invForm.status}
                              onChange={(e) => setInvForm({ ...invForm, status: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white"
                            >
                              <option value="Installed">Installed</option>
                              <option value="Working">Working</option>
                              <option value="Spare">Spare</option>
                              <option value="Under Repair">Under Repair</option>
                              <option value="Maintenance">Maintenance</option>
                              <option value="Damaged">Damaged</option>
                              <option value="Lost">Lost</option>
                              <option value="Disposed">Disposed</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: NETWORK & HARDWARE */}
                    {activeModalTab === "network" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Computer Name</label>
                            <input
                              type="text"
                              value={invForm.computer_name || ""}
                              onChange={(e) => setInvForm({ ...invForm, computer_name: e.target.value })}
                              placeholder="e.g. LAB-A-PC10"
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Host Name</label>
                            <input
                              type="text"
                              value={invForm.hostname || ""}
                              onChange={(e) => setInvForm({ ...invForm, hostname: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">IP Type</label>
                            <select
                              value={invForm.ip_type}
                              onChange={(e) => setInvForm({ ...invForm, ip_type: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white"
                            >
                              <option value="DHCP">DHCP</option>
                              <option value="Static">Static IP</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">IPv4 Address</label>
                            <input
                              type="text"
                              value={invForm.ipv4 || ""}
                              onChange={(e) => setInvForm({ ...invForm, ipv4: e.target.value })}
                              placeholder="e.g. 192.168.10.12"
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">IPv6 Address</label>
                            <input
                              type="text"
                              value={invForm.ipv6 || ""}
                              onChange={(e) => setInvForm({ ...invForm, ipv6: e.target.value })}
                              placeholder="e.g. fe80::..."
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">MAC Address</label>
                            <input
                              type="text"
                              value={invForm.mac_address || ""}
                              onChange={(e) => setInvForm({ ...invForm, mac_address: e.target.value.toUpperCase() })}
                              placeholder="e.g. 00:1A:2B:..."
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Wi-Fi MAC</label>
                            <input
                              type="text"
                              value={invForm.wifi_mac || ""}
                              onChange={(e) => setInvForm({ ...invForm, wifi_mac: e.target.value.toUpperCase() })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">LAN MAC</label>
                            <input
                              type="text"
                              value={invForm.lan_mac || ""}
                              onChange={(e) => setInvForm({ ...invForm, lan_mac: e.target.value.toUpperCase() })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Network Gateway</label>
                            <input
                              type="text"
                              value={invForm.gateway || ""}
                              onChange={(e) => setInvForm({ ...invForm, gateway: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">DNS Server</label>
                            <input
                              type="text"
                              value={invForm.dns || ""}
                              onChange={(e) => setInvForm({ ...invForm, dns: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-wider block text-slate-400">Active Domain</label>
                            <input
                              type="text"
                              value={invForm.domain || ""}
                              onChange={(e) => setInvForm({ ...invForm, domain: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-6 py-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={invForm.reserved_ip === true || invForm.reserved_ip === 'true'}
                              onChange={(e) => setInvForm({ ...invForm, reserved_ip: e.target.checked })}
                              id="res_ip"
                              className="w-4 h-4 text-suas-ruby"
                            />
                            <label htmlFor="res_ip" className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider cursor-pointer">Reserved IP Address</label>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 dark:border-zinc-850 pt-3 mt-3">
                          <h5 className="text-[9px] uppercase tracking-widest text-slate-450 block mb-2 font-black">Computer Hardware Specifications</h5>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider block text-slate-400">Processor (CPU)</label>
                              <input
                                type="text"
                                value={invForm.processor || ""}
                                onChange={(e) => setInvForm({ ...invForm, processor: e.target.value })}
                                placeholder="e.g. Core i7 12Gen"
                                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider block text-slate-400">RAM Count</label>
                              <input
                                type="text"
                                value={invForm.ram || ""}
                                onChange={(e) => setInvForm({ ...invForm, ram: e.target.value })}
                                placeholder="e.g. 16 GB DDR4"
                                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider block text-slate-400">Storage Size</label>
                              <input
                                type="text"
                                value={invForm.storage || ""}
                                onChange={(e) => setInvForm({ ...invForm, storage: e.target.value })}
                                placeholder="e.g. 512 GB"
                                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider block text-slate-400">Disk Type</label>
                              <select
                                value={invForm.storage_type}
                                onChange={(e) => setInvForm({ ...invForm, storage_type: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white"
                              >
                                <option value="SSD">Solid State Drive (SSD)</option>
                                <option value="HDD">Hard Disk Drive (HDD)</option>
                                <option value="NVMe">NVMe SSD</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider block text-slate-400">Graphics GPU</label>
                              <input
                                type="text"
                                value={invForm.gpu || ""}
                                onChange={(e) => setInvForm({ ...invForm, gpu: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider block text-slate-400">Motherboard Make</label>
                              <input
                                type="text"
                                value={invForm.motherboard || ""}
                                onChange={(e) => setInvForm({ ...invForm, motherboard: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider block text-slate-400">Operating System</label>
                              <input
                                type="text"
                                value={invForm.operating_system}
                                onChange={(e) => setInvForm({ ...invForm, operating_system: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider block text-slate-400">Office Suite version</label>
                              <input
                                type="text"
                                value={invForm.office_version || ""}
                                onChange={(e) => setInvForm({ ...invForm, office_version: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider block text-slate-400">BIOS Version</label>
                              <input
                                type="text"
                                value={invForm.bios_version || ""}
                                onChange={(e) => setInvForm({ ...invForm, bios_version: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: PERIPHERALS LINKER */}
                    {activeModalTab === "peripherals" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider block text-slate-400">Chained Parent CPU Asset</label>
                          <select
                            value={invForm.parent_cpu_id || ""}
                            onChange={(e) => setInvForm({ ...invForm, parent_cpu_id: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none text-slate-800 dark:text-white"
                          >
                            <option value="">None (Independent Asset / CPU itself)</option>
                            {inventoryItems.filter((i: any) => (i.device_type === "CPU" || i.device_type === "Desktop") && (i.uuid || i.id) !== invForm.id).map((cpu: any) => (
                              <option key={cpu.uuid || cpu.id} value={cpu.uuid || cpu.id}>🏢 {cpu.lab_name} - CPU: {cpu.lab_asset_id || cpu.asset_number} ({cpu.brand} {cpu.model_number})</option>
                            ))}
                          </select>
                          <p className="text-[8px] text-slate-400 mt-1 uppercase font-semibold">If this asset is a Monitor, Keyboard, Mouse, UPS or Printer, you can chain it to a host CPU Workstation.</p>
                        </div>

                        {/* Monitor configurations specs if this is a monitor */}
                        {invForm.device_type === "Monitor" && (
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-zinc-850">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider block text-slate-400">Screen Size (inches)</label>
                              <input
                                type="text"
                                value={invForm.screen_size || ""}
                                onChange={(e) => setInvForm({ ...invForm, screen_size: e.target.value })}
                                placeholder="e.g. 21.5 inch"
                                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider block text-slate-400">Display Resolution</label>
                              <input
                                type="text"
                                value={invForm.resolution || ""}
                                onChange={(e) => setInvForm({ ...invForm, resolution: e.target.value })}
                                placeholder="e.g. 1920 x 1080"
                                className="w-full px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955 rounded-xl outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* Display linked items if editing a CPU */}
                        {(invForm.device_type === "CPU" || invForm.device_type === "Desktop") && invForm.id && (
                          <div className="pt-3 border-t border-slate-100 dark:border-zinc-850">
                            <h5 className="text-[9px] uppercase tracking-widest text-slate-450 block mb-2 font-black">Linked Peripheral Assets</h5>
                            <div className="space-y-2">
                              {inventoryItems.filter((i: any) => i.parent_cpu_id === invForm.id).length === 0 ? (
                                <div className="text-[10px] text-slate-400 italic">No peripherals (Monitors, Keyboard, Webcams) currently linked to this CPU.</div>
                              ) : (
                                inventoryItems.filter((i: any) => i.parent_cpu_id === invForm.id).map((child: any) => (
                                  <div key={child.uuid || child.id} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
                                    <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">{child.device_type}: {child.lab_asset_id || child.asset_number} ({child.brand} {child.model_number || ""})</span>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        // Unlink child peripheral
                                        const nextChild = { ...child, parent_cpu_id: null, id: child.uuid || child.id };
                                        onSaveInventory({ preventDefault: () => {} } as any, nextChild);
                                        showToast(`Unlinked ${child.device_type} successfully.`);
                                      }}
                                      className="px-2 py-0.5 text-[8px] bg-rose-50 text-suas-ruby font-black uppercase rounded hover:bg-rose-100 cursor-pointer"
                                    >
                                      Unlink
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 4: OCR & PHOTOS */}
                    {activeModalTab === "photos" && (
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-zinc-800 text-center">
                          <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">OCR Serial Plate Auto-Fill</h5>
                          <p className="text-[9px] text-slate-400 mb-3 font-semibold">Upload an image of the device sticker (Dell/HP/Lenovo) to auto-extract parameters.</p>
                          <div className="relative w-36 mx-auto">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleOcrUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              disabled={ocrLoading}
                            />
                            <button
                              type="button"
                              disabled={ocrLoading}
                              className="w-full py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-[9px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Upload size={12} /> {ocrLoading ? "Analyzing Sticker..." : "Select Sticker Image"}
                            </button>
                          </div>

                          {ocrResult && (
                            <div className="mt-3 text-[9px] font-bold text-suas-ruby bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-lg text-left">
                              {ocrResult}
                            </div>
                          )}
                        </div>

                        {/* Image Attachment Upload */}
                        <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-zinc-850">
                          <label className="text-[9px] uppercase tracking-wider block text-slate-400">Attached Device Images (Sticker, Installed layout)</label>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              files.forEach(file => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setInvForm((prev: any) => ({
                                    ...prev,
                                    attachments: [
                                      ...(prev.attachments || []),
                                      { image_type: "Layout", image_url: reader.result as string }
                                    ]
                                  }));
                                };
                                reader.readAsDataURL(file);
                              });
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-xl outline-none"
                          />
                          
                          {/* Image preview list */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {invForm.attachments && invForm.attachments.map((att: any, idx: number) => (
                              <div key={idx} className="relative w-16 h-16 border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                                <img src={att.image_url} alt="att preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInvForm((prev: any) => ({
                                      ...prev,
                                      attachments: prev.attachments.filter((_: any, i: number) => i !== idx)
                                    }));
                                  }}
                                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 text-white rounded hover:bg-rose-600 cursor-pointer"
                                >
                                  <X size={10} />
                                </button>
                                <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[7px] text-center uppercase tracking-wider font-extrabold">{att.image_type || "Layout"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Submit */}
                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-850 mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowInventoryModal(false)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-suas-ruby dark:hover:bg-suas-ruby-neon hover:text-white transition shadow-md cursor-pointer"
                      >
                        Confirm &amp; Deploy
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </div>
        );
      })()}

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
