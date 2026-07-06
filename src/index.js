import React, { useState, useEffect } from 'react';
import { render } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Home, Tractor, ScanLine, Package, Calculator, Users, Plus, ArrowRight, CheckCircle, Droplets, Wind,
  Receipt, User, Search, ChevronDown, ChevronUp, X, MapPin, Factory, ArrowUpRight, ArrowDownToLine, Trash2, Edit3,
  LayoutDashboard, Truck, ClipboardList, AlertCircle
} from 'lucide-react';

// ==========================================
// မဖြစ်မနေ ပြင်ဆင်ရန် (Supabase API Keys)
// ==========================================
const supabaseUrl = 'https://jgerimrkigxtphjcrafq.supabase.co';
const supabaseKey = 'sb_publishable_2jhGRP_tFpR9xuPgJEBBxA_2_HRJTUG';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function MillERP() {
  const [isConfigured, setIsConfigured] = useState(supabaseUrl !== 'YOUR_SUPABASE_URL');
  
  // Login & Roles
  const [userRole, setUserRole] = useState(null); // 'admin', 'paddy_manager', 'rice_manager'
  const [pinInput, setPinInput] = useState('');

  // UI State
  const [activeView, setActiveView] = useState('dashboard'); 
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog (Modal) State (Fixing Freeze Error with z-index and explicit close)
  const [alertConfig, setAlertConfig] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  const getToday = () => new Date().toISOString().split('T')[0];

  const PADDY_STORAGE = ["A (စပါး)", "B (စပါး)", "C (စပါး)", "Suncue အနီး", "Flat ရှေ့", "ဂိုဒေါင်သစ်"];
  const RICE_STORAGE = ["A1 (ဆန်ချော)", "B1 (ဆန်ချော)", "CS ကွင်းသစ်", "ဂိုဒေါင် အဟောင်း", "စကွဲ/ဖွဲ ဂိုဒေါင်"];
  const DRYING_MACHINES = ["Suncue 1", "Suncue 2", "Flat 1", "Flat 2", "Flat 3"];

  // Database State
  const [jobs, setJobs] = useState([]);
  const [customerRemarks, setCustomerRemarks] = useState({});

  // View Specific States
  const [newJob, setNewJob] = useState({ 
    entryType: 'paddy', purpose: 'mill', customer: '', paddyType: '', qty: '', moisture: 'အစို', storage: '', date: getToday() 
  });
  const [activeJobId, setActiveJobId] = useState(null);
  
  // Drying States
  const [dryingAllocations, setDryingAllocations] = useState([{ machine: '', qty: '' }]);
  const [dryQtyInput, setDryQtyInput] = useState('');
  const [dryStorageInput, setDryStorageInput] = useState('');
  
  // Mill & Sort States
  const [millInput, setMillInput] = useState({ rice: '', broken12: '', broken234: '', bran: '' });
  const [sortInput, setSortInput] = useState({ 
    out1: '', storage1: '', out2: '', storage2: '', out3: '', storage3: '' 
  });

  // Billing States
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [billInput, setBillInput] = useState({ 
    dryingRate: '', sortingRate: '', millingRate: '', 
    branOption: 'take', branRate: '', byproductOption: 'take', byproductRate: '', rejectOption: 'take', rejectRate: '', 
    otherExp: '', paidAmount: '' 
  });

  // Delivery State
  const [deliveryModal, setDeliveryModal] = useState(null);
  const [deliveryInput, setDeliveryInput] = useState({
    date: getToday(), carNo: '', driverName: '', out1Qty: '', out2Qty: '', out3Qty: '', branQty: ''
  });

  // Payment State
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Opening Stock State
  const [openingStock, setOpeningStock] = useState({
    type: 'mill', 
    itemType: 'paddy',
    customer: 'စက်ပိုင်',
    paddyType: '',
    qty: '',
    storage: '',
    date: getToday()
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
    try {
        const { data: jobsData, error } = await supabase.from('jobs').select('*').order('date', { ascending: false });
        if (!error && jobsData) setJobs(jobsData);
        fetchRemarks();
    } catch (e) {
        console.error(e);
    }
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

  const showMessage = (msg, type = 'info') => setAlertConfig({ message: msg, type });
  const showConfirm = (msg, onConfirm) => setConfirmConfig({ message: msg, onConfirm });

  const handleDeleteJob = async (id) => {
    setIsLoading(true);
    try {
        const { error } = await supabase.from('jobs').delete().eq('id', id);
        if (error) throw error;
        setJobs(prev => prev.filter(j => j.id !== id));
        showMessage("စာရင်း ဖျက်သိမ်းပြီးပါပြီ။", "success");
    } catch (err) {
        showMessage(err.message, "error");
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === '9999') setUserRole('admin');
    else if (pinInput === '1111') setUserRole('paddy_manager');
    else if (pinInput === '2222') setUserRole('rice_manager');
    else showMessage("စကားဝှက် မှားယွင်းနေပါသည်။", "error");
    setPinInput('');
  };

  const handleLogout = () => {
    setUserRole(null);
    setActiveView('dashboard');
  };

  const getSortingLabels = (type) => {
    const t = (type || '').toLowerCase();
    if(t.includes('ကောက်ညှင်း')) return ['ကောက်ညှင်း (အချော)', 'အကြမ်းဆန် (By-product)', 'ကောက်ညှင်း (Reject)'];
    if(t.includes('ကြမ်း')) return ['အကြမ်းဆန် (အချော)', 'ဗိုက်ဖြူဆန်', 'အကြမ်း (Reject)'];
    if(t.includes('ပေါ်ဆန်း')) return ['ပေါ်ဆန်း (အချော)', 'ကြမ်းဆန်', 'ပေါ်ဆန်း (Reject)'];
    if(t.includes('စကွဲ')) return ['စကွဲ (အချော)', 'By-product (အမှုန့်)', 'Reject (အမည်း)'];
    return [`${type} (အချော)`, 'By-product', 'Reject'];
  };

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

  if (!userRole) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-900 font-sans">
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl font-black shadow-lg">စက်</div>
          <h1 className="text-3xl font-black text-slate-800 mb-2">Mill ERP System</h1>
          <p className="text-slate-500 font-medium mb-8">စနစ်သို့ ဝင်ရောက်ရန် လျှို့ဝှက်နံပါတ် ရိုက်ထည့်ပါ</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} autoFocus className="w-full text-center text-4xl tracking-[1em] font-black text-slate-800 p-4 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-600 bg-slate-50 transition-colors" placeholder="••••" maxLength="4"/>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold text-lg p-4 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all">ဝင်ရောက်မည်</button>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400 flex justify-center gap-4 font-medium">
             <span>Admin: 9999</span>|<span>Paddy: 1111</span>|<span>Rice: 2222</span>
          </div>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    // Shared Calculations
    const totalPaddyIntake = jobs.filter(j => j.entryType === 'paddy' && j.date === getToday() && j.status !== 'opening_stock').reduce((sum, j) => sum + Number(j.originalQty), 0);
    const waitingDry = jobs.filter(j => j.status === 'waiting_dry').length;
    const currentlyDrying = jobs.filter(j => j.status === 'drying').length;
    const waitingMill = jobs.filter(j => j.status === 'waiting_mill').length;
    const waitingSort = jobs.filter(j => j.status === 'waiting_sort').length;
    const readyToBill = jobs.filter(j => j.status === 'ready_to_bill').length;

    // Financial
    let totalCustomerDebt = 0;
    let totalMillDebt = 0;
    jobs.forEach(j => {
      if (j.status === 'billed' && j.billData) {
        if (j.billData.balance > 0) totalCustomerDebt += j.billData.balance;
        if (j.billData.balance < 0) totalMillDebt += Math.abs(j.billData.balance);
      }
      if (j.status === 'payment') {
        if (j.amount > 0) totalCustomerDebt -= j.amount;
        if (j.amount < 0) totalMillDebt -= Math.abs(j.amount);
      }
    });

    if (userRole === 'admin') {
      return (
        <div className="animate-in fade-in duration-300">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><LayoutDashboard className="mr-3 text-blue-600"/> Admin Dashboard (ခြုံငုံသုံးသပ်ချက်)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-blue-500">
              <p className="text-sm font-bold text-slate-500 mb-1">ယနေ့ စပါးအဝင်စုစုပေါင်း</p>
              <h3 className="text-3xl font-black text-slate-800">{totalPaddyIntake} <span className="text-lg font-medium">တင်း</span></h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-indigo-500">
              <p className="text-sm font-bold text-slate-500 mb-1">ဘေလ်ရှင်းရန် ကျန်သော စာရင်း</p>
              <h3 className="text-3xl font-black text-slate-800">{readyToBill} <span className="text-lg font-medium">ဘောက်ချာ</span></h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-rose-500">
              <p className="text-sm font-bold text-slate-500 mb-1">စုစုပေါင်း ဖောက်သည်အကြွေး</p>
              <h3 className="text-3xl font-black text-rose-600">{totalCustomerDebt.toLocaleString()} <span className="text-sm font-medium">Ks</span></h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-500">
              <p className="text-sm font-bold text-slate-500 mb-1">စက်မှပေးရန်ကျန်သော စာရင်း</p>
              <h3 className="text-3xl font-black text-emerald-600">{totalMillDebt.toLocaleString()} <span className="text-sm font-medium">Ks</span></h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Factory size={18} className="mr-2 text-slate-400"/> စက်ရုံတွင်း လုပ်ငန်းအခြေအနေများ</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-amber-50 rounded-xl">
                  <span className="font-bold text-amber-800">အခြောက်ခံရန် စောင့်ဆိုင်းဆဲ</span>
                  <span className="bg-white text-amber-600 font-black px-4 py-1 rounded-full shadow-sm">{waitingDry}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-orange-50 rounded-xl">
                  <span className="font-bold text-orange-800">အခြောက်ခံနေဆဲ (စက်လည်နေဆဲ)</span>
                  <span className="bg-white text-orange-600 font-black px-4 py-1 rounded-full shadow-sm">{currentlyDrying}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-xl">
                  <span className="font-bold text-purple-800">ကြိတ်ခွဲရန် စောင့်ဆိုင်းဆဲ</span>
                  <span className="bg-white text-purple-600 font-black px-4 py-1 rounded-full shadow-sm">{waitingMill}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-xl">
                  <span className="font-bold text-indigo-800">Color Sort ရန် စောင့်ဆိုင်းဆဲ</span>
                  <span className="bg-white text-indigo-600 font-black px-4 py-1 rounded-full shadow-sm">{waitingSort}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
               <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Receipt size={18} className="mr-2 text-slate-400"/> ဘေလ်ရှင်းရန်ကျန်သော စာရင်းများ</h3>
               {readyToBill === 0 ? (
                 <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                   <p className="text-slate-500 font-bold">ရှင်းရန်ကျန် စာရင်းမရှိပါ။</p>
                 </div>
               ) : (
                 <div className="space-y-3">
                   {jobs.filter(j => j.status === 'ready_to_bill').slice(0,5).map(j => (
                     <div key={j.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer" onClick={() => setActiveView('admin')}>
                       <div>
                         <p className="font-bold text-slate-800">{j.customer}</p>
                         <p className="text-xs text-slate-500">{j.id} • {j.purpose === 'dry_only' ? 'အခြောက်ခံသီးသန့်' : 'စက်ကြိတ်'}</p>
                       </div>
                       <button className="text-xs bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg">ငွေစာရင်းသို့ သွားမည်</button>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      );
    }

    if (userRole === 'paddy_manager') {
      return (
        <div className="animate-in fade-in duration-300">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><LayoutDashboard className="mr-3 text-blue-600"/> စပါးတာဝန်ခံ Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-500 mb-1">ယနေ့ စပါးအဝင်</p>
              <h3 className="text-3xl font-black text-slate-800">{totalPaddyIntake} <span className="text-lg font-medium">တင်း</span></h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-500 mb-1">အခြောက်ခံရန် ကျန် (အစို)</p>
              <h3 className="text-3xl font-black text-slate-800">{waitingDry} <span className="text-lg font-medium">စာရင်း</span></h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-500 mb-1">စက်လည်နေဆဲ</p>
              <h3 className="text-3xl font-black text-orange-600">{currentlyDrying} <span className="text-lg font-medium">စာရင်း</span></h3>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">လုပ်ဆောင်ရန်</h3>
            <button onClick={() => setActiveView('gate')} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl shadow-md hover:bg-blue-700">စပါးအဝင် စာရင်းသွင်းမည်</button>
          </div>
        </div>
      );
    }

    if (userRole === 'rice_manager') {
      return (
        <div className="animate-in fade-in duration-300">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><LayoutDashboard className="mr-3 text-blue-600"/> စက်ရုံတာဝန်ခံ Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-500 mb-1">ကြိတ်ခွဲရန် စောင့်ဆိုင်းဆဲ</p>
              <h3 className="text-3xl font-black text-purple-600">{waitingMill} <span className="text-lg font-medium">စာရင်း</span></h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-500 mb-1">Color Sort ရန် ကျန်</p>
              <h3 className="text-3xl font-black text-indigo-600">{waitingSort} <span className="text-lg font-medium">စာရင်း</span></h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
               <p className="text-sm font-bold text-slate-500 mb-1">ယနေ့ ဆန်ထုတ်ပေးမှု</p>
               <h3 className="text-3xl font-black text-slate-800">{jobs.filter(j => j.deliveryLogs?.some(d => d.date === getToday())).length} <span className="text-lg font-medium">ကြိမ်</span></h3>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">လုပ်ဆောင်ရန်</h3>
            <button onClick={() => setActiveView('milling')} className="bg-purple-600 text-white font-bold px-6 py-3 rounded-xl shadow-md hover:bg-purple-700">ကြိတ်ခွဲရေးဌာနသို့ သွားမည်</button>
          </div>
        </div>
      );
    }
  };

  const renderGateView = () => {
    const handleAddJob = async (e) => {
      e.preventDefault();
      if(!newJob.customer || !newJob.qty || !newJob.paddyType) return showMessage("အချက်အလက်များ ပြည့်စုံစွာ ထည့်ပါ။", "error");
      setIsLoading(true);

      try {
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
            status: initialStatus, date: newJob.date, deliveryLogs: []
          };
          
          setJobs(prev => [jobData, ...prev]); // Optimistic
          const { error } = await supabase.from('jobs').insert([jobData]);
          if (error) throw error;
          
          setNewJob({ ...newJob, customer: '', paddyType: '', qty: '', storage: '' });
          showMessage("ဂိုဒေါင်သို့ စာရင်းသွင်းပြီးပါပြီ။ ID: " + newJobId, "success");
      } catch (err) {
          showMessage(err.message, "error");
          fetchData(); // Rollback
      } finally {
          setIsLoading(false);
      }
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Home className="mr-3 text-blue-600"/> စပါးလက်ခံ / ဂိတ်ဝင် ဌာန</h2>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center"><ArrowDownToLine size={18} className="mr-2 text-blue-500"/> အဝင် စာရင်းသစ်သွင်းရန် (ဂိုဒေါင်သို့ တန်းဝင်မည်)</h3>
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
              <button disabled={isLoading} type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-bold shadow-lg disabled:opacity-50 transition-colors text-sm flex items-center">{isLoading ? 'Processing...' : <><Plus size={18} className="mr-2"/> ဂိုဒေါင်သို့ စာရင်းသွင်းမည်</>}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderPaddyWarehouseView = () => {
    const handleAddAllocation = () => setDryingAllocations([...dryingAllocations, { machine: '', qty: '' }]);
    const handleRemoveAllocation = (index) => setDryingAllocations(dryingAllocations.filter((_, i) => i !== index));

    // Splitting Logic Here
    const handleStartDrying = async (jobId) => {
        const job = jobs.find(j => j.id === jobId);
        if (!job) return showMessage("စာရင်း ရှာမတွေ့ပါ။", "error");

        const isValid = dryingAllocations.every(a => a.machine && Number(a.qty) > 0);
        if(!isValid || dryingAllocations.length === 0) return showMessage("စက်အမည် နှင့် တင်းအရေအတွက် အမှန် ထည့်ပါ။", "error");

        const totalDryingQty = dryingAllocations.reduce((sum, a) => sum + Number(a.qty), 0);

        if (totalDryingQty > job.currentQty) {
            return showMessage(`ထည့်သွင်းသော တင်းစုစုပေါင်း (${totalDryingQty}) သည် လက်ကျန်တင်း (${job.currentQty}) ထက် များနေပါသည်။`, "error");
        }

        setIsLoading(true);
        try {
            if (totalDryingQty < job.currentQty) {
                // စပါးတစ်ချို့သာထည့်ခြင်း (Partial Allocation - Split Job)
                const newJobId = `${job.id}-${Date.now().toString().slice(-3)}`;
                const newJob = {
                    ...job, id: newJobId, originalQty: totalDryingQty, currentQty: totalDryingQty, status: 'drying', dryingMachines: dryingAllocations
                };
                const updatedOldJob = {
                    ...job, originalQty: job.originalQty - totalDryingQty, currentQty: job.currentQty - totalDryingQty
                };

                setJobs(prev => prev.map(j => j.id === jobId ? updatedOldJob : j).concat(newJob));

                const {error: e1} = await supabase.from('jobs').update({ originalQty: updatedOldJob.originalQty, currentQty: updatedOldJob.currentQty }).eq('id', jobId);
                if (e1) throw e1;
                const {error: e2} = await supabase.from('jobs').insert([newJob]);
                if (e2) throw e2;

                showMessage(`စပါး ${totalDryingQty} တင်းကို စက်ထဲထည့်ပြီးပါပြီ။ ကျန် ${updatedOldJob.currentQty} တင်း အစိုစာရင်းတွင် ဆက်ရှိနေပါမည်။`, "success");
            } else {
                // စပါးအားလုံး အပြည့်ထည့်ခြင်း (Full Allocation)
                setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'drying', dryingMachines: dryingAllocations } : j));
                const { error } = await supabase.from('jobs').update({ status: 'drying', dryingMachines: dryingAllocations }).eq('id', jobId);
                if (error) throw error;
                showMessage("အခြောက်ခံစက်သို့ အပြည့်အဝ ပို့ဆောင်ပြီးပါပြီ။", "success");
            }
            setActiveJobId(null);
        } catch (err) {
            showMessage(err.message, "error");
            fetchData(); // Rollback
        } finally {
            setIsLoading(false);
        }
    };

    const handleDryingDone = async (job, action) => {
      if(!dryQtyInput || !dryStorageInput) return showMessage("ကျန်ရှိတင်း နှင့် သိုလှောင်ရုံနေရာ ထည့်ပါ။", "error");
      
      const nextStatus = (job.purpose === 'dry_only' || action === 'bill_only') ? 'ready_to_bill' : 'waiting_mill';
      
      setIsLoading(true);
      try {
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, currentQty: Number(dryQtyInput), storage: dryStorageInput, moisture: 'အခြောက်', status: nextStatus } : j));
          const { error } = await supabase.from('jobs').update({ 
            currentQty: Number(dryQtyInput), storage: dryStorageInput, moisture: 'အခြောက်', status: nextStatus
          }).eq('id', job.id);
          if (error) throw error;
          
          setActiveJobId(null); setDryQtyInput(''); setDryStorageInput('');
          showMessage(action === 'bill_only' ? "အခြောက်ခံခ ဘောက်ချာဖွင့်ရန် ငွေစာရင်းသို့ ပို့ပြီးပါပြီ။" : "စပါးဂိုဒေါင် (အခြောက်) သို့ သိမ်းဆည်းပြီးပါပြီ။", "success");
      } catch (err) {
          showMessage(err.message, "error");
          fetchData();
      } finally {
          setIsLoading(false);
      }
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Package className="mr-3 text-orange-600"/> စပါး / နဝလီ ဂိုဒေါင် နှင့် အခြောက်ခံစက်</h2>
        
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-8">
          <div className="bg-slate-50 p-4 border-b border-slate-200">
             <h3 className="font-bold text-slate-800">ဂိုဒေါင်တွင်း လက်ကျန် စပါး/နဝလီ (စက်ချရန်အသင့်)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold">ဘောက်ချာ / ဖောက်သည်</th>
                  <th className="p-4 font-bold">အမျိုးအစား / အစိုအခြောက်</th>
                  <th className="p-4 font-bold">နေရာ နှင့် အရေအတွက်</th>
                  <th className="p-4 font-bold text-right">လုပ်ဆောင်ချက်</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {jobs.filter(j => ['waiting_dry', 'waiting_mill', 'waiting_sort'].includes(j.status)).map(job => (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{job.customer}</div>
                      <div className="text-xs text-slate-500">{job.id}</div>
                    </td>
                    <td className="p-4">
                      <span className="font-bold">{job.paddyType}</span>
                      {job.entryType === 'nawali' ? <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">နဝလီ</span> : <span className={`ml-2 text-xs px-2 py-0.5 rounded ${job.moisture==='အစို'?'bg-blue-100 text-blue-800':'bg-green-100 text-green-800'}`}>{job.moisture}</span>}
                    </td>
                    <td className="p-4">
                       <div className="flex items-center font-bold">
                         <MapPin size={14} className="text-slate-400 mr-1"/><span className="text-blue-600 mr-2">{job.storage}</span>
                         <ArrowRight size={12} className="text-slate-300 mx-1"/><span>{job.currentQty} {job.entryType==='nawali'?'အိတ်':'တင်း'}</span>
                       </div>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                       {userRole === 'admin' && (
                          <button onClick={() => showConfirm(`ဘောက်ချာ/မှတ်တမ်း No: ${job.id} အား အပြီးတိုင် ပယ်ဖျက်မှာ သေချာပါသလား?`, () => handleDeleteJob(job.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                       )}
                       {job.status === 'waiting_dry' && (
                         <button onClick={() => { setActiveJobId(job.id + '-todry'); setDryingAllocations([{machine: '', qty: job.currentQty}]); }} className="bg-orange-100 text-orange-700 hover:bg-orange-200 font-bold px-3 py-1.5 rounded-lg text-xs">စက်ထဲ ခွဲထည့်မည်</button>
                       )}
                       {job.status === 'waiting_mill' && (
                         <span className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-purple-100">စက်ကြိတ်ရန် အသင့်</span>
                       )}
                    </td>
                  </tr>
                ))}
                {jobs.filter(j => ['waiting_dry', 'waiting_mill', 'waiting_sort'].includes(j.status)).length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-bold">စပါးဂိုဒေါင်တွင် လက်ကျန် မရှိပါ။</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-sm flex flex-col">
            <div className="bg-orange-50 p-5 border-b border-orange-200">
              <h3 className="font-bold text-orange-900 flex items-center"><Droplets size={20} className="mr-2"/> အခြောက်ခံစက်သို့ ထည့်ရန် (စောင့်ဆိုင်း)</h3>
            </div>
            <div className="p-5 space-y-4 flex-1 overflow-y-auto bg-slate-50">
              {jobs.filter(j => j.status === 'waiting_dry').map(job => (
                activeJobId === job.id + '-todry' && (
                  <div key={job.id} className="bg-white p-5 rounded-xl border border-orange-300 shadow-md transition-all animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
                      <div>
                        <span className="font-black text-slate-800 block text-lg">{job.customer}</span>
                        <span className="text-sm font-semibold text-slate-500">{job.id} • စပါးအစို</span>
                      </div>
                      <div className="text-right">
                         <span className="text-lg font-black text-orange-600">{job.currentQty} တင်း</span>
                         <span className="text-xs font-medium text-slate-500 block"><MapPin size={12} className="inline mr-1"/>{job.storage}</span>
                      </div>
                    </div>
                    <label className="text-xs font-bold text-orange-800 block mb-3">အသုံးပြုမည့် အခြောက်ခံစက် နှင့် ခွဲထည့်မည့် တင်း</label>
                    <div className="space-y-2">
                      {dryingAllocations.map((alloc, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input type="text" list="dryingMachines" value={alloc.machine} onChange={e => {
                            const newAllocs = [...dryingAllocations]; newAllocs[idx].machine = e.target.value; setDryingAllocations(newAllocs);
                          }} className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-orange-500" placeholder="စက်အမည်..." required/>
                          <datalist id="dryingMachines">{DRYING_MACHINES.map(m => <option key={m} value={m}/>)}</datalist>
                          <input type="number" value={alloc.qty} onChange={e => {
                            const newAllocs = [...dryingAllocations]; newAllocs[idx].qty = e.target.value; setDryingAllocations(newAllocs);
                          }} className="w-24 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-orange-500" placeholder="တင်း" required min="1"/>
                          {idx > 0 && <button onClick={() => handleRemoveAllocation(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>}
                        </div>
                      ))}
                    </div>
                    <button onClick={handleAddAllocation} className="text-xs font-bold text-blue-600 mt-2 mb-6 block">+ စက်ထပ်ထည့်မည်</button>
                    
                    <div className="flex gap-2">
                       <button onClick={() => setActiveJobId(null)} className="flex-1 bg-slate-100 text-slate-700 rounded-lg py-2.5 text-sm font-bold hover:bg-slate-200">ပယ်ဖျက်</button>
                       <button onClick={() => handleStartDrying(job.id)} className="flex-1 bg-orange-500 text-white rounded-lg py-2.5 text-sm font-bold shadow-md hover:bg-orange-600">စက်ထဲ ခွဲထည့်မည်</button>
                    </div>
                  </div>
                )
              ))}
              {!jobs.some(j => activeJobId === j.id + '-todry') && <p className="text-sm font-bold text-slate-400 text-center py-10">စက်ထဲထည့်ရန် အပေါ်မှ ရွေးချယ်ပါ။</p>}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-red-200 overflow-hidden shadow-sm flex flex-col">
            <div className="bg-red-50 p-5 border-b border-red-200">
              <h3 className="font-bold text-red-900 flex items-center"><Wind size={20} className="mr-2"/> အခြောက်ခံနေဆဲ</h3>
            </div>
            <div className="p-5 space-y-4 flex-1 overflow-y-auto bg-slate-50">
              {jobs.filter(j => j.status === 'drying').map(job => (
                <div key={job.id} className="bg-white p-5 rounded-xl border border-red-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                  {userRole === 'admin' && (
                    <button onClick={() => showConfirm(`ဖျက်မှာသေချာလား?`, () => handleDeleteJob(job.id))} className="absolute right-2 top-2 p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                  )}
                  <div className="flex justify-between items-start mb-4 pl-3">
                    <div>
                      <span className="font-black text-slate-800 block text-lg">{job.customer}</span>
                      <span className="text-sm font-bold text-slate-500 mt-1 block">{job.id}</span>
                    </div>
                    <div className="text-right pr-6">
                       <span className="text-sm font-black text-red-600 block">{job.originalQty} တင်း ဝင်ထား</span>
                    </div>
                  </div>

                  <div className="pl-3 mb-4">
                     <div className="flex flex-wrap gap-2">
                        {job.dryingMachines?.map((dm, idx) => (
                           <span key={idx} className="bg-red-50 text-red-800 text-xs px-2.5 py-1 rounded-md border border-red-100 font-bold">{dm.machine} ({dm.qty} တင်း)</span>
                        ))}
                     </div>
                  </div>
                  
                  {activeJobId === job.id + '-finish' ? (
                    <div className="mt-4 pt-4 border-t border-red-100 space-y-4 pl-3 animate-in fade-in zoom-in-95 duration-200">
                      <div>
                        <label className="text-xs font-bold text-red-800 block mb-1.5">အခြောက်ခံပြီး ကျန်ရှိမည့် တင်း</label>
                        <input type="number" value={dryQtyInput} onChange={e=>setDryQtyInput(e.target.value)} placeholder={`မူလ: ${job.originalQty}`} className="w-full p-3 border-2 border-red-300 rounded-xl outline-none focus:border-red-500 font-black text-lg bg-white"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">သိမ်းဆည်းမည့် စပါးဂိုဒေါင်/နေရာ</label>
                        <input type="text" list="paddyStorage" value={dryStorageInput} onChange={e=>setDryStorageInput(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-red-500 bg-white" required/>
                      </div>
                      <div className="pt-2 flex flex-col gap-2">
                        <button onClick={() => handleDryingDone(job, 'mill')} className="w-full bg-red-600 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:bg-red-700">ဂိုဒေါင်သို့သိမ်းမည် (စက်ကြိတ်ရန်)</button>
                        <button onClick={() => handleDryingDone(job, 'bill_only')} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700">အခြောက်ခံခ ဘေလ်ကြိုဖွင့်မည်</button>
                        <button onClick={() => setActiveJobId(null)} className="w-full bg-slate-100 text-red-600 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 mt-1">ပယ်ဖျက်</button>
                      </div>
                    </div>
                  ) : (
                    <div className="pl-3 mt-4 border-t border-slate-100 pt-4">
                       <button onClick={() => setActiveJobId(job.id + '-finish')} className="w-full bg-red-50 text-red-700 border border-red-200 py-3 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors shadow-sm">အခြောက်ခံပြီးစီး</button>
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

  const renderMillingView = () => {
    const handleMillDone = async (jobId) => {
      setIsLoading(true);
      try {
          setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'waiting_sort', millingData: millInput } : j));
          const { error } = await supabase.from('jobs').update({ status: 'waiting_sort', millingData: millInput }).eq('id', jobId);
          if (error) throw error;
          setActiveJobId(null);
          setMillInput({ rice: '', broken12: '', broken234: '', bran: '' });
          showMessage("ကြိတ်ခွဲမှု ရလဒ်များ စာရင်းသွင်းပြီးပါပြီ။ Color Sorting သို့ ပို့ပေးလိုက်ပါပြီ။", "success");
      } catch (err) {
          showMessage(err.message, "error");
          fetchData();
      } finally {
          setIsLoading(false);
      }
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Tractor className="mr-3 text-purple-600"/> ကြိတ်ခွဲရေး ဌာန</h2>
        <div className="space-y-5">
          {jobs.filter(j => j.status === 'waiting_mill' && j.purpose === 'mill').map(job => (
            <div key={job.id} className="bg-white p-6 rounded-2xl border-l-4 border-l-purple-500 border border-slate-200 shadow-sm relative group">
               {userRole === 'admin' && (
                  <button onClick={() => showConfirm(`ဖျက်မှာသေချာလား?`, () => handleDeleteJob(job.id))} className="absolute right-4 top-4 p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18}/></button>
               )}
              <div className="flex justify-between items-start mb-4 pr-8">
                <div>
                  <h3 className="font-black text-2xl text-slate-800">{job.customer}</h3>
                  <div className="text-sm font-bold text-slate-500 mt-2">{job.id} • {job.paddyType} <span className="text-purple-600 ml-2 bg-purple-50 px-2 py-0.5 rounded text-slate-800">စပါး ({job.currentQty || 0} တင်း)</span></div>
                </div>
                <div className="text-right flex flex-col items-end">
                   <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 flex items-center mb-2"><MapPin size={12} className="mr-1"/>{job.storage} (စပါး)</span>
                </div>
              </div>
              
              {activeJobId === job.id ? (
                <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 mt-6 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div><label className="text-xs font-bold text-slate-700 block mb-2">ဆန်အကြမ်း (အိတ်)</label><input type="number" value={millInput.rice} onChange={e=>setMillInput({...millInput, rice: e.target.value})} className="w-full p-3 border-2 border-purple-200 rounded-xl outline-none focus:border-purple-500 bg-white text-slate-900 font-bold text-lg"/></div>
                    <div><label className="text-xs font-bold text-blue-700 block mb-2">၁၂ ဆန်ကွဲ (အိတ်)</label><input type="number" value={millInput.broken12} onChange={e=>setMillInput({...millInput, broken12: e.target.value})} className="w-full p-3 border border-blue-200 rounded-xl outline-none focus:border-blue-500 bg-white text-slate-900"/></div>
                    <div><label className="text-xs font-bold text-sky-700 block mb-2">၂၃၄ ဆန်ကွဲ (အိတ်)</label><input type="number" value={millInput.broken234} onChange={e=>setMillInput({...millInput, broken234: e.target.value})} className="w-full p-3 border border-sky-200 rounded-xl outline-none focus:border-sky-500 bg-white text-slate-900"/></div>
                    <div><label className="text-xs font-bold text-orange-700 block mb-2">ဖွဲနု (အိတ်)</label><input type="number" value={millInput.bran} onChange={e=>setMillInput({...millInput, bran: e.target.value})} className="w-full p-3 border border-orange-200 rounded-xl outline-none focus:border-orange-500 bg-white text-slate-900"/></div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setActiveJobId(null)} className="px-6 py-3 bg-white border border-slate-300 text-red-600 font-bold rounded-xl text-sm hover:bg-red-50">ပယ်ဖျက်</button>
                    <button onClick={() => handleMillDone(job.id)} className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm shadow-lg flex items-center transition-colors">
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

  const renderSortingView = () => {
    const handleSortDone = async (jobId) => {
      const labels = getSortingLabels(jobs.find(j=>j.id===jobId).paddyType);
      if (sortInput.out1 > 0 && !sortInput.storage1) return showMessage(`${labels[0]} အတွက် သိုလှောင်ရုံ/နေရာ ရွေးပါ။`, "error");
      if (sortInput.out2 > 0 && !sortInput.storage2) return showMessage(`${labels[1]} အတွက် သိုလှောင်ရုံ/နေရာ ရွေးပါ။`, "error");
      if (sortInput.out3 > 0 && !sortInput.storage3) return showMessage(`${labels[2]} အတွက် သိုလှောင်ရုံ/နေရာ ရွေးပါ။`, "error");

      setIsLoading(true);
      try {
          setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'ready_to_bill', sortingData: sortInput } : j));
          const { error } = await supabase.from('jobs').update({ status: 'ready_to_bill', sortingData: sortInput }).eq('id', jobId);
          if (error) throw error;
          setActiveJobId(null);
          setSortInput({ out1: '', storage1: '', out2: '', storage2: '', out3: '', storage3: '' });
          showMessage("Sorting ရလဒ်များ ဂိုဒေါင်သို့ သိမ်းဆည်းပြီးပါပြီ။ ဘေလ်ဖွင့်ရန် အသင့်ဖြစ်နေပါပြီ။", "success");
      } catch (err) {
          showMessage(err.message, "error");
          fetchData();
      } finally {
          setIsLoading(false);
      }
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
              <div key={job.id} className="bg-white p-6 rounded-2xl border-l-4 border-l-indigo-500 border border-slate-200 shadow-sm relative group">
                {userRole === 'admin' && (
                  <button onClick={() => showConfirm(`ဖျက်မှာသေချာလား?`, () => handleDeleteJob(job.id))} className="absolute right-4 top-4 p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18}/></button>
                )}
                <div className="flex justify-between items-start mb-4 pr-8">
                  <div>
                    <h3 className="font-black text-2xl text-slate-800">{job.customer}</h3>
                    <div className="text-sm font-bold text-slate-500 mt-2">
                      {job.id} • {job.paddyType} {isNawali ? <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded ml-2 text-xs border border-orange-200">နဝလီ (အပြင်ထည်)</span> : <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2 text-xs border border-blue-200">စက်ကြိတ် (အတွင်းထည်)</span>}
                    </div>
                    <div className="text-indigo-600 font-black mt-3 bg-indigo-50 inline-block px-3 py-1.5 rounded-lg border border-indigo-100">Raw အဝင်: <span className="text-lg text-slate-800">{rawBags}</span> အိတ်</div>
                  </div>
                </div>
                
                {activeJobId === job.id ? (
                  <div className="bg-indigo-50/40 p-6 rounded-2xl border border-indigo-100 mt-6 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-xs font-black text-indigo-800 uppercase tracking-wider mb-5 border-b border-indigo-100 pb-3 flex items-center"><Package className="mr-2"/> Sorting ထွက်ကုန်များ နှင့် သိမ်းမည့်နေရာ</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                        <label className="text-sm font-bold text-indigo-900 block mb-3">{labels[0]}</label>
                        <input type="number" value={sortInput.out1} onChange={e=>setSortInput({...sortInput, out1: e.target.value})} className="w-full p-3 border-2 border-indigo-200 rounded-lg outline-none font-black text-lg mb-2 text-slate-800" placeholder="အိတ် အရေအတွက်"/>
                        <div className="relative mt-2">
                          <MapPin size={14} className="absolute left-3 top-3.5 text-slate-400"/>
                          <input type="text" list="riceStorage" value={sortInput.storage1} onChange={e=>setSortInput({...sortInput, storage1: e.target.value})} className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg text-xs text-slate-800" placeholder="ဂိုဒေါင် (မဖြစ်မနေ)..."/>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <label className="text-sm font-bold text-slate-700 block mb-3">{labels[1]}</label>
                        <input type="number" value={sortInput.out2} onChange={e=>setSortInput({...sortInput, out2: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg outline-none font-bold mb-2 text-slate-800" placeholder="အိတ် အရေအတွက်"/>
                        <div className="relative mt-2">
                          <MapPin size={14} className="absolute left-3 top-3.5 text-slate-400"/>
                          <input type="text" list="riceStorage" value={sortInput.storage2} onChange={e=>setSortInput({...sortInput, storage2: e.target.value})} className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg text-xs text-slate-800" placeholder="ဂိုဒေါင်/နေရာ..."/>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                        <label className="text-sm font-bold text-red-700 block mb-3">{labels[2]}</label>
                        <input type="number" value={sortInput.out3} onChange={e=>setSortInput({...sortInput, out3: e.target.value})} className="w-full p-3 border border-red-200 rounded-lg outline-none font-bold mb-2 text-slate-800" placeholder="အိတ် အရေအတွက်"/>
                        <div className="relative mt-2">
                          <MapPin size={14} className="absolute left-3 top-3.5 text-slate-400"/>
                          <input type="text" list="riceStorage" value={sortInput.storage3} onChange={e=>setSortInput({...sortInput, storage3: e.target.value})} className="w-full p-2.5 pl-9 border border-red-200 rounded-lg text-xs text-slate-800" placeholder="ဂိုဒေါင်/နေရာ..."/>
                        </div>
                      </div>
                    </div>
                    <datalist id="riceStorage">{RICE_STORAGE.map(s => <option key={s} value={s}/>)}</datalist>
                    
                    <div className="flex justify-end gap-3 pt-2 border-t border-indigo-100">
                      <button onClick={() => setActiveJobId(null)} className="px-6 py-3 bg-white border border-slate-300 text-red-600 font-bold rounded-xl text-sm hover:bg-red-50">ပယ်ဖျက်</button>
                      <button onClick={() => handleSortDone(job.id)} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg flex items-center">
                        <CheckCircle size={18} className="mr-2"/> ဂိုဒေါင် နှင့် ငွေစာရင်းသို့ ပို့မည်
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

  const renderRiceWarehouseView = () => {
    return (
      <div className="animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-2xl font-bold text-slate-800 flex items-center"><Factory className="mr-3 text-green-600"/> ဆန် နှင့် ထွက်ကုန် ဂိုဒေါင် (Delivery)</h2>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-green-50 text-green-900 border-b border-green-100">
                <tr>
                  <th className="p-4 font-bold">ဘောက်ချာ / ဖောက်သည်</th>
                  <th className="p-4 font-bold">ထုတ်ယူရန်ကျန်ရှိသည့် ထွက်ကုန်များ (Remaining)</th>
                  <th className="p-4 font-bold text-right">လုပ်ဆောင်ချက်</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {jobs.filter(j => ['ready_to_bill', 'billed'].includes(j.status)).map(job => {
                  const labels = getSortingLabels(job.paddyType);
                  // Calculate remaining
                  let rem1 = Number(job.sortingData?.out1 || 0);
                  let rem2 = Number(job.sortingData?.out2 || 0);
                  let rem3 = Number(job.sortingData?.out3 || 0);
                  let remBran = Number(job.millingData?.bran || 0);

                  // Deduct mill purchases
                  if (job.billData) {
                    if (job.billData.byproductOption === 'sell') rem2 = 0;
                    if (job.billData.rejectOption === 'sell') rem3 = 0;
                    if (job.billData.branOption === 'sell') remBran = 0;
                  }

                  // Deduct previous deliveries
                  (job.deliveryLogs || []).forEach(log => {
                     rem1 -= log.out1; rem2 -= log.out2; rem3 -= log.out3; remBran -= log.bran;
                  });

                  const hasRemaining = rem1>0 || rem2>0 || rem3>0 || remBran>0;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50 group">
                      <td className="p-4 align-top w-1/4">
                        <div className="font-bold text-slate-800">{job.id}</div>
                        <div className="text-sm font-bold text-slate-500 mb-2">{job.customer}</div>
                        <div className="text-xs text-slate-400">{job.paddyType}</div>
                        {userRole === 'admin' && (
                          <button onClick={() => showConfirm(`ဖျက်မှာသေချာလား?`, () => handleDeleteJob(job.id))} className="mt-2 text-xs text-red-500 hover:text-red-700 font-bold flex items-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} className="mr-1"/> ဖျက်မည်</button>
                        )}
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex flex-wrap gap-2">
                           {rem1 > 0 && <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-green-100">{labels[0]}: {rem1} အိတ်</span>}
                           {rem2 > 0 && <span className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200">{labels[1]}: {rem2} အိတ်</span>}
                           {rem3 > 0 && <span className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-100">{labels[2]}: {rem3} အိတ်</span>}
                           {remBran > 0 && <span className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-orange-100">ဖွဲနု: {remBran} အိတ်</span>}
                           {!hasRemaining && <span className="text-slate-400 font-bold text-sm italic">အားလုံး ထုတ်ယူပြီးပါပြီ</span>}
                        </div>
                      </td>
                      <td className="p-4 align-top text-right">
                         {hasRemaining && (
                           <button onClick={() => setDeliveryModal({...job, rem1, rem2, rem3, remBran, labels})} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md hover:bg-blue-700 flex items-center justify-end ml-auto">
                              <Truck size={16} className="mr-2"/> ဆန်ထုတ်ပေးမည်
                           </button>
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

  const renderOpeningStockView = () => {
    const handleAddOpeningStock = async (e) => {
      e.preventDefault();
      setIsLoading(true);
      try {
          const jobId = `OPEN-${Date.now().toString().slice(-4)}`;
          
          const newJob = {
            id: jobId, customer: openingStock.type === 'mill' ? 'စက်ပိုင်' : openingStock.customer, entryType: 'opening_stock',
            status: 'billed', date: openingStock.date, paddyType: openingStock.paddyType,
            originalQty: 0, currentQty: 0, millingData: {}, sortingData: {}, billData: { balance: 0 }
          };

          if (openingStock.itemType === 'paddy') {
             newJob.status = 'waiting_dry'; newJob.originalQty = Number(openingStock.qty); newJob.currentQty = Number(openingStock.qty);
             newJob.storage = openingStock.storage; newJob.moisture = 'အခြောက်';
          } else if (openingStock.itemType === 'rice') {
             newJob.sortingData = { out1: Number(openingStock.qty), storage1: openingStock.storage };
          } else if (openingStock.itemType === 'broken') {
             newJob.sortingData = { out2: Number(openingStock.qty), storage2: openingStock.storage };
          } else if (openingStock.itemType === 'reject') {
             newJob.sortingData = { out3: Number(openingStock.qty), storage3: openingStock.storage };
          } else if (openingStock.itemType === 'bran') {
             newJob.millingData = { bran: Number(openingStock.qty) };
          }

          if (openingStock.type === 'mill') {
             if (openingStock.itemType === 'broken') newJob.billData.byproductOption = 'sell';
             if (openingStock.itemType === 'reject') newJob.billData.rejectOption = 'sell';
             if (openingStock.itemType === 'bran') newJob.billData.branOption = 'sell';
          }

          setJobs(prev => [newJob, ...prev]);
          const { error } = await supabase.from('jobs').insert([newJob]);
          if (error) throw error;
          
          showMessage("လက်ကျန်စာရင်း ထည့်သွင်းပြီးပါပြီ။", "success");
          setOpeningStock({...openingStock, qty: '', storage: ''});
      } catch (err) {
          showMessage(err.message, "error");
          fetchData();
      } finally {
          setIsLoading(false);
      }
    };

    return (
      <div className="animate-in fade-in duration-300 max-w-2xl">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><ClipboardList className="mr-3 text-slate-600"/> လက်ကျန်စာရင်း (Opening Stock) ထည့်ရန်</h2>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <form onSubmit={handleAddOpeningStock} className="space-y-5">
              <div className="flex bg-slate-100 p-1 rounded-xl w-full mb-4">
                <button type="button" onClick={() => setOpeningStock({...openingStock, type: 'mill'})} className={`flex-1 py-2 text-sm font-bold rounded-lg ${openingStock.type === 'mill' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-500'}`}>စက်ပိုင် ပစ္စည်း</button>
                <button type="button" onClick={() => setOpeningStock({...openingStock, type: 'customer'})} className={`flex-1 py-2 text-sm font-bold rounded-lg ${openingStock.type === 'customer' ? 'bg-white text-green-700 shadow-md' : 'text-slate-500'}`}>ကုန်သည်ပိုင် (အပ်နှံ)</button>
              </div>

              {openingStock.type === 'customer' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">ကုန်သည် အမည်</label>
                  <input type="text" required value={openingStock.customer} onChange={e=>setOpeningStock({...openingStock, customer: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-800" placeholder="အမည်"/>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">အမျိုးအစား ရွေးပါ</label>
                  <select value={openingStock.itemType} onChange={e=>setOpeningStock({...openingStock, itemType: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-bold text-slate-800">
                    <option value="paddy">စပါး</option>
                    <option value="rice">ဆန်အချော</option>
                    <option value="broken">ဆန်ကွဲ / By-product</option>
                    <option value="bran">ဖွဲနု</option>
                    <option value="reject">Reject အမည်း</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">စပါး/ဆန် အမည်</label>
                  <input type="text" required value={openingStock.paddyType} onChange={e=>setOpeningStock({...openingStock, paddyType: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-800" placeholder="ဥပမာ - ပေါ်ဆန်း"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">အရေအတွက် (တင်း/အိတ်)</label>
                  <input type="number" required min="1" value={openingStock.qty} onChange={e=>setOpeningStock({...openingStock, qty: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-bold text-slate-800" placeholder="0"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">ဂိုဒေါင် / နေရာ</label>
                  <input type="text" required value={openingStock.storage} onChange={e=>setOpeningStock({...openingStock, storage: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-800" placeholder="နေရာ"/>
                </div>
              </div>
              
              <button disabled={isLoading} type="submit" className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl mt-4 hover:bg-slate-900 transition-colors">အတည်ပြု စာရင်းသွင်းမည်</button>
           </form>
        </div>
      </div>
    );
  }

  const renderInventoryView = () => {
    let totalMillRice = 0; let totalMillBroken = 0; let totalMillReject = 0; let totalMillBran = 0;

    jobs.forEach(job => {
        if (job.status === 'billed') {
            if (job.customer === 'စက်ပိုင်' && job.entryType === 'opening_stock') {
                totalMillRice += Number(job.sortingData?.out1 || 0);
                totalMillBroken += Number(job.sortingData?.out2 || 0);
                totalMillReject += Number(job.sortingData?.out3 || 0);
                totalMillBran += Number(job.millingData?.bran || 0);
            }
            if (job.billData) {
                if (job.billData.branOption === 'sell') totalMillBran += Number(job.millingData?.bran || 0);
                if (job.billData.byproductOption === 'sell') totalMillBroken += Number(job.sortingData?.out2 || 0);
                if (job.billData.rejectOption === 'sell') totalMillReject += Number(job.sortingData?.out3 || 0);
            }
        }
        if (job.customer === 'စက်ပိုင်' && job.deliveryLogs) {
            job.deliveryLogs.forEach(log => {
                totalMillRice -= Number(log.out1 || 0);
                totalMillBroken -= Number(log.out2 || 0);
                totalMillReject -= Number(log.out3 || 0);
                totalMillBran -= Number(log.bran || 0);
            });
        }
    });

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Package className="mr-3 text-slate-800"/> စက်ပိုင် ဆန်/ဖွဲနု စာရင်း</h2>
        
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 mb-8">
           <h3 className="text-sm font-bold mb-6 text-slate-600 flex items-center uppercase tracking-wider"><ArrowDownToLine size={16} className="mr-2"/> စက်မှ ဝယ်ယူထားသော / စက်ပိုင် လက်ကျန်များ</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                 <p className="text-slate-500 text-xs font-bold mb-2">ဆန်အချော</p>
                 <div className="text-3xl font-black text-slate-800">{totalMillRice} <span className="text-sm font-medium text-slate-500">အိတ်</span></div>
              </div>
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
                 <p className="text-blue-700 text-xs font-bold mb-2">ဖွဲနု စုစုပေါင်း</p>
                 <div className="text-3xl font-black text-blue-800">{totalMillBran} <span className="text-sm font-medium text-blue-600">အိတ်</span></div>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                 <p className="text-slate-600 text-xs font-bold mb-2">ဗိုက်ဖြူ (By-product)</p>
                 <div className="text-3xl font-black text-slate-800">{totalMillBroken} <span className="text-sm font-medium text-slate-500">အိတ်</span></div>
              </div>
              <div className="bg-red-50 p-6 rounded-2xl border border-red-200">
                 <p className="text-red-700 text-xs font-bold mb-2">Reject ဆန်အမည်း</p>
                 <div className="text-3xl font-black text-red-800">{totalMillReject} <span className="text-sm font-medium text-red-600">အိတ်</span></div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderAdminView = () => {
    const handleBillSubmit = async (job, totalServiceFee, dryingFee, deduction, net, pd, bal) => {
      setIsLoading(true);
      try {
          const newBillData = { ...billInput, totalServiceFee, dryingFee, deduction, netTotal: net, paid: pd, balance: bal, billDate: getToday() };
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'billed', billData: newBillData } : j));
          const { error } = await supabase.from('jobs').update({ status: 'billed', billData: newBillData }).eq('id', job.id);
          if (error) throw error;

          setActiveJobId(null);
          setBillInput({ dryingRate: '', sortingRate: '', millingRate: '', branOption: 'take', branRate: '', byproductOption: 'take', byproductRate: '', rejectOption: 'take', rejectRate: '', otherExp: '', paidAmount: '' });
          showMessage("ငွေစာရင်း သိမ်းဆည်းပြီးပါပြီ။", "success");
      } catch (err) {
          showMessage(err.message, "error");
          fetchData();
      } finally {
          setIsLoading(false);
      }
    };

    const pendingJobs = jobs.filter(j => j.status === 'ready_to_bill');
    const searchedJobs = pendingJobs.filter(j => j.id === activeJobId || (adminSearchQuery.trim() !== '' && (j.customer.toLowerCase().includes(adminSearchQuery.toLowerCase()) || j.id.toLowerCase().includes(adminSearchQuery.toLowerCase()))));

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
            const isNawali = job.entryType === 'nawali';
            const isDryOnly = job.purpose === 'dry_only';
            const dryingFee = job.wasWet ? (Number(job.originalQty) * (Number(billInput.dryingRate) || 0)) : 0;
            let totalServiceFee = 0; let totalMilledBags = 0;

            if (!isDryOnly) {
              totalMilledBags = isNawali ? 0 : (Number(job.millingData?.rice || 0) + Number(job.millingData?.broken12 || 0) + Number(job.millingData?.broken234 || 0));
              totalServiceFee = isNawali ? (Number(job.originalQty) * (Number(billInput.sortingRate) || 0)) : (totalMilledBags * (Number(billInput.millingRate) || 0));
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
              <div key={job.id} className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden group relative">
                 <button onClick={() => showConfirm(`ဖျက်မှာသေချာလား?`, () => handleDeleteJob(job.id))} className="absolute right-4 top-4 p-2 text-red-200 hover:text-red-400 z-10 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={20}/></button>
                <div className="bg-slate-800 p-6 text-white relative">
                  <h3 className="text-2xl font-black mb-1">{job.customer}</h3>
                  <p className="text-slate-400 text-sm font-bold">ID: {job.id} | {job.paddyType} | {job.date}</p>
                </div>
                {activeJobId === job.id ? (
                  <div className="p-6 bg-slate-50/50">
                    <div className="space-y-4 mb-6">
                      {job.wasWet && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <label className="block text-sm font-bold text-slate-800 mb-2">အခြောက်ခံခ နှုန်း (၁ တင်း)</label>
                          <input type="number" value={billInput.dryingRate} onChange={e=>setBillInput({...billInput, dryingRate: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-bold text-slate-800"/>
                        </div>
                      )}
                      {!isDryOnly && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <label className="block text-sm font-bold text-slate-800 mb-2">{isNawali ? 'Sorting နှုန်း (၁ အိတ်)' : 'ကြိတ်ခွဲခ နှုန်း (၁ အိတ်)'}</label>
                          <input type="number" value={isNawali ? billInput.sortingRate : billInput.millingRate} onChange={e=> isNawali ? setBillInput({...billInput, sortingRate: e.target.value}) : setBillInput({...billInput, millingRate: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-bold text-slate-800"/>
                        </div>
                      )}
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <label className="block text-sm font-bold text-slate-800 mb-2">အခြား ကုန်ကျစရိတ်</label>
                        <input type="number" value={billInput.otherExp} onChange={e=>setBillInput({...billInput, otherExp: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-bold text-slate-800"/>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6">
                        <div className="flex justify-between items-end mb-4">
                           <span className="text-xs font-bold text-slate-500 uppercase">{isRefund ? 'စက်မှ ပြန်အမ်းရမည့်ငွေ' : 'ကျသင့်ငွေ (Net Total)'}</span>
                           <span className={`text-2xl font-black ${isRefund ? 'text-green-600' : 'text-slate-800'}`}>{Math.abs(netTotal).toLocaleString()} Ks</span>
                        </div>
                        {Math.abs(netTotal) > 0 && (
                          <div>
                            <label className="block text-xs font-bold mb-2 uppercase text-blue-800">{isRefund ? 'စက်မှ ပေးသည့်ငွေ' : 'ဖောက်သည် ပေးချေငွေ'}</label>
                            <input type="number" value={billInput.paidAmount} onChange={e=>setBillInput({...billInput, paidAmount: e.target.value})} className="w-full p-3 border-2 border-blue-300 rounded-lg outline-none focus:border-blue-500 font-bold text-xl text-slate-800" placeholder="0"/>
                          </div>
                        )}
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => setActiveJobId(null)} className="px-6 py-3 bg-white border border-slate-300 text-red-600 font-bold rounded-xl hover:bg-red-50">ပယ်ဖျက်</button>
                      <button onClick={() => handleBillSubmit(job, totalServiceFee, dryingFee, totalDeduction, netTotal, paid, balance)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md">ငွေရှင်းမည်</button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <button onClick={() => setActiveJobId(job.id)} className="bg-slate-100 text-blue-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-200">ဘေလ်တွက်ချက်ရန် နှိပ်ပါ</button>
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
      if (job.customer === 'စက်ပိုင်') return;

      if(!customerStats[job.customer]) {
        customerStats[job.customer] = { name: job.customer, totalPaddy: 0, totalRice: 0, totalCustomerDebt: 0, totalMillDebt: 0, history: [] };
      }
      
      const stat = customerStats[job.customer];
      if (job.entryType === 'paddy' && job.status !== 'payment' && job.status !== 'opening_stock') stat.totalPaddy += job.originalQty;
      if (job.status === 'ready_to_bill' || job.status === 'billed') {
        if (job.purpose !== 'dry_only') stat.totalRice += Number(job.sortingData?.out1 || 0);
      }
      
      if (job.status === 'billed' && job.billData) {
        if (job.billData.balance > 0) stat.totalCustomerDebt += job.billData.balance;
        if (job.billData.balance < 0) stat.totalMillDebt += Math.abs(job.billData.balance);
      }
      if (job.status === 'payment') {
        if (job.amount > 0) stat.totalCustomerDebt -= job.amount; 
        if (job.amount < 0) stat.totalMillDebt -= Math.abs(job.amount);
      }
      
      if(job.status !== 'opening_stock') stat.history.push(job);
    });

    const filteredCustomers = Object.values(customerStats).filter(c => c.name.toLowerCase().includes(ledgerSearchQuery.toLowerCase()));

    return (
      <div className="animate-in fade-in duration-300 relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center"><Users className="mr-3 text-blue-600"/> ဖောက်သည် မှတ်တမ်း / အကြွေးစာရင်း</h2>
          <div className="relative w-72">
            <input type="text" placeholder="အမည်ဖြင့် ရှာရန်..." value={ledgerSearchQuery} onChange={e=>setLedgerSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:border-blue-500 bg-white font-bold text-slate-800"/>
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          </div>
        </div>

        <div className="space-y-4 pb-20">
          {filteredCustomers.map(cust => (
            <div key={cust.name} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
              <div className="bg-white hover:bg-slate-50 p-5 flex justify-between items-center transition-colors cursor-pointer" onClick={() => setExpandedCustomer(expandedCustomer === cust.name ? null : cust.name)}>
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">{cust.name.charAt(0)}</div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">{cust.name}</h3>
                    <p className="text-sm text-slate-500 font-medium">လုပ်ငန်းစဉ်/ငွေပေးချေမှု: {cust.history.length} ကြိမ်</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {cust.totalCustomerDebt > 0 && (
                     <div className="flex items-center gap-3">
                         <div className="text-right">
                            <p className="text-[10px] font-bold text-red-500 uppercase">ဖောက်သည် အကြွေး</p>
                            <p className="font-black text-lg text-red-600">{cust.totalCustomerDebt.toLocaleString()} <span className="text-xs font-normal text-slate-400">Ks</span></p>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); setPaymentModal({customer: cust.name, type: 'receive', debt: cust.totalCustomerDebt}); }} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-red-700">ကြွေးဆပ်မည်</button>
                     </div>
                  )}
                  {cust.totalMillDebt > 0 && (
                     <div className="flex items-center gap-3">
                         <div className="text-right">
                            <p className="text-[10px] font-bold text-green-600 uppercase">စက်မှ ပေးရန်ကျန်ငွေ</p>
                            <p className="font-black text-lg text-green-600">{cust.totalMillDebt.toLocaleString()} <span className="text-xs font-normal text-slate-400">Ks</span></p>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); setPaymentModal({customer: cust.name, type: 'pay', debt: cust.totalMillDebt}); }} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-green-700">ငွေရှင်းပေးမည်</button>
                     </div>
                  )}
                  <ChevronDown className={`text-slate-400 transition-transform ${expandedCustomer === cust.name ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {expandedCustomer === cust.name && (
                <div className="p-0 border-t border-slate-100 bg-slate-50/50">
                  <div className="grid grid-cols-2 bg-slate-100/50 p-4 border-b border-slate-200">
                     <div className="text-center">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">စုစုပေါင်း စပါးအဝင်</p>
                        <p className="font-black text-xl text-slate-800">{cust.totalPaddy} <span className="text-sm font-medium text-slate-500">တင်း</span></p>
                     </div>
                     <div className="text-center border-l border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ထုတ်ယူပြီး ဆန်အချော</p>
                        <p className="font-black text-xl text-blue-600">{cust.totalRice} <span className="text-sm font-medium text-blue-600/70">အိတ်</span></p>
                     </div>
                  </div>

                  <div className="p-4 border-b border-slate-100">
                     <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center"><Truck size={16} className="mr-2"/> ဆန်ထုတ်ပေးမှု မှတ်တမ်းများ (Delivery History)</h4>
                     <div className="space-y-2">
                        {cust.history.flatMap(h => h.deliveryLogs || []).length === 0 ? (
                           <p className="text-xs text-slate-400">ထုတ်ပေးမှု မှတ်တမ်း မရှိသေးပါ။</p>
                        ) : (
                           cust.history.flatMap(h => h.deliveryLogs || []).map((log, idx) => (
                             <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 text-sm flex flex-col gap-1">
                               <div className="flex justify-between font-bold text-slate-800">
                                 <span>{log.date}</span>
                                 <span>{log.carNo} ({log.driverName})</span>
                               </div>
                               <div className="text-slate-600 font-medium mt-1 text-xs">
                                 {log.out1 > 0 && <span className="mr-3 bg-green-50 text-green-700 px-2 py-0.5 rounded">အချော: {log.out1} အိတ်</span>}
                                 {log.out2 > 0 && <span className="mr-3 bg-slate-100 text-slate-700 px-2 py-0.5 rounded">By-product: {log.out2} အိတ်</span>}
                                 {log.out3 > 0 && <span className="mr-3 bg-red-50 text-red-700 px-2 py-0.5 rounded">Reject: {log.out3} အိတ်</span>}
                                 {log.bran > 0 && <span className="mr-3 bg-orange-50 text-orange-700 px-2 py-0.5 rounded">ဖွဲနု: {log.bran} အိတ်</span>}
                               </div>
                             </div>
                           ))
                        )}
                     </div>
                  </div>

                  <div className="p-4 bg-white border-b border-slate-100">
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center"><Edit3 size={14} className="mr-1"/> မှတ်ချက် (မှတ်တမ်းထားရန်)</label>
                     <textarea className="w-full p-3 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 resize-none h-16 bg-slate-50 text-slate-800" placeholder="မှတ်ချက်ရေးရန်..." value={customerRemarks[cust.name] || ''} onChange={e => updateRemark(cust.name, e.target.value)} />
                  </div>

                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left text-sm">
                      <thead className="text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="pb-3 px-4 font-bold">ရက်စွဲ / ID</th>
                          <th className="pb-3 px-4 font-bold">အမျိုးအစား/အခြေအနေ</th>
                          <th className="pb-3 px-4 font-bold text-right">ကျသင့်ငွေ/ပေးချေငွေ</th>
                          <th className="pb-3 px-4 font-bold text-right">အကြွေး / ပေးရန်ကျန်</th>
                          <th className="pb-3 px-4 font-bold text-right">လုပ်ဆောင်ချက်</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {cust.history.map(h => (
                          <tr key={h.id} className="hover:bg-slate-50">
                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-800 mb-0.5">{h.date}</div>
                              <div className="text-xs text-blue-600 font-medium">{h.id}</div>
                            </td>
                            <td className="py-4 px-4">
                              {h.status === 'payment' ? (
                                <span className="text-blue-600 font-bold">ငွေပေးချေမှု / ကြွေးဆပ်ခြင်း</span>
                              ) : (
                                <div>
                                  <span className="font-bold">{h.paddyType}</span> <span className="text-xs text-slate-400">({h.entryType === 'nawali' ? 'နဝလီ' : 'စက်ကြိတ်'})</span><br/>
                                  {h.status === 'billed' ? <span className="text-[10px] text-blue-600 font-bold uppercase mt-1 inline-block">ဘေလ်ရှင်းပြီး</span> : <span className="text-[10px] text-orange-600 font-bold uppercase mt-1 inline-block">လုပ်ဆောင်ဆဲ</span>}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right font-black text-[15px]">
                              {h.status === 'payment' ? (
                                <span className="text-blue-600">Paid: {Math.abs(h.amount).toLocaleString()}</span>
                              ) : h.billData?.netTotal !== undefined ? (
                                <span className={h.billData.netTotal < 0 ? 'text-green-600' : 'text-slate-800'}>
                                   {h.billData.netTotal < 0 ? `Refund: ${Math.abs(h.billData.netTotal).toLocaleString()}` : h.billData.netTotal.toLocaleString()}
                                </span> 
                              ) : '-'}
                            </td>
                            <td className="py-4 px-4 text-right font-black text-[15px]">
                              {h.status !== 'payment' && h.billData?.balance !== undefined ? (
                                h.billData.balance > 0 ? <span className="text-red-500">{h.billData.balance.toLocaleString()}</span> : 
                                h.billData.balance < 0 ? <span className="text-green-600">-{Math.abs(h.billData.balance).toLocaleString()}</span> : <span className="text-slate-400">-</span>
                              ) : '-'}
                            </td>
                            <td className="py-4 px-4 text-right">
                                {userRole === 'admin' && (
                                  <button onClick={() => showConfirm(`ဘောက်ချာ/မှတ်တမ်း No: ${h.id} အား အပြီးတိုင် ပယ်ဖျက်မှာ သေချာပါသလား?`, () => handleDeleteJob(h.id))} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                )}
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

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if(amt <= 0) return;
    setIsLoading(true);
    try {
        const newJob = {
            id: `PAY-${Date.now().toString().slice(-6)}`,
            customer: paymentModal.customer,
            status: 'payment',
            amount: paymentModal.type === 'receive' ? amt : -amt,
            date: getToday()
        };
        setJobs(prev => [newJob, ...prev]);
        const { error } = await supabase.from('jobs').insert([newJob]);
        if (error) throw error;

        setPaymentModal(null);
        setPaymentAmount('');
        showMessage("ငွေစာရင်း မှတ်တမ်းတင်ပြီးပါပြီ။", "success");
    } catch (err) {
        showMessage(err.message, "error");
        fetchData();
    } finally {
        setIsLoading(false);
    }
  };

  // Explicit Z-Index and independent overlay wrapper
  const ModalsOverlay = () => (
    <div className="relative z-[9999]">
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-bold text-slate-800">လုပ်ဆောင်နေသည်...</span>
          </div>
        </div>
      )}

      {alertConfig && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
            {alertConfig.type === 'error' ? <AlertCircle size={48} className="mx-auto text-red-500 mb-4"/> : <CheckCircle size={48} className="mx-auto text-green-500 mb-4"/>}
            <p className="text-lg font-bold text-slate-800 mb-8 whitespace-pre-wrap">{alertConfig.message}</p>
            <button onClick={() => setAlertConfig(null)} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 shadow-md">အိုကေ</button>
          </div>
        </div>
      )}

      {confirmConfig && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4"/>
            <p className="text-lg font-bold text-slate-800 mb-8 whitespace-pre-wrap">{confirmConfig.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmConfig(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 border border-slate-300">မလုပ်တော့ပါ</button>
              <button onClick={() => { confirmConfig.onConfirm(); setConfirmConfig(null); }} className="flex-1 bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-700 shadow-md">ဖျက်မည်</button>
            </div>
          </div>
        </div>
      )}
      
      {deliveryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="bg-blue-600 px-6 py-5 flex justify-between items-center text-white shrink-0">
                <h3 className="font-bold text-lg flex items-center"><Truck size={20} className="mr-2"/> ဆန်ထုတ်ပေးမှု မှတ်တမ်း</h3>
                <button onClick={() => setDeliveryModal(null)} className="hover:text-slate-200"><X size={24}/></button>
              </div>
              <div className="p-6 overflow-y-auto">
                 <div className="mb-6 border-b border-slate-100 pb-4">
                    <p className="font-black text-xl text-slate-800">{deliveryModal.customer}</p>
                    <p className="text-sm text-slate-500">ID: {deliveryModal.id}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div><label className="block text-xs font-bold text-slate-600 mb-1">ရက်စွဲ</label><input type="date" value={deliveryInput.date} onChange={e=>setDeliveryInput({...deliveryInput, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none text-slate-800" required/></div>
                    <div><label className="block text-xs font-bold text-slate-600 mb-1">ကားနံပါတ်</label><input type="text" value={deliveryInput.carNo} onChange={e=>setDeliveryInput({...deliveryInput, carNo: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none text-slate-800" placeholder="YGN-1234"/></div>
                    <div className="col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">လာရောက်ထုတ်ယူသူ အမည်</label><input type="text" value={deliveryInput.driverName} onChange={e=>setDeliveryInput({...deliveryInput, driverName: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none text-slate-800" placeholder="အမည်"/></div>
                 </div>
                 <h4 className="text-xs font-bold bg-slate-100 p-2 rounded text-slate-600 mb-4">ထုတ်ပေးမည့် အရေအတွက် (အိတ်)</h4>
                 <div className="grid grid-cols-2 gap-4">
                    {deliveryModal.rem1 > 0 && <div><label className="block text-xs font-bold text-green-700 mb-1">{deliveryModal.labels[0]} (Max: {deliveryModal.rem1})</label><input type="number" max={deliveryModal.rem1} min="0" value={deliveryInput.out1Qty} onChange={e=>setDeliveryInput({...deliveryInput, out1Qty: e.target.value})} className="w-full p-2.5 border-2 border-green-200 rounded-lg outline-none font-bold text-slate-800" placeholder="0"/></div>}
                    {deliveryModal.rem2 > 0 && <div><label className="block text-xs font-bold text-slate-700 mb-1">{deliveryModal.labels[1]} (Max: {deliveryModal.rem2})</label><input type="number" max={deliveryModal.rem2} min="0" value={deliveryInput.out2Qty} onChange={e=>setDeliveryInput({...deliveryInput, out2Qty: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold text-slate-800" placeholder="0"/></div>}
                    {deliveryModal.rem3 > 0 && <div><label className="block text-xs font-bold text-red-700 mb-1">{deliveryModal.labels[2]} (Max: {deliveryModal.rem3})</label><input type="number" max={deliveryModal.rem3} min="0" value={deliveryInput.out3Qty} onChange={e=>setDeliveryInput({...deliveryInput, out3Qty: e.target.value})} className="w-full p-2.5 border border-red-200 rounded-lg outline-none font-bold text-slate-800" placeholder="0"/></div>}
                    {deliveryModal.remBran > 0 && <div><label className="block text-xs font-bold text-orange-700 mb-1">ဖွဲနု (Max: {deliveryModal.remBran})</label><input type="number" max={deliveryModal.remBran} min="0" value={deliveryInput.branQty} onChange={e=>setDeliveryInput({...deliveryInput, branQty: e.target.value})} className="w-full p-2.5 border border-orange-200 rounded-lg outline-none font-bold text-slate-800" placeholder="0"/></div>}
                 </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3 shrink-0">
                 <button onClick={() => setDeliveryModal(null)} className="px-6 py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-700">ပယ်ဖျက်</button>
                 <button onClick={async () => {
                    setIsLoading(true);
                    try {
                        const newLog = {
                           id: Date.now().toString(), date: deliveryInput.date, carNo: deliveryInput.carNo, driverName: deliveryInput.driverName,
                           out1: Number(deliveryInput.out1Qty)||0, out2: Number(deliveryInput.out2Qty)||0, out3: Number(deliveryInput.out3Qty)||0, bran: Number(deliveryInput.branQty)||0
                        };
                        const updatedLogs = [...(deliveryModal.deliveryLogs || []), newLog];
                        setJobs(prev => prev.map(j => j.id === deliveryModal.id ? { ...j, deliveryLogs: updatedLogs } : j));
                        const { error } = await supabase.from('jobs').update({ deliveryLogs: updatedLogs }).eq('id', deliveryModal.id);
                        if (error) throw error;
                        setDeliveryModal(null); setDeliveryInput({date: getToday(), carNo: '', driverName: '', out1Qty: '', out2Qty: '', out3Qty: '', branQty: ''});
                        showMessage("ထုတ်ပေးမှု မှတ်တမ်းတင်ပြီးပါပြီ", "success");
                    } catch (err) {
                        showMessage(err.message, "error");
                        fetchData();
                    } finally {
                        setIsLoading(false);
                    }
                 }} className="flex-1 bg-blue-600 text-white font-bold rounded-xl shadow-md">အတည်ပြု မှတ်တမ်းတင်မည်</button>
              </div>
           </div>
        </div>
      )}

      {paymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`px-6 py-5 border-b flex justify-between items-center ${paymentModal.type === 'receive' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <div>
                <h3 className={`font-black text-lg ${paymentModal.type === 'receive' ? 'text-red-800' : 'text-green-800'}`}>{paymentModal.customer}</h3>
                <p className={`text-xs font-bold ${paymentModal.type === 'receive' ? 'text-red-600' : 'text-green-600'}`}>{paymentModal.type === 'receive' ? 'အကြွေးလာဆပ်ခြင်း' : 'စက်မှငွေရှင်းပေးခြင်း'}</p>
              </div>
              <button onClick={() => setPaymentModal(null)} className="text-slate-500 hover:text-slate-800 bg-white rounded-full p-1 shadow-sm"><X size={20}/></button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6">
              <div className="mb-6 text-center">
                <p className="text-sm font-bold text-slate-500 mb-1">{paymentModal.type === 'receive' ? 'လက်ရှိ အကြွေးကျန်ငွေ' : 'လက်ရှိ ပေးရန်ကျန်ငွေ'}</p>
                <p className={`text-3xl font-black ${paymentModal.type === 'receive' ? 'text-red-600' : 'text-green-600'}`}>{paymentModal.debt.toLocaleString()} <span className="text-lg font-medium">Ks</span></p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ပေးချေမည့် ငွေပမာဏ (ကျပ်)</label>
                <input type="number" required autoFocus value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} className="w-full p-4 border-2 border-slate-300 rounded-xl outline-none focus:border-blue-500 text-xl font-bold text-center text-slate-800" placeholder="0" min="1"/>
              </div>
              <button disabled={isLoading} type="submit" className={`w-full mt-6 py-4 rounded-xl text-white font-bold text-lg shadow-md transition-colors ${paymentModal.type === 'receive' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                အတည်ပြု မှတ်တမ်းတင်မည်
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, show: true },
    { id: 'gate', name: 'စပါးအဝင်/ဂိတ်', icon: Home, show: userRole === 'admin' || userRole === 'paddy_manager' },
    { id: 'paddy_warehouse', name: 'စပါး/နဝလီ ဂိုဒေါင်', icon: Factory, show: userRole === 'admin' || userRole === 'paddy_manager' },
    { id: 'milling', name: 'ကြိတ်ခွဲရေး ဌာန', icon: Tractor, show: userRole === 'admin' || userRole === 'rice_manager' },
    { id: 'sorting', name: 'Color Sorting', icon: ScanLine, show: userRole === 'admin' || userRole === 'rice_manager' },
    { id: 'rice_warehouse', name: 'ဆန်/ထွက်ကုန် ဂိုဒေါင်', icon: Factory, show: userRole === 'admin' || userRole === 'rice_manager' },
    { id: 'inventory', name: 'စက်ပိုင် ဆန်စာရင်း', icon: Package, show: userRole === 'admin' },
    { id: 'admin', name: 'ငွေစာရင်း (POS)', icon: Calculator, show: userRole === 'admin' },
    { id: 'customers', name: 'ဖောက်သည် အကြွေး', icon: Users, show: userRole === 'admin' },
    { id: 'opening_stock', name: 'လက်ကျန်စာရင်း (Opening)', icon: ClipboardList, show: userRole === 'admin' },
  ].filter(m => m.show);

  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans">
      <div className="w-[260px] bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 shrink-0">
        <div className="p-5 border-b border-slate-100 bg-blue-600 text-white">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white text-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-inner">စက်</div>
             <div>
               <h1 className="font-black text-lg leading-none">Mill ERP</h1>
               <p className="text-[10px] font-bold tracking-widest uppercase opacity-80 mt-1">ROLE: {userRole.replace('_', ' ')}</p>
             </div>
          </div>
        </div>
        <div className="flex-1 p-3 overflow-y-auto space-y-1">
          {menuItems.map(menu => (
            <button key={menu.id} onClick={() => setActiveView(menu.id)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeView === menu.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <menu.icon size={18} strokeWidth={activeView === menu.id ? 2.5 : 2} className={activeView === menu.id ? '' : 'opacity-70'}/>
              <span>{menu.name}</span>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-100">
           <button onClick={handleLogout} className="w-full py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors">ထွက်မည် (Logout)</button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 relative z-0">
        <div className="max-w-6xl mx-auto pb-20">
          {activeView === 'dashboard' && renderDashboard()}
          {activeView === 'gate' && renderGateView()}
          {activeView === 'paddy_warehouse' && renderPaddyWarehouseView()}
          {activeView === 'milling' && renderMillingView()}
          {activeView === 'sorting' && renderSortingView()}
          {activeView === 'rice_warehouse' && renderRiceWarehouseView()}
          {activeView === 'opening_stock' && renderOpeningStockView()}
          {activeView === 'inventory' && renderInventoryView()}
          {activeView === 'admin' && renderAdminView()}
          {activeView === 'customers' && renderCustomerLedgerView()}
        </div>
      </div>

      <ModalsOverlay />
    </div>
  );
}

render(<MillERP />, document.getElementById('root'));
