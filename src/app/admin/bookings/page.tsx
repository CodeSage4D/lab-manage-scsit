"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, Search, Trash2, Edit2, RefreshCw, ArrowLeft, CheckCircle, AlertTriangle, Loader2, Check, X, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { getLabBookings, getLaboratories, getAdmins, saveLabBooking, deleteLabBooking } from "../../actions";
import { exportToExcel } from "../../../utils/exportHelper";

const TIME_SLOTS = ["08:00 - 09:00","09:00 - 10:00","10:00 - 11:00","11:00 - 12:00","12:00 - 13:00","13:00 - 14:00","14:00 - 15:00","15:00 - 16:00","16:00 - 17:00","17:00 - 18:00"];

interface Booking {
  id:string;labId:string;userId:string;facultyName:string;timeSlot:string;
  bookingDate:string;subjectName:string;semester:string;studentCount:number;approvalStatus:string;
  lab?:{name:string;code:string};user?:{name:string;employeeId:string};
}

const EMPTY_FORM = {labId:"",userId:"",facultyName:"",timeSlot:"",bookingDate:"",subjectName:"",semester:"",studentCount:30,approvalStatus:"Approved"};

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

export default function LabBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterLab, setFilterLab] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0,10));
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{msg:string;type:"success"|"error"}|null>(null);
  const [viewMode, setViewMode] = useState<"table"|"calendar">("table");
  const PAGE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, lRes, uRes] = await Promise.all([getLabBookings(), getLaboratories(), getAdmins()]);
      if (bRes.success) setBookings(bRes.data || []);
      if (lRes.success) setLabs(lRes.data || lRes.labs || []);
      if (uRes.success) setUsers(uRes.data || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (msg:string, type:"success"|"error"="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  const filtered = useMemo(() => {
    let list = [...bookings];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(b => b.facultyName.toLowerCase().includes(q)||b.subjectName.toLowerCase().includes(q)||(b.lab?.name||"").toLowerCase().includes(q)||b.semester.toLowerCase().includes(q));
    if (filterLab) list = list.filter(b=>b.labId===filterLab);
    if (filterDate) list = list.filter(b=>formatDate(b.bookingDate)===filterDate);
    return list.sort((a,b) => new Date(b.bookingDate).getTime()-new Date(a.bookingDate).getTime());
  }, [bookings, search, filterLab, filterDate]);

  const paginated = useMemo(()=>filtered.slice((page-1)*PAGE,page*PAGE),[filtered,page]);
  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE));

  const todayBookings = useMemo(()=>bookings.filter(b=>formatDate(b.bookingDate)===formatDate(new Date())),[bookings]);

  const handleSave = async () => {
    if(!form.labId||!form.facultyName||!form.timeSlot||!form.bookingDate||!form.subjectName) { showToast("Fill all required fields.","error"); return; }
    setSaving(true);
    try {
      const res = await saveLabBooking({...form,id:editingId||undefined});
      if(res.success) { showToast(editingId?"Booking updated.":"Lab booked successfully."); setShowForm(false); fetchData(); }
      else showToast(res.error||"Failed.","error");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id:string) => {
    if(!confirm("Cancel this booking?")) return;
    const res = await deleteLabBooking(id);
    if(res.success){showToast("Booking cancelled.");fetchData();}
    else showToast(res.error||"Failed.","error");
  };

  const exportExcel = () => {
    const headers = ["Lab","Faculty","Subject","Semester","Time Slot","Date","Students","Status"];
    const rows = filtered.map(b => [
      b.lab?.name||"", b.facultyName, b.subjectName, b.semester, b.timeSlot, formatDate(b.bookingDate), b.studentCount, b.approvalStatus
    ]);
    exportToExcel(rows, headers, "Lab Bookings", "SCSIT_Lab_Bookings");
    showToast("Excel sheet exported successfully.");
  };

  // Calendar view: group by lab and time slot for a given date
  const calendarData = useMemo(() => {
    const dateBookings = bookings.filter(b=>formatDate(b.bookingDate)===(filterDate||formatDate(new Date())));
    const grid: Record<string,Record<string,Booking|null>> = {};
    labs.forEach(l => { grid[l.id]={}; TIME_SLOTS.forEach(t=>{grid[l.id][t]=null;}); });
    dateBookings.forEach(b => { if(grid[b.labId]) grid[b.labId][b.timeSlot]=b; });
    return grid;
  }, [bookings, labs, filterDate]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {toast && <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl ${toast.type==="success"?"bg-emerald-950 border-emerald-700 text-emerald-300":"bg-red-950 border-red-700 text-red-300"}`}>{toast.type==="success"?<CheckCircle size={15}/>:<AlertTriangle size={15}/>}{toast.msg}</div>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100">{editingId?"Edit Booking":"Book Lab"}</h2>
              <button onClick={()=>setShowForm(false)} className="text-zinc-400 hover:text-zinc-200"><X size={20}/></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {[
                {label:"Lab *",field:"labId",type:"select",opts:labs.map((l:any)=>({v:l.id,l:l.name}))},
                {label:"Time Slot *",field:"timeSlot",type:"select",opts:TIME_SLOTS.map(t=>({v:t,l:t}))},
                {label:"Booking Date *",field:"bookingDate",type:"date"},
                {label:"Faculty Name *",field:"facultyName",type:"text",placeholder:"Prof. Sharma"},
                {label:"Subject Name *",field:"subjectName",type:"text",placeholder:"DBMS / Python Lab"},
                {label:"Semester *",field:"semester",type:"text",placeholder:"Sem 3"},
                {label:"Student Count",field:"studentCount",type:"number"},
              ].map(({label,field,type,opts,placeholder}:any)=>(
                <div key={field}>
                  <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
                  {type==="select"?(
                    <select value={form[field]||""} onChange={e=>setForm((p:any)=>({...p,[field]:e.target.value}))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500">
                      <option value="">Select...</option>
                      {(opts||[]).map((o:any)=><option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  ):(
                    <input type={type} value={form[field]||""} onChange={e=>setForm((p:any)=>({...p,[field]:type==="number"?Number(e.target.value):e.target.value}))} placeholder={placeholder}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2">
                {saving?<Loader2 size={14} className="animate-spin"/>:<Check size={14}/>}{editingId?"Update":"Book Lab"}
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
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2"><CalendarDays size={16} className="text-emerald-400"/>Lab Booking Register</h1>
              <p className="text-xs text-zinc-500">SCSIT LabOS · Digital Booking Register</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition"><RefreshCw size={15}/></button>
            <div className="flex bg-zinc-800 rounded-lg p-0.5">
              <button onClick={()=>setViewMode("table")} className={`px-3 py-1.5 rounded text-xs font-medium transition ${viewMode==="table"?"bg-zinc-700 text-zinc-100":"text-zinc-400"}`}>Table</button>
              <button onClick={()=>setViewMode("calendar")} className={`px-3 py-1.5 rounded text-xs font-medium transition ${viewMode==="calendar"?"bg-zinc-700 text-zinc-100":"text-zinc-400"}`}>Schedule</button>
            </div>
            <button onClick={exportExcel} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"><FileSpreadsheet size={14}/>Excel</button>
            <button onClick={()=>{setEditingId(null);setForm({...EMPTY_FORM,bookingDate:new Date().toISOString().slice(0,10)});setShowForm(true);}} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition"><Plus size={14}/>Book Lab</button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"><p className="text-2xl font-bold text-zinc-200">{bookings.length}</p><p className="text-xs text-zinc-500 mt-1">Total Bookings</p></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"><p className="text-2xl font-bold text-emerald-400">{todayBookings.length}</p><p className="text-xs text-zinc-500 mt-1">Today's Bookings</p></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"><p className="text-2xl font-bold text-blue-400">{labs.length}</p><p className="text-xs text-zinc-500 mt-1">Active Labs</p></div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search by faculty, subject, lab, semester..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"/>
          </div>
          <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-rose-500"/>
          <select value={filterLab} onChange={e=>setFilterLab(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-rose-500">
            <option value="">All Labs</option>
            {labs.map((l:any)=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {filterDate && <button onClick={()=>setFilterDate("")} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"><X size={11}/>Clear date</button>}
        </div>

        {viewMode==="calendar" ? (
          /* Schedule / Calendar View */
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid gap-2" style={{gridTemplateColumns:`120px repeat(${labs.length},1fr)`}}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-xs font-bold text-zinc-500 uppercase flex items-center">Time Slot</div>
                {labs.map((l:any)=>(
                  <div key={l.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-xs font-bold text-zinc-300 text-center">{l.name}</div>
                ))}
                {TIME_SLOTS.map(slot=>(
                  <React.Fragment key={slot}>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-2 py-3 text-xs text-zinc-500 flex items-center font-mono">{slot}</div>
                    {labs.map((l:any)=>{
                      const booking = calendarData[l.id]?.[slot];
                      return (
                        <div key={l.id} className={`border rounded-lg px-2 py-2 text-xs transition cursor-pointer ${booking?"bg-rose-900/30 border-rose-700/50 hover:bg-rose-900/50":"bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/50"}`}
                          onClick={()=>{if(!booking){setEditingId(null);setForm({...EMPTY_FORM,labId:l.id,timeSlot:slot,bookingDate:filterDate||new Date().toISOString().slice(0,10)});setShowForm(true);}}}>
                          {booking ? (
                            <div>
                              <p className="font-semibold text-rose-300 truncate">{booking.facultyName}</p>
                              <p className="text-zinc-400 truncate">{booking.subjectName}</p>
                              <p className="text-zinc-500">{booking.semester} · {booking.studentCount}s</p>
                            </div>
                          ) : <p className="text-zinc-700 text-center py-1">Free</p>}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {loading ? <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-emerald-400"/><span className="ml-3 text-zinc-500 text-sm">Loading bookings...</span></div>
            : paginated.length===0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <CalendarDays size={36} className="text-zinc-700 mb-3"/>
                <p className="text-zinc-400 font-medium">No bookings found</p>
                <button onClick={()=>{setEditingId(null);setForm({...EMPTY_FORM,bookingDate:new Date().toISOString().slice(0,10)});setShowForm(true);}} className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg transition">Book a Lab</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-800/50 border-b border-zinc-800">
                    <tr>{["Lab","Time Slot","Date","Faculty","Subject","Semester","Students","Status","Actions"].map(h=><th key={h} className="px-3 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {paginated.map(b=>(
                      <tr key={b.id} className="hover:bg-zinc-800/40 transition-colors group">
                        <td className="px-3 py-3 text-zinc-300 text-xs font-semibold">{b.lab?.name||"–"}</td>
                        <td className="px-3 py-3"><span className="font-mono text-emerald-400 text-xs">{b.timeSlot}</span></td>
                        <td className="px-3 py-3 text-zinc-400 text-xs">{formatDate(b.bookingDate)}</td>
                        <td className="px-3 py-3 text-zinc-300 text-xs">{b.facultyName}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs max-w-[150px] truncate">{b.subjectName}</td>
                        <td className="px-3 py-3 text-zinc-400 text-xs">{b.semester}</td>
                        <td className="px-3 py-3 text-zinc-300 text-xs font-bold">{b.studentCount}</td>
                        <td className="px-3 py-3"><span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[11px] font-semibold">{b.approvalStatus}</span></td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={()=>{setEditingId(b.id);setForm({...b,bookingDate:formatDate(b.bookingDate)});setShowForm(true);}} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-blue-300 transition"><Edit2 size={13}/></button>
                            <button onClick={()=>handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition"><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {viewMode==="table"&&!loading&&totalPages>1&&(
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-zinc-500">Page {page} of {totalPages} · {filtered.length} bookings</p>
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
