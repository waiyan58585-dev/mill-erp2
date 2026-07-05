import React, { useState, useEffect } from 'react';
import { render } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Home, Tractor, ScanLine, Package, Calculator, Users,
  Plus, ArrowRight, CheckCircle, Droplets, Wind,
  Receipt, Search, ChevronDown, ChevronUp, X, MapPin, Factory, ArrowDownToLine, Trash2, Edit3, Lock, LogOut, AlertCircle, Truck
} from 'lucide-react';

// ==========================================
// မဖြစ်မနေ ပြင်ဆင်ရန် (Supabase API Keys)
// ==========================================
const supabaseUrl = 'https://jgerimrkigxtphjcrafq.supabase.co'; // အစ်ကို့ URL အစစ်ကို ထည့်ပါ
const supabaseKey = 'sb_publishable_2jhGRP_tFpR9xuPgJEBBxA_2_HRJTUG'; // အစ်ကို့ Key အစစ်ကို ထည့်ပါ
const supabase = createClient(supabaseUrl, supabaseKey);

export default function MillERP() {
  const [isConfigured, setIsConfigured] = useState(supabaseUrl !== 'YOUR_SUPABASE_URL');
  const [isLoading, setIsLoading] = useState(false);
  
  // --- Auth State ---
  const [userRole, setUserRole] = useState(null); 
  const [pinInput, setPinInput] = useState('');
  
  // --- Custom Dialog State ---
  const [dialogConfig, setDialogConfig] = useState(null); 

  // --- Navigation State ---
  const [activeView, setActiveView] = useState('gate'); 

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
  const [millInput, setMillInput] = useState({ 
    rice: '', riceStorage: '', broken12: '', broken12Storage: '', broken234: '', broken234Storage: '', bran: '', branStorage: '' 
  });
  const [sortInput, setSortInput] = useState({ 
    out1: '', storage1: '', out2: '', storage2: '', out3: '', storage3: '' 
  });
  
  // --- AdminView & CustomerLedgerView State ---
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [billInput, setBillInput] = useState({ 
    dryingRate: '', sortingRate: '', millingRate: '', 
    branOption: 'take', branRate: '', byproductOption: 'take', byproductRate: '', rejectOption: 'take', rejectRate: '', 
    otherExp: '', paidAmount: '' 
  });
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // --- Delivery State ---
  const [deliveryModal, setDeliveryModal] = useState(null);
  const [deliveryInput, setDeliveryInput] = useState({
    date: getToday(), carNo: '', driverName: '', remarks: ''
  });

  useEffect(() => {
    if (!isConfigured) return;
    fetchData();
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

  const showMessage = (msg) => {
    setDialogConfig({ type: 'alert', message: msg });
  };

  const showConfirm = (msg, onConfirm) => {
    setDialogConfig({ type: 'confirm', message: msg, onConfirm });
  };

  const handleDeleteJob = (jobId) => {
    if (userRole !== 'admin') return;
    showConfirm(`ဘောက်ချာ No: ${jobId} အား အပြီးတိုင် ပယ်ဖျက်မှာ သေချာပါသလား?`, async () => {
      setIsLoading(true);
      await supabase.from('jobs').delete().eq('id', jobId);
      setIsLoading(false);
      showMessage('စာရင်း ဖျက်သိမ်းပြီးပါပြီ။');
    });
  };

  const getSortingLabels = (type) => {
    const t = (type || '').toLowerCase();
    if(t.includes('ကောက်ညှင်း')) return ['ကောက်ညှင်း (အချော)', 'အကြမ်းဆန် (By-product)', 'ကောက်ညှင်း (Reject)'];
    if(t.includes('ကြမ်း')) return ['အကြမ်းဆန် (အချော)', 'ဗိုက်ဖြူဆန် (By-product)', 'အကြမ်း (Reject)'];
    if(t.includes('ပေါ်ဆန်း')) return ['ပေါ်ဆန်း (အချော)', 'ကြမ်းဆန် (By-product)', 'ပေါ်ဆန်း (Reject)'];
    if(t.includes('စကွဲ')) return ['စကွဲ (အချော)', 'By-product (အမှုန့်)', 'Reject (အမည်း)'];
    return [`${type} (အချော)`, 'By-product', 'Reject'];
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === '9999') { setUserRole('admin'); setActiveView('gate'); } 
    else if (pinInput === '1111') { setUserRole('gate'); setActiveView('gate'); } 
    else if (pinInput === '2222') { setUserRole('mill'); setActiveView('milling'); } 
    else showMessage('PIN နံပါတ် မှားယွင်းနေပါသည်။');
    setPinInput('');
  };

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Supabase URL & Key ထည့်ရန် လိုအပ်ပါသည်</h2>
        </div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 font-sans relative">
        {/* Custom Dialog Box for Login Screen */}
        {dialogConfig && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 text-center">
                   <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
                   <p className="text-lg font-bold text-slate-800 mb-8">{dialogConfig.message}</p>
                   <button onClick={() => setDialogConfig(null)} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-lg shadow-md transition-colors">
                      အိုကေ
                   </button>
                </div>
             </div>
          </div>
        )}

        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Lock size={32} className="text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-center text-slate-800 mb-2">Mill ERP System</h2>
          <p className="text-center text-slate-500 font-medium mb-8">စနစ်ထဲသို့ ဝင်ရောက်ရန် လျှို့ဝှက် PIN နံပါတ် ရိုက်ထည့်ပါ</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input 
                type="password" 
                autoFocus
                placeholder="****" 
                value={pinInput} 
                onChange={e => setPinInput(e.target.value)} 
                className="w-full text-center text-3xl tracking-[1em] p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-slate-800 transition-colors"
                required 
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95">
              ဝင်ရောက်မည်
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderGateView = () => {
    const handleAddJob = async (e) => {
      e.preventDefault();
      if(!newJob.customer || !newJob.qty || !newJob.paddyType) return showMessage("အချက်အလက်များ ပြည့်စုံစွာ ထည့်ပါ။");
      setIsLoading(true);

      const d = new Date(newJob.date);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      const suffix = `${mm}${yy}`;
      const jobsInThisMonth = jobs.filter(j => j.id && j.id.endsWith(suffix)).length;
      const seq = String(jobsInThisMonth + 1).padStart(3, '0');
      const newJobId = `${seq}${suffix}`;

      const isWet = newJob.entryType === 'paddy' && newJob.moisture === 'အစို';
      // New Flow: Wet goes to drying. Dry goes to Paddy Warehouse directly. Nawali goes to Nawali Warehouse directly.
      const initialStatus = newJob.entryType === 'nawali' ? 'stored_nawali' : (isWet ? 'waiting_dry' : 'stored_paddy');

      const jobData = {
        id: newJobId, customer: newJob.customer, entryType: newJob.entryType, purpose: newJob.entryType === 'nawali' ? 'mill' : newJob.purpose,
        paddyType: newJob.paddyType, originalQty: Number(newJob.qty), currentQty: Number(newJob.qty),
        moisture: newJob.entryType === 'nawali' ? 'အခြောက်' : newJob.moisture, wasWet: isWet, storage: newJob.storage || '-',
        status: initialStatus, date: newJob.date
      };
      
      const { error } = await supabase.from('jobs').insert([jobData]);
      if (error) showMessage("Database Error: " + error.message);
      else {
        setNewJob({ ...newJob, customer: '', paddyType: '', qty: '', storage: '' });
        showMessage("စာရင်းသွင်းပြီးပါပြီ။ ID: " + newJobId);
      }
      setIsLoading(false);
    };

    const handleSendToDryer = async (jobId) => {
      const isValid = dryingAllocations.every(a => a.machine && a.qty > 0);
      if(!isValid || dryingAllocations.length === 0) return showMessage("စက်အမည် နှင့် တင်းအရေအတွက် ထည့်ပါ။");
      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'drying', dryingMachines: dryingAllocations }).eq('id', jobId);
      setActiveJobId(null);
      setIsLoading(false);
    };

    const handleDryingDone = async (job, nextStatusAction) => {
      if(!dryQtyInput || !dryStorageInput) return showMessage("ကျန်ရှိတင်း နှင့် သိုလှောင်ရုံနေရာ ထည့်ပါ။");
      
      setIsLoading(true);
      await supabase.from('jobs').update({ 
        currentQty: Number(dryQtyInput), storage: dryStorageInput, moisture: 'အခြောက်', status: nextStatusAction
      }).eq('id', job.id);
      
      setActiveJobId(null); setDryQtyInput(''); setDryStorageInput('');
      setIsLoading(false);
      
      if(nextStatusAction === 'ready_to_bill_advance') {
        showMessage("အခြောက်ခံခ ဘေလ်ကြိုဖွင့်ရန် ငွေစာရင်းဌာနသို့ ပို့ဆောင်ပြီးပါပြီ။");
      } else {
        showMessage("စပါးဂိုဒေါင်သို့ သိမ်းဆည်းပြီးပါပြီ။");
      }
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
              <div><label className="block text-xs font-bold text-slate-600 mb-1.5">ရက်စွဲ</label><input type="date" value={newJob.date} onChange={e=>setNewJob({...newJob, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900" required /></div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1.5">ဖောက်သည်အမည်</label><input type="text" value={newJob.customer} onChange={e=>setNewJob({...newJob, customer: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900" required placeholder="အမည်" /></div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{newJob.entryType === 'paddy' ? 'စပါးအမျိုးအစား' : 'ဆန်အမျိုးအစား'}</label>
                <input type="text" list="paddyTypes" value={newJob.paddyType} onChange={e=>setNewJob({...newJob, paddyType: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900" required placeholder="ရွေးပါ..." />
                <datalist id="paddyTypes"><option value="ကောက်ညှင်း" /><option value="အကြမ်းဆန်" /><option value="ပေါ်ဆန်း" /><option value="ဧည့်မထ" /><option value="စကွဲ" /></datalist>
              </div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1.5">အရေအတွက် ({newJob.entryType === 'paddy' ? 'တင်း' : 'အိတ်'})</label><input type="number" value={newJob.qty} onChange={e=>setNewJob({...newJob, qty: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900" required placeholder="0" min="1"/></div>
              
              {newJob.entryType === 'paddy' && (
                <>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5">အစို / အခြောက်</label><select value={newJob.moisture} onChange={e=>setNewJob({...newJob, moisture: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900 font-bold"><option value="အစို">အစို (အခြောက်ခံမည်)</option><option value="အခြောက်">အခြောက် (ဂိုဒေါင်တန်းဝင်မည်)</option></select></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5">လုပ်ငန်းရည်ရွယ်ချက်</label><select value={newJob.purpose} onChange={e=>setNewJob({...newJob, purpose: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900 font-bold"><option value="mill">စက်ကြိတ်မည်</option><option value="dry_only">အခြောက်ခံရုံ သီးသန့်</option></select></div>
                </>
              )}
              <div className="col-span-1 md:col-span-2">
                 <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center"><MapPin size={12} className="mr-1"/> ချထားမည့် သိုလှောင်ရုံ/နေရာ</label>
                 <input type="text" list="storageLocations" value={newJob.storage} onChange={e=>setNewJob({...newJob, storage: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 text-slate-900" required/>
                 <datalist id="storageLocations">{newJob.entryType === 'paddy' ? PADDY_STORAGE.map(s => <option key={s} value={s}/>) : RICE_STORAGE.map(s => <option key={s} value={s}/>)}</datalist>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
              <button disabled={isLoading} type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-bold shadow-md transition-colors text-sm flex items-center">{isLoading ? 'Processing...' : <><Plus size={18} className="mr-2"/> စာရင်းသွင်းမည်</>}</button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Waiting to Dry */}
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm flex flex-col">
            <div className="bg-amber-50 p-5 border-b border-amber-200"><h3 className="font-bold text-amber-900 flex items-center"><Droplets size={20} className="mr-2"/> အခြောက်ခံစက်သို့ ထည့်ရန် (အစို)</h3></div>
            <div className="p-5 space-y-4 bg-slate-50 flex-1 overflow-y-auto">
              {jobs.filter(j => j.status === 'waiting_dry').map(job => (
                <div key={job.id} className="bg-white p-5 rounded-xl border border-amber-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="font-black text-slate-800 block text-lg">{job.customer}</span>
                      <span className="text-sm font-semibold text-slate-500 mt-1 block">{job.id} • {job.paddyType} <span className="text-amber-600">({job.currentQty} တင်း)</span></span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-bold uppercase block">စောင့်ဆိုင်းဆဲ</span>
                       {userRole === 'admin' && <button onClick={() => handleDeleteJob(job.id)} className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors border border-transparent" title="ပယ်ဖျက်မည်"><Trash2 size={16} /></button>}
                    </div>
                  </div>
                  {activeJobId === job.id + '-todry' ? (
                    <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-100">
                      {dryingAllocations.map((alloc, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input type="text" list="dryingMachines" value={alloc.machine} onChange={e => { const newA = [...dryingAllocations]; newA[idx].machine = e.target.value; setDryingAllocations(newA); }} className="flex-1 p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" placeholder="စက်အမည်..." required/>
                          <datalist id="dryingMachines">{DRYING_MACHINES.map(m => <option key={m} value={m}/>)}</datalist>
                          <input type="number" value={alloc.qty} onChange={e => { const newA = [...dryingAllocations]; newA[idx].qty = e.target.value; setDryingAllocations(newA); }} className="w-24 p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" placeholder="တင်း" required min="1"/>
                        </div>
                      ))}
                      <div className="flex justify-between items-center mt-2">
                        <button onClick={() => setDryingAllocations([...dryingAllocations, { machine: '', qty: '' }])} className="text-xs font-bold text-blue-600">စက်ထပ်ထည့်မည်</button>
                        <div className="flex gap-2">
                           <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-sm font-bold border border-rose-100">ပယ်ဖျက်</button>
                           <button disabled={isLoading} onClick={() => handleSendToDryer(job.id)} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold shadow-md">စက်လည်မည်</button>
                        </div>
                      </div>
                    </div>
                  ) : <button onClick={() => { setActiveJobId(job.id + '-todry'); setDryingAllocations([{machine: '', qty: job.currentQty}]); }} className="w-full mt-2 bg-amber-50 text-amber-700 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-100">စက်ထဲ ခွဲထည့်မည်</button>}
                </div>
              ))}
              {jobs.filter(j => j.status === 'waiting_dry').length === 0 && <p className="text-slate-400 text-sm font-bold text-center py-6">စောင့်ဆိုင်းစာရင်း မရှိပါ။</p>}
            </div>
          </div>

          {/* Currently Drying */}
          <div className="bg-white rounded-2xl border border-orange-200 shadow-sm flex flex-col">
            <div className="bg-orange-50 p-5 border-b border-orange-200"><h3 className="font-bold text-orange-900 flex items-center"><Wind size={20} className="mr-2"/> အခြောက်ခံနေဆဲ</h3></div>
            <div className="p-5 space-y-4 bg-slate-50 flex-1 overflow-y-auto">
              {jobs.filter(j => j.status === 'drying').map(job => (
                <div key={job.id} className="bg-white p-5 rounded-xl border border-orange-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                  <div className="flex justify-between items-start mb-4 pl-3">
                    <div>
                       <span className="font-black text-slate-800 block text-lg">{job.customer}</span>
                       <span className="text-sm font-bold text-slate-500 mt-1 block">{job.id} • {job.paddyType}</span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className="text-sm font-black text-orange-600 block mb-1">{job.originalQty} တင်း ဝင်ထား</span>
                       {userRole === 'admin' && <button onClick={() => handleDeleteJob(job.id)} className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors border border-transparent" title="ပယ်ဖျက်မည်"><Trash2 size={16} /></button>}
                    </div>
                  </div>
                  
                  {activeJobId === job.id + '-finish' ? (
                    <div className="mt-4 pt-4 border-t border-orange-100 space-y-4 pl-3">
                      <div><label className="text-xs font-bold text-orange-800 block mb-1.5">ကျန်ရှိမည့် တင်း (အခြောက်)</label><input type="number" value={dryQtyInput} onChange={e=>setDryQtyInput(e.target.value)} className="w-full p-3 border-2 border-orange-300 rounded-xl outline-none bg-white text-slate-900 font-black" required/></div>
                      <div><label className="text-xs font-bold text-slate-600 block mb-1.5">သိုလှောင်မည့် စပါးဂိုဒေါင် အသစ်</label><input type="text" list="paddyStorage" value={dryStorageInput} onChange={e=>setDryStorageInput(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" required/></div>
                      
                      <div className="flex gap-2 pt-2">
                        <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="flex-1 bg-rose-50 border border-rose-100 text-rose-600 py-3 rounded-xl text-sm font-bold">ပယ်ဖျက်</button>
                      </div>
                      
                      <div className="flex flex-col gap-3 pt-1 border-t border-slate-100 mt-2">
                         <button disabled={isLoading} onClick={() => handleDryingDone(job, 'stored_paddy')} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold shadow-md">
                           စပါးဂိုဒေါင်သို့ သိမ်းဆည်းမည် (ပုံမှန်)
                         </button>
                         <button disabled={isLoading} onClick={() => handleDryingDone(job, 'ready_to_bill_advance')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold shadow-md flex items-center justify-center">
                           <Receipt size={16} className="mr-2"/> ဂိုဒေါင်သို့သိမ်းပြီး အခြောက်ခံခ ဘေလ်ကြိုဖွင့်မည်
                         </button>
                      </div>
                    </div>
                  ) : <div className="pl-3 mt-4 border-t border-slate-100 pt-4"><button onClick={() => setActiveJobId(job.id + '-finish')} className="w-full bg-orange-50 text-orange-700 py-3 rounded-xl text-sm font-bold hover:bg-orange-100 shadow-sm">အခြောက်ခံပြီးစီး</button></div>}
                </div>
              ))}
              {jobs.filter(j => j.status === 'drying').length === 0 && <p className="text-slate-400 text-sm font-bold text-center py-6">အခြောက်ခံနေဆဲ မရှိပါ။</p>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMillingView = () => {
    const handleMillDone = async (jobId) => {
      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'waiting_sort', millingData: millInput }).eq('id', jobId);
      setActiveJobId(null);
      setMillInput({ rice: '', riceStorage: '', broken12: '', broken12Storage: '', broken234: '', broken234Storage: '', bran: '', branStorage: '' });
      setIsLoading(false);
      showMessage("Color Sorting ဌာနသို့ လွှဲပြောင်းပြီးပါပြီ။");
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Tractor className="mr-3 text-purple-600"/> ကြိတ်ခွဲရေး ဌာန</h2>
        <div className="space-y-5">
          {jobs.filter(j => j.status === 'waiting_mill' && j.purpose === 'mill').map(job => (
            <div key={job.id} className="bg-white p-6 rounded-2xl border-l-4 border-l-purple-500 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-black text-2xl text-slate-800">{job.customer}</h3>
                  <div className="text-sm font-bold text-slate-500 mt-2">{job.id} • {job.paddyType} <span className="text-purple-600 ml-2 bg-purple-50 px-2 py-0.5 rounded">စပါး ({job.currentQty || 0} တင်း)</span></div>
                </div>
                <div className="text-right flex flex-col items-end">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-black uppercase block">ကြိတ်ရန်အသင့်</span>
                     {userRole === 'admin' && <button onClick={() => handleDeleteJob(job.id)} className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors border border-transparent" title="ပယ်ဖျက်မည်"><Trash2 size={16} /></button>}
                   </div>
                   {job.advanceBillData && <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-[10px] font-bold block mb-2">အခြောက်ခံခ ရှင်းပြီး</span>}
                   <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200"><MapPin size={12} className="inline mr-1"/>{job.storage}</span>
                </div>
              </div>
              
              {activeJobId === job.id ? (
                <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    {/* Rice Input */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100">
                      <label className="text-xs font-bold text-slate-700 block mb-2">ဆန်အကြမ်း (အိတ်)</label>
                      <input type="number" value={millInput.rice} onChange={e=>setMillInput({...millInput, rice: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 font-bold mb-2" placeholder="အရေအတွက်"/>
                      <input type="text" list="riceStorageList" value={millInput.riceStorage} onChange={e=>setMillInput({...millInput, riceStorage: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50" placeholder="ထားသိုရာနေရာ"/>
                    </div>
                    {/* Broken 12 Input */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                      <label className="text-xs font-bold text-blue-700 block mb-2">၁၂ ဆန်ကွဲ (အိတ်)</label>
                      <input type="number" value={millInput.broken12} onChange={e=>setMillInput({...millInput, broken12: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 font-bold mb-2" placeholder="အရေအတွက်"/>
                      <input type="text" list="riceStorageList" value={millInput.broken12Storage} onChange={e=>setMillInput({...millInput, broken12Storage: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50" placeholder="ထားသိုရာနေရာ"/>
                    </div>
                    {/* Broken 234 Input */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-sky-100">
                      <label className="text-xs font-bold text-sky-700 block mb-2">၂၃၄ ဆန်ကွဲ (အိတ်)</label>
                      <input type="number" value={millInput.broken234} onChange={e=>setMillInput({...millInput, broken234: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 font-bold mb-2" placeholder="အရေအတွက်"/>
                      <input type="text" list="riceStorageList" value={millInput.broken234Storage} onChange={e=>setMillInput({...millInput, broken234Storage: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50" placeholder="ထားသိုရာနေရာ"/>
                    </div>
                    {/* Bran Input */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-100">
                      <label className="text-xs font-bold text-amber-700 block mb-2">ဖွဲနု (အိတ်)</label>
                      <input type="number" value={millInput.bran} onChange={e=>setMillInput({...millInput, bran: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 font-bold mb-2" placeholder="အရေအတွက်"/>
                      <input type="text" list="riceStorageList" value={millInput.branStorage} onChange={e=>setMillInput({...millInput, branStorage: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50" placeholder="ထားသိုရာနေရာ"/>
                    </div>
                  </div>
                  <datalist id="riceStorageList">{RICE_STORAGE.map(s => <option key={s} value={s}/>)}</datalist>

                  <div className="flex justify-end gap-3 pt-2">
                    <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-sm border border-rose-100">ပယ်ဖျက်</button>
                    <button disabled={isLoading} onClick={() => handleMillDone(job.id)} className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm shadow-lg flex items-center">
                      ကြိတ်ခွဲမှု စာရင်းသွင်းမည် <ArrowRight size={18} className="ml-2"/>
                    </button>
                  </div>
                </div>
              ) : <div className="border-t border-slate-100 pt-5 mt-2"><button onClick={() => setActiveJobId(job.id)} className="w-full bg-slate-50 hover:bg-purple-50 text-purple-700 border border-purple-200 py-3.5 rounded-xl font-bold text-sm">ကြိတ်ခွဲမှု ရလဒ်များ စာရင်းသွင်းမည်</button></div>}
            </div>
          ))}
          {jobs.filter(j => j.status === 'waiting_mill' && j.purpose === 'mill').length === 0 && <p className="text-slate-400 text-sm font-bold text-center py-6 bg-white rounded-2xl border border-slate-200 border-dashed">ကြိတ်ခွဲရန် စာရင်း မရှိပါ။</p>}
        </div>
      </div>
    );
  };

  const renderSortingView = () => {
    const handleSortDone = async (jobId) => {
      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'ready_to_bill', sortingData: sortInput }).eq('id', jobId);
      setActiveJobId(null); setSortInput({ out1: '', storage1: '', out2: '', storage2: '', out3: '', storage3: '' });
      setIsLoading(false);
      showMessage("ဆန်ဂိုဒေါင် နှင့် ငွေစာရင်းဌာနသို့ ပို့ဆောင်ပြီးပါပြီ။");
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><ScanLine className="mr-3 text-indigo-600"/> Color Sorting ဌာန</h2>
        <div className="space-y-5">
          {jobs.filter(j => j.status === 'waiting_sort').map(job => {
            const labels = getSortingLabels(job.paddyType);
            const isNawali = job.entryType === 'nawali';
            return (
              <div key={job.id} className="bg-white p-6 rounded-2xl border-l-4 border-l-indigo-500 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-2xl text-slate-800">{job.customer}</h3>
                    <div className="text-sm font-bold text-slate-500 mt-2">{job.id} • {job.paddyType}</div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                     <div className="flex items-center gap-2 mb-2">
                       <span className="bg-indigo-100 text-indigo-800 px-4 py-1.5 rounded-full text-xs font-black uppercase block">Sort ရန်အသင့်</span>
                       {userRole === 'admin' && <button onClick={() => handleDeleteJob(job.id)} className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors border border-transparent" title="ပယ်ဖျက်မည်"><Trash2 size={16} /></button>}
                     </div>
                     {job.advanceBillData && <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-[10px] font-bold block mb-2">အခြောက်ခံခ ရှင်းပြီး</span>}
                  </div>
                </div>
                
                {activeJobId === job.id ? (
                  <div className="bg-indigo-50/40 p-6 rounded-2xl border border-indigo-100 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="bg-white p-4 rounded-xl border border-indigo-100"><label className="text-sm font-bold text-indigo-900 block mb-3">{labels[0]}</label><input type="number" value={sortInput.out1} onChange={e=>setSortInput({...sortInput, out1: e.target.value})} className="w-full p-3 border-2 border-indigo-200 rounded-lg outline-none font-black text-slate-900 text-lg mb-2 bg-white"/><input type="text" list="riceStorageList" value={sortInput.storage1} onChange={e=>setSortInput({...sortInput, storage1: e.target.value})} className="w-full p-2.5 border border-slate-200 bg-white text-slate-900 rounded-lg text-xs" placeholder="နေရာ..."/></div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200"><label className="text-sm font-bold text-slate-700 block mb-3">{labels[1]}</label><input type="number" value={sortInput.out2} onChange={e=>setSortInput({...sortInput, out2: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg outline-none font-bold text-slate-900 mb-2 bg-white"/><input type="text" list="riceStorageList" value={sortInput.storage2} onChange={e=>setSortInput({...sortInput, storage2: e.target.value})} className="w-full p-2.5 border border-slate-200 bg-white text-slate-900 rounded-lg text-xs" placeholder="နေရာ..."/></div>
                      <div className="bg-white p-4 rounded-xl border border-red-100"><label className="text-sm font-bold text-red-700 block mb-3">{labels[2]}</label><input type="number" value={sortInput.out3} onChange={e=>setSortInput({...sortInput, out3: e.target.value})} className="w-full p-3 border border-red-200 rounded-lg outline-none font-bold text-slate-900 mb-2 bg-white"/><input type="text" list="riceStorageList" value={sortInput.storage3} onChange={e=>setSortInput({...sortInput, storage3: e.target.value})} className="w-full p-2.5 border border-red-200 bg-white text-slate-900 rounded-lg text-xs" placeholder="နေရာ..."/></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-indigo-100">
                      <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-6 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-bold rounded-xl text-sm">ပယ်ဖျက်</button>
                      <button disabled={isLoading} onClick={() => handleSortDone(job.id)} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg">ဂိုဒေါင် / ငွေစာရင်းသို့ ပို့မည်</button>
                    </div>
                  </div>
                ) : <div className="border-t border-slate-100 pt-5 mt-2"><button onClick={() => setActiveJobId(job.id)} className="w-full bg-slate-50 hover:bg-indigo-50 text-indigo-700 border border-indigo-200 py-3.5 rounded-xl font-bold text-sm">Sorting ရလဒ် စာရင်းသွင်းမည်</button></div>}
              </div>
            );
          })}
          {jobs.filter(j => j.status === 'waiting_sort').length === 0 && <p className="text-slate-400 text-sm font-bold text-center py-6 bg-white rounded-2xl border border-slate-200 border-dashed">Sorting လုပ်ရန် စာရင်း မရှိပါ။</p>}
        </div>
      </div>
    );
  };

  const renderPaddyWarehouseView = () => {
    const handleSendToMill = async (jobId) => {
      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'waiting_mill' }).eq('id', jobId);
      setIsLoading(false);
      showMessage("ကြိတ်ခွဲရေးဌာနသို့ လွှဲပြောင်းပေးပို့ပြီးပါပြီ။");
    }

    const handleSendToSort = async (jobId) => {
      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'waiting_sort' }).eq('id', jobId);
      setIsLoading(false);
      showMessage("Color Sorting ဌာနသို့ လွှဲပြောင်းပေးပို့ပြီးပါပြီ။");
    }

    const paddyJobs = jobs.filter(j => j.status === 'stored_paddy' || j.status === 'ready_to_bill_advance');
    const nawaliJobs = jobs.filter(j => j.status === 'stored_nawali');

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Package className="mr-3 text-amber-600"/> စပါး / နဝလီ ဂိုဒေါင်</h2>
        
        <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-sm">
           <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-sm">
                  <tr><th className="p-4 font-bold">ဘောက်ချာ / ဖောက်သည်</th><th className="p-4 font-bold">အမျိုးအစား</th><th className="p-4 font-bold">နေရာ နှင့် အရေအတွက်</th><th className="p-4 font-bold text-center">လုပ်ဆောင်ချက်</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {[...paddyJobs, ...nawaliJobs].map(job => (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <td className="p-4 align-middle">
                        <div className="font-bold text-slate-800">{job.id}</div>
                        <div className="text-sm font-bold text-slate-500">{job.customer}</div>
                      </td>
                      <td className="p-4 align-middle">
                         {job.entryType === 'nawali' ? <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200">နဝလီ (Color Sort အဝင်)</span> : <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold border border-amber-200">စပါးအကြမ်း (အခြောက်)</span>}
                      </td>
                      <td className="p-4 align-middle">
                         <div className="flex items-center text-sm font-bold">
                           <MapPin size={16} className="text-slate-400 mr-2"/><span className="text-blue-600 mr-2">{job.storage}</span> <ArrowRight size={12} className="text-slate-300 mx-2"/> <span>{job.currentQty} {job.entryType==='nawali'?'အိတ်':'တင်း'}</span>
                         </div>
                      </td>
                      <td className="p-4 align-middle text-center">
                         {job.entryType === 'nawali' ? (
                           <button onClick={()=>handleSendToSort(job.id)} className="bg-indigo-100 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold px-4 py-2 rounded-lg text-xs transition-colors">Sorting ပို့မည်</button>
                         ) : (
                           <button onClick={()=>handleSendToMill(job.id)} className="bg-purple-100 hover:bg-purple-600 hover:text-white text-purple-700 font-bold px-4 py-2 rounded-lg text-xs transition-colors">ကြိတ်ခွဲရေး ပို့မည်</button>
                         )}
                      </td>
                    </tr>
                  ))}
                  {[...paddyJobs, ...nawaliJobs].length === 0 && <tr><td colSpan="4" className="p-6 text-center text-slate-400 font-bold">စပါးဂိုဒေါင်တွင် လက်ကျန် မရှိပါ။</td></tr>}
                </tbody>
              </table>
           </div>
        </div>
      </div>
    );
  };

  const renderRiceWarehouseView = () => {
    const riceJobs = jobs.filter(j => ['ready_to_bill', 'billed', 'waiting_sort', 'waiting_mill', 'delivered'].includes(j.status) && j.purpose !== 'dry_only' && j.status !== 'stored_nawali');

    const handleDeliverySubmit = async (e) => {
        e.preventDefault();
        const job = deliveryModal.job;
        setIsLoading(true);
        
        // Update job status to delivered and store delivery details
        await supabase.from('jobs').update({ 
            status: 'delivered', 
            deliveryData: deliveryInput 
        }).eq('id', job.id);
        
        setDeliveryModal(null);
        setDeliveryInput({ date: getToday(), carNo: '', driverName: '', remarks: '' });
        setIsLoading(false);
        showMessage("ဆန်ထုတ်ပေးမှု မှတ်တမ်းတင်ပြီးပါပြီ။");
    };

    return (
      <div className="animate-in fade-in duration-300 relative">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Factory className="mr-3 text-emerald-600"/> ဆန် နှင့် ထွက်ကုန် ဂိုဒေါင်</h2>
        
        <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden shadow-sm">
           <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-sm">
                  <tr><th className="p-4 font-bold w-1/4">ဘောက်ချာ / ဖောက်သည်</th><th className="p-4 font-bold w-1/5">အဆင့်</th><th className="p-4 font-bold">သိုလှောင်ထားသည့် နေရာများ နှင့် အရေအတွက်</th><th className="p-4 font-bold text-center">လုပ်ဆောင်ချက်</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {riceJobs.map(job => {
                    const labels = getSortingLabels(job.paddyType);
                    const isFinished = job.status === 'ready_to_bill' || job.status === 'billed' || job.status === 'delivered';
                    const isDelivered = job.status === 'delivered';
                    return (
                      <tr key={job.id} className={`hover:bg-slate-50 ${isDelivered ? 'opacity-60' : ''}`}>
                        <td className="p-4 align-top">
                          <div className="font-bold text-slate-800">{job.id}</div>
                          <div className="text-sm font-bold text-slate-500">{job.customer}</div>
                          <div className="text-xs text-slate-400 mt-1">{job.paddyType}</div>
                        </td>
                        <td className="p-4 align-top">
                          {isDelivered ? <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-md text-xs font-bold">ထုတ်ယူပြီး</span> : isFinished ? <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md text-xs font-bold border border-emerald-200">အချောထွက်ကုန်များ</span> : <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-xs font-bold">လုပ်ဆောင်ဆဲ ({job.status==='waiting_mill'?'စက်ကြိတ်':'Sorting'})</span>}
                        </td>
                        <td className="p-4 align-top">
                          {/* Display Milling Outputs (12, 234, Bran) if they exist */}
                          {job.millingData && (
                            <div className="space-y-2 mb-3 pb-3 border-b border-slate-100 border-dashed">
                               {job.millingData.broken12 > 0 && <div className="flex items-center text-sm font-bold bg-white p-2 rounded border border-blue-100 w-fit"><MapPin size={14} className="text-slate-400 mr-2"/><span className="text-slate-700 mr-2">{job.millingData.broken12Storage||'-'}</span> <ArrowRight size={12} className="text-slate-300 mx-2"/> <span className="text-blue-700">{job.millingData.broken12} အိတ် (၁၂ ဆန်ကွဲ)</span></div>}
                               {job.millingData.broken234 > 0 && <div className="flex items-center text-sm font-bold bg-white p-2 rounded border border-sky-100 w-fit"><MapPin size={14} className="text-slate-400 mr-2"/><span className="text-slate-700 mr-2">{job.millingData.broken234Storage||'-'}</span> <ArrowRight size={12} className="text-slate-300 mx-2"/> <span className="text-sky-700">{job.millingData.broken234} အိတ် (၂၃၄ ဆန်ကွဲ)</span></div>}
                               {job.millingData.bran > 0 && job.billData?.branOption !== 'sell' && <div className="flex items-center text-sm font-bold bg-white p-2 rounded border border-amber-100 w-fit"><MapPin size={14} className="text-slate-400 mr-2"/><span className="text-slate-700 mr-2">{job.millingData.branStorage||'-'}</span> <ArrowRight size={12} className="text-slate-300 mx-2"/> <span className="text-amber-700">{job.millingData.bran} အိတ် (ဖွဲနု)</span></div>}
                            </div>
                          )}
                          {/* Display Sorting Outputs */}
                          {isFinished && job.sortingData && (
                             <div className="space-y-2">
                               {job.sortingData.out1 > 0 && <div className="flex items-center text-sm font-bold bg-white p-2 rounded border border-emerald-100 w-fit"><MapPin size={14} className="text-slate-400 mr-2"/><span className="text-slate-700 mr-2">{job.sortingData.storage1 || '-'}</span> <ArrowRight size={12} className="text-slate-300 mx-2"/> <span className="text-emerald-700">{job.sortingData.out1} အိတ် <span className="text-xs font-normal">({labels[0]})</span></span></div>}
                               {job.sortingData.out2 > 0 && job.billData?.byproductOption !== 'sell' && <div className="flex items-center text-sm font-bold bg-white p-2 rounded border border-slate-200 w-fit"><MapPin size={14} className="text-slate-400 mr-2"/><span className="text-slate-700 mr-2">{job.sortingData.storage2 || '-'}</span> <ArrowRight size={12} className="text-slate-300 mx-2"/> <span className="text-slate-700">{job.sortingData.out2} အိတ် <span className="text-xs font-normal">({labels[1]})</span></span></div>}
                               {job.sortingData.out3 > 0 && job.billData?.rejectOption !== 'sell' && <div className="flex items-center text-sm font-bold bg-white p-2 rounded border border-red-100 w-fit"><MapPin size={14} className="text-slate-400 mr-2"/><span className="text-slate-700 mr-2">{job.sortingData.storage3 || '-'}</span> <ArrowRight size={12} className="text-slate-300 mx-2"/> <span className="text-red-700">{job.sortingData.out3} အိတ် <span className="text-xs font-normal">({labels[2]})</span></span></div>}
                             </div>
                          )}
                        </td>
                        <td className="p-4 align-top text-center">
                            {isFinished && !isDelivered && (
                                <button onClick={() => setDeliveryModal({job: job})} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-colors flex items-center mx-auto">
                                    <Truck size={14} className="mr-2"/> ဆန်ထုတ်ပေးမည်
                                </button>
                            )}
                            {isDelivered && job.deliveryData && (
                                <div className="text-left bg-slate-100 p-2 rounded-lg text-xs font-medium text-slate-600">
                                    <p><span className="font-bold text-slate-800">နေ့စွဲ:</span> {job.deliveryData.date}</p>
                                    <p><span className="font-bold text-slate-800">ကား No:</span> {job.deliveryData.carNo}</p>
                                    <p><span className="font-bold text-slate-800">ထုတ်သူ:</span> {job.deliveryData.driverName}</p>
                                </div>
                            )}
                        </td>
                      </tr>
                    )
                  })}
                  {riceJobs.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-slate-400 font-bold">ဆန်ဂိုဒေါင်တွင် လက်ကျန် မရှိပါ။</td></tr>}
                </tbody>
              </table>
           </div>
        </div>

        {/* Delivery Input Modal */}
        {deliveryModal && (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="px-6 py-5 border-b bg-slate-50 flex justify-between items-center">
                        <h3 className="font-black text-lg text-slate-800 flex items-center"><Truck className="mr-2 text-slate-600"/> ကုန်ထုတ်ပေးမှု မှတ်တမ်း</h3>
                        <button onClick={() => setDeliveryModal(null)} className="text-slate-400 hover:text-rose-500"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleDeliverySubmit} className="p-6 space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                            <p className="text-sm font-bold text-blue-900">{deliveryModal.job.customer} ({deliveryModal.job.id})</p>
                            <p className="text-xs text-blue-700">အထက်ပါ ဖောက်သည်၏ ဆန်/ထွက်ကုန်အားလုံးကို ထုတ်ပေးပါမည်။</p>
                        </div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-1.5">ထုတ်ယူသည့် ရက်စွဲ</label><input type="date" required value={deliveryInput.date} onChange={e=>setDeliveryInput({...deliveryInput, date: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl outline-none bg-white text-slate-900"/></div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-1.5">ကားနံပါတ်</label><input type="text" required placeholder="ဥပမာ - YGN 1A-1234" value={deliveryInput.carNo} onChange={e=>setDeliveryInput({...deliveryInput, carNo: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-900"/></div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-1.5">လာရောက်ထုတ်ယူသူ အမည်</label><input type="text" required placeholder="အမည်" value={deliveryInput.driverName} onChange={e=>setDeliveryInput({...deliveryInput, driverName: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-900"/></div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-1.5">မှတ်ချက် (ရွေးချယ်ရန်)</label><input type="text" placeholder="မှတ်ချက်..." value={deliveryInput.remarks} onChange={e=>setDeliveryInput({...deliveryInput, remarks: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl outline-none bg-white text-slate-900"/></div>
                        
                        <button disabled={isLoading} type="submit" className="w-full mt-2 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-lg shadow-lg">
                            အတည်ပြု မှတ်တမ်းတင်မည်
                        </button>
                    </form>
                </div>
            </div>
        )}
      </div>
    );
  };

  const renderInventoryView = () => {
    let totalPurchasedBran = 0;
    let totalPurchasedByproduct = 0;
    let totalPurchasedReject = 0;

    jobs.forEach(job => {
      if (job.status === 'billed' || job.status === 'delivered') {
        if (job.billData) {
          if (job.billData.branOption === 'sell' && job.millingData?.bran) totalPurchasedBran += Number(job.millingData.bran);
          if (job.billData.byproductOption === 'sell' && job.sortingData?.out2) totalPurchasedByproduct += Number(job.sortingData.out2);
          if (job.billData.rejectOption === 'sell' && job.sortingData?.out3) totalPurchasedReject += Number(job.sortingData.out3);
        }
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

  const renderAdminView = () => {
    const pendingJobs = jobs.filter(j => j.status === 'ready_to_bill' || j.status === 'ready_to_bill_advance');
    const searchedJobs = pendingJobs.filter(j => 
      j.id === activeJobId || 
      (adminSearchQuery.trim() !== '' && (j.customer.toLowerCase().includes(adminSearchQuery.toLowerCase()) || j.id.toLowerCase().includes(adminSearchQuery.toLowerCase())))
    );

    const handleAdvanceBillSubmit = async (job, net, pd, bal) => {
      setIsLoading(true);
      const advanceData = { dryingFee: job.wasWet ? (Number(job.originalQty) * (Number(billInput.dryingRate) || 0)) : 0, otherExp: Number(billInput.otherExp) || 0, netTotal: net, paid: pd, balance: bal, date: getToday() };
      await supabase.from('jobs').update({ status: 'stored_paddy', advanceBillData: advanceData }).eq('id', job.id);
      setActiveJobId(null); setBillInput({ dryingRate: '', sortingRate: '', millingRate: '', branOption: 'take', branRate: '', byproductOption: 'take', byproductRate: '', rejectOption: 'take', rejectRate: '', otherExp: '', paidAmount: '' });
      setIsLoading(false);
      showMessage("အခြောက်ခံခ ဘေလ်သိမ်းပြီးပါပြီ။ စာရင်းသည် စပါးဂိုဒေါင်တွင် ဆက်ရှိနေပါမည်။");
    };

    const handleFinalBillSubmit = async (job, totalServiceFee, dryingFee, deduction, net, pd, bal) => {
      setIsLoading(true);
      await supabase.from('jobs').update({ 
        status: 'billed', 
        billData: { ...billInput, totalServiceFee, dryingFee, deduction, netTotal: net, paid: pd, balance: bal, billDate: getToday() } 
      }).eq('id', job.id);
      setActiveJobId(null); setBillInput({ dryingRate: '', sortingRate: '', millingRate: '', branOption: 'take', branRate: '', byproductOption: 'take', byproductRate: '', rejectOption: 'take', rejectRate: '', otherExp: '', paidAmount: '' });
      setIsLoading(false);
      showMessage("ငွေစာရင်း သိမ်းဆည်းပြီးပါပြီ။");
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Calculator className="mr-3 text-blue-600"/> ငွေစာရင်း (Admin POS) ဌာန</h2>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-8 shadow-sm">
          <label className="block text-sm font-bold text-slate-700 mb-3">ဘောက်ချာ ဖွင့်ရန် / ငွေရှင်းရန် ရှာဖွေပါ</label>
          <div className="relative max-w-xl">
            <input type="text" placeholder="ဖောက်သည် အမည် (သို့) ဘောက်ချာ ID ရိုက်ထည့်ပါ..." value={adminSearchQuery} onChange={e => setAdminSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold bg-white text-slate-900"/>
            <Search className="absolute left-4 top-4 text-slate-400" size={20} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {searchedJobs.map(job => {
            const isAdvance = job.status === 'ready_to_bill_advance';
            const isNawali = job.entryType === 'nawali';
            const isDryOnly = job.purpose === 'dry_only';
            const hasPaidAdvance = !!job.advanceBillData;
            
            const dryingFee = (job.wasWet && !hasPaidAdvance) ? (Number(job.originalQty) * (Number(billInput.dryingRate) || 0)) : 0;
            
            let totalServiceFee = 0;
            let totalMilledBags = 0;
            if (!isDryOnly && !isAdvance) {
              totalMilledBags = isNawali ? 0 : (Number(job.millingData?.rice || 0) + Number(job.millingData?.broken12 || 0) + Number(job.millingData?.broken234 || 0));
              totalServiceFee = isNawali ? (Number(job.originalQty) * (Number(billInput.sortingRate) || 0)) : (totalMilledBags * (Number(billInput.millingRate) || 0));
            }

            const branQty = (isNawali || isDryOnly || isAdvance) ? 0 : Number(job.millingData?.bran || 0);
            const byproductQty = (isDryOnly || isAdvance) ? 0 : Number(job.sortingData?.out2 || 0);
            const rejectQty = (isDryOnly || isAdvance) ? 0 : Number(job.sortingData?.out3 || 0);
            
            const totalDeduction = (billInput.branOption === 'sell' ? branQty * (Number(billInput.branRate)||0) : 0) + (billInput.byproductOption === 'sell' ? byproductQty * (Number(billInput.byproductRate)||0) : 0) + (billInput.rejectOption === 'sell' ? rejectQty * (Number(billInput.rejectRate)||0) : 0);
            
            const other = Number(billInput.otherExp) || 0;
            const paid = Number(billInput.paidAmount) || 0;
            
            const netTotal = totalServiceFee + dryingFee - totalDeduction + other;
            const balance = netTotal > 0 ? (netTotal - paid) : (netTotal + paid);

            return (
              <div key={job.id} className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                <div className={`${isAdvance ? 'bg-emerald-700' : 'bg-slate-900'} p-6 text-white flex justify-between items-center relative`}>
                  <div className="relative z-10"><h3 className="text-2xl font-black mb-1">{job.customer}</h3><p className="text-white/70 text-sm font-bold">ID: {job.id} | {job.paddyType}</p></div>
                  <div className="relative z-10 flex items-center gap-3">
                     <span className={`${isAdvance ? 'bg-white text-emerald-800' : 'bg-blue-600 text-white'} px-4 py-1.5 rounded-full text-xs font-black uppercase shadow-md`}>{isAdvance ? 'အခြောက်ခံခ ဘေလ်' : 'ငွေရှင်းရန် (Final)'}</span>
                     {userRole === 'admin' && <button onClick={() => handleDeleteJob(job.id)} className="p-1.5 text-white/50 hover:text-white hover:bg-white/20 rounded-lg transition-colors" title="ပယ်ဖျက်မည်"><Trash2 size={18} /></button>}
                  </div>
                </div>

                {activeJobId === job.id ? (
                  <div className="p-6 flex-1 flex flex-col bg-slate-50/50">
                    <div className="space-y-5 mb-8">
                      {isAdvance && (
                        <>
                           <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                             <label className="block text-sm font-bold text-slate-800 mb-3">အခြောက်ခံခ နှုန်းထား (၁ တင်းလျှင်)</label>
                             <input type="number" value={billInput.dryingRate} onChange={e=>setBillInput({...billInput, dryingRate: e.target.value})} className="w-full p-3 border-2 border-slate-200 bg-white text-slate-900 rounded-xl outline-none focus:border-emerald-500 font-bold" placeholder="ကျပ်"/>
                             <p className="text-[11px] text-slate-500 mt-2 font-bold bg-slate-100 p-2 rounded-lg">မူလ စပါးအဝင် ({job.originalQty} တင်း) ဖြင့် မြှောက်ပါမည်။</p>
                           </div>
                           <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                             <label className="block text-sm font-bold text-slate-800 mb-2">အခြား ကုန်ကျစရိတ်</label>
                             <input type="number" value={billInput.otherExp} onChange={e=>setBillInput({...billInput, otherExp: e.target.value})} className="w-full p-3 border-2 border-slate-200 bg-white text-slate-900 rounded-xl outline-none focus:border-emerald-500 font-bold" placeholder="0"/>
                           </div>
                        </>
                      )}

                      {!isAdvance && (
                         <>
                            {job.wasWet && !hasPaidAdvance && (
                              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <label className="block text-sm font-bold text-slate-800 mb-3">အခြောက်ခံခ နှုန်းထား (၁ တင်းလျှင်)</label>
                                <input type="number" value={billInput.dryingRate} onChange={e=>setBillInput({...billInput, dryingRate: e.target.value})} className="w-full p-3 border-2 border-slate-200 bg-white text-slate-900 rounded-xl font-bold" placeholder="ကျပ်"/>
                              </div>
                            )}
                            {!isDryOnly && (
                              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <label className="block text-sm font-bold text-slate-800 mb-3">{isNawali ? 'နဝလီ Sorting နှုန်း (၁ အိတ်)' : 'စက်ကြိတ်ခ နှုန်း (၁ အိတ်)'}</label>
                                <input type="number" value={isNawali ? billInput.sortingRate : billInput.millingRate} onChange={e=> isNawali ? setBillInput({...billInput, sortingRate: e.target.value}) : setBillInput({...billInput, millingRate: e.target.value})} className="w-full p-3 border-2 border-slate-200 bg-white text-slate-900 rounded-xl font-bold" placeholder="ကျပ်"/>
                              </div>
                            )}
                            {!isDryOnly && (branQty > 0 || byproductQty > 0 || rejectQty > 0) && (
                              <div className="bg-cyan-50/50 p-5 rounded-2xl border border-cyan-200 shadow-sm space-y-4 text-slate-900">
                                <h4 className="text-sm font-black text-cyan-800 uppercase tracking-wider mb-2">စက်သို့ပြန်ရောင်း၍ ခုနှိမ်ခြင်း</h4>
                                {branQty > 0 && <div className="p-3 bg-white rounded-xl border border-cyan-100"><label className="block text-xs font-bold mb-2">ဖွဲနု ({branQty} အိတ်) ရောင်းမည်လား?</label><select value={billInput.branOption} onChange={e=>setBillInput({...billInput, branOption: e.target.value})} className="w-full p-2 border mb-2 bg-white text-slate-900 outline-none rounded-lg"><option value="take">ဖောက်သည် ယူမည်</option><option value="sell">စက်သို့ ရောင်းမည်</option></select>{billInput.branOption === 'sell' && <input type="number" placeholder="၁ အိတ် နှုန်း" value={billInput.branRate} onChange={e=>setBillInput({...billInput, branRate: e.target.value})} className="w-full p-2 border rounded bg-white text-slate-900 outline-none"/>}</div>}
                                {byproductQty > 0 && <div className="p-3 bg-white rounded-xl border border-cyan-100"><label className="block text-xs font-bold mb-2">Byproduct ({byproductQty} အိတ်) ရောင်းမည်လား?</label><select value={billInput.byproductOption} onChange={e=>setBillInput({...billInput, byproductOption: e.target.value})} className="w-full p-2 border mb-2 bg-white text-slate-900 outline-none rounded-lg"><option value="take">ဖောက်သည် ယူမည်</option><option value="sell">စက်သို့ ရောင်းမည်</option></select>{billInput.byproductOption === 'sell' && <input type="number" placeholder="၁ အိတ် နှုန်း" value={billInput.byproductRate} onChange={e=>setBillInput({...billInput, byproductRate: e.target.value})} className="w-full p-2 border rounded bg-white text-slate-900 outline-none"/>}</div>}
                                {rejectQty > 0 && <div className="p-3 bg-white rounded-xl border border-cyan-100"><label className="block text-xs font-bold mb-2">Reject ({rejectQty} အိတ်) ရောင်းမည်လား?</label><select value={billInput.rejectOption} onChange={e=>setBillInput({...billInput, rejectOption: e.target.value})} className="w-full p-2 border mb-2 bg-white text-slate-900 outline-none rounded-lg"><option value="take">ဖောက်သည် ယူမည်</option><option value="sell">စက်သို့ ရောင်းမည်</option></select>{billInput.rejectOption === 'sell' && <input type="number" placeholder="၁ အိတ် နှုန်း" value={billInput.rejectRate} onChange={e=>setBillInput({...billInput, rejectRate: e.target.value})} className="w-full p-2 border rounded bg-white text-slate-900 outline-none"/>}</div>}
                              </div>
                            )}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                               <label className="block text-sm font-bold text-slate-800 mb-2">အခြား ကုန်ကျစရိတ်</label>
                               <input type="number" value={billInput.otherExp} onChange={e=>setBillInput({...billInput, otherExp: e.target.value})} className="w-full p-3 border-2 border-slate-200 bg-white text-slate-900 rounded-xl font-bold" placeholder="0"/>
                            </div>
                         </>
                      )}
                    </div>

                    <div className="mt-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                      <div className="border-b border-slate-200 pb-4 mb-4">
                         <div className="flex justify-between items-end">
                           <span className="text-xs font-bold uppercase text-slate-500">{netTotal < 0 ? 'စက်မှ ပြန်အမ်းရမည့်ငွေ' : 'ကျသင့်ငွေ (Net Total)'}</span>
                           <span className={`text-3xl font-black ${netTotal < 0 ? 'text-emerald-600' : 'text-slate-800'}`}>{Math.abs(netTotal).toLocaleString()} Ks</span>
                         </div>
                      </div>
                      {Math.abs(netTotal) > 0 && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <label className="block text-xs font-bold mb-2 uppercase text-slate-700">ပေးချေငွေ (Paid Amount)</label>
                          <input type="number" value={billInput.paidAmount} onChange={e=>setBillInput({...billInput, paidAmount: e.target.value})} className="w-full p-3 border-2 border-slate-300 bg-white text-slate-900 rounded-lg font-bold text-xl outline-none focus:border-blue-500" placeholder="0" min="0"/>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 mt-6">
                      <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-6 py-4 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold rounded-xl border border-rose-100 transition-colors">ပယ်ဖျက်</button>
                      {isAdvance ? (
                        <button disabled={isLoading} onClick={() => handleAdvanceBillSubmit(job, netTotal, paid, balance)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center text-lg"><CheckCircle size={22} className="mr-2"/> ကြိုတင်ဘေလ် သိမ်းမည်</button>
                      ) : (
                        <button disabled={isLoading} onClick={() => handleFinalBillSubmit(job, totalServiceFee, dryingFee, totalDeduction, netTotal, paid, balance)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center text-lg"><CheckCircle size={22} className="mr-2"/> ဘေလ်သိမ်းပြီး ငွေရှင်းမည်</button>
                      )}
                    </div>
                  </div>
                ) : <div className="p-8 flex-1 flex flex-col justify-center items-center bg-slate-50/50 border-t border-slate-100"><button onClick={() => setActiveJobId(job.id)} className={`bg-white font-bold py-4 px-8 rounded-2xl border-2 shadow-sm flex items-center hover:scale-105 ${isAdvance ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50' : 'text-blue-600 border-blue-200 hover:bg-blue-50'}`}><Calculator size={22} className="mr-2"/> ဘေလ်တွက်ချက်ရန် နှိပ်ပါ</button></div>}
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  const renderCustomerLedgerView = () => {
    const customerStats = {};
    jobs.forEach(job => {
      if(!customerStats[job.customer]) {
        customerStats[job.customer] = { name: job.customer, totalPaddy: 0, totalRice: 0, totalDebt: 0, history: [] };
      }
      
      const stat = customerStats[job.customer];
      if (job.entryType === 'paddy' && job.status !== 'payment') stat.totalPaddy += job.originalQty;
      
      if (job.status === 'ready_to_bill' || job.status === 'billed' || job.status === 'delivered') {
        if (job.purpose !== 'dry_only') stat.totalRice += Number(job.sortingData?.out1 || 0);
      }
      if ((job.status === 'billed' || job.status === 'delivered') && job.billData) stat.totalDebt += Number(job.billData.balance || 0);
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
      showMessage("ငွေစာရင်း မှတ်တမ်းတင်ပြီးပါပြီ။");
    }

    const filteredCustomers = Object.values(customerStats).filter(c => c.name.toLowerCase().includes(ledgerSearchQuery.toLowerCase()));

    return (
      <div className="animate-in fade-in duration-300 relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center"><Users className="mr-3 text-indigo-600"/> ဖောက်သည် မှတ်တမ်း / အကြွေးစာရင်း</h2>
          <div className="relative w-72">
            <input type="text" placeholder="အမည်ဖြင့် ရှာရန်..." value={ledgerSearchQuery} onChange={e=>setLedgerSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 bg-white text-slate-900 rounded-xl outline-none focus:border-indigo-500 font-bold"/>
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
                       <div className="text-right bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-0.5">စက်မှ ပေးရန်ကျန်ငွေ</p>
                        <p className="font-black text-lg text-green-700 leading-none">{Math.abs(cust.totalDebt).toLocaleString()} <span className="text-xs font-normal">Ks</span></p>
                      </div>
                      <button onClick={() => setPaymentModal({customer: cust.name, type: 'pay', debt: Math.abs(cust.totalDebt)})} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm">ငွေရှင်းပေးမည်</button>
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
                       className="w-full p-3 text-sm border border-slate-300 bg-amber-50/50 text-slate-900 rounded-lg outline-none focus:border-indigo-500 resize-none h-20"
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
                          {userRole === 'admin' && <th className="pb-3 px-2 font-bold text-center">လုပ်ဆောင်ချက်</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {cust.history.map(h => (
                          <tr key={h.id} className={`hover:bg-slate-50 ${h.status === 'delivered' ? 'bg-slate-50/50' : ''}`}>
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
                                  {h.status === 'delivered' ? (
                                      <span className="text-[10px] text-slate-600 font-bold uppercase mt-1 inline-flex items-center"><Truck size={12} className="mr-1"/> ကုန်ထုတ်ပြီး</span>
                                  ) : h.status === 'billed' ? (
                                      <span className="text-[10px] text-indigo-600 font-bold uppercase mt-1 inline-block">ဘေလ်ရှင်းပြီး</span>
                                  ) : (
                                      <span className="text-[10px] text-amber-600 font-bold uppercase mt-1 inline-block">လုပ်ဆောင်ဆဲ</span>
                                  )}
                                  {h.status === 'delivered' && h.deliveryData && (
                                      <div className="mt-2 text-[10px] text-slate-500 bg-white p-1.5 border border-slate-200 rounded">
                                          ကား: {h.deliveryData.carNo} | ယာဉ်မောင်း: {h.deliveryData.driverName}
                                      </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right font-black text-[15px]">
                              {h.status === 'payment' ? (
                                <span className="text-emerald-600">Paid: {Math.abs(h.amount).toLocaleString()}</span>
                              ) : h.billData?.netTotal !== undefined ? (
                                <span className={h.billData.netTotal < 0 ? 'text-green-600' : 'text-slate-800'}>
                                   {h.billData.netTotal < 0 ? `Refund: ${Math.abs(h.billData.netTotal).toLocaleString()}` : h.billData.netTotal.toLocaleString()}
                                </span> 
                              ) : '-'}
                            </td>
                            <td className="py-4 px-4 text-right font-black text-[15px]">
                              {h.status !== 'payment' && h.billData?.balance !== undefined ? (
                                h.billData.balance > 0 ? <span className="text-rose-500">{h.billData.balance.toLocaleString()}</span> : 
                                h.billData.balance < 0 ? <span className="text-green-600">-{Math.abs(h.billData.balance).toLocaleString()}</span> : <span className="text-slate-400">-</span>
                              ) : '-'}
                            </td>
                            {userRole === 'admin' && (
                                <td className="py-4 px-2 text-center">
                                    <button onClick={() => handleDeleteJob(h.id)} className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors" title="ဤမှတ်တမ်းအား ဖျက်မည်"><Trash2 size={16}/></button>
                                </td>
                            )}
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
              <div className={`px-6 py-5 border-b flex justify-between items-center ${paymentModal.type === 'receive' ? 'bg-rose-50 border-rose-100' : 'bg-green-50 border-green-100'}`}>
                <div>
                  <h3 className={`font-black text-lg ${paymentModal.type === 'receive' ? 'text-rose-800' : 'text-green-800'}`}>{paymentModal.customer}</h3>
                  <p className={`text-xs font-bold ${paymentModal.type === 'receive' ? 'text-rose-600' : 'text-green-600'}`}>{paymentModal.type === 'receive' ? 'အကြွေးလာဆပ်ခြင်း' : 'စက်မှငွေရှင်းပေးခြင်း'}</p>
                </div>
                <button disabled={isLoading} onClick={() => setPaymentModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <form onSubmit={handlePaymentSubmit} className="p-6">
                <div className="mb-6 text-center">
                  <p className="text-sm font-bold text-slate-500 mb-1">{paymentModal.type === 'receive' ? 'လက်ရှိ အကြွေးကျန်ငွေ' : 'လက်ရှိ ပေးရန်ကျန်ငွေ'}</p>
                  <p className={`text-3xl font-black ${paymentModal.type === 'receive' ? 'text-rose-600' : 'text-green-600'}`}>{paymentModal.debt.toLocaleString()} <span className="text-lg font-medium">Ks</span></p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">ပေးချေမည့် ငွေပမာဏ (ကျပ်)</label>
                  <input type="number" required autoFocus value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} className="w-full p-4 border-2 border-slate-300 bg-white text-slate-900 rounded-xl outline-none focus:border-indigo-500 text-xl font-bold text-center" placeholder="0" min="1"/>
                </div>
                <button disabled={isLoading} type="submit" className={`w-full mt-6 py-4 rounded-xl text-white font-bold text-lg shadow-lg ${paymentModal.type === 'receive' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-green-600 hover:bg-green-700'}`}>
                  {isLoading ? 'Processing...' : 'အတည်ပြု မှတ်တမ်းတင်မည်'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMenu = () => {
    let menus = [];
    if (userRole === 'admin') {
      menus = [
        { id: 'gate', name: 'စပါး/အခြောက်ခံ ဌာန', icon: Home, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-100 text-slate-800' },
        { id: 'milling', name: 'ကြိတ်ခွဲရေး ဌာန', icon: Tractor, color: 'text-purple-600', activeBg: 'bg-purple-50 border-purple-100 text-slate-800' },
        { id: 'sorting', name: 'Color Sorting ဌာန', icon: ScanLine, color: 'text-indigo-600', activeBg: 'bg-indigo-50 border-indigo-100 text-slate-800' },
        { id: 'paddy_warehouse', name: 'စပါးဂိုဒေါင်', icon: Factory, color: 'text-amber-600', activeBg: 'bg-amber-50 border-amber-100 text-slate-800' },
        { id: 'rice_warehouse', name: 'ဆန်ဂိုဒေါင်', icon: Factory, color: 'text-emerald-600', activeBg: 'bg-emerald-50 border-emerald-100 text-slate-800' },
        { id: 'inventory', name: 'စက်ပိုင် ဆန်စာရင်း', icon: Package, color: 'text-cyan-600', activeBg: 'bg-cyan-50 border-cyan-100 text-slate-800' },
        { id: 'admin', name: 'ငွေစာရင်း (Admin POS)', icon: Calculator, color: 'text-rose-600', activeBg: 'bg-rose-50 border-rose-100 text-slate-800' },
        { id: 'customers', name: 'ဖောက်သည် / အကြွေးစာရင်း', icon: Users, color: 'text-slate-700', activeBg: 'bg-slate-100 border-slate-200 text-slate-800' },
      ];
    } else if (userRole === 'gate') {
      menus = [
        { id: 'gate', name: 'စပါး/အခြောက်ခံ ဌာန', icon: Home, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-100 text-slate-800' },
        { id: 'paddy_warehouse', name: 'စပါးဂိုဒေါင်', icon: Factory, color: 'text-amber-600', activeBg: 'bg-amber-50 border-amber-100 text-slate-800' }
      ];
    } else if (userRole === 'mill') {
      menus = [
        { id: 'milling', name: 'ကြိတ်ခွဲရေး ဌာန', icon: Tractor, color: 'text-purple-600', activeBg: 'bg-purple-50 border-purple-100 text-slate-800' },
        { id: 'sorting', name: 'Color Sorting ဌာန', icon: ScanLine, color: 'text-indigo-600', activeBg: 'bg-indigo-50 border-indigo-100 text-slate-800' },
        { id: 'rice_warehouse', name: 'ဆန်ဂိုဒေါင်', icon: Factory, color: 'text-emerald-600', activeBg: 'bg-emerald-50 border-emerald-100 text-slate-800' }
      ];
    }

    return (
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="space-y-1.5 overflow-y-auto">
          {menus.map(menu => (
            <button 
              key={menu.id} onClick={() => setActiveView(menu.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all font-bold border ${activeView === menu.id ? `${menu.activeBg} ${menu.color}` : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <menu.icon size={20} strokeWidth={activeView === menu.id ? 2.5 : 2} className={activeView === menu.id ? '' : 'opacity-70'}/>
              <span className="text-sm">{menu.name}</span>
            </button>
          ))}
        </div>
        <button onClick={() => { setUserRole(null); setActiveView('gate'); }} className="mt-6 w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-rose-600 font-bold bg-rose-50 hover:bg-rose-100 transition-colors">
          <LogOut size={18} /> <span>အကောင့်ထွက်မည်</span>
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans relative">
      {/* Fix: Non-freezing Custom Dialog */}
      {dialogConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center">
                 <AlertCircle size={48} className={`mx-auto mb-4 ${dialogConfig.type === 'confirm' ? 'text-rose-500' : 'text-blue-500'}`} />
                 <p className="text-lg font-bold text-slate-800 mb-8 leading-snug">{dialogConfig.message}</p>
                 <div className="flex gap-3 justify-center">
                    {dialogConfig.type === 'confirm' && (
                       <button onClick={() => setDialogConfig(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors border border-slate-200">မလုပ်တော့ပါ</button>
                    )}
                    <button onClick={() => {
                        const action = dialogConfig.onConfirm;
                        setDialogConfig(null);
                        if (action) action();
                    }} className={`flex-1 py-3 font-bold rounded-xl text-white shadow-md transition-colors ${dialogConfig.type === 'confirm' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                       {dialogConfig.type === 'confirm' ? 'ဖျက်မည်' : 'အိုကေ'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="w-[280px] bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
        <div className="p-6 border-b border-slate-100 flex items-center space-x-3 bg-blue-700">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-700 font-black text-xl shadow-inner">စက်</div>
          <div>
            <h1 className="font-black text-xl text-white tracking-tight leading-none">Mill ERP</h1>
            <p className="text-blue-200 text-[10px] font-bold mt-1 uppercase tracking-wider">
               Role: {userRole === 'admin' ? 'Admin' : userRole === 'gate' ? 'Gate Manager' : 'Mill Manager'}
            </p>
          </div>
        </div>
        {renderMenu()}
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-6xl mx-auto">
          {activeView === 'gate' && renderGateView()}
          {activeView === 'milling' && renderMillingView()}
          {activeView === 'sorting' && renderSortingView()}
          {activeView === 'paddy_warehouse' && renderPaddyWarehouseView()}
          {activeView === 'rice_warehouse' && renderRiceWarehouseView()}
          {activeView === 'inventory' && renderInventoryView()}
          {activeView === 'admin' && renderAdminView()}
          {activeView === 'customers' && renderCustomerLedgerView()}
        </div>
      </div>
    </div>
  );
}

render(<MillERP />, document.getElementById('root'));
