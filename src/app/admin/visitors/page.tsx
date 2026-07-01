"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Plus, Search, Trash2, Edit2, RefreshCw, ArrowLeft, CheckCircle, AlertTriangle, Loader2, Check, X, FileSpreadsheet, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { getVisitors, saveVisitor, markVisitorExit, deleteVisitor } from "../../actions";
import { exportToExcel } from "../../../utils/exportHelper";

interface Visitor { id:string;visitorName:string;purpose:string;entryTime:string;exitTime?:string;approvedBy:string; }
const EMPTY_FORM = { visitorName:"", purpose:"", approvedBy:"", entryTime:"", exitTime:"" };

export default function VisitorRegister() {
  const router = useRouter();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0,10));
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{msg:string;type:"success"|"error"}|null>(null);
  const PAGE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVisitors();
      if(res.success) setVisitors(res.data||[]);
    } finally { setLoading(false); }
  }, []);
  useEffect(()=>{fetchData();},[fetchData]);

  const showToast = (msg:string,type:"success"|"error"="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),4000);};

  const filtered = useMemo(() => {
    let list = [...visitors];
    const q = search.trim().toLowerCase();
    if(q) list = list.filter(v=>v.visitorName.toLowerCase().includes(q)||v.purpose.toLowerCase().includes(q)||v.approvedBy.toLowerCase().includes(q));
    if(filterDate) list = list.filter(v=>v.entryTime?.slice(0,10)===filterDate);
    return list.sort((a,b)=>new Date(b.entryTime).getTime()-new Date(a.entryTime).getTime());
  },[visitors,search,filterDate]);

  const paginated = useMemo(()=>filtered.slice((page-1)*PAGE,page*PAGE),[filtered,page]);
  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE));
  const todayCount = useMemo(()=>visitors.filter(v=>v.entryTime?.slice(0,10)===new Date().toISOString().slice(0,10)).length,[visitors]);
  const activeCount = useMemo(()=>visitors.filter(v=>!v.exitTime).length,[visitors]);

  const handleSave = async () => {
    if(!form.visitorName||!form.purpose||!form.approvedBy){showToast("Fill Name, Purpose, and Approved By.","error");return;}
    setSaving(true);
    try {
      const res = await saveVisitor({...form,id:editingId||undefined});
      if(res.success){showToast(editingId?"Updated.":"Visitor entry recorded.");setShowForm(false);fetchData();}
      else showToast(res.error||"Failed.","error");
    } finally{setSaving(false);}
  };

  const handleExit = async (id:string,name:string) => {
    if(!confirm(`Mark exit for ${name}?`)) return;
    const res = await markVisitorExit(id);
    if(res.success){showToast(`${name} exit recorded.`);fetchData();}
    else showToast(res.error||"Failed.","error");
  };

  const handleDelete = async (id:string) => {
    if(!confirm("Delete this visitor entry?")) return;
    const res = await deleteVisitor(id);
    if(res.success){showToast("Entry deleted.");fetchData();}
    else showToast(res.error||"Failed.","error");
  };

  const exportExcel = () => {
    const headers = ["Visitor Name","Purpose","Approved By","Entry Time","Exit Time","Duration"];
    const rows = filtered.map(v => {
      const entry = new Date(v.entryTime); const exit = v.exitTime?new Date(v.exitTime):null;
      const dur = exit ? `${Math.round((exit.getTime()-entry.getTime())/60000)} min` : "Still inside";
      return [v.visitorName, v.purpose, v.approvedBy, v.entryTime?.slice(0,16), v.exitTime?.slice(0,16)||"–", dur];
    });
    exportToExcel(rows, headers, "Visitors Register", "SCSIT_Visitors_Register");
    showToast("Excel sheet exported successfully.");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {toast&&<div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl ${toast.type==="success"?"bg-emerald-950 border-emerald-700 text-emerald-300":"bg-red-950 border-red-700 text-red-300"}`}>{toast.type==="success"?<CheckCircle size={15}/>:<AlertTriangle size={15}/>}{toast.msg}</div>}

      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100">{editingId?"Edit Entry":"Record Visitor Entry"}</h2>
              <button onClick={()=>setShowForm(false)} className="text-zinc-400 hover:text-zinc-200"><X size={20}/></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {[{label:"Visitor Name *",field:"visitorName",placeholder:"John Doe"},{label:"Purpose *",field:"purpose",placeholder:"Lab inspection / Guest lecture"},{label:"Approved By *",field:"approvedBy",placeholder:"Dr. HOD / Lab In-charge"}].map(({label,field,placeholder})=>(
                <div key={field}>
                  <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
                  <input value={form[field]||""} onChange={e=>setForm((p:any)=>({...p,[field]:e.target.value}))} placeholder={placeholder}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Entry Time</label>
                  <input type="datetime-local" value={form.entryTime||""} onChange={e=>setForm((p:any)=>({...p,entryTime:e.target.value}))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Exit Time</label>
                  <input type="datetime-local" value={form.exitTime||""} onChange={e=>setForm((p:any)=>({...p,exitTime:e.target.value}))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2">
                {saving?<Loader2 size={14} className="animate-spin"/>:<Check size={14}/>}{editingId?"Update":"Record Entry"}
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
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2"><UserCheck size={16} className="text-cyan-400"/>Visitor Register</h1>
              <p className="text-xs text-zinc-500">SCSIT LabOS · Digital Visitor Entry Register</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition"><RefreshCw size={15}/></button>
            <button onClick={exportExcel} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"><FileSpreadsheet size={14}/>Excel</button>
            <button onClick={()=>{setEditingId(null);setForm({...EMPTY_FORM,entryTime:new Date().toISOString().slice(0,16)});setShowForm(true);}} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition"><Plus size={14}/>Record Entry</button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"><p className="text-2xl font-bold text-zinc-200">{visitors.length}</p><p className="text-xs text-zinc-500 mt-1">Total Visitors</p></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"><p className="text-2xl font-bold text-cyan-400">{todayCount}</p><p className="text-xs text-zinc-500 mt-1">Today's Visitors</p></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"><p className="text-2xl font-bold text-amber-400">{activeCount}</p><p className="text-xs text-zinc-500 mt-1">Currently Inside</p></div>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search visitor name, purpose, approved by..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
          </div>
          <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-rose-500"/>
          {filterDate&&<button onClick={()=>setFilterDate("")} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"><X size={11}/>Clear</button>}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {loading?<div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-cyan-400"/><span className="ml-3 text-zinc-500 text-sm">Loading visitor register...</span></div>
          :paginated.length===0?(
            <div className="flex flex-col items-center justify-center py-20">
              <UserCheck size={36} className="text-zinc-700 mb-3"/>
              <p className="text-zinc-400 font-medium">No visitor entries found</p>
              <button onClick={()=>{setEditingId(null);setForm({...EMPTY_FORM,entryTime:new Date().toISOString().slice(0,16)});setShowForm(true);}} className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg transition">Record First Entry</button>
            </div>
          ):(
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-800/50 border-b border-zinc-800">
                  <tr>{["Visitor Name","Purpose","Approved By","Entry Time","Exit Time","Duration","Status","Actions"].map(h=><th key={h} className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {paginated.map(v=>{
                    const entry=new Date(v.entryTime);const exit=v.exitTime?new Date(v.exitTime):null;
                    const dur=exit?`${Math.round((exit.getTime()-entry.getTime())/60000)} min`:"–";
                    const inside=!v.exitTime;
                    return(
                      <tr key={v.id} className="hover:bg-zinc-800/40 transition-colors group">
                        <td className="px-3 py-3 text-zinc-200 font-medium text-sm">{v.visitorName}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs max-w-[180px] truncate">{v.purpose}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs">{v.approvedBy}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs font-mono">{v.entryTime?.slice(0,16)}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs font-mono">{v.exitTime?.slice(0,16)||"–"}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs">{dur}</td>
                        <td className="px-3 py-3">
                          {inside?<span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[11px] font-semibold">Inside</span>
                          :<span className="bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 px-2 py-0.5 rounded-full text-[11px] font-semibold">Left</span>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {inside&&<button onClick={()=>handleExit(v.id,v.visitorName)} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition" title="Mark Exit"><LogOut size={13}/></button>}
                            <button onClick={()=>{setEditingId(v.id);setForm({...v,entryTime:v.entryTime?.slice(0,16)||"",exitTime:v.exitTime?.slice(0,16)||""});setShowForm(true);}} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-blue-300 transition"><Edit2 size={13}/></button>
                            <button onClick={()=>handleDelete(v.id)} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition"><Trash2 size={13}/></button>
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
        {!loading&&totalPages>1&&(
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-zinc-500">Page {page} of {totalPages} · {filtered.length} entries</p>
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
