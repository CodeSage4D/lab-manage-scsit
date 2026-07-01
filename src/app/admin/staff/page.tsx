"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Search, Trash2, Edit2, RefreshCw, ArrowLeft, CheckCircle, AlertTriangle, Loader2, Check, X, FileSpreadsheet, Briefcase, Activity, CalendarDays, Award, Clock, History, Mail, Phone, Shield } from "lucide-react";
import { getAdmins, saveAdmin, deleteAdmin, getDailyWorkLogs, getMaintenanceLogs, getAuditLogs } from "../../actions";

interface Staff {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  mobile: string;
  designation: string;
  profilePhoto?: string;
  skills: string[];
  certificates?: string[];
  experienceYears: number;
  createdAt: string;
}

const DESIGNATIONS = ["Director Admin", "HOD", "Technical Assistant", "Trainer of Practice", "Lab Assistant", "IT Person"];
const EMPTY_FORM = { employeeId: "", name: "", email: "", mobile: "", designation: "Lab Assistant", skills: "", experienceYears: 1, password: "" };

export default function StaffManagement() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [maintLogs, setMaintLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, wRes, mRes, aRes] = await Promise.all([
        getAdmins(),
        getDailyWorkLogs(),
        getMaintenanceLogs(),
        getAuditLogs()
      ]);
      if (uRes.success) setStaffList(uRes.data || []);
      if (wRes.success) setWorkLogs(wRes.data || []);
      if (mRes.success) setMaintLogs(mRes.data || []);
      if (aRes.success) setAuditLogs(aRes.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return staffList;
    const q = search.toLowerCase();
    return staffList.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.employeeId.toLowerCase().includes(q) ||
      s.designation.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  }, [staffList, search]);

  const handleSave = async () => {
    if (!form.employeeId || !form.name || !form.email) {
      showToast("Fill in Employee ID, Name, and Email.", "error");
      return;
    }
    setSaving(true);
    try {
      // Split comma separated skills to array
      const payload = {
        ...form,
        id: editingId || undefined,
        skills: typeof form.skills === "string" ? form.skills.split(",").map((s: string) => s.trim()).filter(Boolean) : form.skills
      };
      const res = await saveAdmin(payload);
      if (res.success) {
        showToast(editingId ? "Profile updated." : "Staff member registered.");
        setShowForm(false);
        fetchData();
      } else {
        showToast(res.error || "Failed.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === "admin") {
      showToast("System administrator cannot be deleted.", "error");
      return;
    }
    if (!confirm(`Delete profile for ${name}?`)) return;
    const res = await deleteAdmin(id);
    if (res.success) {
      showToast("Staff profile deleted.");
      fetchData();
    } else {
      showToast(res.error || "Failed.", "error");
    }
  };

  // Stats mapped for a selected staff member
  const staffStats = useMemo(() => {
    if (!selectedStaff) return null;
    const empId = selectedStaff.employeeId;
    const name = selectedStaff.name;

    // Filter work logs
    const staffWork = workLogs.filter(w => w.user?.employeeId === empId || w.userId === selectedStaff.id);
    const totalMinutes = staffWork.reduce((s, w) => s + (w.durationMinutes || 0), 0);
    const workHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Filter maintenance logs
    const staffMaint = maintLogs.filter(m => m.technicianName?.toLowerCase() === name.toLowerCase() || m.remarks?.includes(name));

    // Filter audit actions
    const staffAudits = auditLogs.filter(a => a.username?.toLowerCase() === name.toLowerCase() || a.userId === empId);

    return {
      workLogs: staffWork,
      workHours,
      maintenanceCount: staffMaint.length,
      maintLogs: staffMaint,
      audits: staffAudits,
    };
  }, [selectedStaff, workLogs, maintLogs, auditLogs]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl ${toast.type === "success" ? "bg-emerald-950 border-emerald-700 text-emerald-300" : "bg-red-950 border-red-700 text-red-300"}`}>
          {toast.type === "success" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100">{editingId ? "Edit Staff Details" : "Register Staff Member"}</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-200"><X size={20}/></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Employee ID *</label>
                  <input value={form.employeeId || ""} onChange={e => setForm((p: any) => ({ ...p, employeeId: e.target.value }))} placeholder="SCSIT-EMP-10"
                    disabled={!!editingId} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500 disabled:opacity-50"/>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Full Name *</label>
                  <input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} placeholder="Prof. Rajesh K."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Email Address *</label>
                  <input type="email" value={form.email || ""} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} placeholder="rajesh@symbiosis.edu"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Mobile Number</label>
                  <input value={form.mobile || ""} onChange={e => setForm((p: any) => ({ ...p, mobile: e.target.value }))} placeholder="9876543210"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Designation</label>
                  <select value={form.designation} onChange={e => setForm((p: any) => ({ ...p, designation: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Experience (Years)</label>
                  <input type="number" min="0" value={form.experienceYears} onChange={e => setForm((p: any) => ({ ...p, experienceYears: Number(e.target.value) }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Skills (Comma separated)</label>
                <input value={form.skills || ""} onChange={e => setForm((p: any) => ({ ...p, skills: e.target.value }))} placeholder="Networking, Linux, Database Admin, React"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
              </div>
              {!editingId && (
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Initial Security Password *</label>
                  <input type="password" value={form.password || ""} onChange={e => setForm((p: any) => ({ ...p, password: e.target.value }))} placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {editingId ? "Update Profile" : "Register Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Overview Workspace / Details Sidebar */}
      {selectedStaff && staffStats && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-950 border-l border-zinc-800 w-full max-w-2xl h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-600/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-sm">
                  {selectedStaff.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-zinc-100 text-sm leading-tight">{selectedStaff.name}</h2>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{selectedStaff.designation} · {selectedStaff.employeeId}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStaff(null)} className="text-zinc-400 hover:text-zinc-200"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Card & Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
                  <Mail size={16} className="text-rose-400 shrink-0" />
                  <div className="min-w-0"><p className="text-[10px] text-zinc-500 uppercase">Email</p><p className="text-xs text-zinc-200 truncate font-semibold">{selectedStaff.email}</p></div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
                  <Phone size={16} className="text-rose-400 shrink-0" />
                  <div className="min-w-0"><p className="text-[10px] text-zinc-500 uppercase">Contact</p><p className="text-xs text-zinc-200 font-semibold">{selectedStaff.mobile}</p></div>
                </div>
              </div>

              {/* Experience and Skills */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-450">Experience Level</span>
                  <span className="font-semibold text-zinc-200">{selectedStaff.experienceYears} Years</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1.5">Expertise Tags:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStaff.skills.length === 0 ? <span className="text-xs text-zinc-650 italic">No skills listed</span> :
                      selectedStaff.skills.map((s, idx) => <span key={idx} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-rose-350">{s}</span>)}
                  </div>
                </div>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-violet-400">{staffStats.workHours}h</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Hours Logged</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-blue-400">{staffStats.maintenanceCount}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Repairs Handled</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-emerald-400">{staffStats.audits.length}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Audit Triggers</p>
                </div>
              </div>

              {/* Tab options / timelines */}
              <div className="space-y-4">
                {/* Daily Work logs */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Clock size={13} className="text-violet-400" /> Daily Work Timeline</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {staffStats.workLogs.length === 0 ? <p className="text-xs text-zinc-650 italic py-2">No work logs recorded.</p> :
                      staffStats.workLogs.map((wl: any) => (
                        <div key={wl.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 flex justify-between items-start gap-4">
                          <div>
                            <p className="text-xs text-zinc-300 font-medium leading-relaxed">{wl.tasksPerformed}</p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-1">{wl.labScope} · {wl.date?.slice(0, 10)}</p>
                          </div>
                          <span className="text-[10px] text-violet-400 font-mono shrink-0">{wl.durationMinutes}m</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Repairs handled */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity size={13} className="text-blue-400" /> Maintenance Actions</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {staffStats.maintLogs.length === 0 ? <p className="text-xs text-zinc-650 italic py-2">No repairs registered to this account.</p> :
                      staffStats.maintLogs.map((ml: any) => (
                        <div key={ml.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 flex justify-between items-center">
                          <div>
                            <p className="text-xs text-zinc-300 font-medium">{ml.issueDescription}</p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">PC {ml.pcNumber || "–"} · {ml.lab?.name || "General Lab"}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full border text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border-emerald-500/30">{ml.status}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Audit trail */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><History size={13} className="text-emerald-400" /> Audit Log Timeline</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[10px]">
                    {staffStats.audits.length === 0 ? <p className="text-xs text-zinc-650 italic py-2">No audits matched.</p> :
                      staffStats.audits.map((al: any) => (
                        <div key={al.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex justify-between items-center">
                          <div>
                            <p className="text-zinc-300">{al.actionPerformed}</p>
                            <p className="text-zinc-500 text-[9px] mt-0.5">{al.tableName} · {new Date(al.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin")} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"><ArrowLeft size={18}/></button>
            <div>
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2"><Users size={16} className="text-rose-400"/>Staff Profile Workspace</h1>
              <p className="text-xs text-zinc-500">SCSIT LabOS · Digital Staff Operations & Log Registry</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition"><RefreshCw size={15}/></button>
            <button onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition"><Plus size={14}/>Register Staff</button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff members by name, employee ID, designation, email..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-rose-400"/><span className="ml-3 text-zinc-500 text-sm">Loading staff workspace...</span></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(staff => (
              <div key={staff.id} onClick={() => setSelectedStaff(staff)} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition cursor-pointer group relative flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-600/10 border border-rose-500/20 text-rose-455 flex items-center justify-center font-bold text-sm">
                        {staff.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-100 text-sm">{staff.name}</h3>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{staff.employeeId}</p>
                      </div>
                    </div>
                    <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded text-[9px] font-semibold uppercase">{staff.designation}</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-400 my-4">
                    <p className="flex items-center gap-1.5"><Mail size={12} className="text-zinc-600" /> {staff.email}</p>
                    <p className="flex items-center gap-1.5"><Phone size={12} className="text-zinc-600" /> {staff.mobile}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800 mt-2">
                  <p className="text-[10px] text-zinc-500 font-semibold">{staff.experienceYears}y Experience</p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditingId(staff.id); setForm({ ...staff, skills: staff.skills.join(", ") }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-blue-300 transition" title="Edit Profile"><Edit2 size={13}/></button>
                    {staff.id !== "admin" && (
                      <button onClick={() => handleDelete(staff.id, staff.name)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition" title="Delete Profile"><Trash2 size={13}/></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 flex flex-col items-center justify-center py-20">
                <Users size={36} className="text-zinc-700 mb-3" />
                <p className="text-zinc-400 font-medium">No staff profiles found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
