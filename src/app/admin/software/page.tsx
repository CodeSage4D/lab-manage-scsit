"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppWindow, Plus, Search, Trash2, Edit2, RefreshCw, ArrowLeft, CheckCircle, AlertTriangle, Loader2, Check, X, Monitor, ChevronLeft, ChevronRight } from "lucide-react";
import { getSoftwareCatalog, saveSoftware, deleteSoftware, getLabSoftwares, saveLabSoftware, deleteLabSoftware, getComputers, getLaboratories } from "../../actions";

const CATEGORIES = ["IDE","Database","Programming Language","Networking Tool","Office Suite","Security Tool","Simulation","Graphics","Utility","Other"];

interface Software { id:string;name:string;category:string;latestVersion:string;licenseDetails:string;licenseExpiry?:string;compatibility:string;deployments?:any[]; }
const EMPTY_FORM = { name:"",category:"",latestVersion:"",licenseDetails:"",licenseExpiry:"",compatibility:"Windows 11",installationGuide:"" };
const EMPTY_DEPLOY = { computerId:"",softwareId:"",installedVersion:"",installedBy:"",installedDate:"" };

export default function SoftwareCatalog() {
  const router = useRouter();
  const [software, setSoftware] = useState<Software[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [computers, setComputers] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [deployForm, setDeployForm] = useState<any>(EMPTY_DEPLOY);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"catalog"|"deployments">("catalog");
  const [toast, setToast] = useState<{msg:string;type:"success"|"error"}|null>(null);
  const PAGE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [swRes, depRes, cmpRes, labRes] = await Promise.all([getSoftwareCatalog(), getLabSoftwares(), getComputers(), getLaboratories()]);
      if(swRes.success) setSoftware(swRes.data||[]);
      if(depRes.success) setDeployments(depRes.data||[]);
      if(cmpRes.success) setComputers(cmpRes.data||[]);
      if(labRes.success) setLabs(labRes.data||labRes.labs||[]);
    } finally { setLoading(false); }
  }, []);
  useEffect(()=>{fetchData();},[fetchData]);

  const showToast=(msg:string,type:"success"|"error"="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),4000);};

  const filtered = useMemo(()=>{
    let list=[...software];
    const q=search.trim().toLowerCase();
    if(q) list=list.filter(s=>s.name.toLowerCase().includes(q)||s.category.toLowerCase().includes(q)||(s.licenseDetails||"").toLowerCase().includes(q));
    if(filterCat) list=list.filter(s=>s.category===filterCat);
    return list;
  },[software,search,filterCat]);

  const filteredDeps = useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q) return deployments;
    return deployments.filter(d=>(d.software?.name||"").toLowerCase().includes(q)||(d.computer?.computerId||"").toLowerCase().includes(q)||(d.computer?.lab?.name||"").toLowerCase().includes(q));
  },[deployments,search]);

  const paginated = useMemo(()=>filtered.slice((page-1)*PAGE,page*PAGE),[filtered,page]);
  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE));

  const handleSave=async()=>{
    if(!form.name||!form.category){showToast("Fill Name and Category.","error");return;}
    setSaving(true);
    try{
      const res=await saveSoftware({...form,id:editingId||undefined});
      if(res.success){showToast(editingId?"Updated.":"Software added.");setShowForm(false);fetchData();}
      else showToast(res.error||"Failed.","error");
    }finally{setSaving(false);}
  };

  const handleDeploy=async()=>{
    if(!deployForm.computerId||!deployForm.softwareId){showToast("Select Computer and Software.","error");return;}
    setSaving(true);
    try{
      const res=await saveLabSoftware({...deployForm,installedDate:deployForm.installedDate||new Date().toISOString().slice(0,10)});
      if(res.success){showToast("Deployment recorded.");setShowDeploy(false);fetchData();}
      else showToast(res.error||"Failed.","error");
    }finally{setSaving(false);}
  };

  const handleDelete=async(id:string,name:string)=>{
    if(!confirm(`Delete ${name} from catalog?`)) return;
    const res=await deleteSoftware(id);
    if(res.success){showToast("Deleted.");fetchData();}
    else showToast(res.error||"Failed.","error");
  };

  const handleDeleteDeploy=async(id:string)=>{
    if(!confirm("Remove this deployment?")) return;
    const res=await deleteLabSoftware(id);
    if(res.success){showToast("Deployment removed.");fetchData();}
    else showToast(res.error||"Failed.","error");
  };

  const isExpired=(d?:string)=>d&&new Date(d)<new Date();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {toast&&<div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl ${toast.type==="success"?"bg-emerald-950 border-emerald-700 text-emerald-300":"bg-red-950 border-red-700 text-red-300"}`}>{toast.type==="success"?<CheckCircle size={15}/>:<AlertTriangle size={15}/>}{toast.msg}</div>}

      {/* Add Software Modal */}
      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100">{editingId?"Edit Software":"Add Software"}</h2>
              <button onClick={()=>setShowForm(false)} className="text-zinc-400 hover:text-zinc-200"><X size={20}/></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {[{l:"Software Name *",f:"name",p:"Visual Studio Code"},{l:"Latest Version",f:"latestVersion",p:"1.90.0"},{l:"Compatibility",f:"compatibility",p:"Windows 11, Windows 10"},{l:"License Details",f:"licenseDetails",p:"MIT / Commercial / Educational"}].map(({l,f,p})=>(
                <div key={f}>
                  <label className="text-xs text-zinc-400 mb-1 block">{l}</label>
                  <input value={form[f]||""} onChange={e=>setForm((prev:any)=>({...prev,[f]:e.target.value}))} placeholder={p}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Category *</label>
                  <select value={form.category||""} onChange={e=>setForm((p:any)=>({...p,category:e.target.value}))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    <option value="">Select...</option>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">License Expiry</label>
                  <input type="date" value={form.licenseExpiry||""} onChange={e=>setForm((p:any)=>({...p,licenseExpiry:e.target.value}))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Installation Guide / Notes</label>
                <textarea value={form.installationGuide||""} onChange={e=>setForm((p:any)=>({...p,installationGuide:e.target.value}))} rows={2} placeholder="Step-by-step installation notes..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500 resize-none"/>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2">
                {saving?<Loader2 size={14} className="animate-spin"/>:<Check size={14}/>}{editingId?"Update":"Add Software"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Modal */}
      {showDeploy&&(
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100">Deploy Software to Computer</h2>
              <button onClick={()=>setShowDeploy(false)} className="text-zinc-400 hover:text-zinc-200"><X size={20}/></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Software *</label>
                <select value={deployForm.softwareId} onChange={e=>setDeployForm((p:any)=>({...p,softwareId:e.target.value}))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                  <option value="">Select Software</option>
                  {software.map(s=><option key={s.id} value={s.id}>{s.name} v{s.latestVersion}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Computer *</label>
                <select value={deployForm.computerId} onChange={e=>setDeployForm((p:any)=>({...p,computerId:e.target.value}))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                  <option value="">Select Computer</option>
                  {computers.map((c:any)=><option key={c.id} value={c.id}>{c.computerId} — {c.hostname} ({c.lab?.name})</option>)}
                </select>
              </div>
              {[{l:"Installed Version",f:"installedVersion",p:"1.0"},{l:"Installed By",f:"installedBy",p:"Admin"},{l:"Install Date",f:"installedDate",t:"date"}].map(({l,f,p,t}:any)=>(
                <div key={f}>
                  <label className="text-xs text-zinc-400 mb-1 block">{l}</label>
                  <input type={t||"text"} value={deployForm[f]||""} onChange={e=>setDeployForm((prev:any)=>({...prev,[f]:e.target.value}))} placeholder={p}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
              <button onClick={()=>setShowDeploy(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition">Cancel</button>
              <button onClick={handleDeploy} disabled={saving} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2">
                {saving?<Loader2 size={14} className="animate-spin"/>:<Monitor size={14}/>}Deploy
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
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2"><AppWindow size={16} className="text-purple-400"/>Software Catalog</h1>
              <p className="text-xs text-zinc-500">SCSIT LabOS · Software Management & Deployments</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition"><RefreshCw size={15}/></button>
            <button onClick={()=>setShowDeploy(true)} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"><Monitor size={14}/>Deploy</button>
            <button onClick={()=>{setEditingId(null);setForm(EMPTY_FORM);setShowForm(true);}} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition"><Plus size={14}/>Add Software</button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"><p className="text-2xl font-bold text-zinc-200">{software.length}</p><p className="text-xs text-zinc-500 mt-1">Total Software</p></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"><p className="text-2xl font-bold text-purple-400">{deployments.length}</p><p className="text-xs text-zinc-500 mt-1">Deployments</p></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"><p className="text-2xl font-bold text-red-400">{software.filter(s=>isExpired(s.licenseExpiry)).length}</p><p className="text-xs text-zinc-500 mt-1">Expired Licenses</p></div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 mb-4">
          {[{t:"catalog",l:`Software Catalog (${software.length})`},{t:"deployments",l:`Deployments (${deployments.length})`}].map(({t,l})=>(
            <button key={t} onClick={()=>setActiveTab(t as any)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${activeTab===t?"border-rose-500 text-zinc-100":"border-transparent text-zinc-400 hover:text-zinc-200"}`}>{l}</button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search software, category, computer..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
          </div>
          {activeTab==="catalog"&&<select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-rose-500">
            <option value="">All Categories</option>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>}
        </div>

        {activeTab==="catalog"?(
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {loading?<div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-400"/></div>
            :paginated.length===0?<div className="flex flex-col items-center justify-center py-20"><AppWindow size={36} className="text-zinc-700 mb-3"/><p className="text-zinc-400 font-medium">No software found</p></div>:(
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-800/50 border-b border-zinc-800"><tr>{["Name","Category","Version","Compatibility","License","Expiry","Deployments","Actions"].map(h=><th key={h} className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-zinc-800">
                    {paginated.map(s=>(
                      <tr key={s.id} className="hover:bg-zinc-800/40 transition-colors group">
                        <td className="px-3 py-3 text-zinc-200 font-medium text-sm">{s.name}</td>
                        <td className="px-3 py-3 text-xs"><span className="bg-purple-500/15 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full text-[11px] font-semibold">{s.category}</span></td>
                        <td className="px-3 py-3 text-zinc-400 text-xs font-mono">{s.latestVersion||"–"}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs">{s.compatibility}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs max-w-[130px] truncate">{s.licenseDetails}</td>
                        <td className="px-3 py-3 text-xs">
                          {s.licenseExpiry?<span className={isExpired(s.licenseExpiry)?"text-red-400 font-semibold":"text-zinc-400"}>{s.licenseExpiry?.slice(0,10)}</span>:<span className="text-zinc-600">–</span>}
                        </td>
                        <td className="px-3 py-3 text-zinc-300 text-xs font-bold">{s.deployments?.length||0}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={()=>{setEditingId(s.id);setForm({...s,licenseExpiry:s.licenseExpiry?.slice(0,10)||""});setShowForm(true);}} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-blue-300 transition"><Edit2 size={13}/></button>
                            <button onClick={()=>handleDelete(s.id,s.name)} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition"><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ):(
          /* Deployments */
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {loading?<div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-400"/></div>
            :filteredDeps.length===0?<div className="flex flex-col items-center justify-center py-20"><Monitor size={36} className="text-zinc-700 mb-3"/><p className="text-zinc-400 font-medium">No deployments recorded</p><button onClick={()=>setShowDeploy(true)} className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg transition">Deploy Now</button></div>:(
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-800/50 border-b border-zinc-800"><tr>{["Software","Version","Computer","Lab","Installed By","Date","Status","Actions"].map(h=><th key={h} className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredDeps.map(d=>(
                      <tr key={d.id} className="hover:bg-zinc-800/40 transition-colors group">
                        <td className="px-3 py-3 text-zinc-200 font-medium text-xs">{d.software?.name||"–"}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs font-mono">{d.installedVersion}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs font-mono">{d.computer?.computerId||"–"}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs">{d.computer?.lab?.name||"–"}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs">{d.installedBy}</td>
                        <td className="px-3 py-3 text-zinc-500 text-xs">{d.installedDate?.slice(0,10)}</td>
                        <td className="px-3 py-3"><span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[11px] font-semibold">{d.verificationStatus||"Verified"}</span></td>
                        <td className="px-3 py-3"><button onClick={()=>handleDeleteDeploy(d.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition"><Trash2 size={13}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab==="catalog"&&!loading&&totalPages>1&&(
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-zinc-500">{filtered.length} software · Page {page} of {totalPages}</p>
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
