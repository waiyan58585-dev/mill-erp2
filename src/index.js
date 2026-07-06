import React, { useState, useEffect } from 'react';
import { render } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Home, Tractor, ScanLine, Package, Calculator, Users,
  Plus, ArrowRight, CheckCircle, Droplets, Wind, LayoutDashboard,
  Receipt, User, Search, ChevronDown, ChevronUp, X, MapPin, Factory, ArrowUpRight, ArrowDownToLine, Trash2, Edit3, Truck, AlertCircle, CheckSquare, Settings, LogOut, Database, FileSpreadsheet, PackageCheck, Warehouse
} from 'lucide-react';

// ==========================================
// မဖြစ်မနေ ပြင်ဆင်ရန် (Supabase API Keys)
// ==========================================
const supabaseUrl = 'https://jgerimrkigxtphjcrafq.supabase.co';
const supabaseKey = 'sb_publishable_2jhGRP_tFpR9xuPgJEBBxA_2_HRJTUG';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function MillERP() {
  // --- Core States ---
  const [isConfigured] = useState(supabaseUrl !== 'YOUR_SUPABASE_URL');
  const [session, setSession] = useState(null); // { role: 'admin'|'paddy'|'rice', name: '' }
  const [activeView, setActiveView] = useState('dashboard'); 
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom Modals
  const [dialogConfig, setDialogConfig] = useState(null); // { title, message, onConfirm, onCancel, confirmText, isDanger }

  const getToday = () => new Date().toISOString().split('T')[0];

  const PADDY_STORAGE = ["B", "B/C ကြား", "C", "C/D ကြား", "D", "D/E ကြား", "E1", "E2", "E3", "Suncue", "Flat 1", "Flat 2", "Flat 3"];
  const RICE_STORAGE = ["A1", "CS ကွင်းသစ်", "CS ရှေ့", "B ကွင်း", "ဂိုဒေါင် အဟောင်း"];
  const DRYING_MACHINES = ["Suncue 1", "Suncue 2", "Flat 1", "Flat 2", "Flat 3"];

  // --- Database States ---
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);

  // --- Input States (HOISTED to prevent hooks crashing/focus loss) ---
  const [loginRole, setLoginRole] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [newJob, setNewJob] = useState({ 
    entryType: 'paddy', purpose: 'mill', customer: '', paddyType: '', qty: '', moisture: 'အစို', storage: '', date: getToday() 
  });
  
  const [activeJobId, setActiveJobId] = useState(null);
  
  // Drying State
  const [dryingAllocations, setDryingAllocations] = useState([{ machine: '', qty: '' }]);
  const [dryInput, setDryInput] = useState({ qty: '', storage: '' });

  // Milling & Sorting State
  const [millInput, setMillInput] = useState({ rice: '', broken12: '', broken234: '', bran: '' });
  const [sortInput, setSortInput] = useState({ out1: '', storage1: '', out2: '', storage2: '', out3: '', storage3: '' });

  // POS / Admin Billing State
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [billInput, setBillInput] = useState({ 
    dryingRate: '', sortingRate: '', millingRate: '', 
    branOption: 'take', branRate: '', 
    byproductOption: 'take', byproductRate: '',
    rejectOption: 'take', rejectRate: '', 
    otherExp: '', paidAmount: '' 
  });

  // Delivery State (Mapped by JobId to prevent focus loss)
  const [deliveryInputs, setDeliveryInputs] = useState({}); 
  /* Example: { 'JOB-1': { date: '', carNo: '', driver: '', out1Qty: '', ... } } */

  // Customer Ledger State
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Opening Stock State
  const [openingStockInput, setOpeningStockInput] = useState({
     ownerType: 'စက်ပိုင်', customerName: '',
     itemType: 'စပါး', qty: '', storage: ''
  });

  useEffect(() => {
    if (!isConfigured) return;
    fetchData();
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isConfigured]);

  const fetchData = async () => {
    const { data: jobsData } = await supabase.from('jobs').select('*').order('date', { ascending: false });
    if (jobsData) setJobs(jobsData);
    const { data: custData } = await supabase.from('customers').select('*');
    if (custData) setCustomers(custData);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    if (loginRole === 'admin' && loginPassword === '585') {
        setSession({ role: 'admin', name: 'Admin (ပိုင်ရှင်)' });
    } else if (loginRole === 'paddy' && loginPassword === '2222') {
        setSession({ role: 'paddy', name: 'Paddy Manager' });
    } else if (loginRole === 'rice' && loginPassword === '1111') {
        setSession({ role: 'rice', name: 'Rice Manager' });
    } else {
        setLoginError('စကားဝှက် (Password) မှားယွင်းနေပါသည်။');
    }
  };

  const getSortingLabels = (type) => {
    const t = (type || '').toLowerCase();
    if(t.includes('ကောက်ညှင်း')) return ['ကောက်ညှင်း (အချော)', 'အကြမ်းဆန် (By-product)', 'ကောက်ညှင်း (Reject)'];
    if(t.includes('ကြမ်း')) return ['အကြမ်းဆန် (အချော)', 'ဗိုက်ဖြူဆန် (By-product)', 'အကြမ်း (Reject)'];
    if(t.includes('ပေါ်ဆန်း')) return ['ပေါ်ဆန်း (အချော)', 'ကြမ်းဆန် (By-product)', 'ပေါ်ဆန်း (Reject)'];
    if(t.includes('စကွဲ')) return ['စကွဲ (အချော)', 'By-product (အမှုန့်)', 'Reject (အမည်း)'];
    return [`${type} (အချော)`, 'By-product', 'Reject'];
  };

  const handleDelete = (jobId) => {
    if(session?.role !== 'admin') return alert('Admin သာလျှင် ပယ်ဖျက်ခွင့်ရှိပါသည်။');
    
    setDialogConfig({
      title: 'အပြီးတိုင် ပယ်ဖျက်မည်',
      message: `ဘောက်ချာ/မှတ်တမ်း No: ${jobId} အား အပြီးတိုင် ပယ်ဖျက်မှာ သေချာပါသလား?`,
      confirmText: 'ဖျက်မည်',
      isDanger: true,
      onConfirm: async () => {
        setDialogConfig(null);
        setJobs(jobs.filter(j => j.id !== jobId)); // Optimistic delete
        await supabase.from('jobs').delete().eq('id', jobId);
      },
      onCancel: () => setDialogConfig(null)
    });
  };

  // --- Views ---
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f1f5f9] p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200">
           <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                 <Factory size={32} className="text-white"/>
              </div>
           </div>
           <h1 className="text-2xl font-black text-center text-slate-800 mb-2">Mill ERP System</h1>
           <p className="text-center text-slate-500 text-sm font-bold mb-8">စနစ်အတွင်းသို့ ဝင်ရောက်ရန်</p>
           
           <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ဝင်ရောက်မည့် အကောင့် (Role)</label>
                <select value={loginRole} onChange={e => setLoginRole(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700 bg-slate-50 transition-colors">
                   <option value="admin">Admin (ပိုင်ရှင်)</option>
                   <option value="paddy">Paddy Manager (စပါး/ဂိုဒေါင်)</option>
                   <option value="rice">Rice Manager (ဆန်/ကြိတ်ခွဲရေး)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">စကားဝှက် (Password)</label>
                <input type="password" value={loginPassword} onChange={e => {setLoginPassword(e.target.value); setLoginError('');}} className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold bg-slate-50 transition-colors" placeholder="••••" required />
              </div>
              
              {loginError && (
                <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm font-bold flex items-center border border-rose-100">
                  <AlertCircle size={16} className="mr-2"/> {loginError}
                </div>
              )}
              
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 text-lg">
                ဝင်မည် (Login)
              </button>
           </form>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    // Shared Stats calculations
    const today = getToday();
    const todayJobs = jobs.filter(j => j.date === today);
    
    // Admin specific
    const totalPaddyInToday = todayJobs.filter(j => j.entryType === 'paddy' && j.status !== 'payment').reduce((sum, j) => sum + Number(j.originalQty || 0), 0);
    const totalRiceDeliveredToday = jobs.reduce((sum, j) => {
        const todayLogs = (j.deliveryLogs || []).filter(l => l.date === today);
        return sum + todayLogs.reduce((s, log) => s + Number(log.out1Qty || 0) + Number(log.b12Qty || 0) + Number(log.b234Qty || 0), 0);
    }, 0);
    
    let totalDebt = 0;
    let totalPayable = 0;
    jobs.forEach(job => {
        if (job.status === 'billed' && job.billData) {
            const bal = Number(job.billData.balance || 0);
            if (bal > 0) totalDebt += bal;
            if (bal < 0) totalPayable += Math.abs(bal);
        }
        if (job.status === 'payment') {
            if (job.amount > 0) totalDebt -= job.amount;
            else totalPayable -= Math.abs(job.amount);
        }
    });

    if (session.role === 'admin') {
      return (
        <div className="animate-in fade-in duration-300">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><LayoutDashboard className="mr-3 text-blue-600"/> Admin Dashboard (ခြုံငုံသုံးသပ်ချက်)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-sm font-bold text-slate-500 mb-1">ယနေ့ စပါးအဝင်စုစုပေါင်း</p>
              <p className="text-3xl font-black text-slate-800">{totalPaddyInToday} <span className="text-sm font-medium">တင်း</span></p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-sm font-bold text-slate-500 mb-1">ယနေ့ ဆန်ထုတ်ပေးမှု</p>
              <p className="text-3xl font-black text-slate-800">{totalRiceDeliveredToday} <span className="text-sm font-medium">အိတ်</span></p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-200">
              <p className="text-sm font-bold text-rose-600 mb-1">စုစုပေါင်း ဖောက်သည်အကြွေး</p>
              <p className="text-3xl font-black text-rose-600">{totalDebt.toLocaleString()} <span className="text-sm font-medium">Ks</span></p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200">
              <p className="text-sm font-bold text-emerald-600 mb-1">စက်မှပြန်ပေးရန်ကျန်သော စာရင်း</p>
              <p className="text-3xl font-black text-emerald-600">{totalPayable.toLocaleString()} <span className="text-sm font-medium">Ks</span></p>
            </div>
          </div>
        </div>
      );
    }

    if (session.role === 'paddy') {
       return (
        <div className="animate-in fade-in duration-300">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><LayoutDashboard className="mr-3 text-blue-600"/> စပါးတာဝန်ခံ Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-sm font-bold text-slate-500 mb-1">ယနေ့ စပါးအဝင်</p>
              <p className="text-3xl font-black text-slate-800">{totalPaddyInToday} <span className="text-sm font-medium">တင်း</span></p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-200">
              <p className="text-sm font-bold text-amber-700 mb-1">အခြောက်ခံရန် ကျန် (အစို)</p>
              <p className="text-3xl font-black text-amber-700">{jobs.filter(j => j.status === 'waiting_dry').length} <span className="text-sm font-medium">စာရင်း</span></p>
            </div>
          </div>
        </div>
       );
    }

    if (session.role === 'rice') {
       return (
        <div className="animate-in fade-in duration-300">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><LayoutDashboard className="mr-3 text-blue-600"/> ဆန်ရုံတာဝန်ခံ Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200">
              <p className="text-sm font-bold text-purple-700 mb-1">ကြိတ်ခွဲရန် စောင့်ဆိုင်းဆဲ</p>
              <p className="text-3xl font-black text-purple-700">{jobs.filter(j => j.status === 'waiting_mill' && j.purpose !== 'dry_only').length} <span className="text-sm font-medium">စာရင်း</span></p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-200">
              <p className="text-sm font-bold text-indigo-700 mb-1">Color Sort ရန် ကျန်</p>
              <p className="text-3xl font-black text-indigo-700">{jobs.filter(j => j.status === 'waiting_sort').length} <span className="text-sm font-medium">စာရင်း</span></p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-sm font-bold text-slate-500 mb-1">ယနေ့ ဆန်ထုတ်ပေးမှု</p>
              <p className="text-3xl font-black text-slate-800">{totalRiceDeliveredToday} <span className="text-sm font-medium">အိတ်</span></p>
            </div>
          </div>
        </div>
       );
    }
  };

  const renderGateView = () => {
    const handleAddJob = async (e) => {
      e.preventDefault();
      if(!newJob.customer || !newJob.qty || !newJob.paddyType) return;
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
        status: initialStatus, date: newJob.date, deliveryLogs: [] // Ensure deliveryLogs exists
      };
      
      const { error } = await supabase.from('jobs').insert([jobData]);
      if (error) {
          setDialogConfig({ title: 'Error', message: error.message, onConfirm: ()=>setDialogConfig(null) });
      } else {
        setNewJob({ ...newJob, customer: '', paddyType: '', qty: '', storage: '' });
        setDialogConfig({ title: 'အောင်မြင်ပါသည်', message: `စာရင်းသွင်းပြီးပါပြီ။ ID: ${newJobId}`, onConfirm: ()=>setDialogConfig(null) });
      }
      setIsLoading(false);
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Home className="mr-3 text-blue-600"/> စပါးလက်ခံ / ဂိတ်ဝင် ဌာန</h2>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center text-blue-700"><ArrowDownToLine size={18} className="mr-2"/> အဝင် စာရင်းသစ်သွင်းရန် (ဂိုဒေါင်သို့ တန်းဝင်မည်)</h3>
          <form onSubmit={handleAddJob} className="space-y-4">
            
            <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-md mb-4 border border-slate-200">
              <button type="button" onClick={() => setNewJob({...newJob, entryType: 'paddy'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newJob.entryType === 'paddy' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>စပါးအဝင်</button>
              <button type="button" onClick={() => setNewJob({...newJob, entryType: 'nawali'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newJob.entryType === 'nawali' ? 'bg-white text-amber-700 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>နဝလီ (Color Sort အဝင်)</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">ရက်စွဲ</label>
                <input type="date" value={newJob.date} onChange={e=>setNewJob({...newJob, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm font-bold text-slate-900" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">ဖောက်သည်အမည်</label>
                <input type="text" value={newJob.customer} onChange={e=>setNewJob({...newJob, customer: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm font-bold text-slate-900" required placeholder="အမည်" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{newJob.entryType === 'paddy' ? 'စပါးအမျိုးအစား' : 'ဆန်အမျိုးအစား'}</label>
                <input type="text" list="paddyTypes" value={newJob.paddyType} onChange={e=>setNewJob({...newJob, paddyType: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm font-bold text-slate-900" required placeholder="ရိုက်ထည့်ပါ..." />
                <datalist id="paddyTypes"><option value="ကောက်ညှင်း" /><option value="အကြမ်းဆန်" /><option value="ပေါ်ဆန်း" /><option value="ဧည့်မထ" /><option value="စကွဲ" /></datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">အရေအတွက် ({newJob.entryType === 'paddy' ? 'တင်း' : 'အိတ်'})</label>
                <input type="number" value={newJob.qty} onChange={e=>setNewJob({...newJob, qty: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm font-bold text-slate-900" required placeholder="0" min="1"/>
              </div>
              
              {newJob.entryType === 'paddy' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">အစို / အခြောက်</label>
                    <select value={newJob.moisture} onChange={e=>setNewJob({...newJob, moisture: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm font-bold text-slate-900">
                      <option value="အစို">အစို (အခြောက်ခံမည်)</option>
                      <option value="အခြောက်">အခြောက်</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">လုပ်ငန်းရည်ရွယ်ချက်</label>
                    <select value={newJob.purpose} onChange={e=>setNewJob({...newJob, purpose: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm font-bold text-slate-900">
                      <option value="mill">စက်ကြိတ်မည်</option>
                      <option value="dry_only">အခြောက်ခံရုံ သီးသန့်</option>
                    </select>
                  </div>
                </>
              )}

              <div className="col-span-1 md:col-span-2">
                 <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center"><MapPin size={12} className="mr-1"/> ချထားမည့် သိုလှောင်ရုံ/နေရာ</label>
                 <input type="text" list="storageLocations" value={newJob.storage} onChange={e=>setNewJob({...newJob, storage: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm font-bold text-slate-900" placeholder="ရိုက်ထည့်ပါ (သို့) ရွေးပါ" required/>
                 <datalist id="storageLocations">
                    {newJob.entryType === 'paddy' ? PADDY_STORAGE.map(s => <option key={s} value={s}/>) : RICE_STORAGE.map(s => <option key={s} value={s}/>)}
                 </datalist>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
              <button disabled={isLoading} type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-bold shadow-lg disabled:opacity-50 transition-colors text-sm flex items-center"><Plus size={18} className="mr-2"/> ဂိုဒေါင်သို့ စာရင်းသွင်းမည်</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderPaddyWarehouseView = () => {
    const handleAddAllocation = () => setDryingAllocations([...dryingAllocations, { machine: '', qty: '' }]);
    const handleRemoveAllocation = (index) => setDryingAllocations(dryingAllocations.filter((_, i) => i !== index));

    const handleStartDrying = async (jobId) => {
        const isValid = dryingAllocations.every(a => a.machine && a.qty > 0);
        if(!isValid || dryingAllocations.length === 0) return setDialogConfig({title: 'Error', message: 'စက်အမည် နှင့် တင်းအရေအတွက် ပြည့်စုံစွာ ထည့်ပါ။', onConfirm: ()=>setDialogConfig(null)});
        
        const totalDryQty = dryingAllocations.reduce((sum, a) => sum + Number(a.qty), 0);
        const currentJob = jobs.find(j => j.id === jobId);
        
        if(totalDryQty > currentJob.currentQty) return setDialogConfig({title: 'Error', message: `ထည့်သွင်းသော စုစုပေါင်းတင်း (${totalDryQty}) သည် မူလတင်း (${currentJob.currentQty}) ထက် များနေပါသည်။`, onConfirm: ()=>setDialogConfig(null)});

        setIsLoading(true);
        try {
            if (totalDryQty < currentJob.currentQty) {
                // Split Job: Create a new job for the drying part, keep remaining in waiting_dry
                const remainingQty = currentJob.currentQty - totalDryQty;
                const newDryingJobId = `${currentJob.id}-D${Date.now().toString().slice(-4)}`;
                
                const dryingJob = { ...currentJob, id: newDryingJobId, currentQty: totalDryQty, originalQty: totalDryQty, status: 'drying', dryingMachines: dryingAllocations };
                await supabase.from('jobs').insert([dryingJob]);
                await supabase.from('jobs').update({ currentQty: remainingQty, originalQty: remainingQty }).eq('id', jobId);
            } else {
                // Full amount goes to drying
                await supabase.from('jobs').update({ status: 'drying', dryingMachines: dryingAllocations }).eq('id', jobId);
            }
            setActiveJobId(null);
        } catch (error) {
            setDialogConfig({title: 'Database Error', message: error.message, onConfirm: ()=>setDialogConfig(null)});
        } finally {
            setIsLoading(false);
        }
    };

    const handleDryingDone = async (job) => {
      if(!dryInput.qty || !dryInput.storage) return alert("ကျန်ရှိတင်း နှင့် သိုလှောင်ရုံနေရာ ထည့်ပါ။");
      const nextStatus = job.purpose === 'dry_only' ? 'ready_to_bill' : 'waiting_mill';
      
      setIsLoading(true);
      await supabase.from('jobs').update({ 
        currentQty: Number(dryInput.qty), storage: dryInput.storage, moisture: 'အခြောက်', status: nextStatus
      }).eq('id', job.id);
      
      setActiveJobId(null); setDryInput({ qty: '', storage: '' });
      setIsLoading(false);
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Warehouse className="mr-3 text-amber-600"/> စပါး / နဝလီ ဂိုဒေါင် နှင့် အခြောက်ခံစက်</h2>
        
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-8">
            <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-800">
                ဂိုဒေါင်တွင်း လက်ကျန်စပါး/နဝလီ (စက်ချရန်အသင့်)
            </div>
            <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-500 text-xs uppercase">
                    <tr><th className="p-3">ဘောက်ချာ / ဖောက်သည်</th><th className="p-3">အမျိုးအစား / အစိုအခြောက်</th><th className="p-3">နေရာ နှင့် အရေအတွက်</th><th className="p-3">လုပ်ဆောင်ချက်</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {jobs.filter(j => j.status === 'waiting_dry' || j.status === 'waiting_mill' || j.status === 'waiting_sort').map(job => (
                        <tr key={job.id} className="hover:bg-slate-50">
                            <td className="p-3">
                                <div className="font-bold text-slate-800">{job.customer}</div>
                                <div className="text-xs text-slate-500">{job.id} • {job.date}</div>
                            </td>
                            <td className="p-3">
                                <span className="font-bold">{job.paddyType}</span><br/>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${job.status==='waiting_dry' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {job.status==='waiting_dry' ? 'အစို (အခြောက်ခံမည်)' : job.status==='waiting_sort' ? 'နဝလီ' : 'အခြောက် (ကြိတ်မည်)'}
                                </span>
                            </td>
                            <td className="p-3 font-bold text-slate-700">
                                {job.currentQty} {job.entryType==='paddy' ? 'တင်း' : 'အိတ်'} <br/>
                                <span className="text-xs text-slate-500 font-medium"><MapPin size={10} className="inline mr-1"/> {job.storage}</span>
                            </td>
                            <td className="p-3">
                                {job.status === 'waiting_dry' && (
                                    activeJobId === job.id + '-todry' ? (
                                        <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-lg absolute right-10 z-20 w-80">
                                            <label className="text-xs font-bold text-amber-800 block mb-2">အခြောက်ခံစက်သို့ ထည့်ရန် (ခွဲထည့်နိုင်သည်)</label>
                                            {dryingAllocations.map((alloc, idx) => (
                                                <div key={idx} className="flex gap-2 mb-2">
                                                    <select value={alloc.machine} onChange={e=>{const a=[...dryingAllocations]; a[idx].machine=e.target.value; setDryingAllocations(a);}} className="flex-1 p-2 border border-slate-300 rounded outline-none font-bold text-sm">
                                                        <option value="">စက်ရွေးပါ</option>
                                                        {DRYING_MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                    <input type="number" value={alloc.qty} onChange={e=>{const a=[...dryingAllocations]; a[idx].qty=e.target.value; setDryingAllocations(a);}} className="w-20 p-2 border border-slate-300 rounded font-bold text-sm" placeholder="တင်း" min="1"/>
                                                    {idx>0 && <button onClick={()=>handleRemoveAllocation(idx)} className="text-red-500 p-2"><X size={16}/></button>}
                                                </div>
                                            ))}
                                            <button onClick={handleAddAllocation} className="text-xs text-blue-600 font-bold mb-3">+ စက်ထပ်ထည့်မည်</button>
                                            <div className="flex gap-2">
                                                <button onClick={()=>setActiveJobId(null)} className="flex-1 py-2 border rounded font-bold text-sm">ပယ်ဖျက်</button>
                                                <button onClick={()=>handleStartDrying(job.id)} className="flex-1 py-2 bg-amber-500 text-white rounded font-bold text-sm">စက်ထဲ ထည့်မည်</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={()=>{setActiveJobId(job.id + '-todry'); setDryingAllocations([{machine: '', qty: job.currentQty}]);}} className="bg-amber-50 text-amber-700 font-bold px-3 py-1.5 rounded-lg text-xs border border-amber-200 hover:bg-amber-100">စက်ထဲ ထည့်မည်</button>
                                    )
                                )}
                                {session?.role === 'admin' && (
                                    <button onClick={()=>handleDelete(job.id)} className="ml-2 text-rose-500 hover:bg-rose-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {jobs.filter(j => j.status === 'waiting_dry' || j.status === 'waiting_mill' || j.status === 'waiting_sort').length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-bold">စပါး/နဝလီ ဂိုဒေါင်တွင် လက်ကျန် မရှိပါ။</td></tr>}
                </tbody>
            </table>
        </div>

        {/* Drying Process */}
        <div className="bg-white rounded-2xl border border-red-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-red-50 border-b border-red-100 font-bold text-red-800 flex items-center">
                <Wind className="mr-2"/> အခြောက်ခံစက်ထဲ ရောက်နေသော စာရင်းများ
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50">
                {jobs.filter(j => j.status === 'drying').map(job => (
                    <div key={job.id} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm relative">
                        <h4 className="font-bold text-slate-800">{job.customer} <span className="text-xs text-slate-500 font-normal ml-2">{job.id}</span></h4>
                        <p className="text-sm font-bold text-red-600 mt-1 mb-3">{job.originalQty} တင်း ဝင်ထား</p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                            {job.dryingMachines?.map((dm, idx) => <span key={idx} className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-1 rounded border border-red-100">{dm.machine} ({dm.qty} တင်း)</span>)}
                        </div>

                        {activeJobId === job.id + '-finish' ? (
                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 block mb-1">အခြောက်ခံပြီး ကျန်ရှိမည့် တင်း</label>
                                    <input type="number" value={dryInput.qty} onChange={e=>setDryInput({...dryInput, qty: e.target.value})} className="w-full p-2 border-2 border-red-200 rounded outline-none focus:border-red-500 font-bold text-lg"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 block mb-1">သိုလှောင်မည့် နေရာအသစ်</label>
                                    <input type="text" list="paddyStorage" value={dryInput.storage} onChange={e=>setDryInput({...dryInput, storage: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none focus:border-red-500 font-bold text-sm"/>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={()=>setActiveJobId(null)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded font-bold text-sm">ပယ်ဖျက်</button>
                                    <button onClick={()=>handleDryingDone(job)} className="flex-1 bg-red-600 text-white py-2 rounded font-bold text-sm">အခြောက်ခံပြီးစီး</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={()=>{setActiveJobId(job.id + '-finish'); setDryInput({qty: job.originalQty, storage: ''});}} className="w-full bg-red-50 text-red-700 py-2.5 rounded-lg text-sm font-bold hover:bg-red-100 border border-red-200">အခြောက်ခံပြီးစီး (လျော့တင်းသွင်းမည်)</button>
                        )}
                    </div>
                ))}
                {jobs.filter(j => j.status === 'drying').length === 0 && <p className="text-slate-400 font-bold text-sm col-span-2 text-center py-4">အခြောက်ခံနေသော စာရင်းမရှိပါ။</p>}
            </div>
        </div>
      </div>
    );
  };

  const renderMillingView = () => {
    const handleMillDone = async (jobId) => {
      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'waiting_sort', millingData: millInput }).eq('id', jobId);
      setActiveJobId(null); setMillInput({ rice: '', broken12: '', broken234: '', bran: '' });
      setIsLoading(false);
    };
    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Tractor className="mr-3 text-purple-600"/> ကြိတ်ခွဲရေး ဌာန</h2>
        <div className="space-y-4">
          {jobs.filter(j => j.status === 'waiting_mill' && j.purpose === 'mill').map(job => (
            <div key={job.id} className="bg-white p-6 rounded-2xl border-l-4 border-l-purple-500 shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-black text-xl text-slate-800">{job.customer}</h3>
                  <div className="text-sm font-bold text-slate-500 mt-1">{job.id} • {job.paddyType} <span className="text-purple-600 ml-2">စပါး ({job.currentQty} တင်း)</span></div>
                </div>
                <div className="text-right">
                   <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold mb-2 inline-block">ကြိတ်ရန်အသင့်</span>
                   <div className="text-xs text-slate-500 font-medium"><MapPin size={12} className="inline mr-1"/>{job.storage}</div>
                </div>
              </div>
              
              {activeJobId === job.id ? (
                <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div><label className="text-xs font-bold text-slate-700 block mb-1">ဆန်အကြမ်း (အိတ်)</label><input type="number" value={millInput.rice} onChange={e=>setMillInput({...millInput, rice: e.target.value})} className="w-full p-2.5 border border-purple-300 rounded-lg outline-none font-bold text-lg"/></div>
                    <div><label className="text-xs font-bold text-blue-700 block mb-1">၁၂ ဆန်ကွဲ</label><input type="number" value={millInput.broken12} onChange={e=>setMillInput({...millInput, broken12: e.target.value})} className="w-full p-2.5 border border-blue-200 rounded-lg outline-none font-bold"/></div>
                    <div><label className="text-xs font-bold text-sky-700 block mb-1">၂၃၄ ဆန်ကွဲ</label><input type="number" value={millInput.broken234} onChange={e=>setMillInput({...millInput, broken234: e.target.value})} className="w-full p-2.5 border border-sky-200 rounded-lg outline-none font-bold"/></div>
                    <div><label className="text-xs font-bold text-amber-700 block mb-1">ဖွဲနု</label><input type="number" value={millInput.bran} onChange={e=>setMillInput({...millInput, bran: e.target.value})} className="w-full p-2.5 border border-amber-200 rounded-lg outline-none font-bold"/></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-5 py-2.5 bg-white border border-slate-300 rounded-lg font-bold text-sm">ပယ်ဖျက်</button>
                    <button disabled={isLoading} onClick={() => handleMillDone(job.id)} className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-bold text-sm shadow-md">ကြိတ်ခွဲမှု စာရင်းသွင်းမည်</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setActiveJobId(job.id)} className="w-full mt-2 bg-slate-50 text-purple-700 border border-purple-200 py-2.5 rounded-lg font-bold hover:bg-purple-100 text-sm">ကြိတ်ခွဲမှု ရလဒ်များ သွင်းမည်</button>
              )}
            </div>
          ))}
          {jobs.filter(j => j.status === 'waiting_mill' && j.purpose === 'mill').length === 0 && <div className="p-8 text-center bg-white rounded-2xl border border-slate-200"><p className="text-slate-400 font-bold">ကြိတ်ခွဲရန် စာရင်းမရှိပါ။</p></div>}
        </div>
      </div>
    );
  };

  const renderSortingView = () => {
    const handleSortDone = async (jobId) => {
      const labels = getSortingLabels(jobs.find(j=>j.id===jobId).paddyType);
      if (sortInput.out1 > 0 && !sortInput.storage1) return setDialogConfig({title:'Error', message:`${labels[0]} အတွက် ဂိုဒေါင်ရွေးပါ။`, onConfirm:()=>setDialogConfig(null)});
      if (sortInput.out2 > 0 && !sortInput.storage2) return setDialogConfig({title:'Error', message:`${labels[1]} အတွက် ဂိုဒေါင်ရွေးပါ။`, onConfirm:()=>setDialogConfig(null)});
      if (sortInput.out3 > 0 && !sortInput.storage3) return setDialogConfig({title:'Error', message:`${labels[2]} အတွက် ဂိုဒေါင်ရွေးပါ။`, onConfirm:()=>setDialogConfig(null)});

      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'ready_to_bill', sortingData: sortInput }).eq('id', jobId);
      setActiveJobId(null); setSortInput({ out1: '', storage1: '', out2: '', storage2: '', out3: '', storage3: '' });
      setIsLoading(false);
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><ScanLine className="mr-3 text-indigo-600"/> Color Sorting ဌာန</h2>
        <div className="space-y-4">
          {jobs.filter(j => j.status === 'waiting_sort').map(job => {
            const labels = getSortingLabels(job.paddyType);
            const isNawali = job.entryType === 'nawali';
            const rawBags = isNawali ? job.originalQty : (job.millingData?.rice || 0);

            return (
              <div key={job.id} className="bg-white p-6 rounded-2xl border-l-4 border-l-indigo-500 shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-xl text-slate-800">{job.customer}</h3>
                    <div className="text-sm font-bold text-slate-500 mt-1">{job.id} • {job.paddyType} {isNawali ? '(နဝလီ)' : ''}</div>
                    <div className="text-indigo-700 font-black mt-2 bg-indigo-50 inline-block px-3 py-1 rounded border border-indigo-100">Raw အဝင်: {rawBags} အိတ်</div>
                  </div>
                  <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold">Sort ရန်အသင့်</span>
                </div>
                
                {activeJobId === job.id ? (
                  <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white p-3 rounded-lg border border-indigo-200">
                        <label className="text-xs font-bold text-indigo-900 block mb-2">{labels[0]}</label>
                        <input type="number" value={sortInput.out1} onChange={e=>setSortInput({...sortInput, out1: e.target.value})} className="w-full p-2 border-2 border-indigo-300 rounded font-bold text-lg mb-2" placeholder="အိတ် အရေအတွက်"/>
                        <input type="text" list="riceStorage" value={sortInput.storage1} onChange={e=>setSortInput({...sortInput, storage1: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-xs font-bold" placeholder="ဂိုဒေါင်ရွေးပါ"/>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <label className="text-xs font-bold text-slate-700 block mb-2">{labels[1]}</label>
                        <input type="number" value={sortInput.out2} onChange={e=>setSortInput({...sortInput, out2: e.target.value})} className="w-full p-2 border border-slate-300 rounded font-bold mb-2" placeholder="အိတ် အရေအတွက်"/>
                        <input type="text" list="riceStorage" value={sortInput.storage2} onChange={e=>setSortInput({...sortInput, storage2: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-xs font-bold" placeholder="ဂိုဒေါင်ရွေးပါ"/>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-red-100">
                        <label className="text-xs font-bold text-red-700 block mb-2">{labels[2]}</label>
                        <input type="number" value={sortInput.out3} onChange={e=>setSortInput({...sortInput, out3: e.target.value})} className="w-full p-2 border border-red-200 rounded font-bold mb-2" placeholder="အိတ် အရေအတွက်"/>
                        <input type="text" list="riceStorage" value={sortInput.storage3} onChange={e=>setSortInput({...sortInput, storage3: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-xs font-bold" placeholder="ဂိုဒေါင်ရွေးပါ"/>
                      </div>
                    </div>
                    <datalist id="riceStorage">{RICE_STORAGE.map(s => <option key={s} value={s}/>)}</datalist>
                    
                    <div className="flex justify-end gap-2 mt-2">
                      <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-5 py-2.5 bg-white border border-slate-300 rounded-lg font-bold text-sm">ပယ်ဖျက်</button>
                      <button disabled={isLoading} onClick={() => handleSortDone(job.id)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md flex items-center"><CheckCircle size={16} className="mr-2"/> ဂိုဒေါင်သို့ ပို့မည်</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setActiveJobId(job.id)} className="w-full mt-2 bg-slate-50 text-indigo-700 border border-indigo-200 py-2.5 rounded-lg font-bold hover:bg-indigo-100 text-sm">Sorting ရလဒ် သွင်းမည်</button>
                )}
              </div>
            );
          })}
          {jobs.filter(j => j.status === 'waiting_sort').length === 0 && <div className="p-8 text-center bg-white rounded-2xl border border-slate-200"><p className="text-slate-400 font-bold">Sorting လုပ်ရန် မရှိပါ။</p></div>}
        </div>
      </div>
    );
  };

  const renderRiceWarehouseView = () => {
    const handleDeliverySubmit = async (job) => {
        const input = deliveryInputs[job.id] || {};
        if (!input.date || !input.carNo || !input.driver) {
             return setDialogConfig({title: 'Error', message: 'ရက်စွဲ၊ ကားနံပါတ် နှင့် ယာဉ်မောင်းအမည် အပြည့်အစုံထည့်ပါ။', onConfirm: ()=>setDialogConfig(null)});
        }
        
        const isDeliveringSomething = Number(input.out1Qty)>0 || Number(input.b12Qty)>0 || Number(input.b234Qty)>0 || Number(input.branQty)>0 || Number(input.out2Qty)>0 || Number(input.out3Qty)>0;
        if (!isDeliveringSomething) {
             return setDialogConfig({title: 'Error', message: 'ထုတ်ပေးမည့် ဆန်/ဖွဲနု အိတ်အရေအတွက် အနည်းဆုံး တစ်ခု ထည့်ပါ။', onConfirm: ()=>setDialogConfig(null)});
        }

        setIsLoading(true);
        const currentLogs = job.deliveryLogs || [];
        const newLog = {
            id: Date.now().toString(),
            date: input.date, carNo: input.carNo, driver: input.driver,
            out1Qty: Number(input.out1Qty||0), out2Qty: Number(input.out2Qty||0), out3Qty: Number(input.out3Qty||0),
            b12Qty: Number(input.b12Qty||0), b234Qty: Number(input.b234Qty||0), branQty: Number(input.branQty||0)
        };
        
        await supabase.from('jobs').update({ deliveryLogs: [...currentLogs, newLog] }).eq('id', job.id);
        
        setDeliveryInputs(prev => ({...prev, [job.id]: { date: getToday(), carNo: '', driver: '', out1Qty: '', out2Qty: '', out3Qty: '', b12Qty: '', b234Qty: '', branQty: '' }}));
        setActiveJobId(null);
        setIsLoading(false);
        setDialogConfig({title: 'အောင်မြင်ပါသည်', message: 'ဆန်ထုတ်ပေးမှု မှတ်တမ်းတင်ပြီးပါပြီ။', onConfirm: ()=>setDialogConfig(null)});
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Package className="mr-3 text-emerald-600"/> ဆန် နှင့် ထွက်ကုန် ဂိုဒေါင် (Delivery)</h2>
        
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                <tr><th className="p-4 font-bold">ဘောက်ချာ / ဖောက်သည်</th><th className="p-4 font-bold">ထုတ်ယူရန်ကျန်ရှိသည့် ထွက်ကုန်များ (Remaining)</th><th className="p-4 font-bold text-right">လုပ်ဆောင်ချက်</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
                {jobs.filter(j => j.status === 'ready_to_bill' || j.status === 'billed').map(job => {
                    const isDryOnly = job.purpose === 'dry_only';
                    if(isDryOnly) return null; // Rice warehouse doesn't show paddy

                    const logs = job.deliveryLogs || [];
                    const labels = getSortingLabels(job.paddyType);
                    
                    // Calculate totals delivered
                    const d_out1 = logs.reduce((s, l) => s + Number(l.out1Qty||0), 0);
                    const d_out2 = logs.reduce((s, l) => s + Number(l.out2Qty||0), 0);
                    const d_out3 = logs.reduce((s, l) => s + Number(l.out3Qty||0), 0);
                    const d_b12 = logs.reduce((s, l) => s + Number(l.b12Qty||0), 0);
                    const d_b234 = logs.reduce((s, l) => s + Number(l.b234Qty||0), 0);
                    const d_bran = logs.reduce((s, l) => s + Number(l.branQty||0), 0);

                    // Calculate remaining
                    const r_out1 = (job.sortingData?.out1 || 0) - d_out1;
                    const r_out2 = (job.sortingData?.out2 || 0) - d_out2;
                    const r_out3 = (job.sortingData?.out3 || 0) - d_out3;
                    const r_b12 = (job.millingData?.broken12 || 0) - d_b12;
                    const r_b234 = (job.millingData?.broken234 || 0) - d_b234;
                    const r_bran = (job.millingData?.bran || 0) - d_bran;

                    const hasRemaining = r_out1>0 || r_out2>0 || r_out3>0 || r_b12>0 || r_b234>0 || r_bran>0;

                    return (
                        <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 align-top w-1/4">
                                <div className="font-bold text-slate-800">{job.id}</div>
                                <div className="text-sm font-black text-slate-900 mt-1">{job.customer}</div>
                                <div className="text-xs text-slate-500 font-bold mt-1">{job.paddyType}</div>
                                {session?.role === 'admin' && <button onClick={()=>handleDelete(job.id)} className="text-xs text-red-500 font-bold mt-3 flex items-center"><Trash2 size={12} className="mr-1"/> ဖျက်မည်</button>}
                            </td>
                            <td className="p-4 align-top">
                                {hasRemaining ? (
                                    <div className="flex flex-wrap gap-3">
                                        {r_out1 > 0 && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">{labels[0]}: {r_out1} အိတ်</span>}
                                        {r_b12 > 0 && <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">၁၂ ဆန်ကွဲ: {r_b12} အိတ်</span>}
                                        {r_b234 > 0 && <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded border border-sky-200">၂၃၄ ဆန်ကွဲ: {r_b234} အိတ်</span>}
                                        
                                        {r_out2 > 0 && job.billData?.byproductOption !== 'sell' && <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-300">By-product: {r_out2} အိတ်</span>}
                                        {r_out3 > 0 && job.billData?.rejectOption !== 'sell' && <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">Reject: {r_out3} အိတ်</span>}
                                        {r_bran > 0 && job.billData?.branOption !== 'sell' && <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">ဖွဲနု: {r_bran} အိတ်</span>}
                                    </div>
                                ) : (
                                    <span className="text-xs font-bold text-slate-400">ထုတ်ရန် မရှိပါ / အားလုံးထုတ်ပြီး</span>
                                )}

                                {activeJobId === job.id && (
                                    <div className="mt-4 bg-white p-5 rounded-xl border-2 border-blue-200 shadow-xl relative z-10 w-full max-w-xl">
                                        <h4 className="font-bold text-blue-800 text-sm mb-4 border-b border-blue-100 pb-2">ဆန်ထုတ်ပေးမှု မှတ်တမ်းတင်ရန်</h4>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div><label className="text-xs font-bold text-slate-600 block mb-1">ရက်စွဲ</label><input type="date" value={deliveryInputs[job.id]?.date || getToday()} onChange={(e)=>setDeliveryInputs(prev=>({...prev, [job.id]: {...prev[job.id], date: e.target.value}}))} className="w-full p-2 border border-slate-300 rounded text-sm font-bold"/></div>
                                            <div><label className="text-xs font-bold text-slate-600 block mb-1">ကားနံပါတ်</label><input type="text" value={deliveryInputs[job.id]?.carNo || ''} onChange={(e)=>setDeliveryInputs(prev=>({...prev, [job.id]: {...prev[job.id], carNo: e.target.value}}))} className="w-full p-2 border border-slate-300 rounded text-sm font-bold" placeholder="YGN-1234"/></div>
                                            <div className="col-span-2"><label className="text-xs font-bold text-slate-600 block mb-1">လာထုတ်သူ / ယာဉ်မောင်းအမည်</label><input type="text" value={deliveryInputs[job.id]?.driver || ''} onChange={(e)=>setDeliveryInputs(prev=>({...prev, [job.id]: {...prev[job.id], driver: e.target.value}}))} className="w-full p-2 border border-slate-300 rounded text-sm font-bold" placeholder="အမည်"/></div>
                                        </div>

                                        <p className="text-xs font-bold text-blue-600 mb-2 mt-4 bg-blue-50 p-1.5 inline-block rounded">ယခုကားဖြင့် ထုတ်ပေးလိုက်သော အိတ်အရေအတွက်</p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                            {r_out1>0 && <div><label className="text-[10px] font-bold text-emerald-700 block mb-1">{labels[0]}</label><input type="number" placeholder={`Max: ${r_out1}`} value={deliveryInputs[job.id]?.out1Qty || ''} onChange={(e)=>setDeliveryInputs(prev=>({...prev, [job.id]: {...prev[job.id], out1Qty: e.target.value}}))} className="w-full p-2 border-2 border-emerald-200 rounded text-sm font-bold"/></div>}
                                            {r_b12>0 && <div><label className="text-[10px] font-bold text-blue-700 block mb-1">၁၂ ဆန်ကွဲ</label><input type="number" placeholder={`Max: ${r_b12}`} value={deliveryInputs[job.id]?.b12Qty || ''} onChange={(e)=>setDeliveryInputs(prev=>({...prev, [job.id]: {...prev[job.id], b12Qty: e.target.value}}))} className="w-full p-2 border-2 border-blue-200 rounded text-sm font-bold"/></div>}
                                            {r_b234>0 && <div><label className="text-[10px] font-bold text-sky-700 block mb-1">၂၃၄ ဆန်ကွဲ</label><input type="number" placeholder={`Max: ${r_b234}`} value={deliveryInputs[job.id]?.b234Qty || ''} onChange={(e)=>setDeliveryInputs(prev=>({...prev, [job.id]: {...prev[job.id], b234Qty: e.target.value}}))} className="w-full p-2 border-2 border-sky-200 rounded text-sm font-bold"/></div>}
                                            {r_out2>0 && job.billData?.byproductOption!=='sell' && <div><label className="text-[10px] font-bold text-slate-700 block mb-1">By-product</label><input type="number" placeholder={`Max: ${r_out2}`} value={deliveryInputs[job.id]?.out2Qty || ''} onChange={(e)=>setDeliveryInputs(prev=>({...prev, [job.id]: {...prev[job.id], out2Qty: e.target.value}}))} className="w-full p-2 border border-slate-300 rounded text-sm font-bold"/></div>}
                                            {r_out3>0 && job.billData?.rejectOption!=='sell' && <div><label className="text-[10px] font-bold text-red-700 block mb-1">Reject</label><input type="number" placeholder={`Max: ${r_out3}`} value={deliveryInputs[job.id]?.out3Qty || ''} onChange={(e)=>setDeliveryInputs(prev=>({...prev, [job.id]: {...prev[job.id], out3Qty: e.target.value}}))} className="w-full p-2 border border-slate-300 rounded text-sm font-bold"/></div>}
                                            {r_bran>0 && job.billData?.branOption!=='sell' && <div><label className="text-[10px] font-bold text-amber-700 block mb-1">ဖွဲနု</label><input type="number" placeholder={`Max: ${r_bran}`} value={deliveryInputs[job.id]?.branQty || ''} onChange={(e)=>setDeliveryInputs(prev=>({...prev, [job.id]: {...prev[job.id], branQty: e.target.value}}))} className="w-full p-2 border border-slate-300 rounded text-sm font-bold"/></div>}
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                            <button onClick={()=>setActiveJobId(null)} className="px-4 py-2 border rounded font-bold text-sm bg-slate-50">ပယ်ဖျက်</button>
                                            <button onClick={()=>handleDeliverySubmit(job)} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm shadow-md">အတည်ပြု မှတ်တမ်းတင်မည်</button>
                                        </div>
                                    </div>
                                )}
                            </td>
                            <td className="p-4 text-right align-top w-1/5">
                                {hasRemaining && activeJobId !== job.id && (
                                   <button onClick={()=>{
                                       setActiveJobId(job.id);
                                       if(!deliveryInputs[job.id]) setDeliveryInputs(prev=>({...prev, [job.id]: {date: getToday(), carNo:'', driver:'', out1Qty:'', out2Qty:'', out3Qty:'', b12Qty:'', b234Qty:'', branQty:''}}));
                                   }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center ml-auto"><Truck size={14} className="mr-1.5"/> ဆန်ထုတ်ပေးမည်</button>
                                )}
                            </td>
                        </tr>
                    )
                })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderInventoryView = () => {
    let totalPurchasedBran = 0; let totalPurchasedByproduct = 0; let totalPurchasedReject = 0;
    
    // Add amounts purchased from customers
    jobs.forEach(job => {
      if (job.status === 'billed' && job.billData) {
        if (job.billData.branOption === 'sell') totalPurchasedBran += Number(job.millingData?.bran || 0);
        if (job.billData.byproductOption === 'sell') totalPurchasedByproduct += Number(job.sortingData?.out2 || 0);
        if (job.billData.rejectOption === 'sell') totalPurchasedReject += Number(job.sortingData?.out3 || 0);
      }
    });

    // Add amounts from Opening Stock inputs (where ownerType is 'စက်ပိုင်')
    const openingStocks = jobs.filter(j => j.entryType === 'opening_stock' && j.ownerType === 'စက်ပိုင်');
    let osRice = 0; let osB12 = 0; let osB234 = 0;
    openingStocks.forEach(os => {
        const q = Number(os.originalQty||0);
        if(os.itemType === 'ဆန်အချော') osRice += q;
        if(os.itemType === '၁၂ ဆန်ကွဲ') osB12 += q;
        if(os.itemType === '၂၃၄ ဆန်ကွဲ') osB234 += q;
        if(os.itemType === 'ဖွဲနု') totalPurchasedBran += q;
        if(os.itemType === 'By-product (ဗိုက်ဖြူ/အကြမ်း)') totalPurchasedByproduct += q;
        if(os.itemType === 'Reject (အမည်း)') totalPurchasedReject += q;
    });

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><PackageCheck className="mr-3 text-slate-700"/> စက်ပိုင် ဆန်/ဖွဲနု စာရင်း</h2>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
           <h3 className="text-sm font-black mb-6 text-slate-800 uppercase tracking-widest flex items-center border-b border-slate-100 pb-3"><ArrowDownToLine size={18} className="mr-2"/> စက်မှ ဝယ်ယူထားသော / စက်ပိုင် လက်ကျန်များ</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
                 <p className="text-slate-600 text-xs font-bold mb-2">ဆန်အချော</p>
                 <div className="text-3xl font-black text-slate-900">{osRice} <span className="text-sm font-medium text-slate-500">အိတ်</span></div>
              </div>
              <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
                 <p className="text-slate-600 text-xs font-bold mb-2">၁၂ ဆန်ကွဲ</p>
                 <div className="text-3xl font-black text-slate-900">{osB12} <span className="text-sm font-medium text-slate-500">အိတ်</span></div>
              </div>
              <div className="border border-slate-200 p-5 rounded-xl bg-slate-50">
                 <p className="text-slate-600 text-xs font-bold mb-2">၂၃၄ ဆန်ကွဲ</p>
                 <div className="text-3xl font-black text-slate-900">{osB234} <span className="text-sm font-medium text-slate-500">အိတ်</span></div>
              </div>
              <div className="border border-blue-200 p-5 rounded-xl bg-blue-50/50">
                 <p className="text-blue-800 text-xs font-bold mb-2">ဖွဲနု စုစုပေါင်း</p>
                 <div className="text-3xl font-black text-blue-600">{totalPurchasedBran} <span className="text-sm font-medium text-blue-400">အိတ်</span></div>
              </div>
              <div className="border border-amber-200 p-5 rounded-xl bg-amber-50/50">
                 <p className="text-amber-800 text-xs font-bold mb-2">ဗိုက်ဖြူ (BY-PRODUCT)</p>
                 <div className="text-3xl font-black text-amber-600">{totalPurchasedByproduct} <span className="text-sm font-medium text-amber-400">အိတ်</span></div>
              </div>
              <div className="border border-red-200 p-5 rounded-xl bg-red-50/50">
                 <p className="text-red-800 text-xs font-bold mb-2">REJECT ဆန်အမည်း</p>
                 <div className="text-3xl font-black text-red-600">{totalPurchasedReject} <span className="text-sm font-medium text-red-400">အိတ်</span></div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderOpeningStockView = () => {
      const handleAddStock = async (e) => {
          e.preventDefault();
          if(!openingStockInput.qty || !openingStockInput.itemType) return;
          setIsLoading(true);
          const newId = `OS-${Date.now().toString().slice(-6)}`;
          
          const jobData = {
              id: newId, 
              entryType: 'opening_stock', 
              ownerType: openingStockInput.ownerType,
              customer: openingStockInput.ownerType === 'စက်ပိုင်' ? 'စက်ပိုင်' : openingStockInput.customerName,
              itemType: openingStockInput.itemType,
              paddyType: openingStockInput.itemType === 'စပါး' ? 'မသတ်မှတ်' : openingStockInput.itemType,
              originalQty: Number(openingStockInput.qty), 
              currentQty: Number(openingStockInput.qty),
              storage: openingStockInput.storage || '-',
              status: openingStockInput.itemType === 'စပါး' ? 'waiting_dry' : 'ready_to_bill',
              date: getToday(),
              deliveryLogs: []
          };
          
          // Inject straight into sortingData to mimic finished goods for non-paddy items
          if (jobData.itemType !== 'စပါး') {
             jobData.sortingData = { out1: jobData.itemType === 'ဆန်အချော' ? jobData.currentQty : 0, storage1: jobData.storage };
             jobData.millingData = { 
                 broken12: jobData.itemType === '၁၂ ဆန်ကွဲ' ? jobData.currentQty : 0,
                 broken234: jobData.itemType === '၂၃၄ ဆန်ကွဲ' ? jobData.currentQty : 0,
                 bran: jobData.itemType === 'ဖွဲနု' ? jobData.currentQty : 0
             };
          }

          const { error } = await supabase.from('jobs').insert([jobData]);
          if(error) {
              setDialogConfig({title:'Error', message:error.message, onConfirm:()=>setDialogConfig(null)});
          } else {
              setDialogConfig({title:'အောင်မြင်ပါသည်', message:'လက်ကျန်စာရင်း သွင်းပြီးပါပြီ', onConfirm:()=>setDialogConfig(null)});
              setOpeningStockInput({...openingStockInput, qty: '', storage: ''});
          }
          setIsLoading(false);
      };

      return (
          <div className="animate-in fade-in duration-300">
             <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><FileSpreadsheet className="mr-3 text-slate-700"/> လက်ကျန်စာရင်း (Opening Stock) ထည့်ရန်</h2>
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-3xl">
                 <form onSubmit={handleAddStock}>
                     <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200 w-full max-w-sm">
                        <button type="button" onClick={() => setOpeningStockInput({...openingStockInput, ownerType: 'စက်ပိုင်'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${openingStockInput.ownerType === 'စက်ပိုင်' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>စက်ပိုင် ပစ္စည်း</button>
                        <button type="button" onClick={() => setOpeningStockInput({...openingStockInput, ownerType: 'ကုန်သည်ပိုင်'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${openingStockInput.ownerType === 'ကုန်သည်ပိုင်' ? 'bg-white text-amber-700 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>ကုန်သည်ပိုင် (အပ်နှံ)</button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">အမျိုးအစား ရွေးပါ</label>
                            <select value={openingStockInput.itemType} onChange={e=>setOpeningStockInput({...openingStockInput, itemType: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800">
                               <option value="စပါး">စပါး</option>
                               <option value="ဆန်အချော">ဆန်အချော</option>
                               <option value="၁၂ ဆန်ကွဲ">၁၂ ဆန်ကွဲ</option>
                               <option value="၂၃၄ ဆန်ကွဲ">၂၃၄ ဆန်ကွဲ</option>
                               <option value="ဖွဲနု">ဖွဲနု</option>
                               <option value="By-product (ဗိုက်ဖြူ/အကြမ်း)">By-product (ဗိုက်ဖြူ/အကြမ်း)</option>
                               <option value="Reject (အမည်း)">Reject (အမည်း)</option>
                            </select>
                        </div>
                        {openingStockInput.ownerType === 'ကုန်သည်ပိုင်' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2">စပါး/ဆန် အမည် သို့ ဖောက်သည်အမည်</label>
                                <input type="text" value={openingStockInput.customerName} onChange={e=>setOpeningStockInput({...openingStockInput, customerName: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800" placeholder="ဥပမာ - ပေါ်ဆန်း" required/>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">အရေအတွက် (တင်း/အိတ်)</label>
                            <input type="number" value={openingStockInput.qty} onChange={e=>setOpeningStockInput({...openingStockInput, qty: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800" required min="1"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2">ဂိုဒေါင် / နေရာ</label>
                            <input type="text" value={openingStockInput.storage} onChange={e=>setOpeningStockInput({...openingStockInput, storage: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800" placeholder="နေရာ"/>
                        </div>
                     </div>
                     <div className="text-center pt-4">
                        <button disabled={isLoading} type="submit" className="bg-blue-600 text-white px-10 py-3.5 rounded-full font-bold shadow-lg hover:bg-blue-700 transition-colors flex items-center mx-auto">
                            {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> : <CheckCircle size={18} className="mr-2"/>} လုပ်ဆောင်နေသည်...
                        </button>
                     </div>
                 </form>
             </div>
          </div>
      )
  }

  const renderAdminView = () => {
    const handleBillSubmit = async (job, totalServiceFee, dryingFee, deduction, net, pd, bal) => {
      setIsLoading(true);
      await supabase.from('jobs').update({ 
        status: 'billed', 
        billData: { ...billInput, totalServiceFee, dryingFee, deduction, netTotal: net, paid: pd, balance: bal, billDate: getToday() } 
      }).eq('id', job.id);

      setActiveJobId(null);
      setBillInput({ dryingRate: '', sortingRate: '', millingRate: '', branOption: 'take', branRate: '', byproductOption: 'take', byproductRate: '', rejectOption: 'take', rejectRate: '', otherExp: '', paidAmount: '' });
      setIsLoading(false);
      setDialogConfig({title: 'အောင်မြင်ပါသည်', message:'ငွေစာရင်းသိမ်းဆည်းပြီးပါပြီ။', onConfirm: ()=>setDialogConfig(null)});
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
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {searchedJobs.map(job => {
            const labels = getSortingLabels(job.paddyType);
            const isNawali = job.entryType === 'nawali';
            const isDryOnly = job.purpose === 'dry_only';
            
            const dryingFee = job.wasWet ? (Number(job.originalQty) * (Number(billInput.dryingRate) || 0)) : 0;
            let totalServiceFee = 0; let totalMilledBags = 0;

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

            return (
              <div key={job.id} className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                <div style={{backgroundColor: '#0f172a', padding: '24px'}} className="flex justify-between items-center relative overflow-hidden shrink-0">
                  <div className="relative z-10">
                    <h3 style={{color: '#ffffff', fontSize: '24px', fontWeight: '900', margin: '0 0 4px 0'}}>{job.customer}</h3>
                    <p style={{color: '#94a3b8', fontSize: '14px', fontWeight: 'bold', margin: 0}}>ID: {job.id} | {job.paddyType} | {job.date}</p>
                  </div>
                  <span style={{backgroundColor: '#2563eb', color: '#ffffff', padding: '6px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 'bold'}} className="relative z-10 shadow-md">ငွေရှင်းရန်</span>
                </div>

                {activeJobId === job.id ? (
                  <div className="p-6 flex-1 flex flex-col bg-slate-50/50">
                    <div className="space-y-4 mb-6 text-slate-900">
                      {job.wasWet && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <label className="block text-xs font-bold text-slate-800 mb-2">အခြောက်ခံခ နှုန်းထား (၁ တင်းလျှင်)</label>
                          <input type="number" value={billInput.dryingRate} onChange={e=>setBillInput({...billInput, dryingRate: e.target.value})} className="w-full p-2.5 border-2 border-slate-200 bg-slate-50 rounded-lg outline-none focus:border-blue-500 font-bold" placeholder="ကျပ်"/>
                        </div>
                      )}

                      {!isDryOnly && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <label className="block text-xs font-bold text-slate-800 mb-2">{isNawali ? 'နဝလီ Sorting နှုန်းထား (၁ အိတ်)' : 'စက်ကြိတ်ခ နှုန်းထား (၁ အိတ်)'}</label>
                          <input type="number" value={isNawali ? billInput.sortingRate : billInput.millingRate} onChange={e=> isNawali ? setBillInput({...billInput, sortingRate: e.target.value}) : setBillInput({...billInput, millingRate: e.target.value})} className="w-full p-2.5 border-2 border-slate-200 bg-slate-50 rounded-lg outline-none focus:border-blue-500 font-bold" placeholder="ကျပ်"/>
                        </div>
                      )}
                      
                      {!isDryOnly && (branQty > 0 || byproductQty > 0 || rejectQty > 0) && (
                        <div className="p-4 rounded-xl border-2 border-slate-800" style={{backgroundColor: '#ffffff'}}>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">စက်သို့ ပြန်ရောင်း၍ ခုနှိမ်ခြင်း (Deductions)</h4>
                          
                          {!isNawali && branQty > 0 && (
                            <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                              <label className="block text-xs font-black text-slate-900 mb-2">ဖွဲနု ({branQty} အိတ်)</label>
                              <div className="flex gap-4 mb-2">
                                <label className="text-xs font-bold text-slate-700 flex items-center cursor-pointer"><input type="radio" value="take" checked={billInput.branOption === 'take'} onChange={e=>setBillInput({...billInput, branOption: e.target.value})} className="mr-2"/> ပြန်ယူမည်</label>
                                <label className="text-xs font-bold text-blue-700 flex items-center cursor-pointer"><input type="radio" value="sell" checked={billInput.branOption === 'sell'} onChange={e=>setBillInput({...billInput, branOption: e.target.value})} className="mr-2"/> စက်သို့ ရောင်းမည်</label>
                              </div>
                              {billInput.branOption === 'sell' && <input type="number" value={billInput.branRate} onChange={e=>setBillInput({...billInput, branRate: e.target.value})} className="w-full p-2 border-2 border-slate-300 rounded font-bold text-sm" placeholder="ဝယ်ယူမည့် နှုန်း (၁ အိတ်)"/>}
                            </div>
                          )}

                          {byproductQty > 0 && (
                            <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                              <label className="block text-xs font-black text-slate-900 mb-2">{labels[1]} ({byproductQty} အိတ်)</label>
                              <div className="flex gap-4 mb-2">
                                <label className="text-xs font-bold text-slate-700 flex items-center cursor-pointer"><input type="radio" value="take" checked={billInput.byproductOption === 'take'} onChange={e=>setBillInput({...billInput, byproductOption: e.target.value})} className="mr-2"/> ပြန်ယူမည်</label>
                                <label className="text-xs font-bold text-blue-700 flex items-center cursor-pointer"><input type="radio" value="sell" checked={billInput.byproductOption === 'sell'} onChange={e=>setBillInput({...billInput, byproductOption: e.target.value})} className="mr-2"/> စက်သို့ ရောင်းမည်</label>
                              </div>
                              {billInput.byproductOption === 'sell' && <input type="number" value={billInput.byproductRate} onChange={e=>setBillInput({...billInput, byproductRate: e.target.value})} className="w-full p-2 border-2 border-slate-300 rounded font-bold text-sm" placeholder="ဝယ်ယူမည့် နှုန်း (၁ အိတ်)"/>}
                            </div>
                          )}

                          {rejectQty > 0 && (
                            <div className="mb-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                              <label className="block text-xs font-black text-slate-900 mb-2">{labels[2]} ({rejectQty} အိတ်)</label>
                              <div className="flex gap-4 mb-2">
                                <label className="text-xs font-bold text-slate-700 flex items-center cursor-pointer"><input type="radio" value="take" checked={billInput.rejectOption === 'take'} onChange={e=>setBillInput({...billInput, rejectOption: e.target.value})} className="mr-2"/> ပြန်ယူမည်</label>
                                <label className="text-xs font-bold text-blue-700 flex items-center cursor-pointer"><input type="radio" value="sell" checked={billInput.rejectOption === 'sell'} onChange={e=>setBillInput({...billInput, rejectOption: e.target.value})} className="mr-2"/> စက်သို့ ရောင်းမည်</label>
                              </div>
                              {billInput.rejectOption === 'sell' && <input type="number" value={billInput.rejectRate} onChange={e=>setBillInput({...billInput, rejectRate: e.target.value})} className="w-full p-2 border-2 border-slate-300 rounded font-bold text-sm" placeholder="ဝယ်ယူမည့် နှုန်း (၁ အိတ်)"/>}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-800 mb-2">အခြားစရိတ် (ကူလီ/ကားခ)</label>
                        <input type="number" value={billInput.otherExp} onChange={e=>setBillInput({...billInput, otherExp: e.target.value})} className="w-full p-2.5 border-2 border-slate-200 bg-slate-50 rounded-lg outline-none font-bold" placeholder="0"/>
                      </div>
                    </div>

                    <div className="mt-auto bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{isRefund ? 'စက်မှ ပြန်အမ်းရမည့်ငွေ' : 'ကျသင့်ငွေ (Net Total)'}</span>
                        <span className={`text-2xl font-black ${isRefund ? 'text-emerald-600' : 'text-slate-800'}`}>{Math.abs(netTotal).toLocaleString()} Ks</span>
                      </div>
                      {Math.abs(netTotal) > 0 && (
                        <div>
                          <label className="block text-xs font-bold mb-2 uppercase tracking-wide text-blue-800">{isRefund ? 'စက်မှ ပေးသည့်ငွေ' : 'ဖောက်သည် ပေးချေငွေ (Paid Amount)'}</label>
                          <input type="number" value={billInput.paidAmount} onChange={e=>setBillInput({...billInput, paidAmount: e.target.value})} className="w-full p-3 border-2 border-blue-200 rounded-lg outline-none focus:border-blue-500 font-bold text-lg" placeholder="0"/>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button onClick={() => setActiveJobId(null)} className="px-5 py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl text-sm">ပယ်ဖျက်</button>
                      <button onClick={() => handleBillSubmit(job, totalServiceFee, dryingFee, totalDeduction, netTotal, paid, balance)} className="flex-1 bg-blue-600 text-white font-bold rounded-xl shadow-md text-sm">ဘေလ်သိမ်းပြီး ငွေရှင်းမည်</button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 flex-1 flex items-center justify-center bg-slate-50/50">
                    <button onClick={() => setActiveJobId(job.id)} className="bg-white text-blue-600 font-bold py-3 px-6 rounded-xl border-2 border-blue-200 shadow-sm flex items-center"><Calculator size={18} className="mr-2"/> ဘေလ်တွက်ချက်ရန်</button>
                  </div>
                )}
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
      if(!customerStats[job.customer]) customerStats[job.customer] = { name: job.customer, totalPaddy: 0, totalRice: 0, totalDebt: 0, totalPayable: 0, history: [] };
      const stat = customerStats[job.customer];
      
      if (job.entryType === 'paddy' && job.status !== 'payment') stat.totalPaddy += Number(job.originalQty||0);
      if (job.status === 'ready_to_bill' || job.status === 'billed') {
        if (job.purpose !== 'dry_only') stat.totalRice += Number(job.sortingData?.out1 || 0);
      }
      
      if (job.status === 'billed' && job.billData) {
         const bal = Number(job.billData.balance || 0);
         if(bal > 0) stat.totalDebt += bal;
         if(bal < 0) stat.totalPayable += Math.abs(bal);
      }
      if (job.status === 'payment') {
         if(job.amount > 0) stat.totalDebt -= job.amount;
         else stat.totalPayable -= Math.abs(job.amount);
      }
      stat.history.push(job);
    });

    const handlePaymentSubmit = async (e) => {
      e.preventDefault();
      const amt = Number(paymentAmount);
      if(amt <= 0) return;
      setIsLoading(true);

      const newJob = { id: `PAY-${Date.now().toString().slice(-6)}`, customer: paymentModal.customer, status: 'payment', amount: paymentModal.type === 'receive' ? amt : -amt, date: getToday(), deliveryLogs:[] };
      await supabase.from('jobs').insert([newJob]);
      
      setPaymentModal(null); setPaymentAmount(''); setIsLoading(false);
      setDialogConfig({title: 'အောင်မြင်ပါသည်', message: 'ငွေစာရင်း မှတ်တမ်းတင်ပြီးပါပြီ။', onConfirm: ()=>setDialogConfig(null)});
    };

    const filteredCustomers = Object.values(customerStats).filter(c => c.name.toLowerCase().includes(ledgerSearchQuery.toLowerCase()));

    return (
      <div className="animate-in fade-in duration-300 relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center"><Users className="mr-3 text-blue-600"/> ဖောက်သည် မှတ်တမ်း / အကြွေးစာရင်း</h2>
          <div className="relative w-72">
            <input type="text" placeholder="အမည်ဖြင့် ရှာရန်..." value={ledgerSearchQuery} onChange={e=>setLedgerSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"/>
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          </div>
        </div>

        <div className="space-y-4">
          {filteredCustomers.map(cust => (
            <div key={cust.name} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 p-5 flex justify-between items-center border-b border-slate-100">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setExpandedCustomer(expandedCustomer === cust.name ? null : cust.name)}>
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">{cust.name.charAt(0)}</div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">{cust.name}</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">လုပ်ငန်းစဉ်: {cust.history.length} ကြိမ်</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {cust.totalDebt > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-rose-500 uppercase">ဖောက်သည် အကြွေး</p>
                        <p className="font-black text-lg text-rose-600">{cust.totalDebt.toLocaleString()} <span className="text-xs font-normal">Ks</span></p>
                      </div>
                      <button onClick={() => setPaymentModal({customer: cust.name, type: 'receive', debt: cust.totalDebt})} className="bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-lg">ကြွေးဆပ်မည်</button>
                    </div>
                  )}
                  {cust.totalPayable > 0 && (
                    <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-200">
                       <div className="text-right">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">စက်မှ ပေးရန်ကျန်ငွေ</p>
                        <p className="font-black text-lg text-emerald-700">{cust.totalPayable.toLocaleString()} <span className="text-xs font-normal">Ks</span></p>
                      </div>
                      <button onClick={() => setPaymentModal({customer: cust.name, type: 'pay', debt: cust.totalPayable})} className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg">ငွေရှင်းပေးမည်</button>
                    </div>
                  )}
                  <div className="cursor-pointer p-2 ml-2" onClick={() => setExpandedCustomer(expandedCustomer === cust.name ? null : cust.name)}>
                     {expandedCustomer === cust.name ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                  </div>
                </div>
              </div>

              {expandedCustomer === cust.name && (
                <div className="p-4 border-t border-slate-200 bg-white">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">စုစုပေါင်း စပါးအဝင်</p>
                        <p className="font-black text-xl text-slate-800">{cust.totalPaddy} တင်း</p>
                     </div>
                     <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">ထုတ်ယူပြီး ဆန်အချော</p>
                        <p className="font-black text-xl text-blue-800">{cust.totalRice} အိတ်</p>
                     </div>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr><th className="p-3 font-bold">ရက်စွဲ/ID</th><th className="p-3 font-bold">အမျိုးအစား</th><th className="p-3 font-bold text-right">ကျသင့်ငွေ/ပေးချေငွေ</th><th className="p-3 font-bold text-right">အကြွေး / ပေးရန်ကျန်</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cust.history.map(h => (
                          <tr key={h.id}>
                            <td className="p-3"><div className="font-bold">{h.date}</div><div className="text-xs text-slate-500">{h.id}</div></td>
                            <td className="p-3">{h.status === 'payment' ? <span className="text-emerald-600 font-bold">ငွေပေးချေမှု</span> : <span className="font-bold">{h.paddyType}</span>}</td>
                            <td className="p-3 text-right font-black">
                               {h.status === 'payment' ? <span className="text-emerald-600">{Math.abs(h.amount).toLocaleString()}</span> : h.billData?.netTotal ? h.billData.netTotal.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-right font-black text-rose-500">
                                {h.status !== 'payment' && h.billData?.balance !== undefined ? h.billData.balance.toLocaleString() : '-'}
                                {session?.role==='admin' && <button onClick={()=>handleDelete(h.id)} className="ml-3 text-red-500"><Trash2 size={14} className="inline"/></button>}
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
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-[260px] bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 shrink-0">
        <div className="p-6 bg-blue-600 flex items-center gap-3 shadow-md shrink-0">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-700 font-black text-xl shadow-inner">စက်</div>
          <div>
            <h1 className="font-black text-xl text-white tracking-tight leading-tight">Mill ERP</h1>
            <p className="text-[10px] text-blue-200 font-bold tracking-widest uppercase">ROLE: {session.role}</p>
          </div>
        </div>
        
        <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {[
            { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'paddy', 'rice'] },
            { id: 'gate', name: 'စပါးအဝင်/ဂိတ်', icon: Home, roles: ['admin', 'paddy'] },
            { id: 'paddy_wh', name: 'စပါး/နဝလီ ဂိုဒေါင်', icon: Warehouse, roles: ['admin', 'paddy'] },
            { id: 'milling', name: 'ကြိတ်ခွဲရေး ဌာန', icon: Tractor, roles: ['admin', 'rice'] },
            { id: 'sorting', name: 'Color Sorting', icon: ScanLine, roles: ['admin', 'rice'] },
            { id: 'rice_wh', name: 'ဆန်/ထွက်ကုန် ဂိုဒေါင်', icon: Package, roles: ['admin', 'rice'] },
            { id: 'inventory', name: 'စက်ပိုင် ဆန်စာရင်း', icon: PackageCheck, roles: ['admin'] },
            { id: 'pos', name: 'ငွေစာရင်း (POS)', icon: Calculator, roles: ['admin'] },
            { id: 'customers', name: 'ဖောက်သည် အကြွေး', icon: Users, roles: ['admin'] },
            { id: 'opening', name: 'လက်ကျန်စာရင်း (Opening)', icon: FileSpreadsheet, roles: ['admin', 'paddy', 'rice'] }
          ].filter(m => m.roles.includes(session.role)).map(menu => (
            <button key={menu.id} onClick={() => setActiveView(menu.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeView === menu.id ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}>
              <menu.icon size={18} className={activeView === menu.id ? 'text-blue-600' : 'text-slate-400'}/> {menu.name}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-100 shrink-0 bg-slate-50">
           <button onClick={() => setSession(null)} className="flex items-center text-red-500 font-bold hover:text-red-700 transition-colors text-sm"><LogOut size={16} className="mr-2"/> အကောင့်မှ ထွက်မည်</button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-6xl mx-auto pb-20">
          {activeView === 'dashboard' && renderDashboard()}
          {activeView === 'gate' && renderGateView()}
          {activeView === 'paddy_wh' && renderPaddyWarehouseView()}
          {activeView === 'milling' && renderMillingView()}
          {activeView === 'sorting' && renderSortingView()}
          {activeView === 'rice_wh' && renderRiceWarehouseView()}
          {activeView === 'inventory' && renderInventoryView()}
          {activeView === 'pos' && renderAdminView()}
          {activeView === 'customers' && renderCustomerLedgerView()}
          {activeView === 'opening' && renderOpeningStockView()}
        </div>
      </div>

      {/* --- Global Custom Modals (Top Z-Index to prevent freeze) --- */}
      {dialogConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
             <div className={`p-6 text-center border-b ${dialogConfig.isDanger ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${dialogConfig.isDanger ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                   <AlertCircle size={32}/>
                </div>
                <h3 className="font-black text-xl text-slate-800 mb-2">{dialogConfig.title}</h3>
                <p className="text-sm font-bold text-slate-600">{dialogConfig.message}</p>
             </div>
             <div className="p-4 flex gap-3 bg-slate-50">
                {dialogConfig.onCancel && <button onClick={dialogConfig.onCancel} className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl text-sm">မလုပ်တော့ပါ</button>}
                <button onClick={dialogConfig.onConfirm} className={`flex-1 py-3 text-white font-bold rounded-xl text-sm shadow-md ${dialogConfig.isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{dialogConfig.confirmText || 'အိုကေ'}</button>
             </div>
          </div>
        </div>
      )}

      {paymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className={`px-6 py-5 border-b flex justify-between items-center ${paymentModal.type === 'receive' ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <div>
                <h3 className={`font-black text-lg ${paymentModal.type === 'receive' ? 'text-rose-800' : 'text-emerald-800'}`}>{paymentModal.customer}</h3>
                <p className={`text-xs font-bold ${paymentModal.type === 'receive' ? 'text-rose-600' : 'text-emerald-600'}`}>{paymentModal.type === 'receive' ? 'အကြွေးလာဆပ်ခြင်း' : 'စက်မှငွေရှင်းပေးခြင်း'}</p>
              </div>
              <button onClick={() => setPaymentModal(null)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 shadow-sm"><X size={20}/></button>
            </div>
            <div className="p-6">
              <div className="mb-6 text-center">
                <p className="text-sm font-bold text-slate-500 mb-1">{paymentModal.type === 'receive' ? 'လက်ရှိ အကြွေးကျန်ငွေ' : 'လက်ရှိ ပေးရန်ကျန်ငွေ'}</p>
                <p className={`text-3xl font-black ${paymentModal.type === 'receive' ? 'text-rose-600' : 'text-emerald-600'}`}>{paymentModal.debt.toLocaleString()} <span className="text-lg font-medium">Ks</span></p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ပေးချေမည့် ငွေပမာဏ (ကျပ်)</label>
                <input type="number" autoFocus value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} className="w-full p-4 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-500 text-xl font-bold text-center" placeholder="0" min="1"/>
              </div>
              <button onClick={e => {
                  e.preventDefault();
                  if(Number(paymentAmount)>0) {
                      setDialogConfig({
                          title: 'အတည်ပြုမည်', message: `${paymentAmount} ကျပ် စာရင်းသွင်းမှာ သေချာပါသလား?`, 
                          onConfirm: async () => {
                              setDialogConfig(null);
                              // Trigger original handlePaymentSubmit logic inside component scope
                              const newJob = { id: `PAY-${Date.now().toString().slice(-6)}`, customer: paymentModal.customer, status: 'payment', amount: paymentModal.type === 'receive' ? Number(paymentAmount) : -Number(paymentAmount), date: getToday(), deliveryLogs:[] };
                              await supabase.from('jobs').insert([newJob]);
                              setPaymentModal(null); setPaymentAmount(''); fetchData();
                          },
                          onCancel: () => setDialogConfig(null)
                      })
                  }
              }} className={`w-full mt-6 py-4 rounded-xl text-white font-bold text-lg shadow-lg ${paymentModal.type === 'receive' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                အတည်ပြု မှတ်တမ်းတင်မည်
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

render(<MillERP />, document.getElementById('root'));
