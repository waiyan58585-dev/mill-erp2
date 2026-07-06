import React, { useState, useEffect } from 'react';
import { render } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Home, Tractor, ScanLine, Package, Calculator, Users, Database,
  Plus, ArrowRight, CheckCircle, Droplets, Wind, LayoutDashboard,
  Receipt, Search, ChevronDown, ChevronUp, X, MapPin, Factory, ArrowDownToLine, Trash2, Edit3, Lock, LogOut, AlertCircle, Truck, ShieldAlert
} from 'lucide-react';

// ==========================================
// မဖြစ်မနေ ပြင်ဆင်ရန် (Supabase API Keys)
// ==========================================
const supabaseUrl = 'https://jgerimrkigxtphjcrafq.supabase.co'; // e.g., 'https://jgerimrkigxtphjcrafq.supabase.co'
const supabaseKey = 'sb_publishable_2jhGRP_tFpR9xuPgJEBBxA_2_HRJTUG'; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default function MillERP() {
  const [isConfigured, setIsConfigured] = useState(supabaseUrl !== 'YOUR_SUPABASE_URL');
  const [isLoading, setIsLoading] = useState(false);
  
  // --- Auth & Role State ---
  const [userRole, setUserRole] = useState(null); // 'admin', 'gate', 'mill'
  const [pinInput, setPinInput] = useState('');
  
  // --- Custom Dialog State ---
  const [dialogConfig, setDialogConfig] = useState(null); 

  // --- Navigation State ---
  const [activeView, setActiveView] = useState('dashboard'); 

  const getToday = () => new Date().toISOString().split('T')[0];

  const PADDY_STORAGE = ["B", "B/C ကြား", "C", "C/D ကြား", "D", "D/E ကြား", "E1", "E2", "E3", "Suncue", "Flat 1", "Flat 2", "Flat 3"];
  const RICE_STORAGE = ["A1", "CS ကွင်းသစ်", "CS ရှေ့", "B ကွင်း", "ဂိုဒေါင် အဟောင်း"];
  const DRYING_MACHINES = ["Suncue 1", "Suncue 2", "Flat 1", "Flat 2", "Flat 3"];

  // --- Database State ---
  const [jobs, setJobs] = useState([]);
  const [customerRemarks, setCustomerRemarks] = useState({});

  // --- Form States ---
  const [newJob, setNewJob] = useState({ entryType: 'paddy', purpose: 'mill', customer: '', paddyType: '', qty: '', moisture: 'အစို', storage: '', date: getToday() });
  const [activeJobId, setActiveJobId] = useState(null);
  
  // Drying Form
  const [dryingAllocations, setDryingAllocations] = useState([{ machine: '', qty: '' }]);
  const [dryQtyInput, setDryQtyInput] = useState('');
  const [dryStorageInput, setDryStorageInput] = useState('');
  
  // Mill & Sort Form
  const [millInput, setMillInput] = useState({ rice: '', riceStorage: '', broken12: '', broken12Storage: '', broken234: '', broken234Storage: '', bran: '', branStorage: '' });
  const [sortInput, setSortInput] = useState({ out1: '', storage1: '', out2: '', storage2: '', out3: '', storage3: '' });
  
  // Admin Billing Form
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [billInput, setBillInput] = useState({ 
    dryingRate: '', sortingRate: '', millingRate: '', 
    branOption: 'take', branRate: '', byproductOption: 'take', byproductRate: '', rejectOption: 'take', rejectRate: '', 
    otherExp: '', paidAmount: '' 
  });
  
  // Ledger & Payment Form
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Delivery Form
  const [deliveryModal, setDeliveryModal] = useState(null);
  const [deliveryInput, setDeliveryInput] = useState({ date: getToday(), carNo: '', driverName: '', items: {} });

  // Opening Stock Form
  const [osInput, setOsInput] = useState({ owner: 'merchant', customer: '', category: 'paddy', qty: '', storage: '', date: getToday() });

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

  const showMessage = (msg) => setDialogConfig({ type: 'alert', message: msg });
  const showConfirm = (msg, onConfirm) => setDialogConfig({ type: 'confirm', message: msg, onConfirm });

  const handleDeleteJob = (jobId) => {
    if (userRole !== 'admin') {
        showMessage('သင့်တွင် ဤမှတ်တမ်းအား ဖျက်သိမ်းခွင့် မရှိပါ။');
        return;
    }
    showConfirm(`မှတ်တမ်း No: ${jobId} အား အပြီးတိုင် ပယ်ဖျက်မှာ သေချာပါသလား?`, async () => {
      setJobs(prevJobs => prevJobs.filter(j => j.id !== jobId));
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
    if (pinInput === '9999') { setUserRole('admin'); setActiveView('dashboard'); } 
    else if (pinInput === '1111') { setUserRole('gate'); setActiveView('dashboard'); } 
    else if (pinInput === '2222') { setUserRole('mill'); setActiveView('dashboard'); } 
    else showMessage('PIN နံပါတ် မှားယွင်းနေပါသည်။');
    setPinInput('');
  };

  // --- Root Level Submission Handlers (Moved here to fix modal traps) ---
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if(amt <= 0) return;
    
    setPaymentModal(null);
    setIsLoading(true);

    const newJob = {
        id: `PAY-${Date.now().toString().slice(-6)}`, customer: paymentModal.customer,
        status: 'payment', amount: paymentModal.type === 'receive' ? amt : -amt, date: getToday()
    };
    
    setJobs(prev => [newJob, ...prev]); 
    await supabase.from('jobs').insert([newJob]);
    setPaymentAmount(''); setIsLoading(false);
    showMessage("ငွေစာရင်း မှတ်တမ်းတင်ပြီးပါပြီ။");
  };

  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    const job = deliveryModal.job;
    const items = deliveryInput.items;
    
    const totalToDeliver = Object.values(items).reduce((sum, val) => sum + (Number(val) || 0), 0);
    if (totalToDeliver <= 0) {
        return showMessage("ထုတ်ပေးမည့် အရေအတွက် အနည်းဆုံး တစ်ခု ထည့်ပါ။");
    }

    for (const [key, val] of Object.entries(items)) {
        if (Number(val) > deliveryModal.available[key]) {
            return showMessage(`အရေအတွက် မှားယွင်းနေပါသည်။ (လက်ကျန်ထက် ကျော်လွန်နေပါသည်)`);
        }
    }

    setDeliveryModal(null);
    setIsLoading(true);

    const newLog = {
        id: Date.now().toString(),
        date: deliveryInput.date,
        carNo: deliveryInput.carNo,
        driverName: deliveryInput.driverName,
        items: items
    };

    const updatedLogs = [...(job.deliveryLogs || []), newLog];
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, deliveryLogs: updatedLogs } : j));
    await supabase.from('jobs').update({ deliveryLogs: updatedLogs }).eq('id', job.id);
    
    setIsLoading(false);
    showMessage("ဆန်ထုတ်ပေးမှု မှတ်တမ်းတင်ပြီးပါပြီ။");
  };

  // --- Views ---

  const renderDashboardView = () => {
    const todayStr = getToday();
    const todayJobs = jobs.filter(j => j.date === todayStr);
    const todayPaddyBags = todayJobs.filter(j => j.entryType === 'paddy' && j.status !== 'payment').reduce((sum, j) => sum + j.originalQty, 0);
    
    const customerStatsForDash = {};
    jobs.forEach(job => {
        if(!customerStatsForDash[job.customer]) customerStatsForDash[job.customer] = { totalDebt: 0 };
        const stat = customerStatsForDash[job.customer];
        if (job.status === 'billed' && job.billData) stat.totalDebt += Number(job.billData.balance || 0);
        if (job.status === 'payment') stat.totalDebt -= job.amount;
    });

    let totalCustomerDebt = 0; 
    let totalMillPayable = 0;  
    Object.values(customerStatsForDash).forEach(c => {
        if (c.totalDebt > 0) totalCustomerDebt += c.totalDebt;
        else if (c.totalDebt < 0) totalMillPayable += Math.abs(c.totalDebt);
    });

    const pendingBillsCount = jobs.filter(j => j.status === 'ready_to_bill' || j.status === 'ready_to_bill_advance').length;
    const pendingDry = jobs.filter(j => j.status === 'stored_paddy' && j.moisture === 'အစို').length;
    const dryingNow = jobs.filter(j => j.status === 'drying').length;
    const pendingMill = jobs.filter(j => j.status === 'waiting_mill').length;
    const pendingSort = jobs.filter(j => j.status === 'waiting_sort').length;

    let todayDeliveries = 0;
    jobs.forEach(job => {
        if (job.deliveryLogs) {
            todayDeliveries += job.deliveryLogs.filter(log => log.date === todayStr).reduce((sum, log) => sum + Object.values(log.items).reduce((a,b)=>a+(Number(b)||0), 0), 0);
        }
    });

    if (userRole === 'admin') {
        return (
            <div className="animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><LayoutDashboard className="mr-3 text-blue-600"/> Admin Dashboard (ခြုံငုံသုံးသပ်ချက်)</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-red-500">
                        <p className="text-sm font-bold text-gray-500 mb-2">စုစုပေါင်း ဖောက်သည်အကြွေး</p>
                        <p className="text-3xl font-black text-red-600">{totalCustomerDebt.toLocaleString()} <span className="text-sm text-gray-500">Ks</span></p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
                        <p className="text-sm font-bold text-gray-500 mb-2">စက်မှ ပေးရန်ကျန်ငွေ</p>
                        <p className="text-3xl font-black text-green-600">{totalMillPayable.toLocaleString()} <span className="text-sm text-gray-500">Ks</span></p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
                        <p className="text-sm font-bold text-gray-500 mb-2">ယနေ့ စပါးအဝင်စုစုပေါင်း</p>
                        <p className="text-3xl font-black text-gray-800">{todayPaddyBags} <span className="text-sm">တင်း</span></p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-cyan-500">
                        <p className="text-sm font-bold text-gray-500 mb-2">ယနေ့ ဆန်ထုတ်ပေးမှု</p>
                        <p className="text-3xl font-black text-gray-800">{todayDeliveries} <span className="text-sm">အိတ်</span></p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center"><Factory size={18} className="mr-2 text-gray-500"/> စက်ရုံတွင်း လုပ်ငန်းအခြေအနေများ</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <span className="font-bold text-gray-600">အခြောက်ခံရန် စောင့်ဆိုင်းဆဲ</span>
                                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-lg font-black">{pendingDry}</span>
                            </div>
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <span className="font-bold text-gray-600">အခြောက်ခံနေဆဲ (စက်လည်နေဆဲ)</span>
                                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-lg font-black">{dryingNow}</span>
                            </div>
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <span className="font-bold text-gray-600">ကြိတ်ခွဲရန် စောင့်ဆိုင်းဆဲ</span>
                                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-lg font-black">{pendingMill}</span>
                            </div>
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <span className="font-bold text-gray-600">Color Sort ရန် စောင့်ဆိုင်းဆဲ</span>
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-black">{pendingSort}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center"><Calculator size={18} className="mr-2 text-gray-500"/> ဘေလ်ဖွင့်ရန်ကျန်သော စာရင်းများ</h3>
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-black text-xs">{pendingBillsCount} ခု</span>
                        </div>
                        <div className="space-y-3">
                            {jobs.filter(j => j.status === 'ready_to_bill' || j.status === 'ready_to_bill_advance').slice(0, 5).map(job => (
                                <div key={job.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                                    <div>
                                        <p className="font-bold text-gray-800">{job.customer}</p>
                                        <p className="text-xs text-gray-500">{job.id} • {job.paddyType}</p>
                                    </div>
                                    <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">ဘေလ်ဖွင့်ရန်အသင့်</span>
                                </div>
                            ))}
                            {pendingBillsCount === 0 && <p className="text-sm text-gray-500 text-center py-8 font-bold border border-dashed border-gray-200 rounded-xl">ဖွင့်ရန်ကျန်သော ဘောက်ချာ မရှိပါ။</p>}
                        </div>
                        <button onClick={() => setActiveView('admin')} className="w-full mt-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors border border-gray-200">ငွေစာရင်းဌာနသို့ သွားမည်</button>
                    </div>
                </div>
            </div>
        );
    }

    if (userRole === 'gate') {
        return (
            <div className="animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><LayoutDashboard className="mr-3 text-blue-600"/> စပါးတာဝန်ခံ Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
                        <p className="text-sm font-bold text-gray-500 mb-2">ယနေ့ စပါးအဝင်</p>
                        <p className="text-3xl font-black text-gray-800">{todayPaddyBags} <span className="text-sm">တင်း</span></p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-orange-500">
                        <p className="text-sm font-bold text-gray-500 mb-2">အခြောက်ခံရန် ကျန် (အစို)</p>
                        <p className="text-3xl font-black text-orange-600">{pendingDry} <span className="text-sm">စာရင်း</span></p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-orange-500">
                        <p className="text-sm font-bold text-gray-500 mb-2">စက်လည်နေဆဲ</p>
                        <p className="text-3xl font-black text-orange-600">{dryingNow} <span className="text-sm">စာရင်း</span></p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4">လုပ်ဆောင်ရန်</h3>
                    <div className="flex gap-4">
                        <button onClick={()=>setActiveView('gate')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md">စပါးအဝင် စာရင်းသွင်းမည်</button>
                        <button onClick={()=>setActiveView('paddy_warehouse')} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 shadow-md">စပါးဂိုဒေါင်သို့ သွားမည်</button>
                    </div>
                </div>
            </div>
        );
    }

    if (userRole === 'mill') {
        return (
            <div className="animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><LayoutDashboard className="mr-3 text-blue-600"/> စက်ရုံတာဝန်ခံ Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-purple-500">
                        <p className="text-sm font-bold text-gray-500 mb-2">ကြိတ်ခွဲရန် စောင့်ဆိုင်းဆဲ</p>
                        <p className="text-3xl font-black text-purple-600">{pendingMill} <span className="text-sm">စာရင်း</span></p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
                        <p className="text-sm font-bold text-gray-500 mb-2">Color Sort ရန် ကျန်</p>
                        <p className="text-3xl font-black text-blue-600">{pendingSort} <span className="text-sm">စာရင်း</span></p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
                        <p className="text-sm font-bold text-gray-500 mb-2">ယနေ့ ဆန်ထုတ်ပေးမှု</p>
                        <p className="text-3xl font-black text-green-600">{todayDeliveries} <span className="text-sm">အိတ်</span></p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4">လုပ်ဆောင်ရန်</h3>
                    <div className="flex gap-4">
                        <button onClick={()=>setActiveView('milling')} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 shadow-md">ကြိတ်ခွဲရေးဌာနသို့ သွားမည်</button>
                        <button onClick={()=>setActiveView('rice_warehouse')} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 shadow-md">ဆန်ဂိုဒေါင်သို့ သွားမည်</button>
                    </div>
                </div>
            </div>
        );
    }
  };

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

      const initialStatus = newJob.entryType === 'nawali' ? 'stored_nawali' : 'stored_paddy';
      const isWet = newJob.entryType === 'paddy' && newJob.moisture === 'အစို';

      const jobData = {
        id: newJobId, customer: newJob.customer, entryType: newJob.entryType, purpose: newJob.entryType === 'nawali' ? 'mill' : newJob.purpose,
        paddyType: newJob.paddyType, originalQty: Number(newJob.qty), currentQty: Number(newJob.qty),
        moisture: newJob.entryType === 'nawali' ? 'အခြောက်' : newJob.moisture, wasWet: isWet, storage: newJob.storage || '-',
        status: initialStatus, date: newJob.date, deliveryLogs: []
      };
      
      setJobs([jobData, ...jobs]);
      const { error } = await supabase.from('jobs').insert([jobData]);
      if (error) showMessage("Database Error: " + error.message);
      else {
        setNewJob({ ...newJob, customer: '', paddyType: '', qty: '', storage: '' });
        showMessage("စပါးဂိုဒေါင်သို့ စာရင်းသွင်းပြီးပါပြီ။ ID: " + newJobId);
      }
      setIsLoading(false);
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Home className="mr-3 text-blue-600"/> စပါးလက်ခံ / ဂိတ်ဝင် ဌာန</h2>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center"><ArrowDownToLine size={18} className="mr-2 text-blue-500"/> အဝင် စာရင်းသစ်သွင်းရန် (ဂိုဒေါင်သို့ တန်းဝင်မည်)</h3>
          <form onSubmit={handleAddJob} className="space-y-4">
            <div className="flex bg-gray-100 p-1 rounded-xl w-full max-w-md mb-4 border border-gray-200">
              <button type="button" onClick={() => setNewJob({...newJob, entryType: 'paddy'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newJob.entryType === 'paddy' ? 'bg-white text-blue-700 shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}>စပါးအဝင်</button>
              <button type="button" onClick={() => setNewJob({...newJob, entryType: 'nawali'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newJob.entryType === 'nawali' ? 'bg-white text-orange-700 shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}>နဝလီ (Color Sort အဝင်)</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
              <div><label className="block text-xs font-bold text-gray-600 mb-1.5">ရက်စွဲ</label><input type="date" value={newJob.date} onChange={e=>setNewJob({...newJob, date: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 text-gray-900" required /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1.5">ဖောက်သည်အမည်</label><input type="text" value={newJob.customer} onChange={e=>setNewJob({...newJob, customer: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 text-gray-900" required placeholder="အမည်" /></div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">{newJob.entryType === 'paddy' ? 'စပါးအမျိုးအစား' : 'ဆန်အမျိုးအစား'}</label>
                <input type="text" list="paddyTypes" value={newJob.paddyType} onChange={e=>setNewJob({...newJob, paddyType: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 text-gray-900" required placeholder="ရွေးပါ..." />
                <datalist id="paddyTypes"><option value="ကောက်ညှင်း" /><option value="အကြမ်းဆန်" /><option value="ပေါ်ဆန်း" /><option value="ဧည့်မထ" /><option value="စကွဲ" /></datalist>
              </div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1.5">အရေအတွက် ({newJob.entryType === 'paddy' ? 'တင်း' : 'အိတ်'})</label><input type="number" value={newJob.qty} onChange={e=>setNewJob({...newJob, qty: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 text-gray-900" required placeholder="0" min="1"/></div>
              
              {newJob.entryType === 'paddy' && (
                <>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1.5">အစို / အခြောက်</label><select value={newJob.moisture} onChange={e=>setNewJob({...newJob, moisture: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 text-gray-900 font-bold"><option value="အစို">အစို (အခြောက်ခံမည်)</option><option value="အခြောက်">အခြောက် (ကြိတ်ခွဲမည်)</option></select></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1.5">လုပ်ငန်းရည်ရွယ်ချက်</label><select value={newJob.purpose} onChange={e=>setNewJob({...newJob, purpose: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 text-gray-900 font-bold"><option value="mill">စက်ကြိတ်မည်</option><option value="dry_only">အခြောက်ခံရုံ သီးသန့်</option></select></div>
                </>
              )}
              <div className="col-span-1 md:col-span-2">
                 <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center"><MapPin size={12} className="mr-1"/> ချထားမည့် သိုလှောင်ရုံ/နေရာ</label>
                 <input type="text" list="storageLocations" value={newJob.storage} onChange={e=>setNewJob({...newJob, storage: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 text-gray-900" required placeholder="နေရာသတ်မှတ်ပါ"/>
                 <datalist id="storageLocations">{newJob.entryType === 'paddy' ? PADDY_STORAGE.map(s => <option key={s} value={s}/>) : RICE_STORAGE.map(s => <option key={s} value={s}/>)}</datalist>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-100 mt-6">
              <button disabled={isLoading} type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-bold shadow-md transition-colors text-sm flex items-center">{isLoading ? 'Processing...' : <><Plus size={18} className="mr-2"/> ဂိုဒေါင်သို့ စာရင်းသွင်းမည်</>}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderOpeningStockView = () => {
    const handleOsSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const id = `OPN-${Date.now().toString().slice(-6)}`;
        const qty = Number(osInput.qty);

        let jobData = {
            id, date: osInput.date, customer: osInput.owner === 'mill' ? 'စက်ပိုင် (လက်ကျန်)' : osInput.customer,
            paddyType: 'အထွေထွေ', entryType: 'paddy', deliveryLogs: []
        };

        if (osInput.category === 'paddy') {
            jobData.status = 'stored_paddy';
            jobData.purpose = 'mill';
            jobData.originalQty = qty;
            jobData.currentQty = qty;
            jobData.moisture = 'အခြောက်';
            jobData.storage = osInput.storage;
        } else {
            jobData.status = osInput.owner === 'mill' ? 'billed' : 'ready_to_bill';
            jobData.purpose = 'mill';
            jobData.millingData = {};
            jobData.sortingData = {};
            jobData.billData = {};

            if (osInput.category === 'rice') {
                jobData.sortingData.out1 = qty; jobData.sortingData.storage1 = osInput.storage;
                if (osInput.owner === 'mill') jobData.billData.riceOption = 'sell';
            } else if (osInput.category === 'broken12') {
                jobData.millingData.broken12 = qty; jobData.millingData.broken12Storage = osInput.storage;
                if (osInput.owner === 'mill') jobData.billData.broken12Option = 'sell';
            } else if (osInput.category === 'broken234') {
                jobData.millingData.broken234 = qty; jobData.millingData.broken234Storage = osInput.storage;
                if (osInput.owner === 'mill') jobData.billData.broken234Option = 'sell';
            } else if (osInput.category === 'bran') {
                jobData.millingData.bran = qty; jobData.millingData.branStorage = osInput.storage;
                if (osInput.owner === 'mill') jobData.billData.branOption = 'sell';
            } else if (osInput.category === 'byproduct') {
                jobData.sortingData.out2 = qty; jobData.sortingData.storage2 = osInput.storage;
                if (osInput.owner === 'mill') jobData.billData.byproductOption = 'sell';
            } else if (osInput.category === 'reject') {
                jobData.sortingData.out3 = qty; jobData.sortingData.storage3 = osInput.storage;
                if (osInput.owner === 'mill') jobData.billData.rejectOption = 'sell';
            }
        }

        setJobs([jobData, ...jobs]);
        const { error } = await supabase.from('jobs').insert([jobData]);
        if (error) showMessage("Database Error: " + error.message);
        else {
            showMessage("လက်ကျန်စာရင်း (Ground Data) ထည့်သွင်းပြီးပါပြီ။");
            setOsInput({ owner: 'merchant', customer: '', category: 'paddy', qty: '', storage: '', date: getToday() });
        }
        setIsLoading(false);
    };

    return (
        <div className="animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Database className="mr-3 text-gray-600"/> လက်ကျန်စာရင်းသွင်းရန် (Opening Stock)</h2>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 max-w-3xl">
                <p className="text-sm text-gray-500 mb-6 font-medium">စနစ်မသုံးခင်ကတည်းက ရှိနေသော စပါး/ဆန်/ဖွဲနု အစရှိသည့် Ground Data များကို ဂိုဒေါင်တွင်းသို့ တိုက်ရိုက် ထည့်သွင်းနိုင်ပါသည်။</p>
                <form onSubmit={handleOsSubmit} className="space-y-5">
                    <div className="flex bg-gray-100 p-1 rounded-xl w-full max-w-md border border-gray-200">
                        <button type="button" onClick={() => setOsInput({...osInput, owner: 'merchant'})} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${osInput.owner === 'merchant' ? 'bg-white text-blue-700 shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}>ကုန်သည်ပိုင် (Merchant)</button>
                        <button type="button" onClick={() => setOsInput({...osInput, owner: 'mill'})} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${osInput.owner === 'mill' ? 'bg-white text-cyan-700 shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}>စက်ပိုင် (Mill Owned)</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div><label className="block text-xs font-bold text-gray-600 mb-1.5">ရက်စွဲ</label><input type="date" value={osInput.date} onChange={e=>setOsInput({...osInput, date: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 text-sm outline-none focus:border-blue-500" required/></div>
                        {osInput.owner === 'merchant' && (
                            <div><label className="block text-xs font-bold text-gray-600 mb-1.5">ဖောက်သည်အမည်</label><input type="text" value={osInput.customer} onChange={e=>setOsInput({...osInput, customer: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 text-sm outline-none focus:border-blue-500" required placeholder="အမည်"/></div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5">ပစ္စည်းအမျိုးအစား</label>
                            <select value={osInput.category} onChange={e=>setOsInput({...osInput, category: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 text-sm font-bold outline-none focus:border-blue-500">
                                <option value="paddy">စပါး</option><option value="rice">ဆန်အချော</option><option value="broken12">၁၂ ဆန်ကွဲ</option><option value="broken234">၂၃၄ ဆန်ကွဲ</option>
                                <option value="bran">ဖွဲနု</option><option value="byproduct">ဗိုက်ဖြူ/အကြမ်း (By-product)</option><option value="reject">ဆန်အမည်း (Reject)</option>
                            </select>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1.5">အရေအတွက် ({osInput.category === 'paddy' ? 'တင်း' : 'အိတ်'})</label><input type="number" min="1" value={osInput.qty} onChange={e=>setOsInput({...osInput, qty: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 text-sm font-bold outline-none focus:border-blue-500" required placeholder="0"/></div>
                        <div className="col-span-1 md:col-span-2"><label className="block text-xs font-bold text-gray-600 mb-1.5">ဂိုဒေါင်/ထားသိုရာနေရာ</label><input type="text" list="osStorageLocations" value={osInput.storage} onChange={e=>setOsInput({...osInput, storage: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 text-sm outline-none focus:border-blue-500" required placeholder="နေရာ..."/></div>
                        <datalist id="osStorageLocations">{osInput.category === 'paddy' ? PADDY_STORAGE.map(s => <option key={s} value={s}/>) : RICE_STORAGE.map(s => <option key={s} value={s}/>)}</datalist>
                    </div>

                    <div className="pt-4 mt-2">
                        <button disabled={isLoading} type="submit" className="w-full bg-gray-800 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-gray-900 transition-colors">အတည်ပြု စာရင်းသွင်းမည်</button>
                    </div>
                </form>
            </div>
        </div>
    );
  };

  const renderPaddyWarehouseView = () => {
    const handleSendToDryerFromWarehouse = async (jobId) => {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'waiting_dry' } : j));
      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'waiting_dry' }).eq('id', jobId);
      setIsLoading(false);
      showMessage("အခြောက်ခံစက်ဌာနသို့ လွှဲပြောင်းပေးပို့ပြီးပါပြီ။");
    }

    const handleSendToMill = async (jobId) => {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'waiting_mill' } : j));
      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'waiting_mill' }).eq('id', jobId);
      setIsLoading(false);
      showMessage("ကြိတ်ခွဲရေးဌာနသို့ လွှဲပြောင်းပေးပို့ပြီးပါပြီ။");
    }

   // ... existing code ...
    const handleSendToSort = async (jobId) => {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'waiting_sort' } : j));
      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'waiting_sort' }).eq('id', jobId);
      setIsLoading(false);
      showMessage("Color Sorting ဌာနသို့ လွှဲပြောင်းပေးပို့ပြီးပါပြီ။");
    }

    const handleStartDrying = async (jobId) => {
        const job = jobs.find(j => j.id === jobId);
        if (!job) return showMessage("စာရင်း ရှာမတွေ့ပါ။");

        const isValid = dryingAllocations.every(a => a.machine && Number(a.qty) > 0);
        if(!isValid || dryingAllocations.length === 0) return showMessage("စက်အမည် နှင့် တင်းအရေအတွက် အမှန် ထည့်ပါ။");

        const totalDryingQty = dryingAllocations.reduce((sum, a) => sum + Number(a.qty), 0);

        if (totalDryingQty > job.currentQty) {
            return showMessage(`ထည့်သွင်းသော တင်းစုစုပေါင်း (${totalDryingQty}) သည် လက်ကျန်တင်း (${job.currentQty}) ထက် များနေပါသည်။`);
        }

        setIsLoading(true);

        if (totalDryingQty < job.currentQty) {
            // စပါးတစ်ချို့သာထည့်ခြင်း (Partial Allocation - Split Job)
            const newJobId = `${job.id}-${Date.now().toString().slice(-3)}`;
            
            const newJob = {
                ...job,
                id: newJobId,
                originalQty: totalDryingQty,
                currentQty: totalDryingQty,
                status: 'drying',
                dryingMachines: dryingAllocations
            };

            const updatedOldJob = {
                ...job,
                originalQty: job.originalQty - totalDryingQty,
                currentQty: job.currentQty - totalDryingQty
            };

            setJobs(prev => prev.map(j => j.id === jobId ? updatedOldJob : j).concat(newJob));

            // Database Update လုပ်ခြင်း
            await supabase.from('jobs').update({
                originalQty: updatedOldJob.originalQty,
                currentQty: updatedOldJob.currentQty
            }).eq('id', jobId);

            await supabase.from('jobs').insert([newJob]);
            showMessage(`စပါး ${totalDryingQty} တင်းကို စက်ထဲထည့်ပြီးပါပြီ။ ကျန် ${updatedOldJob.currentQty} တင်း အစိုစာရင်းတွင် ဆက်ရှိနေပါမည်။`);
        } else {
            // စပါးအားလုံး အပြည့်ထည့်ခြင်း (Full Allocation)
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'drying', dryingMachines: dryingAllocations } : j));
            await supabase.from('jobs').update({ status: 'drying', dryingMachines: dryingAllocations }).eq('id', jobId);
            showMessage("အခြောက်ခံစက်သို့ အပြည့်အဝ ပို့ဆောင်ပြီးပါပြီ။");
        }

        setActiveJobId(null);
        setIsLoading(false);
    };

    const handleDryingDone = async (job, nextStatusAction) => {
// ... existing code ...
      
        const updatedJob = { ...job, currentQty: Number(dryQtyInput), storage: dryStorageInput, moisture: 'အခြောက်', status: nextStatusAction };
        setJobs(prev => prev.map(j => j.id === job.id ? updatedJob : j));
        
        setIsLoading(true);
        await supabase.from('jobs').update({ 
          currentQty: Number(dryQtyInput), storage: dryStorageInput, moisture: 'အခြောက်', status: nextStatusAction
        }).eq('id', job.id);
        
        setActiveJobId(null); setDryQtyInput(''); setDryStorageInput('');
        setIsLoading(false);
        
        if(nextStatusAction === 'ready_to_bill_advance') {
          showMessage("အခြောက်ခံခ ဘေလ်ကြိုဖွင့်ရန် ငွေစာရင်းဌာနသို့ ပို့ဆောင်ပြီးပါပြီ။ စပါးသည် ဂိုဒေါင်တွင် ဆက်ရှိနေပါမည်။");
        } else {
          showMessage("စပါးဂိုဒေါင်သို့ သိမ်းဆည်းပြီးပါပြီ။ (ကြိတ်ခွဲရန် အသင့်)");
        }
    };

    const paddyJobs = jobs.filter(j => j.status === 'stored_paddy' || j.status === 'ready_to_bill_advance');
    const nawaliJobs = jobs.filter(j => j.status === 'stored_nawali');
    const waitingDryJobs = jobs.filter(j => j.status === 'waiting_dry');
    const dryingJobs = jobs.filter(j => j.status === 'drying');

    return (
      <div className="animate-in fade-in duration-300 space-y-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center"><Package className="mr-3 text-orange-600"/> စပါး / နဝလီ ဂိုဒေါင် နှင့် အခြောက်ခံစက်</h2>
        
        <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-sm">
           <div className="bg-orange-50 p-5 border-b border-orange-200">
               <h3 className="font-bold text-orange-900">ဂိုဒေါင်တွင်း လက်ကျန်စပါး/နဝလီ (စက်ချရန်အသင့်)</h3>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 text-sm">
                  <tr><th className="p-4 font-bold">ဘောက်ချာ / ဖောက်သည်</th><th className="p-4 font-bold">အမျိုးအစား / အစိုအခြောက်</th><th className="p-4 font-bold">နေရာ နှင့် အရေအတွက်</th><th className="p-4 font-bold text-center">လုပ်ဆောင်ချက်</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800">
                  {[...paddyJobs, ...nawaliJobs].map(job => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="p-4 align-middle">
                        <div className="font-bold text-gray-800">{job.id}</div>
                        <div className="text-sm font-bold text-gray-500">{job.customer}</div>
                        {userRole === 'admin' && (
                            <button onClick={() => handleDeleteJob(job.id)} className="mt-2 text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 flex items-center w-fit"><Trash2 size={12} className="mr-1"/> ဖျက်မည်</button>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                         {job.entryType === 'nawali' ? (
                             <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200">နဝလီ ({job.paddyType})</span>
                         ) : (
                             <div>
                                 <span className="font-bold text-sm block mb-1">{job.paddyType}</span>
                                 {job.moisture === 'အစို' ? <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-200">အစို (အခြောက်ခံရန်လို)</span> : <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-bold border border-orange-200">အခြောက် (ကြိတ်ရန်အသင့်)</span>}
                             </div>
                         )}
                      </td>
                      <td className="p-4 align-middle">
                         <div className="flex items-center text-sm font-bold">
                           <MapPin size={16} className="text-gray-400 mr-2"/><span className="text-blue-600 mr-2">{job.storage}</span> <ArrowRight size={12} className="text-gray-300 mx-2"/> <span>{job.currentQty} {job.entryType==='nawali'?'အိတ်':'တင်း'}</span>
                         </div>
                      </td>
                      <td className="p-4 align-middle text-center">
                         {job.entryType === 'nawali' ? (
                           <button onClick={()=>handleSendToSort(job.id)} className="bg-blue-100 hover:bg-blue-600 hover:text-white text-blue-700 font-bold px-4 py-2 rounded-lg text-xs transition-colors">Sorting ပို့မည်</button>
                         ) : job.moisture === 'အစို' ? (
                           <button onClick={()=>handleSendToDryerFromWarehouse(job.id)} className="bg-orange-100 hover:bg-orange-600 hover:text-white text-orange-700 font-bold px-4 py-2 rounded-lg text-xs transition-colors"><Wind size={14} className="inline mr-1"/> အခြောက်ခံစက် ပို့မည်</button>
                         ) : (
                           <button onClick={()=>handleSendToMill(job.id)} className="bg-purple-100 hover:bg-purple-600 hover:text-white text-purple-700 font-bold px-4 py-2 rounded-lg text-xs transition-colors">ကြိတ်ခွဲရေး ပို့မည်</button>
                         )}
                      </td>
                    </tr>
                  ))}
                  {[...paddyJobs, ...nawaliJobs].length === 0 && <tr><td colSpan="4" className="p-6 text-center text-gray-400 font-bold">စပါးဂိုဒေါင်တွင် လက်ကျန် မရှိပါ။</td></tr>}
                </tbody>
              </table>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-orange-200 shadow-sm flex flex-col">
                <div className="bg-orange-50 p-5 border-b border-orange-200"><h3 className="font-bold text-orange-900 flex items-center"><Droplets size={20} className="mr-2"/> အခြောက်ခံစက်သို့ ထည့်ရန် (စောင့်ဆိုင်း)</h3></div>
                <div className="p-5 space-y-4 flex-1 overflow-y-auto bg-gray-50">
                {waitingDryJobs.map(job => (
                    <div key={job.id} className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="font-black text-gray-800 block text-lg">{job.customer}</span>
                            <span className="text-sm font-semibold text-gray-500 mt-1 block">{job.id} • {job.paddyType}</span>
                        </div>
                        <div className="text-right">
                            <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded font-bold uppercase block mb-1">{job.currentQty} တင်း (အစို)</span>
                            <span className="text-xs text-gray-500"><MapPin size={12} className="inline mr-1"/>{job.storage} (ဂိုဒေါင်)</span>
                        </div>
                    </div>
                    {activeJobId === job.id + '-todry' ? (
                        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-100">
                        {dryingAllocations.map((alloc, idx) => (
                            <div key={idx} className="flex gap-2">
                            <input type="text" list="dryingMachines" value={alloc.machine} onChange={e => { const newA = [...dryingAllocations]; newA[idx].machine = e.target.value; setDryingAllocations(newA); }} className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900" placeholder="စက်အမည်..." required/>
                            <input type="number" value={alloc.qty} onChange={e => { const newA = [...dryingAllocations]; newA[idx].qty = e.target.value; setDryingAllocations(newA); }} className="w-24 p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900" placeholder="တင်း" required min="1"/>
                            </div>
                        ))}
                        <div className="flex justify-between items-center mt-2">
                            <button onClick={() => setDryingAllocations([...dryingAllocations, { machine: '', qty: '' }])} className="text-xs font-bold text-blue-600">စက်ထပ်ထည့်မည်</button>
                            <div className="flex gap-2">
                                <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">ပယ်ဖျက်</button>
                                <button disabled={isLoading} onClick={() => handleStartDrying(job.id)} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold shadow-md">စက်လည်မည်</button>
                            </div>
                        </div>
                        </div>
                    ) : <button onClick={() => { setActiveJobId(job.id + '-todry'); setDryingAllocations([{machine: '', qty: job.currentQty}]); }} className="w-full mt-2 bg-orange-50 text-orange-700 py-2.5 rounded-lg text-sm font-bold hover:bg-orange-100">စက်ထဲ ခွဲထည့်မည်</button>}
                    </div>
                ))}
                {waitingDryJobs.length === 0 && <p className="text-gray-400 text-sm font-bold text-center py-6">စောင့်ဆိုင်းစာရင်း မရှိပါ။</p>}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-red-200 shadow-sm flex flex-col">
                <div className="bg-red-50 p-5 border-b border-red-200"><h3 className="font-bold text-red-900 flex items-center"><Wind size={20} className="mr-2"/> အခြောက်ခံနေဆဲ</h3></div>
                <div className="p-5 space-y-4 flex-1 overflow-y-auto bg-gray-50">
                {dryingJobs.map(job => (
                    <div key={job.id} className="bg-white p-5 rounded-xl border border-red-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                    <div className="flex justify-between items-start mb-4 pl-3">
                        <div>
                            <span className="font-black text-gray-800 block text-lg">{job.customer}</span>
                            <span className="text-sm font-bold text-gray-500 mt-1 block">{job.id} • {job.paddyType}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-black text-red-600 block mb-1">{job.originalQty} တင်း ဝင်ထား</span>
                        </div>
                    </div>
                    
                    {activeJobId === job.id + '-finish' ? (
                        <div className="mt-4 pt-4 border-t border-red-100 space-y-4 pl-3">
                        <div><label className="text-xs font-bold text-red-800 block mb-1.5">ကျန်ရှိမည့် တင်း (အခြောက်)</label><input type="number" value={dryQtyInput} onChange={e=>setDryQtyInput(e.target.value)} className="w-full p-3 border-2 border-red-300 rounded-xl outline-none bg-white text-gray-900 font-black" required/></div>
                        <div><label className="text-xs font-bold text-gray-600 block mb-1.5">သိုလှောင်မည့် စပါးဂိုဒေါင် အသစ်</label><input type="text" list="storageLocations" value={dryStorageInput} onChange={e=>setDryStorageInput(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900" required/></div>
                        
                        <div className="flex gap-2 pt-2">
                            <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-bold">ပယ်ဖျက်</button>
                        </div>
                        
                        <div className="flex flex-col gap-3 pt-1 border-t border-gray-100 mt-2">
                            <button disabled={isLoading} onClick={() => handleDryingDone(job, 'stored_paddy')} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold shadow-md">
                            စပါးဂိုဒေါင်သို့ သိမ်းဆည်းမည် (ပုံမှန်)
                            </button>
                            <button disabled={isLoading} onClick={() => handleDryingDone(job, 'ready_to_bill_advance')} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-bold shadow-md flex items-center justify-center">
                            <Receipt size={16} className="mr-2"/> ဂိုဒေါင်သိမ်းပြီး ဘေလ်ကြိုဖွင့်မည်
                            </button>
                        </div>
                        </div>
                    ) : <div className="pl-3 mt-4 border-t border-gray-100 pt-4"><button onClick={() => setActiveJobId(job.id + '-finish')} className="w-full bg-red-50 text-red-700 py-3 rounded-xl text-sm font-bold hover:bg-red-100 shadow-sm">အခြောက်ခံပြီးစီး</button></div>}
                    </div>
                ))}
                {dryingJobs.length === 0 && <p className="text-gray-400 text-sm font-bold text-center py-6">အခြောက်ခံနေဆဲ မရှိပါ။</p>}
                </div>
            </div>
        </div>
      </div>
    );
  };

  const renderMillingView = () => {
    const handleMillDone = async (jobId) => {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'waiting_sort', millingData: millInput } : j));
      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'waiting_sort', millingData: millInput }).eq('id', jobId);
      setActiveJobId(null);
      setMillInput({ rice: '', riceStorage: '', broken12: '', broken12Storage: '', broken234: '', broken234Storage: '', bran: '', branStorage: '' });
      setIsLoading(false);
      showMessage("Color Sorting ဌာနသို့ လွှဲပြောင်းပြီးပါပြီ။");
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Tractor className="mr-3 text-purple-600"/> ကြိတ်ခွဲရေး ဌာန</h2>
        <div className="space-y-5">
          {jobs.filter(j => j.status === 'waiting_mill' && j.purpose === 'mill').map(job => (
            <div key={job.id} className="bg-white p-6 rounded-2xl border-l-4 border-l-purple-500 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-black text-2xl text-gray-800">{job.customer}</h3>
                  <div className="text-sm font-bold text-gray-500 mt-2">{job.id} • {job.paddyType} <span className="text-purple-600 ml-2 bg-purple-50 px-2 py-0.5 rounded">စပါး ({job.currentQty || 0} တင်း)</span></div>
                </div>
                <div className="text-right flex flex-col items-end">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-black uppercase block">ကြိတ်ရန်အသင့်</span>
                     {userRole === 'admin' && <button onClick={() => handleDeleteJob(job.id)} className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent" title="ပယ်ဖျက်မည်"><Trash2 size={16} /></button>}
                   </div>
                   {job.advanceBillData && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-[10px] font-bold block mb-2">အခြောက်ခံခ ရှင်းပြီး</span>}
                   <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200"><MapPin size={12} className="inline mr-1"/>{job.storage}</span>
                </div>
              </div>
              
              {activeJobId === job.id ? (
                <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    {/* Rice Input */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100">
                      <label className="text-xs font-bold text-gray-700 block mb-2">ဆန်အကြမ်း (အိတ်)</label>
                      <input type="number" value={millInput.rice} onChange={e=>setMillInput({...millInput, rice: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl bg-white text-gray-900 font-bold mb-2" placeholder="အရေအတွက်"/>
                    </div>
                    {/* Broken 12 Input */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                      <label className="text-xs font-bold text-blue-700 block mb-2">၁၂ ဆန်ကွဲ (အိတ်)</label>
                      <input type="number" value={millInput.broken12} onChange={e=>setMillInput({...millInput, broken12: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl bg-white text-gray-900 font-bold mb-2" placeholder="အရေအတွက်"/>
                      <input type="text" list="riceStorageList" value={millInput.broken12Storage} onChange={e=>setMillInput({...millInput, broken12Storage: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-900" placeholder="ထားသိုရာနေရာ"/>
                    </div>
                    {/* Broken 234 Input */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                      <label className="text-xs font-bold text-blue-700 block mb-2">၂၃၄ ဆန်ကွဲ (အိတ်)</label>
                      <input type="number" value={millInput.broken234} onChange={e=>setMillInput({...millInput, broken234: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl bg-white text-gray-900 font-bold mb-2" placeholder="အရေအတွက်"/>
                      <input type="text" list="riceStorageList" value={millInput.broken234Storage} onChange={e=>setMillInput({...millInput, broken234Storage: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-900" placeholder="ထားသိုရာနေရာ"/>
                    </div>
                    {/* Bran Input */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                      <label className="text-xs font-bold text-orange-700 block mb-2">ဖွဲနု (အိတ်)</label>
                      <input type="number" value={millInput.bran} onChange={e=>setMillInput({...millInput, bran: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl bg-white text-gray-900 font-bold mb-2" placeholder="အရေအတွက်"/>
                      <input type="text" list="riceStorageList" value={millInput.branStorage} onChange={e=>setMillInput({...millInput, branStorage: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-900" placeholder="ထားသိုရာနေရာ"/>
                    </div>
                  </div>
                  <datalist id="riceStorageList">{RICE_STORAGE.map(s => <option key={s} value={s}/>)}</datalist>

                  <div className="flex justify-end gap-3 pt-2 border-t border-purple-100">
                    <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-6 py-3 bg-red-50 text-red-600 font-bold rounded-xl text-sm border border-red-100">ပယ်ဖျက်</button>
                    <button disabled={isLoading} onClick={() => handleMillDone(job.id)} className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm shadow-lg flex items-center">
                      ကြိတ်ခွဲမှု စာရင်းသွင်းမည် <ArrowRight size={18} className="ml-2"/>
                    </button>
                  </div>
                </div>
              ) : <div className="border-t border-gray-100 pt-5 mt-2"><button onClick={() => setActiveJobId(job.id)} className="w-full bg-gray-50 hover:bg-purple-50 text-purple-700 border border-purple-200 py-3.5 rounded-xl font-bold text-sm">ကြိတ်ခွဲမှု ရလဒ်များ စာရင်းသွင်းမည်</button></div>}
            </div>
          ))}
          {jobs.filter(j => j.status === 'waiting_mill' && j.purpose === 'mill').length === 0 && <p className="text-gray-400 text-sm font-bold text-center py-6 bg-white rounded-2xl border border-gray-200 border-dashed">ကြိတ်ခွဲရန် စာရင်း မရှိပါ။</p>}
        </div>
      </div>
    );
  };

  const renderSortingView = () => {
    const handleSortDone = async (jobId) => {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'ready_to_bill', sortingData: sortInput } : j));
      setIsLoading(true);
      await supabase.from('jobs').update({ status: 'ready_to_bill', sortingData: sortInput }).eq('id', jobId);
      setActiveJobId(null); setSortInput({ out1: '', storage1: '', out2: '', storage2: '', out3: '', storage3: '' });
      setIsLoading(false);
      showMessage("ဆန်ဂိုဒေါင် နှင့် ငွေစာရင်းဌာနသို့ ပို့ဆောင်ပြီးပါပြီ။");
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><ScanLine className="mr-3 text-blue-600"/> Color Sorting ဌာန</h2>
        <div className="space-y-5">
          {jobs.filter(j => j.status === 'waiting_sort').map(job => {
            const labels = getSortingLabels(job.paddyType);
            const isNawali = job.entryType === 'nawali';
            return (
              <div key={job.id} className="bg-white p-6 rounded-2xl border-l-4 border-l-blue-500 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-2xl text-gray-800">{job.customer}</h3>
                    <div className="text-sm font-bold text-gray-500 mt-2">{job.id} • {job.paddyType}</div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                     <div className="flex items-center gap-2 mb-2">
                       <span className="bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full text-xs font-black uppercase block">Sort ရန်အသင့်</span>
                       {userRole === 'admin' && <button onClick={() => handleDeleteJob(job.id)} className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent" title="ပယ်ဖျက်မည်"><Trash2 size={16} /></button>}
                     </div>
                     {job.advanceBillData && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-[10px] font-bold block mb-2">အခြောက်ခံခ ရှင်းပြီး</span>}
                  </div>
                </div>
                
                {activeJobId === job.id ? (
                  <div className="bg-blue-50/40 p-6 rounded-2xl border border-blue-100 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="bg-white p-4 rounded-xl border border-blue-100"><label className="text-sm font-bold text-blue-900 block mb-3">{labels[0]}</label><input type="number" value={sortInput.out1} onChange={e=>setSortInput({...sortInput, out1: e.target.value})} className="w-full p-3 border-2 border-blue-200 rounded-lg outline-none font-black text-gray-900 text-lg mb-2 bg-white"/><input type="text" list="riceStorageList" value={sortInput.storage1} onChange={e=>setSortInput({...sortInput, storage1: e.target.value})} className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 rounded-lg text-xs" placeholder="နေရာ..."/></div>
                      <div className="bg-white p-4 rounded-xl border border-gray-200"><label className="text-sm font-bold text-gray-700 block mb-3">{labels[1]}</label><input type="number" value={sortInput.out2} onChange={e=>setSortInput({...sortInput, out2: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none font-bold text-gray-900 mb-2 bg-white"/><input type="text" list="riceStorageList" value={sortInput.storage2} onChange={e=>setSortInput({...sortInput, storage2: e.target.value})} className="w-full p-2.5 border border-gray-200 bg-white text-gray-900 rounded-lg text-xs" placeholder="နေရာ..."/></div>
                      <div className="bg-white p-4 rounded-xl border border-red-100"><label className="text-sm font-bold text-red-700 block mb-3">{labels[2]}</label><input type="number" value={sortInput.out3} onChange={e=>setSortInput({...sortInput, out3: e.target.value})} className="w-full p-3 border border-red-200 rounded-lg outline-none font-bold text-gray-900 mb-2 bg-white"/><input type="text" list="riceStorageList" value={sortInput.storage3} onChange={e=>setSortInput({...sortInput, storage3: e.target.value})} className="w-full p-2.5 border border-red-200 bg-white text-gray-900 rounded-lg text-xs" placeholder="နေရာ..."/></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-blue-100">
                      <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-6 py-3 bg-red-50 text-red-600 font-bold rounded-xl text-sm border border-red-100">ပယ်ဖျက်</button>
                      <button disabled={isLoading} onClick={() => handleSortDone(job.id)} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg">ဂိုဒေါင် / ငွေစာရင်းသို့ ပို့မည်</button>
                    </div>
                  </div>
                ) : <div className="border-t border-gray-100 pt-5 mt-2"><button onClick={() => setActiveJobId(job.id)} className="w-full bg-gray-50 hover:bg-blue-50 text-blue-700 border border-blue-200 py-3.5 rounded-xl font-bold text-sm">Sorting ရလဒ် စာရင်းသွင်းမည်</button></div>}
              </div>
            );
          })}
          {jobs.filter(j => j.status === 'waiting_sort').length === 0 && <p className="text-gray-400 text-sm font-bold text-center py-6 bg-white rounded-2xl border border-gray-200 border-dashed">Sorting လုပ်ရန် စာရင်း မရှိပါ။</p>}
        </div>
      </div>
    );
  };

  const renderRiceWarehouseView = () => {
    const riceJobs = jobs.filter(j => ['ready_to_bill', 'billed'].includes(j.status) && j.purpose !== 'dry_only' && j.customer !== 'စက်ပိုင် (လက်ကျန်)');

    const handleDeliveryClick = (job) => {
        const logs = job.deliveryLogs || [];
        const getRem = (key, initial) => {
            const delivered = logs.reduce((sum, log) => sum + (Number(log.items?.[key]) || 0), 0);
            return (Number(initial) || 0) - delivered;
        };

        const available = {
            out1: getRem('out1', job.sortingData?.out1),
            out2: getRem('out2', job.sortingData?.out2),
            out3: getRem('out3', job.sortingData?.out3),
            broken12: getRem('broken12', job.millingData?.broken12),
            broken234: getRem('broken234', job.millingData?.broken234),
            bran: getRem('bran', job.millingData?.bran),
        };

        if (Object.values(available).reduce((a,b)=>a+b, 0) <= 0) {
            showMessage("ဤဖောက်သည်အတွက် ထုတ်ပေးရန် ဆန်/ထွက်ကုန် မကျန်ရှိတော့ပါ။");
            return;
        }

        setDeliveryModal({ job, available });
        setDeliveryInput({ date: getToday(), carNo: '', driverName: '', items: {} });
    };

    return (
      <div className="animate-in fade-in duration-300 relative">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Factory className="mr-3 text-green-600"/> ဆန် နှင့် ထွက်ကုန် ဂိုဒေါင် (Delivery)</h2>
        
        <div className="bg-white rounded-2xl border border-green-200 overflow-hidden shadow-sm">
           <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 text-sm">
                  <tr><th className="p-4 font-bold w-1/4">ဘောက်ချာ / ဖောက်သည်</th><th className="p-4 font-bold">ထုတ်ယူရန်ကျန်ရှိသည့် ထွက်ကုန်များ (Remaining)</th><th className="p-4 font-bold text-center">လုပ်ဆောင်ချက်</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800">
                  {riceJobs.map(job => {
                    const labels = getSortingLabels(job.paddyType);
                    const logs = job.deliveryLogs || [];
                    const getRem = (key, initial) => (Number(initial) || 0) - logs.reduce((sum, log) => sum + (Number(log.items?.[key]) || 0), 0);
                    
                    const rem = {
                        out1: getRem('out1', job.sortingData?.out1),
                        out2: getRem('out2', job.sortingData?.out2),
                        out3: getRem('out3', job.sortingData?.out3),
                        broken12: getRem('broken12', job.millingData?.broken12),
                        broken234: getRem('broken234', job.millingData?.broken234),
                        bran: getRem('bran', job.millingData?.bran),
                    };

                    const totalRem = Object.values(rem).reduce((a,b)=>a+b,0);
                    const isFullyDelivered = totalRem <= 0;

                    return (
                      <tr key={job.id} className={`hover:bg-gray-50 ${isFullyDelivered ? 'opacity-50' : ''}`}>
                        <td className="p-4 align-top">
                          <div className="font-bold text-gray-800">{job.id}</div>
                          <div className="text-sm font-bold text-gray-500">{job.customer}</div>
                          <div className="text-xs text-gray-400 mt-1">{job.paddyType}</div>
                          {userRole === 'admin' && (
                              <button onClick={() => handleDeleteJob(job.id)} className="mt-2 text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 flex items-center w-fit"><Trash2 size={12} className="mr-1"/> ဖျက်မည်</button>
                          )}
                        </td>
                        <td className="p-4 align-top">
                           {isFullyDelivered ? (
                               <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded">ထုတ်ယူပြီးပါပြီ</span>
                           ) : (
                               <div className="flex flex-wrap gap-2">
                                  {rem.out1 > 0 && <div className="text-xs font-bold bg-green-50 text-green-800 px-2 py-1 rounded border border-green-100">{labels[0]}: {rem.out1} အိတ်</div>}
                                  {rem.out2 > 0 && job.billData?.byproductOption !== 'sell' && <div className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200">{labels[1]}: {rem.out2} အိတ်</div>}
                                  {rem.out3 > 0 && job.billData?.rejectOption !== 'sell' && <div className="text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100">{labels[2]}: {rem.out3} အိတ်</div>}
                                  {rem.broken12 > 0 && <div className="text-xs font-bold bg-blue-50 text-blue-800 px-2 py-1 rounded border border-blue-100">၁၂ ဆန်ကွဲ: {rem.broken12} အိတ်</div>}
                                  {rem.broken234 > 0 && <div className="text-xs font-bold bg-blue-50 text-blue-800 px-2 py-1 rounded border border-blue-100">၂၃၄ ဆန်ကွဲ: {rem.broken234} အိတ်</div>}
                                  {rem.bran > 0 && job.billData?.branOption !== 'sell' && <div className="text-xs font-bold bg-orange-50 text-orange-800 px-2 py-1 rounded border border-orange-100">ဖွဲနု: {rem.bran} အိတ်</div>}
                               </div>
                           )}
                           
                           {/* Show delivery history snippet */}
                           {logs.length > 0 && (
                               <div className="mt-3 pt-3 border-t border-gray-100 border-dashed space-y-1">
                                   <p className="text-[10px] font-bold uppercase text-gray-400">ထုတ်ယူမှု မှတ်တမ်းများ:</p>
                                   {logs.map((log, idx) => (
                                       <div key={idx} className="text-xs text-gray-600 bg-gray-50 p-1.5 rounded flex gap-3">
                                           <span>{log.date}</span>
                                           <span>ကား: {log.carNo}</span>
                                           <span className="text-gray-400">({Object.values(log.items).reduce((a,b)=>a+(Number(b)||0),0)} အိတ်)</span>
                                       </div>
                                   ))}
                               </div>
                           )}
                        </td>
                        <td className="p-4 align-top text-center">
                            {!isFullyDelivered && (
                                <button onClick={() => handleDeliveryClick(job)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-colors flex items-center mx-auto">
                                    <Truck size={14} className="mr-2"/> ဆန်ထုတ်ပေးမည်
                                </button>
                            )}
                        </td>
                      </tr>
                    )
                  })}
                  {riceJobs.length === 0 && <tr><td colSpan="3" className="p-6 text-center text-gray-400 font-bold">ဆန်ဂိုဒေါင်တွင် လာထုတ်ရန်ကျန်သူ မရှိပါ။</td></tr>}
                </tbody>
              </table>
           </div>
        </div>
      </div>
    );
  };

  const renderInventoryView = () => {
    let millRice = 0, millB12 = 0, millB234 = 0, millBran = 0, millBy = 0, millRej = 0;

    jobs.forEach(job => {
      if (job.status === 'billed' || job.status === 'delivered') {
        if (job.billData?.riceOption === 'sell') millRice += Number(job.sortingData?.out1 || 0);
        if (job.billData?.broken12Option === 'sell') millB12 += Number(job.millingData?.broken12 || 0);
        if (job.billData?.broken234Option === 'sell') millB234 += Number(job.millingData?.broken234 || 0);
        if (job.billData?.branOption === 'sell') millBran += Number(job.millingData?.bran || 0);
        if (job.billData?.byproductOption === 'sell') millBy += Number(job.sortingData?.out2 || 0);
        if (job.billData?.rejectOption === 'sell') millRej += Number(job.sortingData?.out3 || 0);
      }
    });

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Package className="mr-3 text-gray-600"/> စက်ပိုင် ဆန်/ဖွဲနု စာရင်း</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-3xl shadow-sm p-8 mb-8 relative overflow-hidden">
           <h3 className="text-xl font-black mb-6 text-gray-800 flex items-center relative z-10"><ArrowDownToLine size={24} className="mr-2 text-gray-500"/> စက်မှ ဝယ်ယူထားသော / စက်ပိုင် လက်ကျန်များ</h3>
           
           <div className="grid grid-cols-2 md:grid-cols-3 gap-6 relative z-10">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-gray-800">
                 <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">ဆန်အချော</p>
                 <div className="text-4xl font-black">{millRice} <span className="text-base font-medium text-gray-400">အိတ်</span></div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-gray-800">
                 <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">၁၂ ဆန်ကွဲ</p>
                 <div className="text-4xl font-black">{millB12} <span className="text-base font-medium text-gray-400">အိတ်</span></div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-gray-800">
                 <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">၂၃၄ ဆန်ကွဲ</p>
                 <div className="text-4xl font-black">{millB234} <span className="text-base font-medium text-gray-400">အိတ်</span></div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-gray-800">
                 <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">ဖွဲနု စုစုပေါင်း</p>
                 <div className="text-4xl font-black text-blue-600">{millBran} <span className="text-base font-medium text-gray-400">အိတ်</span></div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-gray-800">
                 <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">ဗိုက်ဖြူ (By-product)</p>
                 <div className="text-4xl font-black text-orange-600">{millBy} <span className="text-base font-medium text-gray-400">အိတ်</span></div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-gray-800">
                 <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Reject ဆန်အမည်း</p>
                 <div className="text-4xl font-black text-red-600">{millRej} <span className="text-base font-medium text-gray-400">အိတ်</span></div>
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
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'stored_paddy', advanceBillData: { dryingFee: job.wasWet ? (Number(job.originalQty) * (Number(billInput.dryingRate) || 0)) : 0, otherExp: Number(billInput.otherExp) || 0, netTotal: net, paid: pd, balance: bal, date: getToday() } } : j));
      setIsLoading(true);
      const advanceData = { dryingFee: job.wasWet ? (Number(job.originalQty) * (Number(billInput.dryingRate) || 0)) : 0, otherExp: Number(billInput.otherExp) || 0, netTotal: net, paid: pd, balance: bal, date: getToday() };
      await supabase.from('jobs').update({ status: 'stored_paddy', advanceBillData: advanceData }).eq('id', job.id);
      setActiveJobId(null); setBillInput({ dryingRate: '', sortingRate: '', millingRate: '', branOption: 'take', branRate: '', byproductOption: 'take', byproductRate: '', rejectOption: 'take', rejectRate: '', otherExp: '', paidAmount: '' });
      setIsLoading(false);
      showMessage("အခြောက်ခံခ ဘေလ်သိမ်းပြီးပါပြီ။ စာရင်းသည် စပါးဂိုဒေါင်တွင် ဆက်ရှိနေပါမည်။");
    };

    const handleFinalBillSubmit = async (job, totalServiceFee, dryingFee, deduction, net, pd, bal) => {
      const updatedBillData = { ...billInput, totalServiceFee, dryingFee, deduction, netTotal: net, paid: pd, balance: bal, billDate: getToday() };
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'billed', billData: updatedBillData } : j));
      setIsLoading(true);
      await supabase.from('jobs').update({ 
        status: 'billed', 
        billData: updatedBillData 
      }).eq('id', job.id);
      setActiveJobId(null); setBillInput({ dryingRate: '', sortingRate: '', millingRate: '', branOption: 'take', branRate: '', byproductOption: 'take', byproductRate: '', rejectOption: 'take', rejectRate: '', otherExp: '', paidAmount: '' });
      setIsLoading(false);
      showMessage("ငွေစာရင်း သိမ်းဆည်းပြီးပါပြီ။");
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Calculator className="mr-3 text-blue-600"/> ငွေစာရင်း (Admin POS) ဌာန</h2>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 mb-8 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-3">ဘောက်ချာ ဖွင့်ရန် / ငွေရှင်းရန် ရှာဖွေပါ</label>
          <div className="relative max-w-xl">
            <input type="text" placeholder="ဖောက်သည် အမည် (သို့) ဘောက်ချာ ID ရိုက်ထည့်ပါ..." value={adminSearchQuery} onChange={e => setAdminSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 font-bold bg-gray-50 text-gray-900"/>
            <Search className="absolute left-4 top-4 text-gray-400" size={20} />
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
              <div key={job.id} className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
                <div className={`${isAdvance ? 'bg-green-700' : 'bg-gray-900'} p-6 text-white flex justify-between items-center relative`}>
                  <div className="relative z-10"><h3 className="text-2xl font-black mb-1">{job.customer}</h3><p className="text-white/70 text-sm font-bold">ID: {job.id} | {job.paddyType}</p></div>
                  <div className="relative z-10 flex items-center gap-3">
                     <span className={`${isAdvance ? 'bg-white text-green-800' : 'bg-blue-600 text-white'} px-4 py-1.5 rounded-full text-xs font-black uppercase shadow-md`}>{isAdvance ? 'အခြောက်ခံခ ဘေလ်' : 'ငွေရှင်းရန် (Final)'}</span>
                     {userRole === 'admin' && <button onClick={() => handleDeleteJob(job.id)} className="p-1.5 text-white/50 hover:text-red-400 rounded-lg transition-colors" title="ပယ်ဖျက်မည်"><Trash2 size={18} /></button>}
                  </div>
                </div>

                {activeJobId === job.id ? (
                  <div className="p-6 flex-1 flex flex-col bg-gray-50/50">
                    <div className="space-y-5 mb-8">
                      {isAdvance && (
                        <>
                           <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                             <label className="block text-sm font-bold text-gray-800 mb-3">အခြောက်ခံခ နှုန်းထား (၁ တင်းလျှင်)</label>
                             <input type="number" value={billInput.dryingRate} onChange={e=>setBillInput({...billInput, dryingRate: e.target.value})} className="w-full p-3 border-2 border-gray-200 bg-gray-50 text-gray-900 rounded-xl outline-none focus:border-green-500 font-bold" placeholder="ကျပ်"/>
                             <p className="text-[11px] text-gray-500 mt-2 font-bold bg-gray-100 p-2 rounded-lg">မူလ စပါးအဝင် ({job.originalQty} တင်း) ဖြင့် မြှောက်ပါမည်။</p>
                           </div>
                           <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                             <label className="block text-sm font-bold text-gray-800 mb-2">အခြား ကုန်ကျစရိတ်</label>
                             <input type="number" value={billInput.otherExp} onChange={e=>setBillInput({...billInput, otherExp: e.target.value})} className="w-full p-3 border-2 border-gray-200 bg-gray-50 text-gray-900 rounded-xl outline-none focus:border-green-500 font-bold" placeholder="0"/>
                           </div>
                        </>
                      )}

                      {!isAdvance && (
                         <>
                            {job.wasWet && !hasPaidAdvance && (
                              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                <label className="block text-sm font-bold text-gray-800 mb-3">အခြောက်ခံခ နှုန်းထား (၁ တင်းလျှင်)</label>
                                <input type="number" value={billInput.dryingRate} onChange={e=>setBillInput({...billInput, dryingRate: e.target.value})} className="w-full p-3 border-2 border-gray-200 bg-gray-50 text-gray-900 rounded-xl font-bold" placeholder="ကျပ်"/>
                              </div>
                            )}
                            {!isDryOnly && (
                              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                <label className="block text-sm font-bold text-gray-800 mb-3">{isNawali ? 'နဝလီ Sorting နှုန်း (၁ အိတ်)' : 'စက်ကြိတ်ခ နှုန်း (၁ အိတ်)'}</label>
                                <input type="number" value={isNawali ? billInput.sortingRate : billInput.millingRate} onChange={e=> isNawali ? setBillInput({...billInput, sortingRate: e.target.value}) : setBillInput({...billInput, millingRate: e.target.value})} className="w-full p-3 border-2 border-gray-200 bg-gray-50 text-gray-900 rounded-xl font-bold" placeholder="ကျပ်"/>
                              </div>
                            )}
                            {!isDryOnly && (branQty > 0 || byproductQty > 0 || rejectQty > 0) && (
                              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-200 shadow-sm space-y-4 text-gray-900">
                                <h4 className="text-sm font-black text-blue-800 uppercase tracking-wider mb-2">စက်သို့ပြန်ရောင်း၍ ခုနှိမ်ခြင်း</h4>
                                {branQty > 0 && <div className="p-3 bg-white rounded-xl border border-blue-100"><label className="block text-xs font-bold mb-2">ဖွဲနု ({branQty} အိတ်) ရောင်းမည်လား?</label><select value={billInput.branOption} onChange={e=>setBillInput({...billInput, branOption: e.target.value})} className="w-full p-2 border mb-2 bg-gray-50 text-gray-900 outline-none rounded-lg"><option value="take">ဖောက်သည် ယူမည်</option><option value="sell">စက်သို့ ရောင်းမည်</option></select>{billInput.branOption === 'sell' && <input type="number" placeholder="၁ အိတ် နှုန်း" value={billInput.branRate} onChange={e=>setBillInput({...billInput, branRate: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-gray-900 outline-none"/>}</div>}
                                {byproductQty > 0 && <div className="p-3 bg-white rounded-xl border border-blue-100"><label className="block text-xs font-bold mb-2">Byproduct ({byproductQty} အိတ်) ရောင်းမည်လား?</label><select value={billInput.byproductOption} onChange={e=>setBillInput({...billInput, byproductOption: e.target.value})} className="w-full p-2 border mb-2 bg-gray-50 text-gray-900 outline-none rounded-lg"><option value="take">ဖောက်သည် ယူမည်</option><option value="sell">စက်သို့ ရောင်းမည်</option></select>{billInput.byproductOption === 'sell' && <input type="number" placeholder="၁ အိတ် နှုန်း" value={billInput.byproductRate} onChange={e=>setBillInput({...billInput, byproductRate: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-gray-900 outline-none"/>}</div>}
                                {rejectQty > 0 && <div className="p-3 bg-white rounded-xl border border-blue-100"><label className="block text-xs font-bold mb-2">Reject ({rejectQty} အိတ်) ရောင်းမည်လား?</label><select value={billInput.rejectOption} onChange={e=>setBillInput({...billInput, rejectOption: e.target.value})} className="w-full p-2 border mb-2 bg-gray-50 text-gray-900 outline-none rounded-lg"><option value="take">ဖောက်သည် ယူမည်</option><option value="sell">စက်သို့ ရောင်းမည်</option></select>{billInput.rejectOption === 'sell' && <input type="number" placeholder="၁ အိတ် နှုန်း" value={billInput.rejectRate} onChange={e=>setBillInput({...billInput, rejectRate: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-gray-900 outline-none"/>}</div>}
                              </div>
                            )}
                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                               <label className="block text-sm font-bold text-gray-800 mb-2">အခြား ကုန်ကျစရိတ်</label>
                               <input type="number" value={billInput.otherExp} onChange={e=>setBillInput({...billInput, otherExp: e.target.value})} className="w-full p-3 border-2 border-gray-200 bg-gray-50 text-gray-900 rounded-xl font-bold" placeholder="0"/>
                            </div>
                         </>
                      )}
                    </div>

                    <div className="mt-auto bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <div className="border-b border-gray-200 pb-4 mb-4">
                         <div className="flex justify-between items-end">
                           <span className="text-xs font-bold uppercase text-gray-500">{netTotal < 0 ? 'စက်မှ ပြန်အမ်းရမည့်ငွေ' : 'ကျသင့်ငွေ (Net Total)'}</span>
                           <span className={`text-3xl font-black ${netTotal < 0 ? 'text-green-600' : 'text-gray-800'}`}>{Math.abs(netTotal).toLocaleString()} Ks</span>
                         </div>
                      </div>
                      {Math.abs(netTotal) > 0 && (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <label className="block text-xs font-bold mb-2 uppercase text-gray-700">ပေးချေငွေ (Paid Amount)</label>
                          <input type="number" value={billInput.paidAmount} onChange={e=>setBillInput({...billInput, paidAmount: e.target.value})} className="w-full p-3 border-2 border-gray-300 bg-white text-gray-900 rounded-lg font-bold text-xl outline-none focus:border-blue-500" placeholder="0" min="0"/>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 mt-6">
                      <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-6 py-4 bg-gray-50 text-gray-700 hover:bg-gray-100 font-bold rounded-xl border border-gray-200 transition-colors">ပယ်ဖျက်</button>
                      {isAdvance ? (
                        <button disabled={isLoading} onClick={() => handleAdvanceBillSubmit(job, netTotal, paid, balance)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center text-lg"><CheckCircle size={22} className="mr-2"/> ကြိုတင်ဘေလ် သိမ်းမည်</button>
                      ) : (
                        <button disabled={isLoading} onClick={() => handleFinalBillSubmit(job, totalServiceFee, dryingFee, totalDeduction, netTotal, paid, balance)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center text-lg"><CheckCircle size={22} className="mr-2"/> ဘေလ်သိမ်းပြီး ငွေရှင်းမည်</button>
                      )}
                    </div>
                  </div>
                ) : <div className="p-8 flex-1 flex flex-col justify-center items-center bg-gray-50/50 border-t border-gray-100"><button onClick={() => setActiveJobId(job.id)} className={`bg-white font-bold py-4 px-8 rounded-2xl border-2 shadow-sm flex items-center hover:scale-105 transition-all ${isAdvance ? 'text-green-600 border-green-200 hover:bg-green-50' : 'text-blue-600 border-blue-200 hover:bg-blue-50'}`}><Calculator size={22} className="mr-2"/> ဘေလ်တွက်ချက်ရန် နှိပ်ပါ</button></div>}
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
      
      if (job.status === 'ready_to_bill' || job.status === 'billed') {
        if (job.purpose !== 'dry_only') stat.totalRice += Number(job.sortingData?.out1 || 0);
      }
      if (job.status === 'billed' && job.billData) stat.totalDebt += Number(job.billData.balance || 0);
      if (job.status === 'payment') stat.totalDebt -= job.amount; 
      stat.history.push(job);
    });

    const filteredCustomers = Object.values(customerStats).filter(c => c.name.toLowerCase().includes(ledgerSearchQuery.toLowerCase()));

    return (
      <div className="animate-in fade-in duration-300 relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center"><Users className="mr-3 text-blue-600"/> ဖောက်သည် မှတ်တမ်း / အကြွေးစာရင်း</h2>
          <div className="relative w-72">
            <input type="text" placeholder="အမည်ဖြင့် ရှာရန်..." value={ledgerSearchQuery} onChange={e=>setLedgerSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 bg-white text-gray-900 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-bold"/>
            <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
          </div>
        </div>

        <div className="space-y-4 pb-20">
          {filteredCustomers.map(cust => (
            <div key={cust.name} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all">
              <div className="bg-gray-50 hover:bg-blue-50/50 p-5 flex justify-between items-center transition-colors">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setExpandedCustomer(expandedCustomer === cust.name ? null : cust.name)}>
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">{cust.name.charAt(0)}</div>
                  <div>
                    <h3 className="text-lg font-black text-gray-800">{cust.name}</h3>
                    <p className="text-sm text-gray-500 font-medium mt-0.5">လုပ်ငန်းစဉ်/ငွေပေးချေမှု: <span className="text-blue-600 font-bold">{cust.history.length}</span> ကြိမ်</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {cust.totalDebt > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="text-right bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">ဖောက်သည် အကြွေး</p>
                        <p className="font-black text-lg text-red-600 leading-none">{cust.totalDebt.toLocaleString()} <span className="text-xs font-normal">Ks</span></p>
                      </div>
                      <button onClick={() => setPaymentModal({customer: cust.name, type: 'receive', debt: cust.totalDebt})} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md transition-colors">ကြွေးဆပ်မည်</button>
                    </div>
                  )}
                  {cust.totalDebt < 0 && (
                    <div className="flex items-center gap-3">
                       <div className="text-right bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-0.5">စက်မှ ပေးရန်ကျန်ငွေ</p>
                        <p className="font-black text-lg text-green-700 leading-none">{Math.abs(cust.totalDebt).toLocaleString()} <span className="text-xs font-normal">Ks</span></p>
                      </div>
                      <button onClick={() => setPaymentModal({customer: cust.name, type: 'pay', debt: Math.abs(cust.totalDebt)})} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md transition-colors">ငွေရှင်းပေးမည်</button>
                    </div>
                  )}
                  <div className="cursor-pointer p-2" onClick={() => setExpandedCustomer(expandedCustomer === cust.name ? null : cust.name)}>
                     {expandedCustomer === cust.name ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                  </div>
                </div>
              </div>

              {expandedCustomer === cust.name && (
                <div className="p-0 border-t border-gray-200 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 bg-gray-50 p-4 border-b border-gray-200">
                     <div className="text-center">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">စုစုပေါင်း စပါးအဝင်</p>
                        <p className="font-black text-xl text-gray-800">{cust.totalPaddy} <span className="text-sm font-medium text-gray-500">တင်း</span></p>
                     </div>
                     <div className="text-center border-l border-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">ထုတ်ယူပြီး ဆန်အချော</p>
                        <p className="font-black text-xl text-blue-600">{cust.totalRice} <span className="text-sm font-medium text-blue-600/70">အိတ်</span></p>
                     </div>
                  </div>

                  <div className="p-4 bg-white border-b border-gray-200">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center"><Edit3 size={14} className="mr-1"/> မှတ်ချက် (မှတ်တမ်းထားရန်)</label>
                     <textarea
                       className="w-full p-3 text-sm border border-gray-300 bg-gray-50 text-gray-900 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none h-20"
                       placeholder="ဖောက်သည်အကြောင်း မှတ်သားရန် (ဥပမာ- ဘယ်နေ့ အကြွေးလာဆပ်မည် စသည်)..."
                       value={customerRemarks[cust.name] || ''}
                       onChange={e => updateRemark(cust.name, e.target.value)}
                     />
                  </div>

                  <div className="overflow-x-auto p-4 bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="text-gray-500 border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="py-3 px-4 font-bold rounded-tl-lg">ရက်စွဲ / ID</th>
                          <th className="py-3 px-4 font-bold">အမျိုးအစား/အခြေအနေ</th>
                          <th className="py-3 px-4 font-bold text-right">ကျသင့်ငွေ/ပေးချေငွေ</th>
                          <th className="py-3 px-4 font-bold text-right">အကြွေး / ပေးရန်ကျန်</th>
                          {userRole === 'admin' && <th className="py-3 px-2 font-bold text-center rounded-tr-lg">လုပ်ဆောင်ချက်</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-800">
                        {cust.history.map(h => (
                          <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 align-top">
                              <div className="font-bold text-gray-800 mb-0.5">{h.date}</div>
                              <div className="text-xs text-gray-500 font-medium">{h.id}</div>
                            </td>
                            <td className="py-4 px-4 align-top">
                              {h.status === 'payment' ? (
                                <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-md text-xs font-bold border border-green-200 shadow-sm">ငွေပေးချေမှု / ကြွေးဆပ်ခြင်း</span>
                              ) : (
                                <div>
                                  <span className="font-bold text-gray-800">{h.paddyType}</span> <span className="text-xs text-gray-400">({h.entryType === 'nawali' ? 'နဝလီ' : 'စက်ကြိတ်'})</span><br/>
                                  {h.status === 'billed' ? (
                                      <span className="text-[10px] text-blue-600 font-bold uppercase mt-1.5 inline-block bg-blue-50 px-2 py-0.5 rounded border border-blue-100">ဘေလ်ရှင်းပြီး</span>
                                  ) : (
                                      <span className="text-[10px] text-orange-600 font-bold uppercase mt-1.5 inline-block bg-orange-50 px-2 py-0.5 rounded border border-orange-100">လုပ်ဆောင်ဆဲ</span>
                                  )}
                                  
                                  {h.deliveryLogs && h.deliveryLogs.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-gray-200 border-dashed space-y-2">
                                          <p className="text-[10px] font-bold text-gray-400 uppercase">ဆန်/ထွက်ကုန် ထုတ်ယူမှုများ:</p>
                                          {h.deliveryLogs.map((log, idx) => (
                                              <div key={idx} className="bg-gray-100 p-2 rounded-lg text-xs text-gray-700 border border-gray-200">
                                                  <div className="flex justify-between font-bold text-gray-800 mb-1.5">
                                                      <span>{log.date}</span>
                                                      <span>ကား: <span className="text-blue-600">{log.carNo}</span></span>
                                                  </div>
                                                  <div className="flex flex-wrap gap-1.5">
                                                      {Object.entries(log.items).map(([key, val]) => val > 0 && (
                                                          <span key={key} className="bg-white border border-gray-300 px-2 py-0.5 rounded shadow-sm text-[10px] font-medium text-gray-600">{key}: {val} အိတ်</span>
                                                      ))}
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right font-black text-[15px] align-top">
                              {h.status === 'payment' ? (
                                <span className="text-green-600">Paid: {Math.abs(h.amount).toLocaleString()}</span>
                              ) : h.billData?.netTotal !== undefined ? (
                                <span className={h.billData.netTotal < 0 ? 'text-green-600' : 'text-gray-800'}>
                                   {h.billData.netTotal < 0 ? `Refund: ${Math.abs(h.billData.netTotal).toLocaleString()}` : h.billData.netTotal.toLocaleString()}
                                </span> 
                              ) : '-'}
                            </td>
                            <td className="py-4 px-4 text-right font-black text-[15px] align-top">
                              {h.status !== 'payment' && h.billData?.balance !== undefined ? (
                                h.billData.balance > 0 ? <span className="text-red-500">{h.billData.balance.toLocaleString()}</span> : 
                                h.billData.balance < 0 ? <span className="text-green-600">-{Math.abs(h.billData.balance).toLocaleString()}</span> : <span className="text-gray-400">-</span>
                              ) : '-'}
                            </td>
                            {userRole === 'admin' && (
                                <td className="py-4 px-2 text-center align-top">
                                    <button onClick={() => handleDeleteJob(h.id)} className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors border border-transparent hover:border-red-600 shadow-sm"><Trash2 size={16}/></button>
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
          {filteredCustomers.length === 0 && <p className="text-center text-gray-500 py-12 bg-white rounded-2xl border border-gray-200 border-dashed font-bold text-lg shadow-sm">ရှာဖွေမှုနှင့် ကိုက်ညီသော ဖောက်သည် မရှိပါ။</p>}
        </div>
      </div>
    );
  };

  const renderMenu = () => {
    let menus = [];
    if (userRole === 'admin') {
      menus = [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-100 text-gray-800' },
        { id: 'gate', name: 'စပါးအဝင်/ဂိတ်', icon: Home, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-100 text-gray-800' },
        { id: 'paddy_warehouse', name: 'စပါး/နဝလီ ဂိုဒေါင်', icon: Factory, color: 'text-orange-600', activeBg: 'bg-orange-50 border-orange-100 text-gray-800' },
        { id: 'milling', name: 'ကြိတ်ခွဲရေး ဌာန', icon: Tractor, color: 'text-purple-600', activeBg: 'bg-purple-50 border-purple-100 text-gray-800' },
        { id: 'sorting', name: 'Color Sorting', icon: ScanLine, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-100 text-gray-800' },
        { id: 'rice_warehouse', name: 'ဆန်/ထွက်ကုန် ဂိုဒေါင်', icon: Factory, color: 'text-green-600', activeBg: 'bg-green-50 border-green-100 text-gray-800' },
        { id: 'inventory', name: 'စက်ပိုင် ဆန်စာရင်း', icon: Package, color: 'text-gray-600', activeBg: 'bg-gray-100 border-gray-200 text-gray-800' },
        { id: 'admin', name: 'ငွေစာရင်း (POS)', icon: Calculator, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-100 text-gray-800' },
        { id: 'customers', name: 'ဖောက်သည် အကြွေး', icon: Users, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-100 text-gray-800' },
        { id: 'opening_stock', name: 'လက်ကျန်စာရင်း (Opening)', icon: Database, color: 'text-gray-600', activeBg: 'bg-gray-100 border-gray-200 text-gray-800' },
      ];
    } else if (userRole === 'gate') {
      menus = [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-100 text-gray-800' },
        { id: 'gate', name: 'စပါးအဝင်/ဂိတ်', icon: Home, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-100 text-gray-800' },
        { id: 'paddy_warehouse', name: 'စပါး/နဝလီ ဂိုဒေါင်', icon: Factory, color: 'text-orange-600', activeBg: 'bg-orange-50 border-orange-100 text-gray-800' }
      ];
    } else if (userRole === 'mill') {
      menus = [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-100 text-gray-800' },
        { id: 'milling', name: 'ကြိတ်ခွဲရေး ဌာန', icon: Tractor, color: 'text-purple-600', activeBg: 'bg-purple-50 border-purple-100 text-gray-800' },
        { id: 'sorting', name: 'Color Sorting', icon: ScanLine, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-100 text-gray-800' },
        { id: 'rice_warehouse', name: 'ဆန်/ထွက်ကုန် ဂိုဒေါင်', icon: Factory, color: 'text-green-600', activeBg: 'bg-green-50 border-green-100 text-gray-800' }
      ];
    }

    return (
      <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-1.5">
          {menus.map(menu => (
            <button 
              key={menu.id} onClick={() => setActiveView(menu.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all font-bold border ${activeView === menu.id ? `${menu.activeBg} ${menu.color} shadow-sm` : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <menu.icon size={20} strokeWidth={activeView === menu.id ? 2.5 : 2} className={activeView === menu.id ? '' : 'opacity-70'}/>
              <span className="text-sm">{menu.name}</span>
            </button>
          ))}
        </div>
        <button onClick={() => { setUserRole(null); setActiveView('dashboard'); }} className="mt-6 w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-red-600 font-bold bg-red-50 hover:bg-red-100 transition-colors border border-red-100 shadow-sm">
          <LogOut size={18} /> <span>အကောင့်ထွက်မည်</span>
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden w-full relative">
      {/* Initial Configuration Check */}
      {!isConfigured && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg text-center border border-gray-200">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Supabase URL & Key ထည့်ရန် လိုအပ်ပါသည်</h2>
            <p className="text-gray-600 font-medium text-sm">src/index.js ဖိုင်၏ အပေါ်ဆုံးတွင် သင့်၏ URL နှင့် Key အစစ်ကို အစားထိုးထည့်သွင်းပေးပါ။</p>
          </div>
        </div>
      )}

      {/* Login Screen (Secured) */}
      {!userRole && isConfigured && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-gray-900 font-sans">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Lock size={32} className="text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-center text-gray-800 mb-2">Mill ERP System</h2>
            <p className="text-center text-gray-500 font-medium mb-8">စနစ်ထဲသို့ ဝင်ရောက်ရန် လျှို့ဝှက် PIN နံပါတ် ရိုက်ထည့်ပါ</p>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <input type="password" autoFocus placeholder="PIN နံပါတ် (****)" value={pinInput} onChange={e => setPinInput(e.target.value)} className="w-full text-center text-3xl tracking-[1em] p-4 bg-gray-50 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white font-black text-gray-800 transition-colors shadow-inner" required />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg transition-all active:scale-95">ဝင်ရောက်မည်</button>
            </form>
          </div>
        </div>
      )}

      {/* Main App Layout */}
      {userRole && isConfigured && (
          <>
            <div className="w-[280px] bg-white border-r border-gray-200 flex flex-col shadow-sm z-20 shrink-0">
              <div className="p-6 border-b border-gray-100 flex items-center space-x-3 bg-blue-700">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-700 font-black text-xl shadow-inner">စက်</div>
                <div>
                  <h1 className="font-black text-xl text-white tracking-tight leading-none">Mill ERP</h1>
                  <p className="text-blue-200 text-[10px] font-bold mt-1 uppercase tracking-wider">
                    Role: {userRole === 'admin' ? 'Admin' : userRole === 'gate' ? 'Paddy Manager' : 'Rice Manager'}
                  </p>
                </div>
              </div>
              {renderMenu()}
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 relative">
              <div className="max-w-6xl mx-auto pb-20">
                {activeView === 'dashboard' && renderDashboardView()}
                {activeView === 'gate' && renderGateView()}
                {activeView === 'paddy_warehouse' && renderPaddyWarehouseView()}
                {activeView === 'milling' && renderMillingView()}
                {activeView === 'sorting' && renderSortingView()}
                {activeView === 'rice_warehouse' && renderRiceWarehouseView()}
                {activeView === 'inventory' && renderInventoryView()}
                {activeView === 'admin' && renderAdminView()}
                {activeView === 'customers' && renderCustomerLedgerView()}
                {activeView === 'opening_stock' && renderOpeningStockView()}
              </div>
            </div>

            {/* --- ROOT LEVEL MODALS (Z-Index Trap Proof) --- */}
            {dialogConfig && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget && dialogConfig.type === 'alert') setDialogConfig(null) }}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative z-10">
                        <div className="p-8 text-center">
                            {dialogConfig.type === 'confirm' ? (
                                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-inner"><ShieldAlert size={32} className="text-red-600" /></div>
                            ) : (
                                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-inner"><AlertCircle size={32} className="text-blue-600" /></div>
                            )}
                            <h3 className="text-lg font-bold text-gray-800 mb-8 whitespace-normal break-words leading-relaxed">{dialogConfig.message}</h3>
                            <div className="flex gap-3 justify-center">
                                {dialogConfig.type === 'confirm' && (
                                    <button type="button" onClick={() => setDialogConfig(null)} className="flex-1 py-3 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-colors border border-gray-300 shadow-sm">မလုပ်တော့ပါ</button>
                                )}
                                <button type="button" onClick={() => {
                                    const action = dialogConfig.onConfirm;
                                    setDialogConfig(null);
                                    if (action) action();
                                }} className={`flex-1 py-3 font-bold rounded-xl text-white shadow-lg transition-transform active:scale-95 ${dialogConfig.type === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                    {dialogConfig.type === 'confirm' ? 'ဖျက်မည်' : 'အိုကေ'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {paymentModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setPaymentModal(null) }}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative z-10">
                        <div className={`px-6 py-5 border-b flex justify-between items-center ${paymentModal.type === 'receive' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                            <div>
                                <h3 className={`font-black text-lg ${paymentModal.type === 'receive' ? 'text-red-800' : 'text-green-800'}`}>{paymentModal.customer}</h3>
                                <p className={`text-xs font-bold ${paymentModal.type === 'receive' ? 'text-red-600' : 'text-green-600'}`}>{paymentModal.type === 'receive' ? 'အကြွေးလာဆပ်ခြင်း' : 'စက်မှငွေရှင်းပေးခြင်း'}</p>
                            </div>
                            <button type="button" disabled={isLoading} onClick={() => setPaymentModal(null)} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm border border-gray-200"><X size={20}/></button>
                        </div>
                        <form onSubmit={handlePaymentSubmit} className="p-6">
                            <div className="mb-6 text-center">
                                <p className="text-sm font-bold text-gray-500 mb-1">{paymentModal.type === 'receive' ? 'လက်ရှိ အကြွေးကျန်ငွေ' : 'လက်ရှိ ပေးရန်ကျန်ငွေ'}</p>
                                <p className={`text-3xl font-black ${paymentModal.type === 'receive' ? 'text-red-600' : 'text-green-600'}`}>{paymentModal.debt.toLocaleString()} <span className="text-lg font-medium">Ks</span></p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">ပေးချေမည့် ငွေပမာဏ (ကျပ်)</label>
                                <input type="number" required autoFocus value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} className="w-full p-4 border-2 border-gray-300 bg-white text-gray-900 rounded-xl outline-none focus:border-blue-500 text-xl font-bold text-center" placeholder="0" min="1"/>
                            </div>
                            <button disabled={isLoading} type="submit" className={`w-full mt-6 py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-transform active:scale-95 ${paymentModal.type === 'receive' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                                {isLoading ? 'Processing...' : 'အတည်ပြု မှတ်တမ်းတင်မည်'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {deliveryModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setDeliveryModal(null) }}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col relative z-10">
                        <div className="px-6 py-5 border-b bg-gray-50 flex justify-between items-center shrink-0">
                            <h3 className="font-black text-lg text-gray-800 flex items-center"><Truck className="mr-2 text-gray-600"/> ကုန်ထုတ်ပေးမှု မှတ်တမ်း</h3>
                            <button type="button" onClick={() => setDeliveryModal(null)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleDeliverySubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="bg-green-50 p-3 rounded-xl border border-green-100 mb-2">
                                <p className="text-sm font-bold text-green-900">{deliveryModal.job.customer} ({deliveryModal.job.id})</p>
                                <p className="text-xs text-green-700">ထုတ်ပေးမည့် အရေအတွက်များကို အောက်တွင် ဖြည့်ပါ။</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1.5">ထုတ်ယူသည့် ရက်စွဲ</label><input type="date" required value={deliveryInput.date} onChange={e=>setDeliveryInput({...deliveryInput, date: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none bg-gray-50 text-gray-900 text-sm"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1.5">ကားနံပါတ်</label><input type="text" required placeholder="ဥပမာ - YGN 1A-1234" value={deliveryInput.carNo} onChange={e=>setDeliveryInput({...deliveryInput, carNo: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-gray-50 text-gray-900 text-sm"/></div>
                                <div className="col-span-2"><label className="block text-xs font-bold text-gray-700 mb-1.5">လာရောက်ထုတ်ယူသူ အမည် / ဖုန်း</label><input type="text" required placeholder="အမည် (သို့) ဖုန်းနံပါတ်" value={deliveryInput.driverName} onChange={e=>setDeliveryInput({...deliveryInput, driverName: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-gray-50 text-gray-900 text-sm"/></div>
                            </div>

                            <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
                                <p className="text-xs font-bold uppercase text-gray-500 mb-2">ထုတ်ပေးမည့် ပစ္စည်းများ (အိတ်)</p>
                                
                                {deliveryModal.available.out1 > 0 && (
                                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                                        <span className="text-sm font-bold text-gray-700">{getSortingLabels(deliveryModal.job.paddyType)[0]} (Max: {deliveryModal.available.out1})</span>
                                        <input type="number" min="0" max={deliveryModal.available.out1} placeholder="0" value={deliveryInput.items.out1 || ''} onChange={e=>setDeliveryInput({...deliveryInput, items: {...deliveryInput.items, out1: e.target.value}})} className="w-24 p-2 border border-gray-300 rounded text-right outline-none focus:border-blue-500 font-bold"/>
                                    </div>
                                )}
                                {deliveryModal.available.out2 > 0 && deliveryModal.job.billData?.byproductOption !== 'sell' && (
                                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                                        <span className="text-sm font-bold text-gray-700">{getSortingLabels(deliveryModal.job.paddyType)[1]} (Max: {deliveryModal.available.out2})</span>
                                        <input type="number" min="0" max={deliveryModal.available.out2} placeholder="0" value={deliveryInput.items.out2 || ''} onChange={e=>setDeliveryInput({...deliveryInput, items: {...deliveryInput.items, out2: e.target.value}})} className="w-24 p-2 border border-gray-300 rounded text-right outline-none focus:border-blue-500 font-bold"/>
                                    </div>
                                )}
                                {deliveryModal.available.out3 > 0 && deliveryModal.job.billData?.rejectOption !== 'sell' && (
                                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                                        <span className="text-sm font-bold text-gray-700">{getSortingLabels(deliveryModal.job.paddyType)[2]} (Max: {deliveryModal.available.out3})</span>
                                        <input type="number" min="0" max={deliveryModal.available.out3} placeholder="0" value={deliveryInput.items.out3 || ''} onChange={e=>setDeliveryInput({...deliveryInput, items: {...deliveryInput.items, out3: e.target.value}})} className="w-full p-2 border border-gray-300 rounded text-right outline-none focus:border-blue-500 font-bold"/>
                                    </div>
                                )}
                                {deliveryModal.available.broken12 > 0 && (
                                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                                        <span className="text-sm font-bold text-gray-700">၁၂ ဆန်ကွဲ (Max: {deliveryModal.available.broken12})</span>
                                        <input type="number" min="0" max={deliveryModal.available.broken12} placeholder="0" value={deliveryInput.items.broken12 || ''} onChange={e=>setDeliveryInput({...deliveryInput, items: {...deliveryInput.items, broken12: e.target.value}})} className="w-24 p-2 border border-gray-300 rounded text-right outline-none focus:border-blue-500 font-bold"/>
                                    </div>
                                )}
                                {deliveryModal.available.broken234 > 0 && (
                                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                                        <span className="text-sm font-bold text-gray-700">၂၃၄ ဆန်ကွဲ (Max: {deliveryModal.available.broken234})</span>
                                        <input type="number" min="0" max={deliveryModal.available.broken234} placeholder="0" value={deliveryInput.items.broken234 || ''} onChange={e=>setDeliveryInput({...deliveryInput, items: {...deliveryInput.items, broken234: e.target.value}})} className="w-24 p-2 border border-gray-300 rounded text-right outline-none focus:border-blue-500 font-bold"/>
                                    </div>
                                )}
                                {deliveryModal.available.bran > 0 && deliveryModal.job.billData?.branOption !== 'sell' && (
                                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                                        <span className="text-sm font-bold text-gray-700">ဖွဲနု (Max: {deliveryModal.available.bran})</span>
                                        <input type="number" min="0" max={deliveryModal.available.bran} placeholder="0" value={deliveryInput.items.bran || ''} onChange={e=>setDeliveryInput({...deliveryInput, items: {...deliveryInput.items, bran: e.target.value}})} className="w-24 p-2 border border-gray-300 rounded text-right outline-none focus:border-blue-500 font-bold"/>
                                    </div>
                                )}
                            </div>
                            
                            <button disabled={isLoading} type="submit" className="w-full mt-4 py-3.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-bold text-lg shadow-lg">
                                အတည်ပြု မှတ်တမ်းတင်မည်
                            </button>
                        </form>
                    </div>
                </div>
            )}
          </>
      )}
    </div>
  );
}

render(<MillERP />, document.getElementById('root'));
