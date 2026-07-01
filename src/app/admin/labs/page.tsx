"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Search, Trash2, Edit2, RefreshCw, ArrowLeft, CheckCircle, AlertTriangle, Loader2, Check, X, Monitor, Wrench, CalendarDays } from "lucide-react";
import { getLaboratories, saveLaboratory, deleteLaboratory } from "../../actions";

interface Lab { id:string;name:string;code:string;building:string;floor:string;location:string;seatingCapacity:number;totalComputers:number;operatingSystem:string;primaryPurpose:string;status:string;operatingHours:string;switchesCount:number;internetSpeed:string;computers?:any[];maintenanceLogs?:any[];bookings?:any[]; }
const EMPTY_FORM = { name:"",code:"",building:"EB",floor:"1",location:"",seatingCapacity:30,totalComputers:30,operatingSystem:"Windows 11 Pro",primaryPurpose:"Computer Laboratory",status:"ACTIVE",operatingHours:"09:00 - 17:00",switchesCount:2,internetSpeed:"1 Gbps" };

export default function LabsRegister() {
  const router = useRouter();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;type:"success"|"error"}|null>(null);
  const [selectedLab, setSelectedLab] = useState<Lab|null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await getLaboratories(); if(res.success) setLabs(res.data||res.labs||[]); }
    finally { setLoading(false); }
  }, []);
  useEffect(()=>{fetchData();},[fetchData]);

  const showToast=(msg:string,type:"success"|"error"="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),4000);};

  const filtered = useMemo(()=>{
    if(!search.trim()) return labs;
    const q=search.toLowerCase();
    return labs.filter(l=>l.name.toLowerCase().includes(q)||l.code.toLowerCase().includes(q)||l.location.toLowerCase().includes(q)||l.primaryPurpose.toLowerCase().includes(q));
  },[labs,search]);

  const stats = useMemo(()=>({
    total:labs.length, active:labs.filter(l=>l.status==="ACTIVE").length,
    totalComputers:labs.reduce((s,l)=>s+(l.computers?.length||0),0),
    openIssues:labs.reduce((s,l)=>s+(l.maintenanceLogs?.length||0),0),
  }),[labs]);

  const handleSave=async()=>{
    if(!form.name||!form.code){showToast("Fill Lab Name and Code.","error");return;}
    setSaving(true);
    try{
      const res=await saveLaboratory({...form,id:editingId||undefined});
      if(res.success){showToast(editingId?"Lab updated.":"Lab registered.");setShowForm(false);fetchData();}
      else showToast(res.error||"Failed.","error");
    }finally{setSaving(false);}
  };

  const handleDelete=async(id:string,name:string)=>{
    if(!confirm(`Delete ${name}? All related computers and bookings will be removed.`)) return;
    const res=await deleteLaboratory(id);
    if(res.success){showToast("Lab deleted.");fetchData();}
    else showToast(res.error||"Failed.","error");
  };

  const STATUS_COLOR:Record<string,string>={ACTIVE:"bg-emerald-500/15 text-emerald-400 border-emerald-500/30",MAINTENANCE:"bg-amber-500/15 text-amber-400 border-amber-500/30",CLOSED:"bg-red-500/15 text-red-400 border-red-500/30"};

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {toast&&<div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl ${toast.type==="success"?"bg-emerald-950 border-emerald-700 text-emerald-300":"bg-red-950 border-red-700 text-red-300"}`}>{toast.type==="success"?<CheckCircle size={15}/>:<AlertTriangle size={15}/>}{toast.msg}</div>}

      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100">{editingId?"Edit Laboratory":"Register Laboratory"}</h2>
              <button onClick={()=>setShowForm(false)} className="text-zinc-400 hover:text-zinc-200"><X size={20}/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {l:"Lab Name *",f:"name",p:"Lab A"},
                  {l:"Lab Code *",f:"code",p:"LBA"},
                  {l:"Building",f:"building",p:"EB"},
                  {l:"Floor",f:"floor",p:"1"},
                  {l:"Location",f:"location",p:"East Block, Room 101"},
                  {l:"Primary Purpose",f:"primaryPurpose",p:"Computer Laboratory"},
                  {l:"Operating System",f:"operatingSystem",p:"Windows 11 Pro"},
                  {l:"Operating Hours",f:"operatingHours",p:"09:00 - 17:00"},
                  {l:"Internet Speed",f:"internetSpeed",p:"1 Gbps"},
                ].map(({l,f,p})=>(
                  <div key={f}>
                    <label className="text-xs text-zinc-400 mb-1 block">{l}</label>
                    <input value={form[f]||""} onChange={e=>setForm((prev:any)=>({...prev,[f]:e.target.value}))} placeholder={p}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
                  </div>
                ))}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Status</label>
                  <select value={form.status||"ACTIVE"} onChange={e=>setForm((p:any)=>({...p,status:e.target.value}))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    {["ACTIVE","MAINTENANCE","CLOSED"].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {[{l:"Seating Capacity",f:"seatingCapacity"},{l:"Total Computers",f:"totalComputers"},{l:"Switches Count",f:"switchesCount"}].map(({l,f})=>(
                  <div key={f}>
                    <label className="text-xs text-zinc-400 mb-1 block">{l}</label>
                    <input type="number" min="0" value={form[f]||0} onChange={e=>setForm((p:any)=>({...p,[f]:Number(e.target.value)}))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2">
                {saving?<Loader2 size={14} className="animate-spin"/>:<Check size={14}/>}{editingId?"Update":"Register Lab"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lab Detail Sidebar */}
      {selectedLab&&(
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-zinc-950 border-l border-zinc-800 w-full max-w-md h-full overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="font-bold text-zinc-100">{selectedLab.name} — Overview</h2>
              <button onClick={()=>setSelectedLab(null)} className="text-zinc-400 hover:text-zinc-200"><X size={20}/></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {l:"Code",v:selectedLab.code},{l:"Building",v:selectedLab.building},{l:"Floor",v:selectedLab.floor},
                  {l:"Location",v:selectedLab.location},{l:"Seating",v:selectedLab.seatingCapacity},{l:"Computers",v:selectedLab.computers?.length||0},
                  {l:"OS",v:selectedLab.operatingSystem},{l:"Purpose",v:selectedLab.primaryPurpose},{l:"Hours",v:selectedLab.operatingHours},
                  {l:"Internet",v:selectedLab.internetSpeed},{l:"Switches",v:selectedLab.switchesCount},
                ].map(({l,v})=>(
                  <div key={l} className="bg-zinc-900 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-zinc-500 uppercase">{l}</p>
                    <p className="text-sm text-zinc-200 font-medium">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-2">Today's Bookings</p>
                {(selectedLab.bookings||[]).length===0?<p className="text-xs text-zinc-600">No bookings today.</p>:
                selectedLab.bookings!.map((b:any)=><div key={b.id} className="bg-zinc-900 rounded-lg px-3 py-2 mb-1.5"><p className="text-xs text-emerald-400 font-mono">{b.timeSlot}</p><p className="text-xs text-zinc-300">{b.facultyName}</p></div>)}
              </div>
              {(selectedLab.maintenanceLogs||[]).length>0&&(
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Open Issues</p>
                  <p className="text-amber-400 font-bold text-lg">{selectedLab.maintenanceLogs?.length}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={()=>router.push(`/admin/computers?lab=${selectedLab.id}`)} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium text-zinc-200 transition flex items-center justify-center gap-1"><Monitor size={13}/>Computers</button>
                <button onClick={()=>router.push(`/admin/maintenance?lab=${selectedLab.id}`)} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium text-zinc-200 transition flex items-center justify-center gap-1"><Wrench size={13}/>Maintenance</button>
                <button onClick={()=>router.push(`/admin/bookings?lab=${selectedLab.id}`)} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium text-zinc-200 transition flex items-center justify-center gap-1"><CalendarDays size={13}/>Bookings</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={()=>router.push("/admin")} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"><ArrowLeft size={18}/></button>
            <div>
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2"><Building2 size={16} className="text-rose-400"/>Laboratories Register</h1>
              <p className="text-xs text-zinc-500">SCSIT LabOS · Lab Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition"><RefreshCw size={15}/></button>
            <button onClick={()=>{setEditingId(null);setForm(EMPTY_FORM);setShowForm(true);}} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition"><Plus size={14}/>Register Lab</button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[{l:"Total Labs",v:stats.total,c:"text-zinc-200"},{l:"Active",v:stats.active,c:"text-emerald-400"},{l:"Total Computers",v:stats.totalComputers,c:"text-blue-400"},{l:"Open Issues",v:stats.openIssues,c:"text-amber-400"}].map(s=>(
            <div key={s.l} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"><p className={`text-2xl font-bold ${s.c}`}>{s.v}</p><p className="text-xs text-zinc-500 mt-1">{s.l}</p></div>
          ))}
        </div>

        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search labs by name, code, location, purpose..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
        </div>

        {loading?<div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-rose-400"/><span className="ml-3 text-zinc-500 text-sm">Loading labs...</span></div>:(
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(lab=>(
              <div key={lab.id} onClick={()=>setSelectedLab(lab)} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition cursor-pointer group relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-zinc-100 text-base">{lab.name}</h3>
                    <p className="text-xs text-zinc-500 font-mono">{lab.code} · Floor {lab.floor} · {lab.building}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${STATUS_COLOR[lab.status]||""}`}>{lab.status}</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3">{lab.primaryPurpose}</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-zinc-800 rounded-lg px-2 py-1.5 text-center"><p className="text-sm font-bold text-blue-400">{lab.computers?.length||0}</p><p className="text-[10px] text-zinc-500">PCs</p></div>
                  <div className="bg-zinc-800 rounded-lg px-2 py-1.5 text-center"><p className="text-sm font-bold text-zinc-200">{lab.seatingCapacity}</p><p className="text-[10px] text-zinc-500">Seats</p></div>
                  <div className="bg-zinc-800 rounded-lg px-2 py-1.5 text-center"><p className={`text-sm font-bold ${(lab.maintenanceLogs?.length||0)>0?"text-amber-400":"text-emerald-400"}`}>{lab.maintenanceLogs?.length||0}</p><p className="text-[10px] text-zinc-500">Issues</p></div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500">{lab.operatingHours}</p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>{setEditingId(lab.id);setForm({...lab});setShowForm(true);}} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-blue-300 transition"><Edit2 size={13}/></button>
                    <button onClick={()=>handleDelete(lab.id,lab.name)} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition"><Trash2 size={13}/></button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length===0&&<div className="col-span-3 flex flex-col items-center justify-center py-20"><Building2 size={36} className="text-zinc-700 mb-3"/><p className="text-zinc-400 font-medium">No labs found</p><button onClick={()=>{setEditingId(null);setForm(EMPTY_FORM);setShowForm(true);}} className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg transition">Register First Lab</button></div>}
          </div>
        )}
      </div>
    </div>
  );
}
