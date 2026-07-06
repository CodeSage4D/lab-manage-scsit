"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Search, Trash2, Edit2, RefreshCw, ArrowLeft, CheckCircle, AlertTriangle, Loader2, Check, X, FileSpreadsheet, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getDailyWorkLogs, getAdmins, saveDailyWorkLog, deleteDailyWorkLog } from "../../actions";
import { exportToExcel } from "../../../utils/exportHelper";

interface WorkLog { id:string;userId:string;date:string;tasksPerformed:string;durationMinutes:number;labScope:string;evidenceUrl?:string;remarks?:string;user?:{name:string;employeeId:string}; }
const EMPTY_FORM = { userId:"", date:new Date().toISOString().slice(0,10), tasksPerformed:"", durationMinutes:60, labScope:"", evidenceUrl:"", remarks:"" };

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

export default function DailyWorkRegister() {
  const router = useRouter();
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{msg:string;type:"success"|"error"}|null>(null);
  const PAGE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, uRes] = await Promise.all([getDailyWorkLogs(), getAdmins()]);
      if(lRes.success) setLogs(lRes.data||[]);
      if(uRes.success) setUsers(uRes.data||[]);
    } finally{setLoading(false);}
  },[]);
  useEffect(()=>{fetchData();},[fetchData]);

  const showToast=(msg:string,type:"success"|"error"="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),4000);};

  const filtered = useMemo(()=>{
    let list=[...logs];
    const q=search.trim().toLowerCase();
    if(q) list=list.filter(l=>l.tasksPerformed.toLowerCase().includes(q)||(l.user?.name||"").toLowerCase().includes(q)||l.labScope.toLowerCase().includes(q));
    if(filterUser) list=list.filter(l=>l.userId===filterUser);
    if(filterFrom) list=list.filter(l=>formatDate(l.date)>=filterFrom);
    if(filterTo) list=list.filter(l=>formatDate(l.date)<=filterTo);
    return list.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
  },[logs,search,filterUser,filterFrom,filterTo]);

  const paginated=useMemo(()=>filtered.slice((page-1)*PAGE,page*PAGE),[filtered,page]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE));
  const totalHours=useMemo(()=>filtered.reduce((s,l)=>s+l.durationMinutes,0),[filtered]);

  const handleSave=async()=>{
    if(!form.tasksPerformed||!form.labScope){showToast("Fill Tasks and Lab Scope.","error");return;}
    setSaving(true);
    try{
      const res=await saveDailyWorkLog({...form,id:editingId||undefined});
      if(res.success){showToast(editingId?"Updated.":"Work log recorded.");setShowForm(false);fetchData();}
      else showToast(res.error||"Failed.","error");
    }finally{setSaving(false);}
  };

  const handleDelete=async(id:string)=>{
    if(!confirm("Delete this work log?")) return;
    const res=await deleteDailyWorkLog(id);
    if(res.success){showToast("Deleted.");fetchData();}
    else showToast(res.error||"Failed.","error");
  };

  const exportExcel = () => {
    const headers = ["Staff Name","Date","Lab Scope","Tasks Performed","Duration (min)","Remarks"];
    const rows = filtered.map(l => [
      l.user?.name||"", formatDate(l.date), l.labScope, l.tasksPerformed, l.durationMinutes, l.remarks||""
    ]);
    exportToExcel(rows, headers, "Daily Work Log", "SCSIT_Daily_Work_Register");
    showToast("Excel sheet exported successfully.");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {toast&&<div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl ${toast.type==="success"?"bg-emerald-950 border-emerald-700 text-emerald-300":"bg-red-950 border-red-700 text-red-300"}`}>{toast.type==="success"?<CheckCircle size={15}/>:<AlertTriangle size={15}/>}{toast.msg}</div>}

      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100">{editingId?"Edit Work Log":"Add Work Log"}</h2>
              <button onClick={()=>setShowForm(false)} className="text-zinc-400 hover:text-zinc-200"><X size={20}/></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Staff Member</label>
                  <select value={form.userId||""} onChange={e=>setForm((p:any)=>({...p,userId:e.target.value}))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    <option value="">Select Staff</option>
                    {users.map((u:any)=><option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Date</label>
                  <input type="date" value={form.date||""} onChange={e=>setForm((p:any)=>({...p,date:e.target.value}))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Lab Scope *</label>
                <input value={form.labScope||""} onChange={e=>setForm((p:any)=>({...p,labScope:e.target.value}))} placeholder="Lab A, Lab B, Server Room"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Tasks Performed *</label>
                <textarea value={form.tasksPerformed||""} onChange={e=>setForm((p:any)=>({...p,tasksPerformed:e.target.value}))}
                  placeholder="Describe tasks done today: software installation, hardware check, cleaning..." rows={4}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500 resize-none"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Duration (minutes)</label>
                  <input type="number" min="1" value={form.durationMinutes||60} onChange={e=>setForm((p:any)=>({...p,durationMinutes:Number(e.target.value)}))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Evidence URL</label>
                  <input value={form.evidenceUrl||""} onChange={e=>setForm((p:any)=>({...p,evidenceUrl:e.target.value}))} placeholder="Photo/doc link"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Remarks</label>
                <input value={form.remarks||""} onChange={e=>setForm((p:any)=>({...p,remarks:e.target.value}))} placeholder="Any additional notes..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2">
                {saving?<Loader2 size={14} className="animate-spin"/>:<Check size={14}/>}{editingId?"Update":"Save Log"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={()=>router.push("/admin")} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"><ArrowLeft size={18}/></button>
            <div>
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2"><ClipboardList size={16} className="text-violet-400"/>Daily Work Register</h1>
              <p className="text-xs text-zinc-500">SCSIT LabOS · Staff Daily Activity Log</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition"><RefreshCw size={15}/></button>
            <button onClick={exportExcel} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"><FileSpreadsheet size={14}/>Excel</button>
            <button onClick={()=>{setEditingId(null);setForm({...EMPTY_FORM,date:new Date().toISOString().slice(0,10)});setShowForm(true);}} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition"><Plus size={14}/>Add Log</button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"><p className="text-2xl font-bold text-zinc-200">{logs.length}</p><p className="text-xs text-zinc-500 mt-1">Total Logs</p></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"><p className="text-2xl font-bold text-violet-400">{Math.round(totalHours/60)}h {totalHours%60}m</p><p className="text-xs text-zinc-500 mt-1">Total Hours (filtered)</p></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"><p className="text-2xl font-bold text-blue-400">{users.length}</p><p className="text-xs text-zinc-500 mt-1">Staff Members</p></div>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search by tasks, staff, lab scope..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
          </div>
          <select value={filterUser} onChange={e=>setFilterUser(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-rose-500">
            <option value="">All Staff</option>
            {users.map((u:any)=><option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} placeholder="From" className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-rose-500"/>
          <input type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} placeholder="To" className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-rose-500"/>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {loading?<div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-violet-400"/><span className="ml-3 text-zinc-500 text-sm">Loading work register...</span></div>
          :paginated.length===0?(
            <div className="flex flex-col items-center justify-center py-20">
              <ClipboardList size={36} className="text-zinc-700 mb-3"/>
              <p className="text-zinc-400 font-medium">No work logs found</p>
              <button onClick={()=>{setEditingId(null);setForm({...EMPTY_FORM,date:new Date().toISOString().slice(0,10)});setShowForm(true);}} className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg transition">Add First Log</button>
            </div>
          ):(
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-800/50 border-b border-zinc-800">
                  <tr>{["Date","Staff","Lab Scope","Tasks Summary","Duration","Remarks","Actions"].map(h=><th key={h} className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {paginated.map(l=>(
                    <tr key={l.id} className="hover:bg-zinc-800/40 transition-colors group">
                      <td className="px-3 py-3 text-zinc-400 text-xs font-mono whitespace-nowrap">{formatDate(l.date)}</td>
                      <td className="px-3 py-3 text-zinc-300 text-xs font-medium">{l.user?.name||"–"}</td>
                      <td className="px-3 py-3 text-zinc-400 text-xs">{l.labScope}</td>
                      <td className="px-3 py-3 max-w-[250px]"><p className="text-zinc-300 text-xs truncate" title={l.tasksPerformed}>{l.tasksPerformed}</p></td>
                      <td className="px-3 py-3 text-xs"><span className="flex items-center gap-1 text-violet-400 font-semibold"><Clock size={11}/>{l.durationMinutes>=60?`${Math.floor(l.durationMinutes/60)}h ${l.durationMinutes%60}m`:`${l.durationMinutes}m`}</span></td>
                      <td className="px-3 py-3 text-zinc-500 text-xs max-w-[150px] truncate">{l.remarks||"–"}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>{setEditingId(l.id);setForm({...l,date:formatDate(l.date)});setShowForm(true);}} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-blue-300 transition"><Edit2 size={13}/></button>
                          <button onClick={()=>handleDelete(l.id)} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {!loading&&totalPages>1&&(
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-zinc-500">Page {page} of {totalPages} · {filtered.length} logs · {Math.round(totalHours/60)}h {totalHours%60}m total</p>
            <div className="flex items-center gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-400"><ChevronLeft size={15}/></button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{const pg=i+1;return(<button key={pg} onClick={()=>setPage(pg)} className={`w-8 h-8 rounded-lg text-xs font-medium transition ${pg===page?"bg-rose-600 text-white":"hover:bg-zinc-800 text-zinc-400"}`}>{pg}</button>);})}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-400"><ChevronRight size={15}/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
