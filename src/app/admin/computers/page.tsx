"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Edit2, Trash2, Download, Filter, X,
  Monitor, Cpu, HardDrive, Wifi, Printer, RefreshCw,
  CheckCircle, AlertTriangle, XCircle, ChevronDown,
  ChevronUp, ChevronLeft, ChevronRight, QrCode, FileText,
  FileSpreadsheet, Eye, ArrowLeft, Layers, Activity,
  Calendar, Building2, Server, MemoryStick, Shield,
  SlidersHorizontal, Check, Loader2, ClipboardList
} from "lucide-react";
import {
  getComputers,
  getLaboratories,
  saveComputer,
  deleteComputer,
  getComputerByTag,
  importComputers,
} from "../../actions";
import { exportToExcel } from "../../../utils/exportHelper";

/* ─── Types ──────────────────────────────────────────────────────────────────── */
interface Lab { id: string; name: string; code: string; building: string; floor: string; }

interface Computer {
  id: string;
  computerId: string;
  hostname: string;
  labId: string;
  lab?: Lab;
  benchNumber: string;
  ipAddress: string;
  macAddress: string;
  cpu: string;
  motherboard: string;
  ramGb: number;
  ssdGb: number;
  hddGb: number;
  gpu?: string;
  monitorDetails: string;
  keyboardBrand: string;
  mouseBrand: string;
  upsDetails?: string;
  purchaseDate: string;
  warrantyExpiry: string;
  invoiceUrl?: string;
  vendorDetails: string;
  condition: "EXCELLENT" | "WORKING" | "FAULTY" | "SCRAP";
  status: "ONLINE" | "OFFLINE" | "UNDER_REPAIR" | "DECOMMISSIONED";
  operatingSystem: string;
  biosVersion?: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
  remarks?: string;
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
}

interface Filters {
  lab: string;
  status: string;
  condition: string;
  ramGb: string;
  os: string;
  vendor: string;
  warrantyExpired: string;
}

const EMPTY_FORM: Partial<Computer> = {
  computerId: "", hostname: "", labId: "", benchNumber: "",
  ipAddress: "", macAddress: "", cpu: "", motherboard: "",
  ramGb: 8, ssdGb: 256, hddGb: 0, gpu: "", monitorDetails: "",
  keyboardBrand: "", mouseBrand: "", upsDetails: "", purchaseDate: "",
  warrantyExpiry: "", invoiceUrl: "", vendorDetails: "", condition: "EXCELLENT",
  status: "ONLINE", operatingSystem: "Windows 11 Pro", biosVersion: "",
  lastServiceDate: "", nextServiceDate: "", remarks: "", qrCode: "",
};

/* ─── Status/Condition Badge Components ──────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    ONLINE:        { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: <CheckCircle size={11} />, label: "Online" },
    OFFLINE:       { color: "bg-slate-500/15 text-slate-400 border-slate-500/30", icon: <XCircle size={11} />, label: "Offline" },
    UNDER_REPAIR:  { color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: <AlertTriangle size={11} />, label: "Under Repair" },
    DECOMMISSIONED:{ color: "bg-red-500/15 text-red-400 border-red-500/30", icon: <XCircle size={11} />, label: "Decommissioned" },
  };
  const s = map[status] || map.OFFLINE;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${s.color}`}>
      {s.icon}{s.label}
    </span>
  );
}

function ConditionBadge({ cond }: { cond: string }) {
  const map: Record<string, string> = {
    EXCELLENT: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    WORKING:   "bg-blue-500/15 text-blue-400 border-blue-500/30",
    FAULTY:    "bg-red-500/15 text-red-400 border-red-500/30",
    SCRAP:     "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${map[cond] || map.WORKING}`}>
      {cond.charAt(0) + cond.slice(1).toLowerCase()}
    </span>
  );
}

/* ─── QR Display ─────────────────────────────────────────────────────────────── */
function QrDisplay({ computerId, qrCode }: { computerId: string; qrCode?: string }) {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/scan/${computerId}`;
  // Simple QR-like visual placeholder using CSS pattern
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-32 h-32 bg-white border-2 border-zinc-800 rounded-lg flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='%23000'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23000'/%3E%3C/svg%3E")`,
          backgroundSize: "4px 4px",
          opacity: 0.85
        }}
      >
        <div className="bg-white px-2 py-1 rounded text-[8px] font-bold text-zinc-900 z-10">
          {computerId}
        </div>
      </div>
      <p className="text-xs text-zinc-500 font-mono">{computerId}</p>
      <button
        onClick={() => {
          const link = document.createElement("a");
          link.href = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
          link.download = `${computerId}-QR.png`;
          link.target = "_blank";
          link.click();
        }}
        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
      >
        <Download size={11} /> Download QR
      </button>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────────── */
export default function ComputerRegistry() {
  const router = useRouter();
  const [computers, setComputers] = useState<Computer[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Computer | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Computer>>(EMPTY_FORM);
  const [sortKey, setSortKey] = useState<keyof Computer>("computerId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [filters, setFilters] = useState<Filters>({
    lab: "", status: "", condition: "", ramGb: "", os: "", vendor: "", warrantyExpired: ""
  });
  
  // Scanner state variables
  const [showScanner, setShowScanner] = useState(false);
  const [scannerInput, setScannerInput] = useState("");
  const [scannerError, setScannerError] = useState("");
  const [scannerLoading, setScannerLoading] = useState(false);

  // Import state variables
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importError, setImportError] = useState("");
  const [importSuccessMsg, setImportSuccessMsg] = useState("");
  const PAGE_SIZE = 15;

  /* ─── Fetch Data ─────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, labRes] = await Promise.all([getComputers(), getLaboratories()]);
      if (compRes.success) setComputers((compRes.data as Computer[]) || []);
      if (labRes.success) setLabs((labRes.data as Lab[]) || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerInput.trim()) return;
    setScannerLoading(true);
    setScannerError("");
    try {
      const res = await getComputerByTag(scannerInput.trim());
      if (res.success && res.data) {
        setShowDetail(res.data);
        setShowScanner(false);
        setScannerInput("");
      } else {
        setScannerError(res.error || "System not found.");
      }
    } catch (err) {
      setScannerError("Scan lookup failed.");
    } finally {
      setScannerLoading(false);
    }
  };

  const handleCSVImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError("");
    setImportSuccessMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          setImportError("CSV file must have a header row and at least one data row.");
          return;
        }

        const parseCSVLine = (line: string) => {
          const result = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
        const colMap: Record<string, number> = {};
        headers.forEach((h, index) => {
          colMap[h] = index;
        });

        if (!headers.includes("computerid")) {
          setImportError("CSV must contain a 'computerId' header column.");
          return;
        }

        const list: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = parseCSVLine(line);
          if (cols.length < headers.length) continue;

          const getVal = (field: string) => {
            const idx = colMap[field];
            return idx !== undefined ? cols[idx] : "";
          };

          list.push({
            computerId: getVal("computerid"),
            hostname: getVal("hostname"),
            labCode: getVal("labcode"),
            labName: getVal("labname"),
            benchNumber: getVal("benchnumber") || "1",
            ipAddress: getVal("ipaddress"),
            macAddress: getVal("macaddress"),
            cpu: getVal("cpu"),
            motherboard: getVal("motherboard"),
            ramGb: Number(getVal("ramgb")) || 8,
            ssdGb: Number(getVal("ssdgb")) || 256,
            hddGb: Number(getVal("hddgb")) || 0,
            monitorDetails: getVal("monitordetails"),
            keyboardBrand: getVal("keyboardbrand"),
            mouseBrand: getVal("mousebrand"),
            vendorDetails: getVal("vendordetails"),
            operatingSystem: getVal("operatingsystem"),
            status: getVal("status") || "ONLINE",
            condition: getVal("condition") || "WORKING",
            purchaseDate: getVal("purchasedate"),
            warrantyExpiry: getVal("warrantyexpiry"),
            barcode: getVal("barcode") || getVal("computerid"),
            qrCode: getVal("qrcode")
          });
        }

        setImportPreview(list);
      } catch (err) {
        setImportError("Error reading or parsing CSV file.");
      }
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = async () => {
    if (importPreview.length === 0) return;
    setSaving(true);
    setImportError("");
    try {
      const res = await importComputers(importPreview, "admin");
      if (res.success) {
        showToast(`Successfully imported ${importPreview.length} computers.`);
        setImportSuccessMsg(`Successfully imported ${importPreview.length} workstations!`);
        setImportPreview([]);
        setTimeout(() => {
          setShowImport(false);
          setImportSuccessMsg("");
        }, 1500);
        fetchData();
      } else {
        setImportError(res.error || "Bulk import failed.");
      }
    } catch (err) {
      setImportError("Import failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Sort ──────────────── */
  const handleSort = (key: keyof Computer) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  /* ─── Filter + Search + Sort ─ */
  const filtered = useMemo(() => {
    let list = [...computers];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        c.computerId.toLowerCase().includes(q) ||
        c.hostname.toLowerCase().includes(q) ||
        c.ipAddress.toLowerCase().includes(q) ||
        c.macAddress.toLowerCase().includes(q) ||
        c.cpu.toLowerCase().includes(q) ||
        c.vendorDetails.toLowerCase().includes(q) ||
        (c.lab?.name || "").toLowerCase().includes(q) ||
        c.operatingSystem.toLowerCase().includes(q)
      );
    }
    if (filters.lab) list = list.filter(c => c.labId === filters.lab);
    if (filters.status) list = list.filter(c => c.status === filters.status);
    if (filters.condition) list = list.filter(c => c.condition === filters.condition);
    if (filters.ramGb) list = list.filter(c => c.ramGb === parseInt(filters.ramGb));
    if (filters.os) list = list.filter(c => c.operatingSystem.toLowerCase().includes(filters.os.toLowerCase()));
    if (filters.vendor) list = list.filter(c => c.vendorDetails.toLowerCase().includes(filters.vendor.toLowerCase()));
    if (filters.warrantyExpired === "expired") list = list.filter(c => new Date(c.warrantyExpiry) < new Date());
    if (filters.warrantyExpired === "active") list = list.filter(c => new Date(c.warrantyExpiry) >= new Date());
    list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return list;
  }, [computers, search, filters, sortKey, sortDir]);

  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  /* ─── Form handlers ─────── */
  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (c: Computer) => {
    setEditingId(c.id);
    setForm({
      ...c,
      purchaseDate: c.purchaseDate ? c.purchaseDate.slice(0, 10) : "",
      warrantyExpiry: c.warrantyExpiry ? c.warrantyExpiry.slice(0, 10) : "",
      lastServiceDate: c.lastServiceDate ? c.lastServiceDate.slice(0, 10) : "",
      nextServiceDate: c.nextServiceDate ? c.nextServiceDate.slice(0, 10) : "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.computerId || !form.hostname || !form.labId || !form.ipAddress || !form.macAddress) {
      showToast("Fill all required fields (Computer ID, Hostname, Lab, IP, MAC)", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        id: editingId || undefined,
        ramGb: Number(form.ramGb),
        ssdGb: Number(form.ssdGb),
        hddGb: Number(form.hddGb),
        purchaseDate: form.purchaseDate ? new Date(form.purchaseDate) : new Date(),
        warrantyExpiry: form.warrantyExpiry ? new Date(form.warrantyExpiry) : new Date(),
        lastServiceDate: form.lastServiceDate ? new Date(form.lastServiceDate) : null,
        nextServiceDate: form.nextServiceDate ? new Date(form.nextServiceDate) : null,
      };
      const res = await saveComputer(payload);
      if (res.success) {
        showToast(editingId ? "Computer record updated." : "Computer registered successfully.");
        setShowForm(false);
        fetchData();
      } else {
        showToast(res.error || "Failed to save computer.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Decommission and permanently delete ${name}? This cannot be undone.`)) return;
    const res = await deleteComputer(id, "admin");
    if (res.success) { showToast(`${name} decommissioned.`); fetchData(); }
    else showToast(res.error || "Delete failed.", "error");
  };

  /* ─── Export Excel ─────────── */
  const exportExcel = () => {
    const headers = ["Computer ID","Hostname","Lab","Bench","IP","MAC","CPU","RAM (GB)","SSD (GB)","HDD (GB)","OS","Status","Condition","Vendor","Purchase Date","Warranty Expiry","Remarks"];
    const rows = filtered.map(c => [
      c.computerId, c.hostname, c.lab?.name || c.labId, c.benchNumber,
      c.ipAddress, c.macAddress, c.cpu, c.ramGb, c.ssdGb, c.hddGb,
      c.operatingSystem, c.status, c.condition, c.vendorDetails,
      c.purchaseDate?.slice(0,10), c.warrantyExpiry?.slice(0,10), c.remarks || ""
    ]);
    exportToExcel(rows, headers, "Computers Register", "SCSIT_Computer_Registry");
    showToast("Excel sheet exported successfully.");
  };

  /* ─── Stats ──────────────── */
  const stats = useMemo(() => ({
    total: computers.length,
    online: computers.filter(c => c.status === "ONLINE").length,
    faulty: computers.filter(c => c.condition === "FAULTY").length,
    underRepair: computers.filter(c => c.status === "UNDER_REPAIR").length,
    warrantyExpired: computers.filter(c => new Date(c.warrantyExpiry) < new Date()).length,
  }), [computers]);

  /* ─── Sortable Header ─────── */
  function SortTh({ label, field }: { label: string; field: keyof Computer }) {
    return (
      <th
        onClick={() => handleSort(field)}
        className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 select-none whitespace-nowrap"
      >
        <span className="flex items-center gap-1">
          {label}
          {sortKey === field ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
        </span>
      </th>
    );
  }

  /* ─── Filter Panel ─────────────────────────────────────────────────────────── */
  function FilterPanel() {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Lab</label>
          <select
            value={filters.lab}
            onChange={e => { setFilters(f => ({ ...f, lab: e.target.value })); setPage(1); }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
          >
            <option value="">All Labs</option>
            {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Status</label>
          <select
            value={filters.status}
            onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
          >
            <option value="">All Status</option>
            {["ONLINE","OFFLINE","UNDER_REPAIR","DECOMMISSIONED"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Condition</label>
          <select
            value={filters.condition}
            onChange={e => { setFilters(f => ({ ...f, condition: e.target.value })); setPage(1); }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
          >
            <option value="">All Conditions</option>
            {["EXCELLENT","WORKING","FAULTY","SCRAP"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">RAM (GB)</label>
          <select
            value={filters.ramGb}
            onChange={e => { setFilters(f => ({ ...f, ramGb: e.target.value })); setPage(1); }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
          >
            <option value="">Any RAM</option>
            {[4,8,16,32,64].map(r => <option key={r} value={r}>{r} GB</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">OS</label>
          <input
            value={filters.os}
            onChange={e => { setFilters(f => ({ ...f, os: e.target.value })); setPage(1); }}
            placeholder="e.g. Windows 11"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Vendor</label>
          <input
            value={filters.vendor}
            onChange={e => { setFilters(f => ({ ...f, vendor: e.target.value })); setPage(1); }}
            placeholder="e.g. Dell, HP"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Warranty</label>
          <select
            value={filters.warrantyExpired}
            onChange={e => { setFilters(f => ({ ...f, warrantyExpired: e.target.value })); setPage(1); }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
          >
            <option value="">All</option>
            <option value="active">Active Warranty</option>
            <option value="expired">Warranty Expired</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => { setFilters({ lab:"",status:"",condition:"",ramGb:"",os:"",vendor:"",warrantyExpired:"" }); setPage(1); }}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg px-3 py-2 text-sm font-medium transition"
          >
            Clear Filters
          </button>
        </div>
      </div>
    );
  }

  /* ─── Add/Edit Form ─────────────────────────────────────────────────────────── */
  function ComputerForm() {
    const f = (field: keyof Computer) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }));
    };

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                {editingId ? "Edit Computer Record" : "Register New Computer"}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">All fields marked * are required</p>
            </div>
            <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-200">
              <X size={20} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[80vh]">
            {/* Identity */}
            <section>
              <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Monitor size={13} /> Identity & Location
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <FormField label="Computer ID *" placeholder="LBA-001" value={form.computerId || ""} onChange={f("computerId")} />
                <FormField label="Hostname *" placeholder="SCSIT-LBA-001" value={form.hostname || ""} onChange={f("hostname")} />
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Lab *</label>
                  <select
                    value={form.labId || ""}
                    onChange={e => setForm(p => ({ ...p, labId: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Select Lab</option>
                    {labs.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                  </select>
                </div>
                <FormField label="Bench Number *" placeholder="A-01" value={form.benchNumber || ""} onChange={f("benchNumber")} />
                <FormField label="IP Address *" placeholder="192.168.1.101" value={form.ipAddress || ""} onChange={f("ipAddress")} />
                <FormField label="MAC Address *" placeholder="AA:BB:CC:DD:EE:FF" value={form.macAddress || ""} onChange={f("macAddress")} />
              </div>
            </section>

            {/* Hardware */}
            <section>
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Cpu size={13} /> Hardware Specifications
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <FormField label="CPU *" placeholder="Intel Core i5-12400" value={form.cpu || ""} onChange={f("cpu")} />
                <FormField label="Motherboard" placeholder="Asus Prime B660M" value={form.motherboard || ""} onChange={f("motherboard")} />
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">RAM (GB) *</label>
                  <select value={form.ramGb || 8} onChange={e => setForm(p => ({ ...p, ramGb: Number(e.target.value) }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    {[4,8,16,32,64].map(r => <option key={r} value={r}>{r} GB</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">SSD (GB)</label>
                  <select value={form.ssdGb || 256} onChange={e => setForm(p => ({ ...p, ssdGb: Number(e.target.value) }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    {[0,128,256,512,1024].map(r => <option key={r} value={r}>{r === 0 ? "None" : r + " GB"}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">HDD (GB)</label>
                  <select value={form.hddGb || 0} onChange={e => setForm(p => ({ ...p, hddGb: Number(e.target.value) }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    {[0,500,1000,2000].map(r => <option key={r} value={r}>{r === 0 ? "None" : r >= 1000 ? (r/1000) + " TB" : r + " GB"}</option>)}
                  </select>
                </div>
                <FormField label="GPU" placeholder="Integrated / NVIDIA GTX" value={form.gpu || ""} onChange={f("gpu")} />
                <FormField label="Monitor" placeholder="Dell 24in FHD IPS" value={form.monitorDetails || ""} onChange={f("monitorDetails")} />
                <FormField label="Keyboard" placeholder="Dell Multimedia KB" value={form.keyboardBrand || ""} onChange={f("keyboardBrand")} />
                <FormField label="Mouse" placeholder="Dell Optical" value={form.mouseBrand || ""} onChange={f("mouseBrand")} />
                <FormField label="UPS" placeholder="APC 600VA" value={form.upsDetails || ""} onChange={f("upsDetails")} />
              </div>
            </section>

            {/* Software & OS */}
            <section>
              <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Server size={13} /> Software & Status
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <FormField label="Operating System *" placeholder="Windows 11 Pro" value={form.operatingSystem || ""} onChange={f("operatingSystem")} />
                <FormField label="BIOS Version" placeholder="F12" value={form.biosVersion || ""} onChange={f("biosVersion")} />
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Status</label>
                  <select value={form.status || "ONLINE"} onChange={e => setForm(p => ({ ...p, status: e.target.value as Computer["status"] }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    {["ONLINE","OFFLINE","UNDER_REPAIR","DECOMMISSIONED"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Condition</label>
                  <select value={form.condition || "EXCELLENT"} onChange={e => setForm(p => ({ ...p, condition: e.target.value as Computer["condition"] }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    {["EXCELLENT","WORKING","FAULTY","SCRAP"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Purchase */}
            <section>
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Shield size={13} /> Purchase & Warranty
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <FormField label="Vendor / Supplier" placeholder="Dell India Pvt Ltd" value={form.vendorDetails || ""} onChange={f("vendorDetails")} />
                <FormField label="Purchase Date *" type="date" value={form.purchaseDate || ""} onChange={f("purchaseDate")} />
                <FormField label="Warranty Expiry *" type="date" value={form.warrantyExpiry || ""} onChange={f("warrantyExpiry")} />
                <FormField label="Invoice URL" placeholder="https://..." value={form.invoiceUrl || ""} onChange={f("invoiceUrl")} />
                <FormField label="Last Service Date" type="date" value={form.lastServiceDate || ""} onChange={f("lastServiceDate")} />
                <FormField label="Next Service Date" type="date" value={form.nextServiceDate || ""} onChange={f("nextServiceDate")} />
              </div>
            </section>

            {/* Remarks */}
            <section>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Remarks</h3>
              <textarea
                value={form.remarks || ""}
                onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
                placeholder="Any additional notes about this computer..."
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500 resize-none"
              />
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {editingId ? "Update Record" : "Register Computer"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Detail Modal ──────────────────────────────────────────────────────────── */
  function DetailModal({ c }: { c: Computer }) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-zinc-100">{c.computerId} — Digital Record</h2>
              <p className="text-xs text-zinc-500">{c.hostname} · {c.lab?.name}</p>
            </div>
            <button onClick={() => setShowDetail(null)} className="text-zinc-400 hover:text-zinc-200"><X size={20} /></button>
          </div>
          <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[80vh]">
            <div className="flex gap-6 flex-col md:flex-row">
              {/* QR */}
              <div className="flex-shrink-0">
                <QrDisplay computerId={c.computerId} qrCode={c.qrCode} />
              </div>
              {/* Quick Stats */}
              <div className="flex-1 grid grid-cols-2 gap-3">
                <InfoCard label="Status" value={<StatusBadge status={c.status} />} />
                <InfoCard label="Condition" value={<ConditionBadge cond={c.condition} />} />
                <InfoCard label="Lab" value={c.lab?.name || "–"} />
                <InfoCard label="Bench" value={c.benchNumber} />
                <InfoCard label="IP Address" value={c.ipAddress} mono />
                <InfoCard label="MAC Address" value={c.macAddress} mono />
              </div>
            </div>

            <hr className="border-zinc-800" />

            {/* Specs */}
            <div>
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Hardware Specifications</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <InfoCard label="CPU" value={c.cpu} />
                <InfoCard label="Motherboard" value={c.motherboard} />
                <InfoCard label="RAM" value={`${c.ramGb} GB`} />
                <InfoCard label="SSD" value={c.ssdGb ? `${c.ssdGb} GB` : "None"} />
                <InfoCard label="HDD" value={c.hddGb ? (c.hddGb >= 1000 ? `${c.hddGb/1000} TB` : `${c.hddGb} GB`) : "None"} />
                <InfoCard label="GPU" value={c.gpu || "Integrated"} />
                <InfoCard label="Monitor" value={c.monitorDetails} />
                <InfoCard label="Keyboard" value={c.keyboardBrand} />
                <InfoCard label="Mouse" value={c.mouseBrand} />
                <InfoCard label="UPS" value={c.upsDetails || "None"} />
                <InfoCard label="OS" value={c.operatingSystem} />
                <InfoCard label="BIOS" value={c.biosVersion || "–"} />
              </div>
            </div>

            <hr className="border-zinc-800" />

            {/* Purchase */}
            <div>
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">Purchase & Warranty</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <InfoCard label="Vendor" value={c.vendorDetails} />
                <InfoCard label="Purchase Date" value={c.purchaseDate?.slice(0,10) || "–"} />
                <InfoCard label="Warranty Expiry" value={c.warrantyExpiry?.slice(0,10) || "–"} highlight={new Date(c.warrantyExpiry) < new Date()} />
                <InfoCard label="Invoice" value={c.invoiceUrl ? "Attached" : "Not attached"} />
                <InfoCard label="Last Serviced" value={c.lastServiceDate?.slice(0,10) || "–"} />
                <InfoCard label="Next Service" value={c.nextServiceDate?.slice(0,10) || "–"} />
              </div>
            </div>

            {c.remarks && (
              <>
                <hr className="border-zinc-800" />
                <div>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Remarks</h3>
                  <p className="text-sm text-zinc-300 bg-zinc-900 rounded-lg px-4 py-3">{c.remarks}</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-600">Last Updated: {new Date(c.updatedAt).toLocaleString()}</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDetail(null); openEdit(c); }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded-lg transition flex items-center gap-2"
              >
                <Edit2 size={13} /> Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Info Card ─────────────────────────────────────────────────────────────── */
  function InfoCard({ label, value, mono = false, highlight = false }: { label: string; value: React.ReactNode; mono?: boolean; highlight?: boolean }) {
    return (
      <div className="bg-zinc-900 rounded-lg px-3 py-2.5">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-sm font-medium ${highlight ? "text-red-400" : "text-zinc-200"} ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    );
  }

  /* ─── Form Field ─────────────────────────────────────────────────────────────── */
  function FormField({ label, placeholder, value, onChange, type = "text" }: {
    label: string; placeholder?: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string;
  }) {
    return (
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500 transition"
        />
      </div>
    );
  }

  /* ─── Scanner Modal ────────────────────────────────────────────────────────── */
  function ScannerModal() {
    return (
      <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <QrCode className="text-rose-400" size={16} /> Asset Tag Verification
            </h3>
            <button onClick={() => setShowScanner(false)} className="text-zinc-400 hover:text-zinc-200"><X size={18} /></button>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Verify workstation allocations. Point your device camera at the asset QR Code / Barcode, drag & drop a tag image, or type the code manually below to inspect details instantly.
          </p>

          <form onSubmit={handleScanSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter Computer ID, Hostname, Barcode or IP..."
                value={scannerInput}
                onChange={e => setScannerInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-3 pr-10 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-rose-500 transition font-mono uppercase"
                autoFocus
              />
              <button type="submit" disabled={scannerLoading} className="absolute right-2 top-2.5 p-1 text-zinc-400 hover:text-rose-455">
                {scannerLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>

            {scannerError && (
              <div className="p-3 bg-red-955/20 border border-red-900/50 text-red-400 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{scannerError}</span>
              </div>
            )}

            <div className="border border-dashed border-zinc-800 rounded-xl p-6 bg-zinc-900/40 flex flex-col items-center justify-center gap-2 text-center select-none relative group">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition duration-200">
                <QrCode size={20} />
              </div>
              <div>
                <span className="text-xs font-semibold text-zinc-350 block">Camera auto-scan active</span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Waiting for asset sticker to come in range...</span>
              </div>
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-rose-500/20 rounded-xl pointer-events-none transition duration-200" />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowScanner(false)}
                className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={scannerLoading || !scannerInput.trim()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition flex items-center gap-2"
              >
                Inspect Record
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ─── CSV Import Modal ──────────────────────────────────────────────────────── */
  function ImportModal() {
    return (
      <div className="fixed inset-0 z-55 flex items-start justify-center pt-10 pb-10 px-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
        <div className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <FileSpreadsheet className="text-rose-400" size={16} /> Import Offline System Records
            </h3>
            <button onClick={() => setShowImport(false)} className="text-zinc-400 hover:text-zinc-200"><X size={18} /></button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Upload an offline CSV register containing your workstation records. The system will parse column mappings, resolve department locations dynamically, and bulk import records into Neon PostgreSQL database via Prisma ORM.
            </p>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Required Template Columns:</span>
              <div className="flex flex-wrap gap-1.5 font-mono text-[9px]">
                {["computerId", "hostname", "labCode", "labName", "benchNumber", "ipAddress", "macAddress", "cpu", "ramGb", "ssdGb", "operatingSystem", "status", "condition"].map(c => (
                  <span key={c} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-rose-350">{c}</span>
                ))}
              </div>
            </div>

            <div className="border-2 border-dashed border-zinc-800 rounded-xl p-8 bg-zinc-900/10 flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:border-rose-500/30 transition duration-200 relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVImportFile}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-200 block">Click to select CSV File</span>
                <span className="text-[10px] text-zinc-500 mt-1 block">Drag and drop templates or select file (Max 10MB)</span>
              </div>
            </div>

            {importError && (
              <div className="p-3 bg-red-955/20 border border-red-900/50 text-red-400 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccessMsg && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-805/50 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle size={14} className="shrink-0" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {importPreview.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider">Preview Systems ({importPreview.length} rows)</span>
                  <button onClick={() => setImportPreview([])} className="text-xs text-rose-455 hover:text-rose-300">Clear</button>
                </div>
                <div className="border border-zinc-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-zinc-900 text-zinc-500 sticky top-0 border-b border-zinc-800">
                      <tr>
                        <th className="p-2 border-r border-zinc-800">Computer ID</th>
                        <th className="p-2 border-r border-zinc-800">Hostname</th>
                        <th className="p-2 border-r border-zinc-800">Lab Code</th>
                        <th className="p-2 border-r border-zinc-800">IP Address</th>
                        <th className="p-2">CPU</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 bg-zinc-900/20">
                      {importPreview.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/20">
                          <td className="p-2 border-r border-zinc-800 text-rose-400 font-semibold">{item.computerId}</td>
                          <td className="p-2 border-r border-zinc-800 text-zinc-300">{item.hostname}</td>
                          <td className="p-2 border-r border-zinc-800 text-zinc-400">{item.labCode}</td>
                          <td className="p-2 border-r border-zinc-800 text-zinc-400">{item.ipAddress}</td>
                          <td className="p-2 text-zinc-400 truncate max-w-[120px]">{item.cpu}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-955">
            <button
              onClick={() => setShowImport(false)}
              className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleImportConfirm}
              disabled={saving || importPreview.length === 0}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition flex items-center gap-2"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Confirm Import
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────────────────────────────────────── */
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all
          ${toast.type === "success" ? "bg-emerald-950 border-emerald-700 text-emerald-300" : "bg-red-950 border-red-700 text-red-300"}`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {showForm && <ComputerForm />}
      {showDetail && <DetailModal c={showDetail} />}
      {showScanner && <ScannerModal />}
      {showImport && <ImportModal />}

      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin")}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Monitor size={16} className="text-rose-400" />
                Computer Registry
              </h1>
              <p className="text-xs text-zinc-500">SCSIT LabOS · Digital Computer Register</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition" title="Refresh">
              <RefreshCw size={15} />
            </button>
            <button
              onClick={exportExcel}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-805 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
            >
              <FileSpreadsheet size={14} /> Export Excel
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition"
            >
              <Plus size={14} /> Register Computer
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5">

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {[
            { label: "Total Computers", value: stats.total, color: "text-zinc-200", icon: <Monitor size={16} /> },
            { label: "Online", value: stats.online, color: "text-emerald-400", icon: <CheckCircle size={16} /> },
            { label: "Faulty", value: stats.faulty, color: "text-red-400", icon: <AlertTriangle size={16} /> },
            { label: "Under Repair", value: stats.underRepair, color: "text-amber-400", icon: <Activity size={16} /> },
            { label: "Warranty Expired", value: stats.warrantyExpired, color: "text-orange-400", icon: <Shield size={16} /> },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <div className={`flex items-center gap-2 text-xl font-bold ${s.color}`}>
                {s.icon} {s.value}
              </div>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter Bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by Computer ID, Hostname, IP, MAC, CPU, Vendor, OS, Lab..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500 transition"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition
              ${showFilters ? "bg-rose-600 border-rose-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{activeFiltersCount}</span>
            )}
          </button>
        </div>

        {showFilters && <FilterPanel />}

        {/* Results info */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500">
            Showing {paginated.length} of {filtered.length} computers
            {filtered.length !== computers.length && ` (filtered from ${computers.length} total)`}
          </p>
          {(search || activeFiltersCount > 0) && (
            <button
              onClick={() => { setSearch(""); setFilters({ lab:"",status:"",condition:"",ramGb:"",os:"",vendor:"",warrantyExpired:"" }); }}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              <X size={11} /> Clear all
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-rose-400" />
              <span className="ml-3 text-zinc-500 text-sm">Loading computer registry...</span>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Monitor size={36} className="text-zinc-700 mb-3" />
              <p className="text-zinc-400 font-medium">No computers found</p>
              <p className="text-zinc-600 text-sm mt-1">
                {search || activeFiltersCount > 0 ? "Try adjusting your search or filters." : "Register the first computer to get started."}
              </p>
              {!search && !activeFiltersCount && (
                <button onClick={openAdd} className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg transition">
                  Register Computer
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-800/50 border-b border-zinc-800">
                  <tr>
                    <SortTh label="Computer ID" field="computerId" />
                    <SortTh label="Hostname" field="hostname" />
                    <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Lab</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bench</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">IP Address</th>
                    <SortTh label="CPU" field="cpu" />
                    <SortTh label="RAM" field="ramGb" />
                    <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">OS</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Condition</th>
                    <SortTh label="Warranty" field="warrantyExpiry" />
                    <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {paginated.map(c => {
                    const warrantyExpired = new Date(c.warrantyExpiry) < new Date();
                    return (
                      <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors group">
                        <td className="px-3 py-3">
                          <span className="font-mono text-rose-400 font-semibold text-xs">{c.computerId}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-zinc-200 font-medium">{c.hostname}</span>
                        </td>
                        <td className="px-3 py-3 text-zinc-400 text-xs">{c.lab?.name || "–"}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs">{c.benchNumber}</td>
                        <td className="px-3 py-3 font-mono text-zinc-400 text-xs">{c.ipAddress}</td>
                        <td className="px-3 py-3 text-zinc-300 text-xs max-w-[140px] truncate" title={c.cpu}>{c.cpu}</td>
                        <td className="px-3 py-3 text-zinc-300 text-xs">{c.ramGb} GB</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs max-w-[100px] truncate" title={c.operatingSystem}>{c.operatingSystem}</td>
                        <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                        <td className="px-3 py-3"><ConditionBadge cond={c.condition} /></td>
                        <td className="px-3 py-3">
                          <span className={`text-xs font-mono ${warrantyExpired ? "text-red-400" : "text-zinc-400"}`}>
                            {c.warrantyExpiry?.slice(0, 10)}
                            {warrantyExpired && " ⚠"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setShowDetail(c)}
                              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition"
                              title="View Record"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => openEdit(c)}
                              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-blue-300 transition"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id, c.computerId)}
                              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition"
                              title="Decommission"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-zinc-500">
              Page {page} of {totalPages} · {filtered.length} records
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-zinc-200 transition"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const pg = page <= 4 ? i + 1 : page + i - 3;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                      pg === page ? "bg-rose-600 text-white" : "hover:bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-zinc-200 transition"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
