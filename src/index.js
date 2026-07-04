import React, { useState, useEffect } from 'react';
import { render } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Home, Tractor, ScanLine, Package, Calculator, Users,
  Plus, ArrowRight, CheckCircle, Droplets, Wind,
  Receipt, User, Search, ChevronDown, ChevronUp, X, MapPin, Factory, ArrowUpRight, ArrowDownToLine, Trash2, Edit3
} from 'lucide-react';

// ==========================================
// မဖြစ်မနေ ပြင်ဆင်ရန် (Supabase API Keys)
// ==========================================
const supabaseUrl = 'https://jgerimrkigxtphjcrafq.supabase.co/rest/v1/';
const supabaseKey = 'sb_publishable_2jhGRP_tFpR9xuPgJEBBxA_2_HRJTUG';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function MillERP() {
  const [isConfigured, setIsConfigured] = useState(supabaseUrl !== 'YOUR_SUPABASE_URL');
  const [activeView, setActiveView] = useState('gate'); 
  const [isLoading, setIsLoading] = useState(false);
  
  const getToday = () => new Date().toISOString().split('T')[0];

  const PADDY_STORAGE = ["B", "B/C ကြား", "C", "C/D ကြား", "D", "D/E ကြား", "E1", "E2", "E3", "Suncue", "Flat 1", "Flat 2", "Flat 3"];
  const RICE_STORAGE = ["A1", "CS ကွင်းသစ်", "CS ရှေ့", "B ကွင်း", "ဂိုဒေါင် အဟောင်း"];
  const DRYING_MACHINES = ["Suncue 1", "Suncue 2", "Flat 1", "Flat 2", "Flat 3"];

  // --- Database State ---
  const [jobs, setJobs] = useState([]);
  const [customerRemarks, setCustomerRemarks] = useState({});

  // --- UI State ---
  const [newJob, setNewJob] = useState({ 
    entryType: 'paddy', purpose: 'mill', customer: '', paddyType: '', qty: '', moisture: 'အစို', storage: '', date: getToday() 
  });
  const [activeJobId, setActiveJobId] = useState(null);
  const [dryingAllocations, setDryingAllocations] = useState([{ machine: '', qty: '' }]);
  const [dryQtyInput, setDryQtyInput] = useState('');
  const [dryStorageInput, setDryStorageInput] = useState('');
  const [millInput, setMillInput] = useState({ rice: '', broken12: '', broken234: '', bran: '' });
  const [sortInput, setSortInput] = useState({ 
    out1: '', storage1: '', out2: '', storage2: '', out3: '', storage3: '' 
  });
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // --- Supabase Data Fetching & Realtime Subscription ---
  useEffect(() => {
    if (!isConfigured) return;

    fetchData();

    // အခြားဖုန်းကနေ ဒေတာသွင်းရင် ချက်ချင်းပေါ်အောင် Realtime ချိတ်ဆက်ခြင်း
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchRemarks())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isConfigured]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: jobsData, error } = await supabase.from('jobs').select('*').order('date', { ascending: false });
    if (!error && jobsData) setJobs(jobsData);
    fetchRemarks();
    setIsLoading(false);
  };

  const fetchRemarks = async () => {
    const { data } = await supabase.from('customers').select('*');
    if (data) {
      const remarksObj = {};
      data.forEach(d => remarksObj[d.name] = d.remark);
      setCustomerRemarks(remarksObj);
    }
  };

  const updateRemark = async (name, remark) => {
    setCustomerRemarks(prev => ({ ...prev, [name]: remark }));
    await supabase.from('customers').upsert({ name, remark });
  };

  // ----------------------------------------
  // Helper Functions
  // ----------------------------------------
  const getSortingLabels = (type) => {
    const t = (type || '').toLowerCase();
    if(t.includes('ကောက်ညှင်း')) return ['ကောက်ညှင်း (အချော)', 'အကြမ်းဆန် (By-product)', 'ကောက်ညှင်း (Reject)'];
    if(t.includes('ကြမ်း')) return ['အကြမ်းဆန် (အချော)', 'ဗိုက်ဖြူဆန် (By-product)', 'အကြမ်း (Reject)'];
    if(t.includes('ပေါ်ဆန်း')) return ['ပေါ်ဆန်း (အချော)', 'ကြမ်းဆန် (By-product)', 'ပေါ်ဆန်း (Reject)'];
    if(t.includes('စကွဲ')) return ['စကွဲ (အချော)', 'By-product (အမှုန့်)', 'Reject (အမည်း)'];
    return [`${type} (အချော)`, 'By-product', 'Reject'];
  };

  // အကယ်၍ API Key မထည့်ရသေးပါက သတိပေးရန်
  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Supabase API Keys လိုအပ်နေပါသည်</h2>
          <p className="text-slate-600 mb-6">Code ရဲ့ အပေါ်ဆုံးမှာရှိတဲ့ <code>YOUR_SUPABASE_URL</code> နဲ့ <code>YOUR_SUPABASE_ANON_KEY</code> နေရာတွေမှာ အစ်ကို့ Project ရဲ့ Keys တွေကို အစားထိုးပေးပါ။</p>
        </div>
      </div>
    );
  }

  const GateView = () => {
    const handleAddJob = async (e) => {
      e.preventDefault();
      if(!newJob.customer || !newJob.qty || !newJob.paddyType) return alert("အချက်အလက်များ ပြည့်စုံစွာ ထည့်ပါ။");
      setIsLoading(true);

      const d = new Date(newJob.date);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      const suffix = `${mm}${yy}`;
      
      const jobsInThisMonth = jobs.filter(j => j.id && j.id.endsWith(suffix)).length;
      const seq = String(jobsInThisMonth + 1).padStart(3, '0');
      const newJobId = `${seq}${suffix}`;

      const isWet = newJob.entryType === 'paddy' && newJob.moisture === 'အစို';
      const initialStatus = newJob.entryType === 'nawali' ? 'waiting_sort' : (isWet ? 'waiting_dry' : 'waiting_mill');

      const jobData = {
        id: newJobId, customer: newJob.customer, entryType: newJob.entryType, purpose: newJob.entryType === 'nawali' ? 'mill' : newJob.purpose,
        paddyType: newJob.paddyType, originalQty: Number(newJob.qty), currentQty: Number(newJob.qty),
        moisture: newJob.entryType === 'nawali' ? 'အခြောက်' : newJob.moisture, wasWet: isWet, storage: newJob.storage || '-',
        status: initialStatus, date: newJob.date
      };
      
      const { error } = await supabase.from('jobs').insert([jobData]);
      if (error) alert("Database Error: " + error.message);
      else {
        setNewJob({ ...newJob, customer: '', paddyType: '', qty: '', storage: '' });
        alert("စာရင်းသွင်းပြီးပါပြီ။ ID: " + newJobId);
      }
      setIsLoading(false);
    };

    const handleAddAllocation = () => setDryingAllocations([...dryingAllocations, { machine: '', qty: '' }]);
    const handleRemoveAllocation = (index) => setDryingAllocations(dryingAllocations.filter((_, i) => i !== index));

    const handleSendToDryer = async (jobId) => {
      const isValid = dryingAllocations.every(a => a.machine && a.qty > 0);
      if(!isValid || dryingAllocations.length === 0) return alert("စက်အမည် နှင့် တင်းအရေအတွက် ပြည့်စုံစွာ ထည့်ပါ။");
      const totalDryQty = dryingAllocations.reduce((sum, a) => sum + Number(a.qty), 0);
      const currentJob = jobs.find(j => j.id === jobId);
      if(totalDryQty > currentJob.currentQty) return alert(`ထည့်သွင်းသော စုစုပေါင်းတင်း (${totalDryQty}) သည် မူလတင်း (${currentJob.currentQty}) ထက် များနေပါသည်။`);

      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'drying', dryingMachines: dryingAllocations }).eq('id', jobId);
      setActiveJobId(null);
      setIsLoading(false);
    };

    const handleDryingDone = async (job) => {
      if(!dryQtyInput || !dryStorageInput) return alert("ကျန်ရှိတင်း နှင့် သိုလှောင်ရုံနေရာ ထည့်ပါ။");
      const nextStatus = job.purpose === 'dry_only' ? 'ready_to_bill' : 'waiting_mill';
      
      setIsLoading(true);
      await supabase.from('jobs').update({ 
        currentQty: Number(dryQtyInput), storage: dryStorageInput, moisture: 'အခြောက်', status: nextStatus
      }).eq('id', job.id);
      
      setActiveJobId(null); setDryQtyInput(''); setDryStorageInput('');
      setIsLoading(false);
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Home className="mr-3 text-blue-600"/> စပါးလက်ခံ / အခြောက်ခံ ဌာန</h2>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center"><ArrowDownToLine size={18} className="mr-2 text-blue-500"/> စပါးအဝင် စာရင်းသစ်သွင်းရန်</h3>
          <form onSubmit={handleAddJob} className="space-y-4">
            
            <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-md mb-4 border border-slate-200">
              <button type="button" onClick={() => setNewJob({...newJob, entryType: 'paddy'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newJob.entryType === 'paddy' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>စပါးအဝင်</button>
              <button type="button" onClick={() => setNewJob({...newJob, entryType: 'nawali'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newJob.entryType === 'nawali' ? 'bg-white text-amber-700 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>နဝလီ (Color Sort အဝင်)</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">ရက်စွဲ</label>
                <input type="date" value={newJob.date} onChange={e=>setNewJob({...newJob, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">ဖောက်သည်အမည်</label>
                <input type="text" value={newJob.customer} onChange={e=>setNewJob({...newJob, customer: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900" required placeholder="အမည်" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{newJob.entryType === 'paddy' ? 'စပါးအမျိုးအစား' : 'ဆန်အမျိုးအစား'}</label>
                <input type="text" list="paddyTypes" value={newJob.paddyType} onChange={e=>setNewJob({...newJob, paddyType: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900" required placeholder="ရိုက်ထည့်ပါ..." />
                <datalist id="paddyTypes">
                  <option value="ကောက်ညှင်း" /><option value="အကြမ်းဆန်" /><option value="ပေါ်ဆန်း" /><option value="ဧည့်မထ" /><option value="စကွဲ" />
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">အရေအတွက် ({newJob.entryType === 'paddy' ? 'တင်း' : 'အိတ်'})</label>
                <input type="number" value={newJob.qty} onChange={e=>setNewJob({...newJob, qty: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900" required placeholder="0" min="1"/>
              </div>
              
              {newJob.entryType === 'paddy' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">အစို / အခြောက်</label>
                    <select value={newJob.moisture} onChange={e=>setNewJob({...newJob, moisture: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900 font-bold text-blue-700">
                      <option value="အစို">အစို (အခြောက်ခံမည်)</option>
                      <option value="အခြောက်">အခြောက်</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">လုပ်ငန်းရည်ရွယ်ချက်</label>
                    <select value={newJob.purpose} onChange={e=>setNewJob({...newJob, purpose: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900 font-bold">
                      <option value="mill">စက်ကြိတ်မည်</option>
                      <option value="dry_only">အခြောက်ခံရုံ သီးသန့်</option>
                    </select>
                  </div>
                </>
              )}

              <div className="col-span-1 md:col-span-2">
                 <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center"><MapPin size={12} className="mr-1"/> ချထားမည့် သိုလှောင်ရုံ/နေရာ</label>
                 <input type="text" list="storageLocations" value={newJob.storage} onChange={e=>setNewJob({...newJob, storage: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900" placeholder="ရိုက်ထည့်ပါ (သို့) ရွေးပါ" required/>
                 <datalist id="storageLocations">
                    {newJob.entryType === 'paddy' ? PADDY_STORAGE.map(s => <option key={s} value={s}/>) : RICE_STORAGE.map(s => <option key={s} value={s}/>)}
                 </datalist>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
              <button disabled={isLoading} type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-bold shadow-lg disabled:opacity-50 transition-colors text-sm flex items-center">{isLoading ? 'Processing...' : <><Plus size={18} className="mr-2"/> စာရင်းသွင်းမည်</>}</button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Waiting to Dry */}
          <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-sm flex flex-col">
            <div className="bg-amber-50 p-5 border-b border-amber-200">
              <h3 className="font-bold text-amber-900 flex items-center"><Droplets size={20} className="mr-2"/> အခြောက်ခံစက်သို့ ထည့်ရန် (အစို)</h3>
            </div>
            <div className="p-5 space-y-4 flex-1 overflow-y-auto bg-slate-50">
              {jobs.filter(j => j.status === 'waiting_dry').map(job => (
                <div key={job.id} className="bg-white p-5 rounded-xl border border-amber-100 shadow-sm transition-all hover:shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="font-black text-slate-800 block text-lg">{job.customer}</span>
                      <span className="text-sm font-semibold text-slate-500 mt-1 block">{job.id} • {job.paddyType} <span className="text-amber-600">({job.currentQty} တင်း)</span></span>
                    </div>
                    <div className="text-right">
                       <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-bold uppercase block mb-1">စောင့်ဆိုင်းဆဲ</span>
                       <span className="text-xs font-medium text-slate-500"><MapPin size={12} className="inline mr-1"/>{job.storage}</span>
                    </div>
                  </div>
                  
                  {activeJobId === job.id + '-todry' ? (
                    <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-bold text-amber-800">အသုံးပြုမည့် အခြောက်ခံစက်များ ခွဲထည့်ရန်</label>
                      {dryingAllocations.map((alloc, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input type="text" list="dryingMachines" value={alloc.machine} onChange={e => {
                            const newAllocs = [...dryingAllocations]; newAllocs[idx].machine = e.target.value; setDryingAllocations(newAllocs);
                          }} className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500" placeholder="စက်အမည်..." required/>
                          <datalist id="dryingMachines">{DRYING_MACHINES.map(m => <option key={m} value={m}/>)}</datalist>
                          
                          <input type="number" value={alloc.qty} onChange={e => {
                            const newAllocs = [...dryingAllocations]; newAllocs[idx].qty = e.target.value; setDryingAllocations(newAllocs);
                          }} className="w-24 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500" placeholder="တင်း" required min="1"/>
                          
                          {idx > 0 && <button onClick={() => handleRemoveAllocation(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16}/></button>}
                        </div>
                      ))}
                      
                      <div className="flex justify-between items-center mt-2">
                        <button onClick={handleAddAllocation} className="text-xs font-bold text-blue-600 flex items-center"><Plus size={14} className="mr-1"/> စက်ထပ်ထည့်မည်</button>
                        <div className="flex gap-2">
                           <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold">ပယ်ဖျက်</button>
                           <button disabled={isLoading} onClick={() => handleSendToDryer(job.id)} className="px-5 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold shadow-md">စက်လည်မည်</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setActiveJobId(job.id + '-todry'); setDryingAllocations([{machine: '', qty: job.currentQty}]); }} className="w-full mt-2 bg-amber-50 text-amber-700 border border-amber-200 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-100 transition-colors">စက်ထဲ ခွဲထည့်မည်</button>
                  )}
                </div>
              ))}
              {jobs.filter(j => j.status === 'waiting_dry').length === 0 && <p className="text-sm font-bold text-slate-400 text-center py-10">အစို စောင့်ဆိုင်းစာရင်း မရှိပါ။</p>}
            </div>
          </div>

          {/* Currently Drying */}
          <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-sm flex flex-col">
            <div className="bg-orange-50 p-5 border-b border-orange-200">
              <h3 className="font-bold text-orange-900 flex items-center"><Wind size={20} className="mr-2"/> အခြောက်ခံနေဆဲ</h3>
            </div>
            <div className="p-5 space-y-4 flex-1 overflow-y-auto bg-slate-50">
              {jobs.filter(j => j.status === 'drying').map(job => (
                <div key={job.id} className="bg-white p-5 rounded-xl border border-orange-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                  <div className="flex justify-between items-start mb-4 pl-3">
                    <div>
                      <span className="font-black text-slate-800 block text-lg">{job.customer}</span>
                      <span className="text-sm font-bold text-slate-500 mt-1 block">{job.id} • {job.paddyType}</span>
                    </div>
                    <div className="text-right">
                       <span className="text-sm font-black text-orange-600 block mb-1">{job.originalQty} တင်း ဝင်ထား</span>
                    </div>
                  </div>

                  <div className="pl-3 mb-4">
                     <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">အသုံးပြုနေသော စက်များ</p>
                     <div className="flex flex-wrap gap-2">
                        {job.dryingMachines?.map((dm, idx) => (
                           <span key={idx} className="bg-orange-50 text-orange-800 text-xs px-2.5 py-1 rounded-md border border-orange-100 font-bold">{dm.machine} ({dm.qty} တင်း)</span>
                        ))}
                     </div>
                  </div>
                  
                  {activeJobId === job.id + '-finish' ? (
                    <div className="mt-4 pt-4 border-t border-orange-100 space-y-4 pl-3 animate-in fade-in zoom-in-95 duration-200">
                      <div>
                        <label className="text-xs font-bold text-orange-800 block mb-1.5">ကျန်ရှိမည့် တင်း (လျော့တင်း အလိုအလျောက် တွက်မည်)</label>
                        <input type="number" value={dryQtyInput} onChange={e=>setDryQtyInput(e.target.value)} placeholder={`မူလတင်း: ${job.originalQty}`} className="w-full p-3 border-2 border-orange-300 rounded-xl text-lg outline-none bg-orange-50/30 text-slate-900 font-black" required/>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">သိုလှောင်ရုံ/နေရာ အသစ် <span className="text-red-500">*</span></label>
                        <input type="text" list="paddyStorage" value={dryStorageInput} onChange={e=>setDryStorageInput(e.target.value)} placeholder="နေရာရွေးပါ..." className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none bg-white text-slate-900" required/>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-sm font-bold">ပယ်ဖျက်</button>
                        <button disabled={isLoading} onClick={() => handleDryingDone(job)} className="flex-1 bg-orange-600 text-white py-3 rounded-xl text-sm font-bold shadow-md">အတည်ပြုမည်</button>
                      </div>
                    </div>
                  ) : (
                    <div className="pl-3 mt-4 border-t border-slate-100 pt-4">
                       <button onClick={() => setActiveJobId(job.id + '-finish')} className="w-full bg-orange-50 text-orange-700 border border-orange-200 py-3 rounded-xl text-sm font-bold hover:bg-orange-100 transition-colors shadow-sm">အခြောက်ခံပြီးစီး (လျော့တင်းသွင်းမည်)</button>
                    </div>
                  )}
                </div>
              ))}
              {jobs.filter(j => j.status === 'drying').length === 0 && <p className="text-sm font-bold text-slate-400 text-center py-10">အခြောက်ခံနေသော စာရင်းမရှိပါ။</p>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MillingView = () => {
    const handleMillDone = async (jobId) => {
      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'waiting_sort', millingData: millInput }).eq('id', jobId);
      setActiveJobId(null);
      setMillInput({ rice: '', broken12: '', broken234: '', bran: '' });
      setIsLoading(false);
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Tractor className="mr-3 text-purple-600"/> ကြိတ်ခွဲရေး ဌာန</h2>
        <div className="space-y-5">
          {jobs.filter(j => j.status === 'waiting_mill' && j.purpose === 'mill').map(job => (
            <div key={job.id} className="bg-white p-6 rounded-2xl border-l-4 border-l-purple-500 border border-slate-200 shadow-sm relative transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-black text-2xl text-slate-800">{job.customer}</h3>
                  <div className="text-sm font-bold text-slate-500 mt-2">{job.id} • {job.paddyType} <span className="text-purple-600 ml-2 bg-purple-50 px-2 py-0.5 rounded">စပါး ({job.currentQty || 0} တင်း)</span></div>
                </div>
                <div className="text-right">
                   <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider block mb-2">ကြိတ်ရန်အသင့်</span>
                   <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 flex items-center justify-end"><MapPin size={12} className="mr-1"/>{job.storage}</span>
                </div>
              </div>
              
              {activeJobId === job.id ? (
                <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 mt-6 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div><label className="text-xs font-bold text-slate-700 block mb-2">ဆန်အကြမ်း (အိတ်)</label><input type="number" value={millInput.rice} onChange={e=>setMillInput({...millInput, rice: e.target.value})} className="w-full p-3 border-2 border-purple-200 rounded-xl outline-none focus:border-purple-500 bg-white text-slate-900 font-bold text-lg"/></div>
                    <div><label className="text-xs font-bold text-blue-700 block mb-2">၁၂ ဆန်ကွဲ (အိတ်)</label><input type="number" value={millInput.broken12} onChange={e=>setMillInput({...millInput, broken12: e.target.value})} className="w-full p-3 border border-blue-200 rounded-xl outline-none bg-white text-slate-900"/></div>
                    <div><label className="text-xs font-bold text-sky-700 block mb-2">၂၃၄ ဆန်ကွဲ (အိတ်)</label><input type="number" value={millInput.broken234} onChange={e=>setMillInput({...millInput, broken234: e.target.value})} className="w-full p-3 border border-sky-200 rounded-xl outline-none bg-white text-slate-900"/></div>
                    <div><label className="text-xs font-bold text-amber-700 block mb-2">ဖွဲနု (အိတ်)</label><input type="number" value={millInput.bran} onChange={e=>setMillInput({...millInput, bran: e.target.value})} className="w-full p-3 border border-amber-200 rounded-xl outline-none bg-white text-slate-900"/></div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl text-sm">ပယ်ဖျက်</button>
                    <button disabled={isLoading} onClick={() => handleMillDone(job.id)} className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm shadow-lg flex items-center transition-colors">
                      ကြိတ်ခွဲမှု စာရင်းသွင်းမည် <ArrowRight size={18} className="ml-2"/>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-100 pt-5 mt-2">
                   <button onClick={() => setActiveJobId(job.id)} className="w-full bg-slate-50 text-purple-700 border border-purple-200 py-3.5 rounded-xl font-bold hover:bg-purple-100 transition-colors shadow-sm text-sm">ကြိတ်ခွဲမှု ရလဒ်များ စာရင်းသွင်းမည်</button>
                </div>
              )}
            </div>
          ))}
          {jobs.filter(j => j.status === 'waiting_mill' && j.purpose === 'mill').length === 0 && <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed"><p className="text-slate-500 font-bold text-lg">ကြိတ်ခွဲရန် စာရင်းမရှိပါ။</p></div>}
        </div>
      </div>
    );
  };

  const SortingView = () => {
    const handleSortDone = async (jobId) => {
      const labels = getSortingLabels(jobs.find(j=>j.id===jobId).paddyType);
      if (sortInput.out1 > 0 && !sortInput.storage1) return alert(`${labels[0]} အတွက် သိုလှောင်ရုံ/နေရာ ရွေးပါ။`);
      if (sortInput.out2 > 0 && !sortInput.storage2) return alert(`${labels[1]} အတွက် သိုလှောင်ရုံ/နေရာ ရွေးပါ။`);
      if (sortInput.out3 > 0 && !sortInput.storage3) return alert(`${labels[2]} အတွက် သိုလှောင်ရုံ/နေရာ ရွေးပါ။`);

      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'ready_to_bill', sortingData: sortInput }).eq('id', jobId);
      setActiveJobId(null);
      setSortInput({ out1: '', storage1: '', out2: '', storage2: '', out3: '', storage3: '' });
      setIsLoading(false);
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><ScanLine className="mr-3 text-indigo-600"/> Color Sorting ဌာန</h2>
        <div className="space-y-5">
          {jobs.filter(j => j.status === 'waiting_sort').map(job => {
            const labels = getSortingLabels(job.paddyType);
            const isNawali = job.entryType === 'nawali';
            const rawBags = isNawali ? job.originalQty : (job.millingData?.rice || 0);

            return (
              <div key={job.id} className="bg-white p-6 rounded-2xl border-l-4 border-l-indigo-500 border border-slate-200 shadow-sm relative transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-2xl text-slate-800">{job.customer}</h3>
                    <div className="text-sm font-bold text-slate-500 mt-2">
                      {job.id} • {job.paddyType} {isNawali ? <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded ml-2 text-xs border border-amber-200">နဝလီ (အပြင်ထည်)</span> : <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2 text-xs border border-blue-200">စက်ကြိတ် (အတွင်းထည်)</span>}
                    </div>
                    <div className="text-indigo-600 font-black mt-3 bg-indigo-50 inline-block px-3 py-1.5 rounded-lg border border-indigo-100">Raw အဝင်: <span className="text-lg">{rawBags}</span> အိတ်</div>
                  </div>
                  <div className="text-right">
                     <span className="bg-indigo-100 text-indigo-800 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider block mb-2">Sort ရန်အသင့်</span>
                  </div>
                </div>
                
                {activeJobId === job.id ? (
                  <div className="bg-indigo-50/40 p-6 rounded-2xl border border-indigo-100 mt-6 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-xs font-black text-indigo-800 uppercase tracking-wider mb-5 border-b border-indigo-100 pb-3 flex items-center"><Package size={16} className="mr-2"/> Sorting ထွက်ကုန်များ</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                        <label className="text-sm font-bold text-indigo-900 block mb-3">{labels[0]}</label>
                        <input type="number" value={sortInput.out1} onChange={e=>setSortInput({...sortInput, out1: e.target.value})} className="w-full p-3 border-2 border-indigo-200 rounded-lg outline-none font-black text-lg mb-2" placeholder="အိတ် အရေအတွက်"/>
                        <div className="relative mt-2">
                          <MapPin size={14} className="absolute left-3 top-3.5 text-slate-400"/>
                          <input type="text" list="riceStorage" value={sortInput.storage1} onChange={e=>setSortInput({...sortInput, storage1: e.target.value})} className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg text-xs" placeholder="ဂိုဒေါင်/နေရာ (မဖြစ်မနေ)..."/>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <label className="text-sm font-bold text-slate-700 block mb-3">{labels[1]}</label>
                        <input type="number" value={sortInput.out2} onChange={e=>setSortInput({...sortInput, out2: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg outline-none font-bold mb-2" placeholder="အိတ် အရေအတွက်"/>
                        <div className="relative mt-2">
                          <MapPin size={14} className="absolute left-3 top-3.5 text-slate-400"/>
                          <input type="text" list="riceStorage" value={sortInput.storage2} onChange={e=>setSortInput({...sortInput, storage2: e.target.value})} className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg text-xs" placeholder="ဂိုဒေါင်/နေရာ..."/>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                        <label className="text-sm font-bold text-red-700 block mb-3">{labels[2]}</label>
                        <input type="number" value={sortInput.out3} onChange={e=>setSortInput({...sortInput, out3: e.target.value})} className="w-full p-3 border border-red-200 rounded-lg outline-none font-bold mb-2" placeholder="အိတ် အရေအတွက်"/>
                        <div className="relative mt-2">
                          <MapPin size={14} className="absolute left-3 top-3.5 text-slate-400"/>
                          <input type="text" list="riceStorage" value={sortInput.storage3} onChange={e=>setSortInput({...sortInput, storage3: e.target.value})} className="w-full p-2.5 pl-9 border border-red-200 rounded-lg text-xs" placeholder="ဂိုဒေါင်/နေရာ..."/>
                        </div>
                      </div>
                    </div>
                    <datalist id="riceStorage">{RICE_STORAGE.map(s => <option key={s} value={s}/>)}</datalist>
                    
                    <div className="flex justify-end gap-3 pt-2 border-t border-indigo-100">
                      <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl text-sm">ပယ်ဖျက်</button>
                      <button disabled={isLoading} onClick={() => handleSortDone(job.id)} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg transition-colors flex items-center">
                        <CheckCircle size={18} className="mr-2"/> ဂိုဒေါင် / ငွေစာရင်းသို့ ပို့မည်
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-100 pt-5 mt-2">
                    <button onClick={() => setActiveJobId(job.id)} className="w-full bg-slate-50 text-indigo-700 border border-indigo-200 py-3.5 rounded-xl font-bold hover:bg-indigo-100 transition-colors shadow-sm text-sm">Sorting ရလဒ် စာရင်းသွင်းမည်</button>
                  </div>
                )}
              </div>
            );
          })}
          {jobs.filter(j => j.status === 'waiting_sort').length === 0 && <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed"><p className="text-slate-500 font-bold text-lg">Sorting လုပ်ရန် စာရင်းမရှိပါ။</p></div>}
        </div>
      </div>
    );
  };

  const WarehouseView = () => {
    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Factory className="mr-3 text-emerald-600"/> သိုလှောင်ရုံ (ဂိုဒေါင်)</h2>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-emerald-50 text-emerald-900 border-b border-emerald-100">
                <tr>
                  <th className="p-4 text-sm font-bold">ဘောက်ချာ / ဖောက်သည်</th>
                  <th className="p-4 text-sm font-bold">ပစ္စည်း အမျိုးအစား</th>
                  <th className="p-4 text-sm font-bold text-emerald-700">သိုလှောင်ထားသည့် နေရာများ နှင့် အရေအတွက်</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {jobs.map(job => {
                  const isPaddy = job.status === 'waiting_dry' || job.status === 'waiting_mill';
                  const isFinished = job.status === 'ready_to_bill' || job.status === 'billed';
                  const labels = getSortingLabels(job.paddyType);
                  if (job.status === 'drying') return null;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <td className="p-4 align-top w-1/3">
                        <div className="font-bold text-slate-800">{job.id}</div>
                        <div className="text-sm font-bold text-slate-500">{job.customer}</div>
                        <div className="text-xs text-slate-400 mt-1">{job.paddyType} {job.entryType === 'nawali' ? '(နဝလီ)' : ''}</div>
                      </td>
                      <td className="p-4 align-top w-1/4">
                        {isPaddy ? <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-md text-xs font-bold border border-amber-200">စပါး ({job.moisture})</span>
                         : isFinished ? <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md text-xs font-bold border border-emerald-200">ဆန်ထွက်ကုန်များ</span>
                         : <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-xs font-bold">လုပ်ဆောင်ဆဲ</span>}
                      </td>
                      <td className="p-4 align-top">
                        {isPaddy && (
                           <div className="flex items-center text-sm font-bold bg-white p-2 rounded border border-slate-200 w-fit mb-2">
                             <MapPin size={14} className="text-slate-400 mr-2"/>
                             <span className="text-blue-600 mr-2">{job.storage}</span> <ArrowRight size={12} className="text-slate-300 mx-2"/> <span>{job.currentQty} တင်း</span>
                           </div>
                        )}
                        {isFinished && job.sortingData && job.purpose !== 'dry_only' && (
                           <div className="space-y-2">
                             {job.sortingData.out1 > 0 && (
                                <div className="flex items-center text-sm font-bold bg-white p-2 rounded border border-emerald-100 w-fit">
                                  <MapPin size={14} className="text-slate-400 mr-2"/>
                                  <span className="text-emerald-700 mr-2">{job.sortingData.storage1 || '-'}</span> <ArrowRight size={12} className="text-slate-300 mx-2"/> <span>{job.sortingData.out1} အိတ် <span className="text-xs text-slate-400 font-normal">({labels[0]})</span></span>
                                </div>
                             )}
                             {job.sortingData.out2 > 0 && job.billData?.byproductOption !== 'sell' && (
                                <div className="flex items-center text-sm font-bold bg-white p-2 rounded border border-slate-200 w-fit">
                                  <MapPin size={14} className="text-slate-400 mr-2"/>
                                  <span className="text-slate-700 mr-2">{job.sortingData.storage2 || '-'}</span> <ArrowRight size={12} className="text-slate-300 mx-2"/> <span>{job.sortingData.out2} အိတ် <span className="text-xs text-slate-400 font-normal">({labels[1]})</span></span>
                                </div>
                             )}
                             {job.sortingData.out3 > 0 && job.billData?.rejectOption !== 'sell' && (
                                <div className="flex items-center text-sm font-bold bg-white p-2 rounded border border-red-100 w-fit">
                                  <MapPin size={14} className="text-slate-400 mr-2"/>
                                  <span className="text-red-700 mr-2">{job.sortingData.storage3 || '-'}</span> <ArrowRight size={12} className="text-slate-300 mx-2"/> <span>{job.sortingData.out3} အိတ် <span className="text-xs text-red-400 font-normal">({labels[2]})</span></span>
                                </div>
                             )}
                           </div>
                        )}
                        {isFinished && job.purpose === 'dry_only' && (
                           <div className="flex items-center text-sm font-bold bg-white p-2 rounded border border-orange-200 w-fit">
                             <MapPin size={14} className="text-slate-400 mr-2"/>
                             <span className="text-orange-600 mr-2">{job.storage}</span> <ArrowRight size={12} className="text-slate-300 mx-2"/> <span>{job.currentQty} တင်း <span className="text-xs text-slate-400 font-normal">(အခြောက်ခံသီးသန့်)</span></span>
                           </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const InventoryView = () => {
    let totalPurchasedBran = 0;
    let totalPurchasedByproduct = 0;
    let totalPurchasedReject = 0;

    jobs.forEach(job => {
      if (job.status === 'billed' && job.billData) {
        if (job.billData.branOption === 'sell') totalPurchasedBran += Number(job.millingData?.bran || 0);
        if (job.billData.byproductOption === 'sell') totalPurchasedByproduct += Number(job.sortingData?.out2 || 0);
        if (job.billData.rejectOption === 'sell') totalPurchasedReject += Number(job.sortingData?.out3 || 0);
      }
    });

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Package className="mr-3 text-cyan-600"/> စက်ပိုင် ဆန်/ဖွဲနု စာရင်း</h2>
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl shadow-xl p-8 mb-8 text-white relative overflow-hidden">
           <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4"><ArrowDownToLine size={200}/></div>
           <h3 className="text-xl font-black mb-6 text-cyan-400 flex items-center relative z-10"><ArrowDownToLine size={24} className="mr-2"/> စက်မှ ပြန်လည်ဝယ်ယူထားသော စာရင်းချုပ်</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              <div className="bg-white/10 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                 <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">ဖွဲနု စုစုပေါင်း</p>
                 <div className="text-4xl font-black text-white">{totalPurchasedBran} <span className="text-base font-medium text-slate-400">အိတ်</span></div>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                 <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">အကြမ်းဆန် / ဗိုက်ဖြူ (By-product)</p>
                 <div className="text-4xl font-black text-white">{totalPurchasedByproduct} <span className="text-base font-medium text-slate-400">အိတ်</span></div>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                 <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Reject ဆန်အမည်း</p>
                 <div className="text-4xl font-black text-white">{totalPurchasedReject} <span className="text-base font-medium text-slate-400">အိတ်</span></div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const AdminView = () => {
    const [adminSearchQuery, setAdminSearchQuery] = useState('');
    const [billInput, setBillInput] = useState({ 
      dryingRate: '', sortingRate: '', millingRate: '', 
      branOption: 'take', branRate: '', 
      byproductOption: 'take', byproductRate: '',
      rejectOption: 'take', rejectRate: '', 
      otherExp: '', paidAmount: '' 
    });

    const handleBillSubmit = async (job, totalServiceFee, dryingFee, deduction, net, pd, bal) => {
      setIsLoading(true);
      await supabase.from('jobs').update({ 
        status: 'billed', 
        billData: { ...billInput, totalServiceFee, dryingFee, deduction, netTotal: net, paid: pd, balance: bal, billDate: getToday() } 
      }).eq('id', job.id);

      setActiveJobId(null);
      setBillInput({ dryingRate: '', sortingRate: '', millingRate: '', branOption: 'take', branRate: '', byproductOption: 'take', byproductRate: '', rejectOption: 'take', rejectRate: '', otherExp: '', paidAmount: '' });
      setIsLoading(false);
      alert("ငွေစာရင်းသိမ်းဆည်းပြီးပါပြီ။");
    };

    const pendingJobs = jobs.filter(j => j.status === 'ready_to_bill');
    const searchedJobs = pendingJobs.filter(j => 
      j.id === activeJobId || 
      (adminSearchQuery.trim() !== '' && (j.customer.toLowerCase().includes(adminSearchQuery.toLowerCase()) || j.id.toLowerCase().includes(adminSearchQuery.toLowerCase())))
    );

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Calculator className="mr-3 text-blue-600"/> ငွေစာရင်း (Admin POS) ဌာန</h2>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-8 shadow-sm">
          <label className="block text-sm font-bold text-slate-700 mb-3">ဘောက်ချာ ဖွင့်ရန် / ငွေရှင်းရန် ရှာဖွေပါ</label>
          <div className="relative max-w-xl">
            <input type="text" placeholder="ဖောက်သည် အမည် (သို့) ဘောက်ချာ ID ရိုက်ထည့်ပါ..." value={adminSearchQuery} onChange={e => setAdminSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-900 bg-slate-50"/>
            <Search className="absolute left-4 top-4 text-slate-400" size={20} />
          </div>
          {adminSearchQuery.trim() === '' && !activeJobId && <p className="text-sm font-medium text-slate-400 mt-4 flex items-center"><ArrowUpRight size={16} className="mr-2 text-blue-400"/> ရှာဖွေမှု အကွက်တွင် ရိုက်ထည့်မှသာ ဘေလ်များ ပေါ်လာပါမည်။</p>}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {adminSearchQuery.trim() !== '' && searchedJobs.length === 0 && !activeJobId && (
             <div className="col-span-2 text-center py-10 bg-white rounded-xl border border-slate-200"><p className="text-slate-500">ရှာဖွေမှုနှင့် ကိုက်ညီသော စာရင်း မရှိပါ။</p></div>
          )}

          {searchedJobs.map(job => {
            const labels = getSortingLabels(job.paddyType);
            const isNawali = job.entryType === 'nawali';
            const isDryOnly = job.purpose === 'dry_only';
            
            const dryingFee = job.wasWet ? (Number(job.originalQty) * (Number(billInput.dryingRate) || 0)) : 0;
            let totalServiceFee = 0;
            let totalMilledBags = 0;

            if (!isDryOnly) {
              totalMilledBags = isNawali ? 0 : (Number(job.millingData?.rice || 0) + Number(job.millingData?.broken12 || 0) + Number(job.millingData?.broken234 || 0));
              if (isNawali) totalServiceFee = Number(job.originalQty) * (Number(billInput.sortingRate) || 0);
              else totalServiceFee = totalMilledBags * (Number(billInput.millingRate) || 0);
            }

            const branQty = isNawali || isDryOnly ? 0 : Number(job.millingData?.bran || 0);
            const byproductQty = isDryOnly ? 0 : Number(job.sortingData?.out2 || 0);
            const rejectQty = isDryOnly ? 0 : Number(job.sortingData?.out3 || 0);
            
            const branDeduction = billInput.branOption === 'sell' ? (branQty * (Number(billInput.branRate) || 0)) : 0;
            const byproductDeduction = billInput.byproductOption === 'sell' ? (byproductQty * (Number(billInput.byproductRate) || 0)) : 0;
            const rejectDeduction = billInput.rejectOption === 'sell' ? (rejectQty * (Number(billInput.rejectRate) || 0)) : 0;
            
            const totalDeduction = branDeduction + byproductDeduction + rejectDeduction;
            const other = Number(billInput.otherExp) || 0;
            const paid = Number(billInput.paidAmount) || 0;
            
            const netTotal = totalServiceFee + dryingFee - totalDeduction + other;
            const balance = netTotal > 0 ? (netTotal - paid) : (netTotal + paid);
            const isRefund = netTotal < 0;
            const absNetTotal = Math.abs(netTotal);

            return (
              <div key={job.id} className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col transition-all">
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4"><Receipt size={140}/></div>
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black text-white mb-1">{job.customer}</h3>
                    <p className="text-slate-400 text-sm font-bold">ID: {job.id} | {job.paddyType}</p>
                  </div>
                  <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md relative z-10">ငွေရှင်းရန်</span>
                </div>

                {activeJobId === job.id ? (
                  <div className="p-6 flex-1 flex flex-col bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 mb-6 gap-3">
                       <div>
                          <h3 className="text-2xl font-black text-slate-800">{job.customer}</h3>
                          <p className="text-sm font-bold text-slate-500 mt-1">ဘောက်ချာ No: <span className="text-slate-800">{job.id}</span></p>
                       </div>
                       <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${isDryOnly ? 'bg-orange-50 text-orange-700 border-orange-200' : isNawali ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                          {isDryOnly ? 'အခြောက်ခံရုံ သီးသန့်' : isNawali ? 'နဝလီ (အပြင်ထည်)' : 'စက်ကြိတ် (အတွင်းထည်)'}
                       </span>
                    </div>

                    <div className="space-y-5 mb-8 text-slate-900">
                      {job.wasWet && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center"><Droplets size={18} className="mr-2 text-blue-500"/> အခြောက်ခံခ နှုန်းထား (၁ တင်းလျှင်)</label>
                          <div className="relative max-w-xs">
                            <input type="number" value={billInput.dryingRate} onChange={e=>setBillInput({...billInput, dryingRate: e.target.value})} className="w-full p-3 pl-4 pr-12 border-2 border-slate-200 bg-slate-50 text-slate-900 rounded-xl outline-none focus:border-blue-500 font-bold text-lg" placeholder="ကျပ်"/>
                            <span className="absolute right-4 top-3.5 text-slate-400 font-bold">Ks</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-2 font-bold bg-slate-100 p-2 rounded-lg inline-block">မူလ စပါးအဝင် ({job.originalQty} တင်း) ဖြင့် မြှောက်ပါမည်။</p>
                        </div>
                      )}

                      {!isDryOnly && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <label className="block text-sm font-bold text-slate-800 mb-3">
                            {isNawali ? 'နဝလီ Sorting နှုန်းထား (၁ အိတ်)' : 'စက်ကြိတ်ခ နှုန်းထား (၁ အိတ်)'}
                          </label>
                          <div className="relative max-w-xs">
                            <input type="number" value={isNawali ? billInput.sortingRate : billInput.millingRate} onChange={e=> isNawali ? setBillInput({...billInput, sortingRate: e.target.value}) : setBillInput({...billInput, millingRate: e.target.value})} className="w-full p-3 pl-4 pr-12 border-2 border-slate-200 bg-slate-50 text-slate-900 rounded-xl outline-none focus:border-blue-500 font-bold text-lg" placeholder="ကျပ်"/>
                            <span className="absolute right-4 top-3.5 text-slate-400 font-bold">Ks</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-2 font-bold bg-slate-100 p-2 rounded-lg inline-block">
                            {isNawali ? `Raw အဝင် (${job.originalQty} အိတ်) ဖြင့် မြှောက်ပါမည်။` : `ဆန် + ဆန်ကွဲ ပေါင်း (${totalMilledBags} အိတ်) ဖြင့် မြှောက်ပါမည်။`}
                          </p>
                        </div>
                      )}
                      
                      {!isDryOnly && (branQty > 0 || byproductQty > 0 || rejectQty > 0) && (
                        <div className="bg-cyan-50/50 p-5 rounded-2xl border border-cyan-200 shadow-sm space-y-4">
                          <h4 className="text-sm font-black text-cyan-800 uppercase tracking-wider mb-2 flex items-center"><ArrowDownToLine size={16} className="mr-2"/> စက်သို့ပြန်ရောင်း၍ ခုနှိမ်ခြင်း</h4>
                          
                          {/* Bran */}
                          {!isNawali && branQty > 0 && (
                            <div className="p-4 bg-white rounded-xl border border-cyan-100">
                              <label className="block text-xs font-bold text-slate-700 mb-3">ဖွဲနု ({branQty} အိတ်)</label>
                              <div className="flex flex-wrap gap-4 mb-3">
                                <label className="flex items-center text-sm font-bold text-slate-700 cursor-pointer"><input type="radio" value="take" checked={billInput.branOption === 'take'} onChange={e=>setBillInput({...billInput, branOption: e.target.value})} className="mr-2 w-4 h-4 text-cyan-600 focus:ring-cyan-500"/> ဖောက်သည် ပြန်ယူမည်</label>
                                <label className="flex items-center text-sm font-bold text-cyan-700 cursor-pointer"><input type="radio" value="sell" checked={billInput.branOption === 'sell'} onChange={e=>setBillInput({...billInput, branOption: e.target.value})} className="mr-2 w-4 h-4 text-cyan-600 focus:ring-cyan-500"/> စက်သို့ ရောင်းမည်</label>
                              </div>
                              {billInput.branOption === 'sell' && (
                                <div className="relative max-w-xs mt-2">
                                  <input type="number" value={billInput.branRate} onChange={e=>setBillInput({...billInput, branRate: e.target.value})} className="w-full p-2.5 pl-4 pr-12 border-2 border-cyan-300 bg-cyan-50 text-cyan-900 rounded-lg outline-none focus:border-cyan-500 font-bold" placeholder="ဝယ်ယူမည့် နှုန်း (၁ အိတ်)"/>
                                  <span className="absolute right-3 top-3 text-cyan-600 font-bold text-sm">Ks</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Byproduct */}
                          {byproductQty > 0 && (
                            <div className="p-4 bg-white rounded-xl border border-cyan-100">
                              <label className="block text-xs font-bold text-slate-700 mb-3">{labels[1]} ({byproductQty} အိတ်)</label>
                              <div className="flex flex-wrap gap-4 mb-3">
                                <label className="flex items-center text-sm font-bold text-slate-700 cursor-pointer"><input type="radio" value="take" checked={billInput.byproductOption === 'take'} onChange={e=>setBillInput({...billInput, byproductOption: e.target.value})} className="mr-2 w-4 h-4 text-cyan-600 focus:ring-cyan-500"/> ဖောက်သည် ပြန်ယူမည်</label>
                                <label className="flex items-center text-sm font-bold text-cyan-700 cursor-pointer"><input type="radio" value="sell" checked={billInput.byproductOption === 'sell'} onChange={e=>setBillInput({...billInput, byproductOption: e.target.value})} className="mr-2 w-4 h-4 text-cyan-600 focus:ring-cyan-500"/> စက်သို့ ရောင်းမည်</label>
                              </div>
                              {billInput.byproductOption === 'sell' && (
                                <div className="relative max-w-xs mt-2">
                                  <input type="number" value={billInput.byproductRate} onChange={e=>setBillInput({...billInput, byproductRate: e.target.value})} className="w-full p-2.5 pl-4 pr-12 border-2 border-cyan-300 bg-cyan-50 text-cyan-900 rounded-lg outline-none focus:border-cyan-500 font-bold" placeholder="ဝယ်ယူမည့် နှုန်း (၁ အိတ်)"/>
                                  <span className="absolute right-3 top-3 text-cyan-600 font-bold text-sm">Ks</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Reject */}
                          {rejectQty > 0 && (
                            <div className="p-4 bg-white rounded-xl border border-cyan-100">
                              <label className="block text-xs font-bold text-slate-700 mb-3">{labels[2]} ({rejectQty} အိတ်)</label>
                              <div className="flex flex-wrap gap-4 mb-3">
                                <label className="flex items-center text-sm font-bold text-slate-700 cursor-pointer"><input type="radio" value="take" checked={billInput.rejectOption === 'take'} onChange={e=>setBillInput({...billInput, rejectOption: e.target.value})} className="mr-2 w-4 h-4 text-cyan-600 focus:ring-cyan-500"/> ဖောက်သည် ပြန်ယူမည်</label>
                                <label className="flex items-center text-sm font-bold text-cyan-700 cursor-pointer"><input type="radio" value="sell" checked={billInput.rejectOption === 'sell'} onChange={e=>setBillInput({...billInput, rejectOption: e.target.value})} className="mr-2 w-4 h-4 text-cyan-600 focus:ring-cyan-500"/> စက်သို့ ရောင်းမည်</label>
                              </div>
                              {billInput.rejectOption === 'sell' && (
                                <div className="relative max-w-xs mt-2">
                                  <input type="number" value={billInput.rejectRate} onChange={e=>setBillInput({...billInput, rejectRate: e.target.value})} className="w-full p-2.5 pl-4 pr-12 border-2 border-cyan-300 bg-cyan-50 text-cyan-900 rounded-lg outline-none focus:border-cyan-500 font-bold" placeholder="ဝယ်ယူမည့် နှုန်း (၁ အိတ်)"/>
                                  <span className="absolute right-3 top-3 text-cyan-600 font-bold text-sm">Ks</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="block text-sm font-bold text-slate-800 mb-2">အခြား ကုန်ကျစရိတ် (ကူလီ/ကားခ)</label>
                        <div className="relative max-w-xs">
                           <input type="number" value={billInput.otherExp} onChange={e=>setBillInput({...billInput, otherExp: e.target.value})} className="w-full p-3 pr-12 border-2 border-slate-200 bg-slate-50 text-slate-900 rounded-xl outline-none focus:border-blue-500 font-bold" placeholder="0"/>
                           <span className="absolute right-4 top-3.5 text-slate-400 font-bold">Ks</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto bg-slate-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                      <div className="space-y-3 text-sm mb-6 relative z-10">
                        {dryingFee > 0 && (
                          <div className="flex justify-between text-slate-300">
                            <span>အခြောက်ခံခ:</span>
                            <span className="font-bold text-white">{dryingFee.toLocaleString()} Ks</span>
                          </div>
                        )}
                        {!isDryOnly && (
                           <div className="flex justify-between text-slate-300">
                             <span>{isNawali ? 'နဝလီ Sorting ခ:' : 'ကြိတ်ခွဲခ:'}</span>
                             <span className="font-bold text-white">{totalServiceFee.toLocaleString()} Ks</span>
                           </div>
                        )}
                        {branDeduction > 0 && (
                          <div className="flex justify-between text-cyan-400 font-bold">
                            <span>ဖွဲနုဖိုး နှိမ်ငွေ:</span>
                            <span>- {branDeduction.toLocaleString()} Ks</span>
                          </div>
                        )}
                        {byproductDeduction > 0 && (
                          <div className="flex justify-between text-cyan-400 font-bold">
                            <span>{labels[1]} နှိမ်ငွေ:</span>
                            <span>- {byproductDeduction.toLocaleString()} Ks</span>
                          </div>
                        )}
                        {rejectDeduction > 0 && (
                          <div className="flex justify-between text-cyan-400 font-bold">
                            <span>{labels[2]} နှိမ်ငွေ:</span>
                            <span>- {rejectDeduction.toLocaleString()} Ks</span>
                          </div>
                        )}
                        {other > 0 && (
                          <div className="flex justify-between text-slate-300 pt-2 border-t border-slate-700/50">
                            <span>အခြားစရိတ်:</span>
                            <span className="font-bold text-white">+ {other.toLocaleString()} Ks</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t border-slate-700 pt-5 flex justify-between items-end mb-6 relative z-10">
                        <span className={`text-xs font-bold uppercase tracking-wider ${isRefund ? 'text-cyan-400' : 'text-slate-400'}`}>
                          {isRefund ? 'စက်မှ ပြန်အမ်းရမည့်ငွေ' : 'ကျသင့်ငွေ (Net Total)'}
                        </span>
                        <span className={`text-3xl font-black ${isRefund ? 'text-cyan-400' : 'text-white'}`}>
                          {absNetTotal.toLocaleString()} Ks
                        </span>
                      </div>

                      {absNetTotal > 0 && (
                        <div className={`p-5 rounded-xl border relative z-10 ${isRefund ? 'bg-cyan-900/50 border-cyan-800' : 'bg-slate-800/80 border-slate-700'}`}>
                          <label className={`block text-xs font-bold mb-2 uppercase tracking-wide ${isRefund ? 'text-cyan-300' : 'text-blue-300'}`}>
                            {isRefund ? 'စက်မှ ဖောက်သည်သို့ ပေးသည့်ငွေ' : 'ဖောက်သည် ပေးချေငွေ (Paid Amount)'}
                          </label>
                          <input type="number" value={billInput.paidAmount} onChange={e=>setBillInput({...billInput, paidAmount: e.target.value})} className={`w-full p-3 border-2 bg-slate-900 text-white rounded-lg outline-none font-bold text-xl ${isRefund ? 'border-cyan-700 focus:border-cyan-500' : 'border-blue-700 focus:border-blue-500'}`} placeholder="0" min="0"/>
                          
                          {!isRefund && balance > 0 && paid > 0 && (
                            <div className="text-xs text-rose-400 font-bold mt-3 bg-rose-400/10 p-2 rounded">ယခုဘောက်ချာအတွက် အကြွေးကျန်ငွေ: {balance.toLocaleString()} Ks</div>
                          )}
                          {isRefund && Math.abs(balance) > 0 && paid > 0 && (
                            <div className="text-xs text-cyan-400 font-bold mt-3 bg-cyan-400/10 p-2 rounded">ဖောက်သည်ကို ပေးရန်ကျန်ငွေ: {Math.abs(balance).toLocaleString()} Ks</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 mt-6">
                      <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-6 py-4 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">ပယ်ဖျက်</button>
                      <button disabled={isLoading} onClick={() => handleBillSubmit(job, totalServiceFee, dryingFee, totalDeduction, netTotal, paid, balance)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center transition-all text-lg">
                        <CheckCircle size={22} className="mr-2"/> ဘေလ်သိမ်းပြီး ငွေရှင်းမည်
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 flex-1 flex flex-col justify-center items-center bg-slate-50/50">
                    <button onClick={() => setActiveJobId(job.id)} className="bg-white hover:bg-blue-50 text-blue-600 font-bold py-4 px-8 rounded-2xl transition-all border-2 border-blue-200 shadow-sm flex items-center">
                      <Calculator size={22} className="mr-2"/> ဘေလ်တွက်ချက်ရန် နှိပ်ပါ
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  const CustomerLedgerView = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCustomer, setExpandedCustomer] = useState(null);

    const customerStats = {};
    jobs.forEach(job => {
      if(!customerStats[job.customer]) {
        customerStats[job.customer] = { name: job.customer, totalPaddy: 0, totalRice: 0, totalDebt: 0, history: [] };
      }
      
      const stat = customerStats[job.customer];
      if (job.entryType === 'paddy' && job.status !== 'payment') stat.totalPaddy += job.originalQty;
      
      if (job.status === 'ready_to_bill' || job.status === 'billed') {
        if (job.purpose !== 'dry_only') stat.totalRice += Number(job.sortingData?.out1 || 0);
      }
      if (job.status === 'billed' && job.billData) stat.totalDebt += Number(job.billData.balance || 0);
      if (job.status === 'payment') stat.totalDebt -= job.amount; 
      stat.history.push(job);
    });

    const handlePaymentSubmit = async (e) => {
      e.preventDefault();
      const amt = Number(paymentAmount);
      if(amt <= 0) return;
      setIsLoading(true);

      const newJob = {
          id: `PAY-${Date.now().toString().slice(-6)}`,
          customer: paymentModal.customer,
          status: 'payment',
          amount: paymentModal.type === 'receive' ? amt : -amt,
          date: getToday()
      };
      
      await supabase.from('jobs').insert([newJob]);
      setPaymentModal(null);
      setPaymentAmount('');
      setIsLoading(false);
      alert("ငွေစာရင်း မှတ်တမ်းတင်ပြီးပါပြီ။");
    }

    const filteredCustomers = Object.values(customerStats).filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div className="animate-in fade-in duration-300 relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center"><Users className="mr-3 text-indigo-600"/> ဖောက်သည် မှတ်တမ်း / အကြွေးစာရင်း</h2>
          <div className="relative w-72">
            <input type="text" placeholder="အမည်ဖြင့် ရှာရန်..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white font-bold"/>
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          </div>
        </div>

        <div className="space-y-4 pb-20">
          {filteredCustomers.map(cust => (
            <div key={cust.name} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all">
              <div className="bg-slate-50 hover:bg-indigo-50/50 p-5 flex justify-between items-center transition-colors">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setExpandedCustomer(expandedCustomer === cust.name ? null : cust.name)}>
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">{cust.name.charAt(0)}</div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">{cust.name}</h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">လုပ်ငန်းစဉ်/ငွေပေးချေမှု: <span className="text-indigo-600 font-bold">{cust.history.length}</span> ကြိမ်</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {cust.totalDebt > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="text-right bg-rose-50 px-4 py-2 rounded-xl border border-rose-100">
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-0.5">ဖောက်သည် အကြွေး</p>
                        <p className="font-black text-lg text-rose-600 leading-none">{cust.totalDebt.toLocaleString()} <span className="text-xs font-normal">Ks</span></p>
                      </div>
                      <button onClick={() => setPaymentModal({customer: cust.name, type: 'receive', debt: cust.totalDebt})} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm">ကြွေးဆပ်မည်</button>
                    </div>
                  )}
                  {cust.totalDebt < 0 && (
                    <div className="flex items-center gap-3">
                       <div className="text-right bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">စက်မှ ပေးရန်ကျန်ငွေ</p>
                        <p className="font-black text-lg text-emerald-700 leading-none">{Math.abs(cust.totalDebt).toLocaleString()} <span className="text-xs font-normal">Ks</span></p>
                      </div>
                      <button onClick={() => setPaymentModal({customer: cust.name, type: 'pay', debt: Math.abs(cust.totalDebt)})} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm">ငွေရှင်းပေးမည်</button>
                    </div>
                  )}
                  <div className="cursor-pointer p-2" onClick={() => setExpandedCustomer(expandedCustomer === cust.name ? null : cust.name)}>
                     {expandedCustomer === cust.name ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                  </div>
                </div>
              </div>

              {expandedCustomer === cust.name && (
                <div className="p-0 border-t border-slate-200 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 bg-slate-100/50 p-4 border-b border-slate-200">
                     <div className="text-center">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">စုစုပေါင်း စပါးအဝင်</p>
                        <p className="font-black text-xl text-slate-800">{cust.totalPaddy} <span className="text-sm font-medium text-slate-500">တင်း</span></p>
                     </div>
                     <div className="text-center border-l border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ထုတ်ယူပြီး ဆန်အချော</p>
                        <p className="font-black text-xl text-indigo-600">{cust.totalRice} <span className="text-sm font-medium text-indigo-600/70">အိတ်</span></p>
                     </div>
                  </div>

                  <div className="p-4 bg-white border-b border-slate-200">
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center"><Edit3 size={14} className="mr-1"/> မှတ်ချက် (မှတ်တမ်းထားရန်)</label>
                     <textarea
                       className="w-full p-3 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500 resize-none h-20 bg-amber-50/50"
                       placeholder="ဖောက်သည်အကြောင်း မှတ်သားရန် (ဥပမာ- ဘယ်နေ့ အကြွေးလာဆပ်မည် စသည်)..."
                       value={customerRemarks[cust.name] || ''}
                       onChange={e => updateRemark(cust.name, e.target.value)}
                     />
                  </div>

                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left text-sm">
                      <thead className="text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="pb-3 px-4 font-bold">ရက်စွဲ / ID</th>
                          <th className="pb-3 px-4 font-bold">အမျိုးအစား/အခြေအနေ</th>
                          <th className="pb-3 px-4 font-bold text-right">ကျသင့်ငွေ/ပေးချေငွေ</th>
                          <th className="pb-3 px-4 font-bold text-right">အကြွေး / ပေးရန်ကျန်</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {cust.history.map(h => (
                          <tr key={h.id} className="hover:bg-slate-50">
                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-800 mb-0.5">{h.date}</div>
                              <div className="text-xs text-slate-500 font-medium">{h.id}</div>
                            </td>
                            <td className="py-4 px-4">
                              {h.status === 'payment' ? (
                                <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-200">ငွေပေးချေမှု / ကြွေးဆပ်ခြင်း</span>
                              ) : (
                                <div>
                                  <span className="font-bold">{h.paddyType}</span> <span className="text-xs text-slate-400">({h.entryType === 'nawali' ? 'နဝလီ' : 'စက်ကြိတ်'})</span><br/>
                                  {h.status === 'billed' ? <span className="text-[10px] text-indigo-600 font-bold uppercase mt-1 inline-block">ဘေလ်ရှင်းပြီး</span> : <span className="text-[10px] text-amber-600 font-bold uppercase mt-1 inline-block">လုပ်ဆောင်ဆဲ</span>}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right font-black text-[15px]">
                              {h.status === 'payment' ? (
                                <span className="text-emerald-600">Paid: {Math.abs(h.amount).toLocaleString()}</span>
                              ) : h.billData?.netTotal !== undefined ? (
                                <span className={h.billData.netTotal < 0 ? 'text-cyan-600' : 'text-slate-800'}>
                                   {h.billData.netTotal < 0 ? `Refund: ${Math.abs(h.billData.netTotal).toLocaleString()}` : h.billData.netTotal.toLocaleString()}
                                </span> 
                              ) : '-'}
                            </td>
                            <td className="py-4 px-4 text-right font-black text-[15px]">
                              {h.status !== 'payment' && h.billData?.balance !== undefined ? (
                                h.billData.balance > 0 ? <span className="text-rose-500">{h.billData.balance.toLocaleString()}</span> : 
                                h.billData.balance < 0 ? <span className="text-emerald-600">-{Math.abs(h.billData.balance).toLocaleString()}</span> : <span className="text-slate-400">-</span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filteredCustomers.length === 0 && <p className="text-center text-slate-500 py-12 bg-white rounded-2xl border border-slate-200 border-dashed font-bold text-lg">ရှာဖွေမှုနှင့် ကိုက်ညီသော ဖောက်သည် မရှိပါ။</p>}
        </div>

        {paymentModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className={`px-6 py-5 border-b flex justify-between items-center ${paymentModal.type === 'receive' ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div>
                  <h3 className={`font-black text-lg ${paymentModal.type === 'receive' ? 'text-rose-800' : 'text-emerald-800'}`}>{paymentModal.customer}</h3>
                  <p className={`text-xs font-bold ${paymentModal.type === 'receive' ? 'text-rose-600' : 'text-emerald-600'}`}>{paymentModal.type === 'receive' ? 'အကြွေးလာဆပ်ခြင်း' : 'စက်မှငွေရှင်းပေးခြင်း'}</p>
                </div>
                <button disabled={isLoading} onClick={() => setPaymentModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <form onSubmit={handlePaymentSubmit} className="p-6">
                <div className="mb-6 text-center">
                  <p className="text-sm font-bold text-slate-500 mb-1">{paymentModal.type === 'receive' ? 'လက်ရှိ အကြွေးကျန်ငွေ' : 'လက်ရှိ ပေးရန်ကျန်ငွေ'}</p>
                  <p className={`text-3xl font-black ${paymentModal.type === 'receive' ? 'text-rose-600' : 'text-emerald-600'}`}>{paymentModal.debt.toLocaleString()} <span className="text-lg font-medium">Ks</span></p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">ပေးချေမည့် ငွေပမာဏ (ကျပ်)</label>
                  <input type="number" required autoFocus value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} className="w-full p-4 border-2 border-slate-300 rounded-xl outline-none focus:border-indigo-500 text-xl font-bold text-center" placeholder="0" min="1"/>
                </div>
                <button disabled={isLoading} type="submit" className={`w-full mt-6 py-4 rounded-xl text-white font-bold text-lg shadow-lg ${paymentModal.type === 'receive' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {isLoading ? 'Processing...' : 'အတည်ပြု မှတ်တမ်းတင်မည်'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans">
      <div className="w-[280px] bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
        <div className="p-6 border-b border-slate-100 flex items-center space-x-3 bg-blue-700">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-700 font-black text-xl shadow-inner">စက်</div>
          <h1 className="font-black text-xl text-white tracking-tight">Mill ERP</h1>
        </div>
        <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {[
            { id: 'gate', name: 'စပါး/အခြောက်ခံ ဌာန', icon: Home, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-100 shadow-sm' },
            { id: 'milling', name: 'ကြိတ်ခွဲရေး ဌာန', icon: Tractor, color: 'text-purple-600', activeBg: 'bg-purple-50 border-purple-100 shadow-sm' },
            { id: 'sorting', name: 'Color Sorting ဌာန', icon: ScanLine, color: 'text-indigo-600', activeBg: 'bg-indigo-50 border-indigo-100 shadow-sm' },
            { id: 'warehouse', name: 'သိုလှောင်ရုံ (ဂိုဒေါင်)', icon: Factory, color: 'text-emerald-600', activeBg: 'bg-emerald-50 border-emerald-100 shadow-sm' },
            { id: 'inventory', name: 'စက်ပိုင် ဆန်စာရင်း', icon: Package, color: 'text-cyan-600', activeBg: 'bg-cyan-50 border-cyan-100 shadow-sm' },
            { id: 'admin', name: 'ငွေစာရင်း (Admin POS)', icon: Calculator, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-100 shadow-sm' },
            { id: 'customers', name: 'ဖောက်သည် / အကြွေးစာရင်း', icon: Users, color: 'text-slate-700', activeBg: 'bg-slate-100 border-slate-200 shadow-sm' },
          ].map(menu => (
            <button 
              key={menu.id} onClick={() => setActiveView(menu.id)}
              className={`w-full flex items-center space-x-3 px-4 py-4 rounded-xl transition-all font-bold border ${activeView === menu.id ? `${menu.activeBg} ${menu.color}` : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <menu.icon size={20} strokeWidth={activeView === menu.id ? 2.5 : 2} className={activeView === menu.id ? '' : 'opacity-70'}/>
              <span>{menu.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-6xl mx-auto">
          {activeView === 'gate' && <GateView />}
          {activeView === 'milling' && <MillingView />}
          {activeView === 'sorting' && <SortingView />}
          {activeView === 'warehouse' && <WarehouseView />}
          {activeView === 'inventory' && <InventoryView />}
          {activeView === 'admin' && <AdminView />}
          {activeView === 'customers' && <CustomerLedgerView />}
        </div>
      </div>
    </div>
  );
}

render(<MillERP />, document.getElementById('root'));