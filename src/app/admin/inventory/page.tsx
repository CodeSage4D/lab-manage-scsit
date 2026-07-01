"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Package, Plus, Search, Trash2, Edit2, RefreshCw, ArrowLeft,
  CheckCircle, AlertTriangle, Loader2, Check, X, FileSpreadsheet, ChevronLeft, ChevronRight
} from "lucide-react";
import { getInventory, getLaboratories, saveInventoryItem, deleteInventoryItem } from "../../actions";
import { exportToExcel } from "../../../utils/exportHelper";

const ASSET_TYPES = ["RAM","SSD","HDD","Mouse","Keyboard","Monitor","UPS","Switch","Router","Printer","Projector","Webcam","RJ45 Cable","Patch Panel","Other"];
const STATUS_OPTS = ["AVAILABLE","ISSUED","STOCK","RETURNED","DEPLETED"];

interface InventoryItem {
  id: string; labId: string; deviceType: string; assetNumber: string;
  specifications: Record<string,any>; purchaseDate: string;
  warrantyDetails?: string; vendorDetails?: string; status: string; stockCount: number;
  lab?: { name: string; code: string };
}

const EMPTY_FORM = { labId:"", deviceType:"", assetNumber:"", specifications:{}, purchaseDate:"", warrantyDetails:"", vendorDetails:"", status:"AVAILABLE", stockCount:1 };
const STATUS_COLOR: Record<string,string> = {
  AVAILABLE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  STOCK:     "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ISSUED:    "bg-amber-500/15 text-amber-400 border-amber-500/30",
  RETURNED:  "bg-purple-500/15 text-purple-400 border-purple-500/30",
  DEPLETED:  "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function InventoryRegister() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [specKey, setSpecKey] = useState(""); const [specVal, setSpecVal] = useState("");
  const [search, setSearch] = useState(""); const [filterLab, setFilterLab] = useState(""); const [filterType, setFilterType] = useState(""); const [filterStatus, setFilterStatus] = useState("");
  const [saving, setSaving] = useState(false); const [page, setPage] = useState(1); const [toast, setToast] = useState<{msg:string;type:"success"|"error"}|null>(null);
  const PAGE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, labRes] = await Promise.all([getInventory(), getLaboratories()]);
      if (invRes.success) setItems(invRes.data || []);
      if (labRes.success) setLabs(labRes.data || labRes.labs || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (msg:string, type:"success"|"error"="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  const filtered = useMemo(() => {
    let list = [...items];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(i => i.assetNumber.toLowerCase().includes(q) || i.deviceType.toLowerCase().includes(q) || (i.vendorDetails||"").toLowerCase().includes(q) || (i.lab?.name||"").toLowerCase().includes(q));
    if (filterLab) list = list.filter(i => i.labId === filterLab);
    if (filterType) list = list.filter(i => i.deviceType === filterType);
    if (filterStatus) list = list.filter(i => i.status === filterStatus);
    return list;
  }, [items, search, filterLab, filterType, filterStatus]);

  const paginated = useMemo(() => filtered.slice((page-1)*PAGE, page*PAGE), [filtered,page]);
  const totalPages = Math.max(1, Math.ceil(filtered.length/PAGE));

  const stats = useMemo(() => ({
    total: items.length,
    available: items.filter(i=>i.status==="AVAILABLE").length,
    issued: items.filter(i=>i.status==="ISSUED").length,
    depleted: items.filter(i=>i.status==="DEPLETED").length,
  }), [items]);

  const handleSave = async () => {
    if (!form.labId || !form.deviceType || !form.assetNumber) { showToast("Fill Lab, Device Type, and Asset Number.","error"); return; }
    setSaving(true);
    try {
      const res = await saveInventoryItem({ ...form, id: editingId||undefined });
      if (res.success) { showToast(editingId?"Updated.":"Item added."); setShowForm(false); fetchData(); }
      else showToast(res.error||"Failed.","error");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id:string, assetNum:string) => {
    if (!confirm(`Delete inventory item ${assetNum}?`)) return;
    const res = await deleteInventoryItem(id);
    if (res.success) { showToast("Item deleted."); fetchData(); }
    else showToast(res.error||"Failed.","error");
  };

  const exportExcel = () => {
    const headers = ["Asset No","Device Type","Lab","Vendor","Status","Stock","Purchase Date","Warranty"];
    const rows = filtered.map(i => [
      i.assetNumber, i.deviceType, i.lab?.name||"", i.vendorDetails||"", i.status, i.stockCount, i.purchaseDate?.slice(0,10), i.warrantyDetails||""
    ]);
    exportToExcel(rows, headers, "Hardware Inventory", "SCSIT_Hardware_Inventory");
    showToast("Excel sheet exported successfully.");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {toast && <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl ${toast.type==="success"?"bg-emerald-950 border-emerald-700 text-emerald-300":"bg-red-950 border-red-700 text-red-300"}`}>{toast.type==="success"?<CheckCircle size={15}/>:<AlertTriangle size={15}/>}{toast.msg}</div>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100">{editingId?"Edit Inventory Item":"Add Inventory Item"}</h2>
              <button onClick={()=>setShowForm(false)} className="text-zinc-400 hover:text-zinc-200"><X size={20}/></button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Lab *</label>
                  <select value={form.labId} onChange={e=>setForm((p:any)=>({...p,labId:e.target.value}))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    <option value="">Select Lab</option>
                    {labs.map((l:any)=><option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Device Type *</label>
                  <select value={form.deviceType} onChange={e=>setForm((p:any)=>({...p,deviceType:e.target.value}))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    <option value="">Select Type</option>
                    {ASSET_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Asset Number *</label>
                  <input value={form.assetNumber} onChange={e=>setForm((p:any)=>({...p,assetNumber:e.target.value}))} placeholder="SCSIT-INV-001"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Stock Count</label>
                  <input type="number" min="0" value={form.stockCount} onChange={e=>setForm((p:any)=>({...p,stockCount:Number(e.target.value)}))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Status</label>
                  <select value={form.status} onChange={e=>setForm((p:any)=>({...p,status:e.target.value}))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                    {STATUS_OPTS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Purchase Date</label>
                  <input type="date" value={form.purchaseDate} onChange={e=>setForm((p:any)=>({...p,purchaseDate:e.target.value}))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500"/>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Vendor Details</label>
                  <input value={form.vendorDetails||""} onChange={e=>setForm((p:any)=>({...p,vendorDetails:e.target.value}))} placeholder="Vendor name / contact"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Warranty Details</label>
                  <input value={form.warrantyDetails||""} onChange={e=>setForm((p:any)=>({...p,warrantyDetails:e.target.value}))} placeholder="3 years, expires 2027"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
                </div>
              </div>
              {/* Specifications */}
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Specifications (Key-Value)</label>
                <div className="flex gap-2 mb-2">
                  <input value={specKey} onChange={e=>setSpecKey(e.target.value)} placeholder="e.g. Capacity" className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
                  <input value={specVal} onChange={e=>setSpecVal(e.target.value)} placeholder="e.g. 8 GB DDR4" className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
                  <button onClick={()=>{if(specKey&&specVal){setForm((p:any)=>({...p,specifications:{...p.specifications,[specKey]:specVal}}));setSpecKey("");setSpecVal("");}}} className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg text-sm">Add</button>
                </div>
                {Object.entries(form.specifications||{}).length>0 && (
                  <div className="bg-zinc-900 rounded-lg p-3 space-y-1">
                    {Object.entries(form.specifications||{}).map(([k,v])=>(
                      <div key={k} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">{k}: <span className="text-zinc-200">{String(v)}</span></span>
                        <button onClick={()=>setForm((p:any)=>{const s={...p.specifications};delete s[k];return{...p,specifications:s};})} className="text-red-400 hover:text-red-300"><X size={11}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2">
                {saving?<Loader2 size={14} className="animate-spin"/>:<Check size={14}/>}{editingId?"Update":"Add Item"}
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
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2"><Package size={16} className="text-blue-400"/>Inventory Register</h1>
              <p className="text-xs text-zinc-500">SCSIT LabOS · Digital Inventory Record Book</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition"><RefreshCw size={15}/></button>
            <button onClick={exportExcel} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"><FileSpreadsheet size={14}/>Excel</button>
            <button onClick={()=>{setEditingId(null);setForm(EMPTY_FORM);setShowForm(true);}} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition"><Plus size={14}/>Add Item</button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[{label:"Total Items",value:stats.total,color:"text-zinc-200"},{label:"Available",value:stats.available,color:"text-emerald-400"},{label:"Issued",value:stats.issued,color:"text-amber-400"},{label:"Depleted",value:stats.depleted,color:"text-red-400"}].map(s=>(
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search by asset number, type, vendor, lab..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
          </div>
          <select value={filterLab} onChange={e=>{setFilterLab(e.target.value);setPage(1);}} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-rose-500">
            <option value="">All Labs</option>
            {labs.map((l:any)=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1);}} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-rose-500">
            <option value="">All Types</option>
            {ASSET_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-rose-500">
            <option value="">All Status</option>
            {STATUS_OPTS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {loading ? <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-blue-400"/><span className="ml-3 text-zinc-500 text-sm">Loading inventory...</span></div>
          : paginated.length===0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Package size={36} className="text-zinc-700 mb-3"/>
              <p className="text-zinc-400 font-medium">No inventory items found</p>
              {!search&&!filterLab&&<button onClick={()=>{setEditingId(null);setForm(EMPTY_FORM);setShowForm(true);}} className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg transition">Add First Item</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-800/50 border-b border-zinc-800">
                  <tr>{["Asset Number","Device Type","Lab","Specifications","Vendor","Stock","Status","Warranty","Actions"].map(h=><th key={h} className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {paginated.map(i=>(
                    <tr key={i.id} className="hover:bg-zinc-800/40 transition-colors group">
                      <td className="px-3 py-3"><span className="font-mono text-blue-400 font-semibold text-xs">{i.assetNumber}</span></td>
                      <td className="px-3 py-3 text-zinc-300 text-xs font-medium">{i.deviceType}</td>
                      <td className="px-3 py-3 text-zinc-400 text-xs">{i.lab?.name||"–"}</td>
                      <td className="px-3 py-3 max-w-[150px]">
                        {Object.entries(i.specifications||{}).slice(0,2).map(([k,v])=>(<div key={k} className="text-xs text-zinc-500">{k}: <span className="text-zinc-300">{String(v)}</span></div>))}
                      </td>
                      <td className="px-3 py-3 text-zinc-400 text-xs">{i.vendorDetails||"–"}</td>
                      <td className="px-3 py-3 text-zinc-300 text-xs font-bold">{i.stockCount}</td>
                      <td className="px-3 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${STATUS_COLOR[i.status]||""}`}>{i.status}</span></td>
                      <td className="px-3 py-3 text-zinc-500 text-xs max-w-[120px] truncate">{i.warrantyDetails||"–"}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>{setEditingId(i.id);setForm({...i,purchaseDate:i.purchaseDate?.slice(0,10)||""});setShowForm(true);}} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-blue-300 transition"><Edit2 size={13}/></button>
                          <button onClick={()=>handleDelete(i.id,i.assetNumber)} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition"><Trash2 size={13}/></button>
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
