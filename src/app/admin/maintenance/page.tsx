"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench, Plus, Search, Filter, X, ChevronDown, ChevronLeft, ChevronRight,
  Eye, Edit2, Trash2, RefreshCw, ArrowLeft, AlertTriangle, CheckCircle,
  Clock, Loader2, Check, FileSpreadsheet, SlidersHorizontal, ArrowRight,
  CalendarDays, User, Monitor, Building2
} from "lucide-react";
import {
  getMaintenanceLogs, getLaboratories, getComputers,
  saveMaintenanceLog, updateMaintenanceStatus, deleteMaintenanceLog
} from "../../actions";
import { exportToExcel } from "../../../utils/exportHelper";

const STATUSES = ["REPORTED","ASSIGNED","DIAGNOSIS","WAITING_PARTS","REPAIRING","TESTING","RESOLVED","CLOSED"] as const;
type MaintStatus = typeof STATUSES[number];

const STATUS_META: Record<string, { label: string; color: string; next?: string }> = {
  REPORTED:      { label: "Reported",       color: "bg-red-500/15 text-red-400 border-red-500/30",       next: "ASSIGNED" },
  ASSIGNED:      { label: "Assigned",       color: "bg-orange-500/15 text-orange-400 border-orange-500/30", next: "DIAGNOSIS" },
  DIAGNOSIS:     { label: "Diagnosis",      color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", next: "WAITING_PARTS" },
  WAITING_PARTS: { label: "Waiting Parts",  color: "bg-purple-500/15 text-purple-400 border-purple-500/30", next: "REPAIRING" },
  REPAIRING:     { label: "Repairing",      color: "bg-blue-500/15 text-blue-400 border-blue-500/30",    next: "TESTING" },
  TESTING:       { label: "Testing",        color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",    next: "RESOLVED" },
  RESOLVED:      { label: "Resolved",       color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", next: "CLOSED" },
  CLOSED:        { label: "Closed",         color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
};

interface MaintenanceLog {
  id: string; maintenanceId: string; labId: string; computerId: string;
  pcNumber: string; systemMake: string; systemModel: string; serialNumber: string;
  reportedDate: string; issueDescription: string; reasonForDamage?: string;
  actionTaken?: string; technicianName: string; status: string;
  completionDate?: string; remarks?: string;
  lab?: { name: string; code: string }; computer?: { computerId: string; hostname: string };
}

const EMPTY_FORM = {
  labId:"", computerId:"", pcNumber:"", systemMake:"", systemModel:"", serialNumber:"",
  issueDescription:"", reasonForDamage:"", technicianName:"", status:"REPORTED",
};

const formatDate = (d: any, len = 10) => {
  if (!d) return "";
  try {
    const dateObj = typeof d === "string" ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return "";
    return dateObj.toISOString().slice(0, len);
  } catch (e) {
    return "";
  }
};

export default function MaintenanceRegister() {
  const router = useRouter();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [computers, setComputers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState<MaintenanceLog | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<MaintenanceLog | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [statusRemarks, setStatusRemarks] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLab, setFilterLab] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ msg: string; type: "success"|"error" }|null>(null);
  const PAGE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, labsRes, compsRes] = await Promise.all([
        getMaintenanceLogs(), getLaboratories(), getComputers()
      ]);
      if (logsRes.success) setLogs(logsRes.data || []);
      if (labsRes.success) setLabs(labsRes.data || labsRes.labs || []);
      if (compsRes.success) setComputers(compsRes.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (msg: string, type: "success"|"error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000);
  };

  const filtered = useMemo(() => {
    let list = [...logs];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(l =>
      l.maintenanceId.toLowerCase().includes(q) ||
      l.issueDescription.toLowerCase().includes(q) ||
      l.technicianName.toLowerCase().includes(q) ||
      (l.lab?.name || "").toLowerCase().includes(q) ||
      (l.computer?.computerId || "").toLowerCase().includes(q)
    );
    if (filterStatus) list = list.filter(l => l.status === filterStatus);
    if (filterLab) list = list.filter(l => l.labId === filterLab);
    return list;
  }, [logs, search, filterStatus, filterLab]);

  const paginated = useMemo(() => filtered.slice((page-1)*PAGE, page*PAGE), [filtered, page]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));

  const stats = useMemo(() => ({
    open: logs.filter(l => !["RESOLVED","CLOSED"].includes(l.status)).length,
    resolved: logs.filter(l => ["RESOLVED","CLOSED"].includes(l.status)).length,
    critical: logs.filter(l => l.status === "REPORTED").length,
    repairing: logs.filter(l => l.status === "REPAIRING").length,
  }), [logs]);

  const handleSave = async () => {
    if (!form.labId || !form.computerId || !form.issueDescription || !form.technicianName) {
      showToast("Fill Lab, Computer, Issue, and Technician fields.", "error"); return;
    }
    setSaving(true);
    try {
      const res = await saveMaintenanceLog({ ...form, id: editingId || undefined });
      if (res.success) { showToast(editingId ? "Record updated." : "Maintenance ticket created."); setShowForm(false); fetchData(); }
      else showToast(res.error || "Failed.", "error");
    } finally { setSaving(false); }
  };

  const handleStatusAdvance = async () => {
    if (!showStatusModal) return;
    setSaving(true);
    try {
      const res = await updateMaintenanceStatus(showStatusModal.id, nextStatus, statusRemarks);
      if (res.success) { showToast(`Status updated to ${STATUS_META[nextStatus]?.label}.`); setShowStatusModal(null); fetchData(); }
      else showToast(res.error || "Failed.", "error");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, mid: string) => {
    if (!confirm(`Delete maintenance record ${mid}?`)) return;
    const res = await deleteMaintenanceLog(id);
    if (res.success) { showToast("Record deleted."); fetchData(); }
    else showToast(res.error || "Delete failed.", "error");
  };

  const exportExcel = () => {
    const headers = ["Ticket ID","Lab","Computer","PC No","Issue","Technician","Status","Reported","Completed","Remarks"];
    const rows = filtered.map(l => [
      l.maintenanceId, l.lab?.name||"", l.computer?.computerId||"", l.pcNumber,
      l.issueDescription, l.technicianName, l.status,
      formatDate(l.reportedDate), formatDate(l.completionDate)||"", l.remarks||""
    ]);
    exportToExcel(rows, headers, "Maintenance Register", "SCSIT_Maintenance_Logs");
    showToast("Excel sheet exported successfully.");
  };

  const labComputers = useMemo(() => computers.filter(c => c.labId === form.labId), [computers, form.labId]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl ${toast.type==="success"?"bg-emerald-950 border-emerald-700 text-emerald-300":"bg-red-950 border-red-700 text-red-300"}`}>
          {toast.type==="success"?<CheckCircle size={15}/>:<AlertTriangle size={15}/>} {toast.msg}
        </div>
      )}

      {/* Status Advance Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-100 mb-1">Advance Ticket Status</h3>
            <p className="text-xs text-zinc-500 mb-4">{showStatusModal.maintenanceId} — {showStatusModal.issueDescription}</p>
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${STATUS_META[showStatusModal.status]?.color}`}>{STATUS_META[showStatusModal.status]?.label}</span>
              <ArrowRight size={14} className="text-zinc-500"/>
              <select value={nextStatus} onChange={e=>setNextStatus(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                <option value="">Select next status</option>
                {STATUSES.filter(s => STATUSES.indexOf(s) > STATUSES.indexOf(showStatusModal.status as MaintStatus)).map(s =>
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                )}
              </select>
            </div>
            <textarea value={statusRemarks} onChange={e=>setStatusRemarks(e.target.value)} placeholder="Remarks / Notes on this transition..." rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500 resize-none mb-4"/>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>setShowStatusModal(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition">Cancel</button>
              <button onClick={handleStatusAdvance} disabled={!nextStatus||saving}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2">
                {saving?<Loader2 size={13} className="animate-spin"/>:<Check size={13}/>} Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100">{editingId?"Edit Maintenance Record":"File New Maintenance Ticket"}</h2>
              <button onClick={()=>setShowForm(false)} className="text-zinc-400 hover:text-zinc-200"><X size={20}/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Lab *</label>
                  <select value={form.labId} onChange={e=>setForm((p:any)=>({...p,labId:e.target.value,computerId:""}))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    <option value="">Select Lab</option>
                    {labs.map((l:any)=><option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Computer *</label>
                  <select value={form.computerId} onChange={e=>{
                    const comp = computers.find((c:any)=>c.id===e.target.value);
                    setForm((p:any)=>({...p,computerId:e.target.value,pcNumber:comp?.benchNumber||"",systemMake:comp?.vendorDetails||"",systemModel:comp?.cpu||"",serialNumber:comp?.macAddress||""}));
                  }} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    <option value="">Select Computer</option>
                    {labComputers.map((c:any)=><option key={c.id} value={c.id}>{c.computerId} — {c.hostname}</option>)}
                  </select>
                </div>
                {[
                  {label:"PC / Bench No",field:"pcNumber",placeholder:"A-01"},
                  {label:"System Make",field:"systemMake",placeholder:"Dell"},
                  {label:"System Model",field:"systemModel",placeholder:"OptiPlex 7010"},
                  {label:"Serial Number",field:"serialNumber",placeholder:"DL2024XYZ"},
                  {label:"Technician Name *",field:"technicianName",placeholder:"Raikwar Sir"},
                ].map(({label,field,placeholder})=>(
                  <div key={field}>
                    <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
                    <input value={form[field]||""} onChange={e=>setForm((p:any)=>({...p,[field]:e.target.value}))} placeholder={placeholder}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Issue Description *</label>
                <textarea value={form.issueDescription||""} onChange={e=>setForm((p:any)=>({...p,issueDescription:e.target.value}))}
                  placeholder="Describe the problem clearly..." rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500 resize-none"/>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Reason for Damage</label>
                <input value={form.reasonForDamage||""} onChange={e=>setForm((p:any)=>({...p,reasonForDamage:e.target.value}))} placeholder="Hardware fault, physical damage, etc."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2">
                {saving?<Loader2 size={14} className="animate-spin"/>:<Check size={14}/>}
                {editingId?"Update Record":"File Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={()=>router.push("/admin")} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"><ArrowLeft size={18}/></button>
            <div>
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2"><Wrench size={16} className="text-amber-400"/>Maintenance Register</h1>
              <p className="text-xs text-zinc-500">SCSIT LabOS · Digital Maintenance Record Book</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition"><RefreshCw size={15}/></button>
            <button onClick={exportExcel} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"><FileSpreadsheet size={14}/> Excel</button>
            <button onClick={()=>{setEditingId(null);setForm(EMPTY_FORM);setShowForm(true);}}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition">
              <Plus size={14}/> File Ticket
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            {label:"Open Tickets",value:stats.open,color:"text-amber-400"},
            {label:"Critical (Reported)",value:stats.critical,color:"text-red-400"},
            {label:"In Repair",value:stats.repairing,color:"text-blue-400"},
            {label:"Resolved/Closed",value:stats.resolved,color:"text-emerald-400"},
          ].map(s=>(
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search by ticket ID, issue, technician, computer, lab..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500 transition"/>
          </div>
          <select value={filterLab} onChange={e=>{setFilterLab(e.target.value);setPage(1);}}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-rose-500">
            <option value="">All Labs</option>
            {labs.map((l:any)=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-rose-500">
            <option value="">All Status</option>
            {STATUSES.map(s=><option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-amber-400"/><span className="ml-3 text-zinc-500 text-sm">Loading maintenance register...</span></div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Wrench size={36} className="text-zinc-700 mb-3"/>
              <p className="text-zinc-400 font-medium">No maintenance records found</p>
              {!search&&!filterStatus&&<button onClick={()=>{setEditingId(null);setForm(EMPTY_FORM);setShowForm(true);}} className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg transition">File First Ticket</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-800/50 border-b border-zinc-800">
                  <tr>
                    {["Ticket ID","Lab","Computer","Issue","Technician","Status","Reported","Action"].map(h=>(
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {paginated.map(l=>(
                    <tr key={l.id} className="hover:bg-zinc-800/40 transition-colors group">
                      <td className="px-3 py-3"><span className="font-mono text-amber-400 font-semibold text-xs">{l.maintenanceId}</span></td>
                      <td className="px-3 py-3 text-zinc-400 text-xs">{l.lab?.name||"–"}</td>
                      <td className="px-3 py-3"><span className="font-mono text-zinc-300 text-xs">{l.computer?.computerId||"–"}</span></td>
                      <td className="px-3 py-3 max-w-[200px]"><p className="text-zinc-300 text-xs truncate" title={l.issueDescription}>{l.issueDescription}</p></td>
                      <td className="px-3 py-3 text-zinc-400 text-xs">{l.technicianName}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${STATUS_META[l.status]?.color||""}`}>
                          {STATUS_META[l.status]?.label||l.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-zinc-500 text-xs">{formatDate(l.reportedDate)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {STATUS_META[l.status]?.next && (
                            <button onClick={()=>{setShowStatusModal(l);setNextStatus(STATUS_META[l.status]?.next||"");setStatusRemarks("");}}
                              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition" title="Advance Status">
                              <ArrowRight size={13}/>
                            </button>
                          )}
                          <button onClick={()=>{setEditingId(l.id);setForm({...l});setShowForm(true);}} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-blue-300 transition" title="Edit"><Edit2 size={13}/></button>
                          <button onClick={()=>handleDelete(l.id,l.maintenanceId)} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition" title="Delete"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-zinc-500">Page {page} of {totalPages} · {filtered.length} records</p>
            <div className="flex items-center gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-400"><ChevronLeft size={15}/></button>
              {Array.from({length:Math.min(7,totalPages)},(_,i)=>{const pg=page<=4?i+1:page+i-3;if(pg<1||pg>totalPages)return null;return(<button key={pg} onClick={()=>setPage(pg)} className={`w-8 h-8 rounded-lg text-xs font-medium transition ${pg===page?"bg-rose-600 text-white":"hover:bg-zinc-800 text-zinc-400"}`}>{pg}</button>);})}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-400"><ChevronRight size={15}/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
