import React, { useState, useEffect } from 'react';
import { render } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Home, Tractor, ScanLine, Package, Calculator, Users,
  Plus, ArrowRight, CheckCircle, Droplets, Wind, LayoutDashboard,
  Receipt, User, Search, ChevronDown, ChevronUp, X, MapPin, Factory, ArrowUpRight, ArrowDownToLine, Trash2, Edit3, Truck, AlertCircle, CheckSquare, Settings, LogOut, Database
} from 'lucide-react';

// ==========================================
// မဖြစ်မနေ ပြင်ဆင်ရန် (Supabase API Keys)
// ==========================================
const supabaseUrl = 'https://jgerimrkigxtphjcrafq.supabase.co';
const supabaseKey = 'sb_publishable_2jhGRP_tFpR9xuPgJEBBxA_2_HRJTUG';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function MillERP() {
  const [isConfigured, setIsConfigured] = useState(supabaseUrl !== 'YOUR_SUPABASE_URL');
  const [session, setSession] = useState(null); // { role: 'admin' | 'paddy' | 'rice', name: '' }
  const [activeView, setActiveView] = useState('dashboard'); 
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState(null); // { message, type, confirmAction }

  const getToday = () => new Date().toISOString().split('T')[0];

  const PADDY_STORAGE = ["B", "B/C ကြား", "C", "C/D ကြား", "D", "D/E ကြား", "E1", "E2", "E3", "Suncue", "Flat 1", "Flat 2", "Flat 3"];
  const RICE_STORAGE = ["A1", "CS ကွင်းသစ်", "CS ရှေ့", "B ကွင်း", "ဂိုဒေါင် အဟောင်း"];
  const DRYING_MACHINES = ["Suncue 1", "Suncue 2", "Flat 1", "Flat 2", "Flat 3"];

  // --- Database States ---
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);

  // --- Input States ---
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

  // Billing State
  const [billInput, setBillInput] = useState({ 
    dryingRate: '', sortingRate: '', millingRate: '', 
    branOption: 'take', branRate: '', 
    byproductOption: 'take', byproductRate: '',
    rejectOption: 'take', rejectRate: '', 
    otherExp: '', paidAmount: '' 
  });

  // Delivery State (Now handled via Modal statically to prevent focus loss)
  const [deliveryModal, setDeliveryModal] = useState(null);
  const [deliveryInput, setDeliveryInput] = useState({
    date: getToday(), carNo: '', driverName: '', out1Qty: '', out2Qty: '', out3Qty: '', branQty: '', b12Qty: '', b234Qty: ''
  });

  // Payment State
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

  const showMessage = (message, type = 'info', confirmAction = null) => {
    setAlertConfig({ message, type, confirmAction });
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

  const updateRemark = async (name, remark) => {
    const existing = customers.find(c => c.name === name);
    if (existing) {
       await supabase.from('customers').update({ remark }).eq('id', existing.id);
    } else {
       await supabase.from('customers').insert([{ name, remark }]);
    }
    fetchData();
  };

  // ----------------------------------------
  // Database Handlers
  // ----------------------------------------
  const handleDeleteJob = async (jobId) => {
      showMessage(`ဘောက်ချာ/မှတ်တမ်း No: ${jobId} အား အပြီးတိုင် ပယ်ဖျက်မှာ သေချာပါသလား?`, "danger", async () => {
          setIsLoading(true);
          try {
             // Optimistic update
             setJobs(prev => prev.filter(j => j.id !== jobId));
             const { error } = await supabase.from('jobs').delete().eq('id', jobId);
             if (error) throw error;
             setAlertConfig(null);
          } catch (err) {
             showMessage("ဖျက်သိမ်းရာတွင် အမှားအယွင်းဖြစ်ပွားခဲ့ပါသည်။", "danger");
             fetchData(); // revert
          } finally {
             setIsLoading(false);
          }
      });
  };

  const handleDeliverySubmit = async () => {
      if(!deliveryModal) return;
      setIsLoading(true);
      try {
          const newLog = {
             id: Date.now().toString(), date: deliveryInput.date, carNo: deliveryInput.carNo, driverName: deliveryInput.driverName,
             out1: Number(deliveryInput.out1Qty)||0, out2: Number(deliveryInput.out2Qty)||0, out3: Number(deliveryInput.out3Qty)||0, bran: Number(deliveryInput.branQty)||0,
             b12: Number(deliveryInput.b12Qty)||0, b234: Number(deliveryInput.b234Qty)||0
          };
          const updatedLogs = [...(deliveryModal.deliveryLogs || []), newLog];
          
          // Optimistic
          setJobs(prev => prev.map(j => j.id === deliveryModal.id ? { ...j, deliveryLogs: updatedLogs } : j));
          
          const { error } = await supabase.from('jobs').update({ deliveryLogs: updatedLogs }).eq('id', deliveryModal.id);
          if (error) throw error;
          
          setDeliveryModal(null); 
          setDeliveryInput({date: getToday(), carNo: '', driverName: '', out1Qty: '', out2Qty: '', out3Qty: '', branQty: '', b12Qty: '', b234Qty: ''});
          showMessage("ထုတ်ပေးမှု မှတ်တမ်းတင်ပြီးပါပြီ", "success");
      } catch (err) {
          showMessage("အမှားအယွင်းဖြစ်ပွားခဲ့ပါသည်။", "danger");
      } finally {
          setIsLoading(false);
      }
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

  if (!session) {
    return (
       <div className="flex items-center justify-center h-screen bg-slate-900">
          <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
             <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-4xl mx-auto mb-6 shadow-lg shadow-blue-600/40">စက်</div>
             <h1 className="text-3xl font-black text-slate-800 mb-2">Mill ERP System</h1>
             <p className="text-slate-500 font-bold mb-8">Role ရွေးချယ်၍ ဝင်ရောက်ပါ</p>
             <div className="space-y-4">
                <button onClick={() => setSession({role: 'admin', name: 'Admin'})} className="w-full p-4 border-2 border-blue-200 text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors">Admin အဖြစ် ဝင်မည်</button>
                <button onClick={() => setSession({role: 'paddy', name: 'စပါးမန်နေဂျာ'})} className="w-full p-4 border-2 border-amber-200 text-amber-700 font-bold rounded-xl hover:bg-amber-50 transition-colors">စပါး/အစို ဌာန အဖြစ် ဝင်မည်</button>
                <button onClick={() => setSession({role: 'rice', name: 'ဆန်မန်နေဂျာ'})} className="w-full p-4 border-2 border-emerald-200 text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-colors">ဆန်/ကြိတ်ခွဲရေး ဌာန အဖြစ် ဝင်မည်</button>
             </div>
          </div>
       </div>
    );
  }

  const renderAdminDashboard = () => {
     let todayPaddy = 0;
     let todayRiceOut = 0;
     let totalDebt = 0;
     let toPay = 0;

     jobs.forEach(j => {
        if(j.date === getToday() && j.entryType === 'paddy') todayPaddy += Number(j.originalQty || 0);
        if(j.date === getToday() && j.deliveryLogs) {
           j.deliveryLogs.filter(l => l.date === getToday()).forEach(l => {
              todayRiceOut += Number(l.out1||0) + Number(l.out2||0) + Number(l.out3||0) + Number(l.bran||0) + Number(l.b12||0) + Number(l.b234||0);
           });
        }
        if(j.status === 'billed' && j.billData?.balance > 0) totalDebt += Number(j.billData.balance);
        if(j.status === 'billed' && j.billData?.balance < 0) toPay += Math.abs(j.billData.balance);
        if(j.status === 'payment') {
           if(j.amount > 0) totalDebt -= j.amount;
           if(j.amount < 0) toPay -= Math.abs(j.amount);
        }
     });

     const pendingToDry = jobs.filter(j => j.status === 'waiting_dry').length;
     const dryingNow = jobs.filter(j => j.status === 'drying').length;
     const waitingMill = jobs.filter(j => j.status === 'waiting_mill' && j.purpose === 'mill').length;
     const waitingSort = jobs.filter(j => j.status === 'waiting_sort').length;
     const readyToBill = jobs.filter(j => j.status === 'ready_to_bill').length;

     return (
        <div className="animate-in fade-in duration-300">
           <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><LayoutDashboard className="mr-3 text-blue-600"/> Admin Dashboard (ခြုံငုံသုံးသပ်ချက်)</h2>
           
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <p className="text-xs font-bold text-slate-500 uppercase mb-2">ယနေ့ စပါးအဝင်စုစုပေါင်း</p>
                 <p className="text-3xl font-black text-slate-800">{todayPaddy} <span className="text-base font-bold text-slate-400">တင်း</span></p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <p className="text-xs font-bold text-slate-500 uppercase mb-2">ယနေ့ ဆန်ထုတ်ပေးမှု</p>
                 <p className="text-3xl font-black text-slate-800">{todayRiceOut} <span className="text-base font-bold text-slate-400">အိတ်</span></p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100">
                 <p className="text-xs font-bold text-rose-500 uppercase mb-2">စုစုပေါင်း ဖောက်သည်အကြွေး</p>
                 <p className="text-3xl font-black text-rose-600">{totalDebt > 0 ? totalDebt.toLocaleString() : 0} <span className="text-base font-bold text-rose-400">Ks</span></p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
                 <p className="text-xs font-bold text-emerald-600 uppercase mb-2">စက်မှပေးရန်ကျန်သော စာရင်း</p>
                 <p className="text-3xl font-black text-emerald-600">{toPay > 0 ? toPay.toLocaleString() : 0} <span className="text-base font-bold text-emerald-400">ဘောက်ချာ</span></p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                 <h3 className="font-bold text-slate-800 mb-6 flex items-center"><Factory size={18} className="mr-2"/> စက်ရုံတွင်း လုပ်ငန်းအခြေအနေများ</h3>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg"><span className="font-bold text-slate-600">အခြောက်ခံရန် စောင့်ဆိုင်းဆဲ</span><span className="font-black text-amber-600 bg-amber-100 px-3 py-1 rounded-full">{pendingToDry}</span></div>
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg"><span className="font-bold text-slate-600">အခြောက်ခံနေဆဲ (စက်လည်နေဆဲ)</span><span className="font-black text-orange-600 bg-orange-100 px-3 py-1 rounded-full">{dryingNow}</span></div>
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg"><span className="font-bold text-slate-600">ကြိတ်ခွဲရန် စောင့်ဆိုင်းဆဲ</span><span className="font-black text-purple-600 bg-purple-100 px-3 py-1 rounded-full">{waitingMill}</span></div>
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg"><span className="font-bold text-slate-600">Color Sort ရန် စောင့်ဆိုင်းဆဲ</span><span className="font-black text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">{waitingSort}</span></div>
                 </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                 <h3 className="font-bold text-slate-800 mb-6 flex items-center"><Receipt size={18} className="mr-2"/> ဘေလ်ရှင်းရန်ကျန်သော စာရင်းများ</h3>
                 {readyToBill === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-10">ရှင်းရန်ကျန် စာရင်းမရှိပါ။</p>
                 ) : (
                    <div className="space-y-3">
                       {jobs.filter(j => j.status === 'ready_to_bill').map(j => (
                          <div key={j.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                             <div>
                                <div className="font-bold text-slate-800">{j.customer}</div>
                                <div className="text-xs text-slate-500">{j.id} | {j.paddyType}</div>
                             </div>
                             <button onClick={() => setActiveView('admin')} className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200">ငွေစာရင်းသို့ သွားမည်</button>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
     );
  };

  const renderPaddyDashboard = () => {
     let todayPaddy = 0;
     jobs.forEach(j => {
        if(j.date === getToday() && j.entryType === 'paddy') todayPaddy += Number(j.originalQty || 0);
     });
     const pendingToDry = jobs.filter(j => j.status === 'waiting_dry').length;
     const dryingNow = jobs.filter(j => j.status === 'drying').length;

     return (
        <div className="animate-in fade-in duration-300">
           <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><LayoutDashboard className="mr-3 text-blue-600"/> စပါးတာဝန်ခံ Dashboard</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <p className="text-xs font-bold text-slate-500 uppercase mb-2">ယနေ့ စပါးအဝင်</p>
                 <p className="text-3xl font-black text-slate-800">{todayPaddy} <span className="text-base font-bold text-slate-400">တင်း</span></p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <p className="text-xs font-bold text-slate-500 uppercase mb-2">အခြောက်ခံရန် ကျန် (အစို)</p>
                 <p className="text-3xl font-black text-slate-800">{pendingToDry} <span className="text-base font-bold text-slate-400">စာရင်း</span></p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <p className="text-xs font-bold text-slate-500 uppercase mb-2">စက်လည်နေဆဲ</p>
                 <p className="text-3xl font-black text-orange-600">{dryingNow} <span className="text-base font-bold text-orange-400">စာရင်း</span></p>
              </div>
           </div>
           <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <p className="text-sm font-bold text-slate-500 mb-4">လုပ်ဆောင်ရန်</p>
              <button onClick={() => setActiveView('gate')} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 shadow-md">စပါးအဝင် စာရင်းသွင်းမည်</button>
           </div>
        </div>
     );
  };

  const renderRiceDashboard = () => {
     const waitingMill = jobs.filter(j => j.status === 'waiting_mill' && j.purpose === 'mill').length;
     const waitingSort = jobs.filter(j => j.status === 'waiting_sort').length;
     let todayRiceOut = 0;
     jobs.forEach(j => {
        if(j.deliveryLogs) {
           j.deliveryLogs.filter(l => l.date === getToday()).forEach(l => {
              todayRiceOut += Number(l.out1||0) + Number(l.out2||0) + Number(l.out3||0) + Number(l.bran||0) + Number(l.b12||0) + Number(l.b234||0);
           });
        }
     });

     return (
        <div className="animate-in fade-in duration-300">
           <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><LayoutDashboard className="mr-3 text-blue-600"/> ဆန်ရုံတာဝန်ခံ Dashboard</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <p className="text-xs font-bold text-slate-500 uppercase mb-2">ကြိတ်ခွဲရန် စောင့်ဆိုင်းဆဲ</p>
                 <p className="text-3xl font-black text-purple-600">{waitingMill} <span className="text-base font-bold text-purple-400">စာရင်း</span></p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <p className="text-xs font-bold text-slate-500 uppercase mb-2">Color Sort ရန် ကျန်</p>
                 <p className="text-3xl font-black text-indigo-600">{waitingSort} <span className="text-base font-bold text-indigo-400">စာရင်း</span></p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <p className="text-xs font-bold text-slate-500 uppercase mb-2">ယနေ့ ဆန်ထုတ်ပေးမှု</p>
                 <p className="text-3xl font-black text-slate-800">{todayRiceOut} <span className="text-base font-bold text-slate-400">အိတ်</span></p>
              </div>
           </div>
           <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <p className="text-sm font-bold text-slate-500 mb-4">လုပ်ဆောင်ရန်</p>
              <button onClick={() => setActiveView('milling')} className="bg-purple-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-purple-700 shadow-md">ကြိတ်ခွဲရေးဌာနသို့ သွားမည်</button>
           </div>
        </div>
     );
  };

  const renderPaddyGateView = () => {
    const handleAddJob = async (e) => {
      e.preventDefault();
      if(!newJob.customer || !newJob.qty || !newJob.paddyType) return showMessage("အချက်အလက်များ ပြည့်စုံစွာ ထည့်ပါ။", "danger");
      setIsLoading(true);

      const d = new Date(newJob.date);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      const suffix = `${mm}${yy}`;
      const jobsInThisMonth = jobs.filter(j => j.id && j.id.endsWith(suffix)).length;
      const seq = String(jobsInThisMonth + 1).padStart(3, '0');
      const newJobId = `${seq}${suffix}`;

      const isWet = newJob.entryType === 'paddy' && newJob.moisture === 'အစို';
      // Change: Even if wet, goes to waiting_dry (stored in Paddy Warehouse first)
      const initialStatus = newJob.entryType === 'nawali' ? 'waiting_sort' : (isWet ? 'waiting_dry' : 'waiting_mill');

      const jobData = {
        id: newJobId, customer: newJob.customer, entryType: newJob.entryType, purpose: newJob.entryType === 'nawali' ? 'mill' : newJob.purpose,
        paddyType: newJob.paddyType, originalQty: Number(newJob.qty), currentQty: Number(newJob.qty),
        moisture: newJob.entryType === 'nawali' ? 'အခြောက်' : newJob.moisture, wasWet: isWet, storage: newJob.storage || '-',
        status: initialStatus, date: newJob.date
      };
      
      try {
         const { error } = await supabase.from('jobs').insert([jobData]);
         if (error) throw error;
         setNewJob({ ...newJob, customer: '', paddyType: '', qty: '', storage: '' });
         showMessage(`စာရင်းသွင်းပြီးပါပြီ။ ဘောက်ချာ ID: ${newJobId}`, "success");
      } catch (err) {
         showMessage("Database Error ဖြစ်ပွားခဲ့ပါသည်။", "danger");
      } finally {
         setIsLoading(false);
      }
    };

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Home className="mr-3 text-blue-600"/> စပါးလက်ခံ / ဂိတ်ဝင် ဌာန</h2>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center"><ArrowDownToLine size={18} className="mr-2 text-blue-500"/> အဝင် စာရင်းသစ်သွင်းရန် (ဂိုဒေါင်သို့ တန်းဝင်မည်)</h3>
          <form onSubmit={handleAddJob} className="space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-md mb-4 border border-slate-200">
              <button type="button" onClick={() => setNewJob({...newJob, entryType: 'paddy'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newJob.entryType === 'paddy' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>စပါးအဝင်</button>
              <button type="button" onClick={() => setNewJob({...newJob, entryType: 'nawali'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newJob.entryType === 'nawali' ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>နဝလီ (Color Sort အဝင်)</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">ရက်စွဲ</label>
                <input type="date" value={newJob.date} onChange={e=>setNewJob({...newJob, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold bg-slate-50" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">ဖောက်သည်အမည်</label>
                <input type="text" value={newJob.customer} onChange={e=>setNewJob({...newJob, customer: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold bg-slate-50" required placeholder="အမည်" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{newJob.entryType === 'paddy' ? 'စပါးအမျိုးအစား' : 'ဆန်အမျိုးအစား'}</label>
                <input type="text" list="paddyTypes" value={newJob.paddyType} onChange={e=>setNewJob({...newJob, paddyType: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold bg-slate-50" required placeholder="ရိုက်ထည့်ပါ..." />
                <datalist id="paddyTypes"><option value="ကောက်ညှင်း" /><option value="အကြမ်းဆန်" /><option value="ပေါ်ဆန်း" /><option value="ဧည့်မထ" /><option value="စကွဲ" /></datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">အရေအတွက် ({newJob.entryType === 'paddy' ? 'တင်း' : 'အိတ်'})</label>
                <input type="number" value={newJob.qty} onChange={e=>setNewJob({...newJob, qty: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold bg-slate-50" required placeholder="0" min="1"/>
              </div>
              
              {newJob.entryType === 'paddy' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">အစို / အခြောက်</label>
                    <select value={newJob.moisture} onChange={e=>setNewJob({...newJob, moisture: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold bg-slate-50">
                      <option value="အစို">အစို</option>
                      <option value="အခြောက်">အခြောက်</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">လုပ်ငန်းရည်ရွယ်ချက်</label>
                    <select value={newJob.purpose} onChange={e=>setNewJob({...newJob, purpose: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold bg-slate-50">
                      <option value="mill">စက်ကြိတ်မည်</option>
                      <option value="dry_only">အခြောက်ခံရုံ သီးသန့်</option>
                    </select>
                  </div>
                </>
              )}

              <div className="col-span-1 md:col-span-2">
                 <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center"><MapPin size={12} className="mr-1"/> ချထားမည့် သိုလှောင်ရုံ/နေရာ</label>
                 <input type="text" list="storageLocations" value={newJob.storage} onChange={e=>setNewJob({...newJob, storage: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold bg-slate-50" placeholder="နေရာရွေးပါ..." required/>
                 <datalist id="storageLocations">{PADDY_STORAGE.map(s => <option key={s} value={s}/>)}</datalist>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
              <button disabled={isLoading} type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-bold shadow-md disabled:opacity-50 flex items-center">{isLoading ? 'Processing...' : <><Plus size={18} className="mr-2"/> ဂိုဒေါင်သို့ စာရင်းသွင်းမည်</>}</button>
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
        const isValid = dryingAllocations.every(a => a.machine && Number(a.qty) > 0);
        if(!isValid || dryingAllocations.length === 0) return showMessage("စက်အမည် နှင့် တင်းအရေအတွက် ပြည့်စုံစွာ ထည့်ပါ။", "danger");
        
        const totalDryQty = dryingAllocations.reduce((sum, a) => sum + Number(a.qty), 0);
        const currentJob = jobs.find(j => j.id === jobId);
        if(totalDryQty > currentJob.currentQty) return showMessage(`ထည့်သွင်းသော စုစုပေါင်းတင်း (${totalDryQty}) သည် မူလတင်း (${currentJob.currentQty}) ထက် များနေပါသည်။`, "danger");

        setIsLoading(true);
        try {
           if (totalDryQty < currentJob.currentQty) {
              // Split Job
              const remainingQty = currentJob.currentQty - totalDryQty;
              const newSplitJobId = `${currentJob.id}-${Date.now().toString().slice(-4)}`;
              
              // 1. Update old job to remaining qty (stays waiting_dry)
              await supabase.from('jobs').update({ currentQty: remainingQty, originalQty: remainingQty }).eq('id', jobId);
              
              // 2. Create new job for drying portion
              const dryingJob = {
                 ...currentJob,
                 id: newSplitJobId,
                 currentQty: totalDryQty,
                 originalQty: totalDryQty,
                 status: 'drying',
                 dryingMachines: dryingAllocations
              };
              await supabase.from('jobs').insert([dryingJob]);
           } else {
              // Full Dry
              await supabase.from('jobs').update({ status: 'drying', dryingMachines: dryingAllocations }).eq('id', jobId);
           }
           setActiveJobId(null);
           fetchData();
           showMessage("စက်ထဲသို့ အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။", "success");
        } catch (err) {
           showMessage("လုပ်ဆောင်မှု မအောင်မြင်ပါ။", "danger");
        } finally {
           setIsLoading(false);
        }
     };

     const handleFinishDrying = async (job) => {
        if(!dryInput.qty || !dryInput.storage) return showMessage("ကျန်ရှိတင်း နှင့် သိုလှောင်ရုံနေရာ ထည့်ပါ။", "danger");
        const nextStatus = job.purpose === 'dry_only' ? 'ready_to_bill' : 'waiting_mill';
        setIsLoading(true);
        try {
           await supabase.from('jobs').update({ 
              currentQty: Number(dryInput.qty), storage: dryInput.storage, moisture: 'အခြောက်', status: nextStatus
           }).eq('id', job.id);
           setActiveJobId(null); setDryInput({qty:'', storage:''});
           fetchData();
           showMessage("အခြောက်ခံပြီးစီးမှု စာရင်းသွင်းပြီးပါပြီ။", "success");
        } catch (err) {
           showMessage("လုပ်ဆောင်မှု မအောင်မြင်ပါ။", "danger");
        } finally {
           setIsLoading(false);
        }
     };

     const waitingList = jobs.filter(j => ['waiting_dry', 'waiting_mill'].includes(j.status));
     const dryingList = jobs.filter(j => j.status === 'drying');

     return (
        <div className="animate-in fade-in duration-300">
           <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Package className="mr-3 text-amber-700"/> စပါး / နဝလီ ဂိုဒေါင် နှင့် အခြောက်ခံစက်</h2>
           
           {/* Current Stock in Paddy Warehouse */}
           <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-8">
              <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-800 text-sm">ဂိုဒေါင်တွင်း လက်ကျန်စပါး/နဝလီ (စက်ချရန်အသင့်)</h3></div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="border-b border-slate-200">
                       <tr><th className="p-4 text-xs font-bold text-slate-500">ဘောက်ချာ / ဖောက်သည်</th><th className="p-4 text-xs font-bold text-slate-500">အမျိုးအစား / အစိုအခြောက်</th><th className="p-4 text-xs font-bold text-slate-500">နေရာ နှင့် အရေအတွက်</th><th className="p-4 text-xs font-bold text-slate-500 text-right">လုပ်ဆောင်ချက်</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {waitingList.map(job => (
                          <tr key={job.id} className="hover:bg-slate-50">
                             <td className="p-4"><div className="font-bold text-slate-800 text-sm">{job.customer}</div><div className="text-xs text-slate-500">{job.id}</div></td>
                             <td className="p-4 text-sm font-bold text-slate-700">{job.paddyType} <span className={`text-xs ml-2 px-2 py-0.5 rounded ${job.moisture==='အစို'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}`}>{job.moisture}</span></td>
                             <td className="p-4 text-sm font-bold"><MapPin size={14} className="inline mr-1 text-slate-400"/> {job.storage} <ArrowRight size={12} className="inline mx-2 text-slate-300"/> {job.currentQty} {job.entryType==='nawali'?'အိတ်':'တင်း'}</td>
                             <td className="p-4 text-right">
                                {session?.role === 'admin' && <button onClick={()=>handleDeleteJob(job.id)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg ml-2"><Trash2 size={16}/></button>}
                             </td>
                          </tr>
                       ))}
                       {waitingList.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-bold">စပါးဂိုဒေါင်တွင် လက်ကျန် မရှိပါ။</td></tr>}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Ready to Dry */}
              <div className="bg-white rounded-2xl border border-blue-200 overflow-hidden shadow-sm flex flex-col">
                 <div className="bg-blue-50 p-4 border-b border-blue-100"><h3 className="font-bold text-blue-900 flex items-center"><Droplets size={18} className="mr-2"/> အခြောက်ခံစက်သို့ ထည့်ရန် (စောင့်ဆိုင်း)</h3></div>
                 <div className="p-5 space-y-4 bg-slate-50">
                    {waitingList.filter(j => j.status === 'waiting_dry').map(job => (
                       <div key={job.id} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                             <div><span className="font-black text-slate-800 text-lg">{job.customer}</span><span className="text-xs font-bold text-slate-500 block">{job.id} • {job.paddyType}</span></div>
                             <div className="text-right font-black text-blue-600">{job.currentQty} တင်း <span className="block text-[10px] text-slate-400 font-medium"><MapPin size={10} className="inline"/> {job.storage}</span></div>
                          </div>
                          {activeJobId === job.id+'-todry' ? (
                             <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                                <label className="text-xs font-bold text-slate-600 block">မည်သည့်စက်ထဲသို့ မည်မျှထည့်မည်နည်း?</label>
                                {dryingAllocations.map((alloc, idx) => (
                                  <div key={idx} className="flex gap-2">
                                    <input type="text" list="dryingMachines" value={alloc.machine} onChange={e => {
                                      const newAllocs = [...dryingAllocations]; newAllocs[idx].machine = e.target.value; setDryingAllocations(newAllocs);
                                    }} className="flex-1 p-2 border border-slate-300 rounded text-sm outline-none font-bold" placeholder="စက်အမည်..." required/>
                                    <input type="number" value={alloc.qty} onChange={e => {
                                      const newAllocs = [...dryingAllocations]; newAllocs[idx].qty = e.target.value; setDryingAllocations(newAllocs);
                                    }} className="w-24 p-2 border border-slate-300 rounded text-sm outline-none font-bold text-blue-700" placeholder="တင်း" required min="1"/>
                                    {idx > 0 && <button onClick={() => handleRemoveAllocation(idx)} className="p-2 text-rose-500 bg-rose-50 rounded"><X size={16}/></button>}
                                  </div>
                                ))}
                                <div className="flex justify-between mt-2">
                                   <button onClick={handleAddAllocation} className="text-xs font-bold text-blue-600">+ စက်ထပ်ထည့်မည်</button>
                                   <div className="flex gap-2">
                                      <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-xs font-bold">ပယ်ဖျက်</button>
                                      <button disabled={isLoading} onClick={() => handleStartDrying(job.id)} className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold shadow-md">စက်ထဲ ခွဲထည့်မည်</button>
                                   </div>
                                </div>
                             </div>
                          ) : (
                             <button onClick={() => { setActiveJobId(job.id+'-todry'); setDryingAllocations([{machine: '', qty: job.currentQty}]); }} className="w-full bg-blue-50 text-blue-700 font-bold text-xs py-2 rounded-lg border border-blue-100">စက်ထဲ ခွဲထည့်မည်</button>
                          )}
                       </div>
                    ))}
                 </div>
              </div>

              {/* Drying Currently */}
              <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-sm flex flex-col">
                 <div className="bg-orange-50 p-4 border-b border-orange-100"><h3 className="font-bold text-orange-900 flex items-center"><Wind size={18} className="mr-2"/> အခြောက်ခံနေဆဲ</h3></div>
                 <div className="p-5 space-y-4 bg-slate-50">
                    {dryingList.map(job => (
                       <div key={job.id} className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm relative">
                          <div className="flex justify-between items-start mb-3">
                             <div><span className="font-black text-slate-800 text-lg">{job.customer}</span><span className="text-xs font-bold text-slate-500 block">{job.id} • {job.paddyType}</span></div>
                             <div className="text-right font-black text-orange-600">{job.originalQty} တင်း ဝင်ထား</div>
                          </div>
                          {activeJobId === job.id+'-finish' ? (
                             <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                                <div><label className="text-xs font-bold text-slate-600 block mb-1">အခြောက်ခံပြီး ကျန်ရှိမည့် တင်း</label><input type="number" value={dryInput.qty} onChange={e=>setDryInput({...dryInput, qty: e.target.value})} className="w-full p-2 border-2 border-orange-300 rounded outline-none font-bold text-orange-800 bg-orange-50" placeholder="0"/></div>
                                <div><label className="text-xs font-bold text-slate-600 block mb-1">သိမ်းဆည်းမည့် ဂိုဒေါင်နေရာ အသစ်</label><input type="text" list="storageLocations" value={dryInput.storage} onChange={e=>setDryInput({...dryInput, storage: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none font-bold" placeholder="နေရာရွေးပါ..."/></div>
                                <div className="flex justify-end gap-2 mt-2">
                                   <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">ပယ်ဖျက်</button>
                                   <button disabled={isLoading} onClick={() => handleFinishDrying(job)} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold shadow-md">အခြောက်ခံပြီးစီး</button>
                                </div>
                             </div>
                          ) : (
                             <button onClick={() => { setActiveJobId(job.id+'-finish'); setDryInput({qty:'', storage:''}); }} className="w-full bg-orange-50 text-orange-700 font-bold text-xs py-2 rounded-lg border border-orange-100">အခြောက်ခံပြီးစီး (လျော့တင်းသွင်းမည်)</button>
                          )}
                       </div>
                    ))}
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
         await supabase.from('jobs').update({ status: 'waiting_sort', millingData: millInput }).eq('id', jobId);
         setActiveJobId(null); setMillInput({ rice: '', broken12: '', broken234: '', bran: '' });
         fetchData();
         showMessage("ကြိတ်ခွဲမှု ရလဒ်များ စာရင်းသွင်းပြီးပါပြီ။", "success");
      } catch (err) {
         showMessage("လုပ်ဆောင်မှု မအောင်မြင်ပါ။", "danger");
      } finally {
         setIsLoading(false);
      }
    };

    const millJobs = jobs.filter(j => j.status === 'waiting_mill' && j.purpose === 'mill');

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Tractor className="mr-3 text-purple-600"/> ကြိတ်ခွဲရေး ဌာန</h2>
        <div className="space-y-4">
          {millJobs.map(job => (
            <div key={job.id} className="bg-white p-5 rounded-2xl border-l-4 border-l-purple-500 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div><h3 className="font-black text-xl text-slate-800">{job.customer}</h3><div className="text-xs font-bold text-slate-500 mt-1">{job.id} • {job.paddyType}</div></div>
                <div className="text-right">
                   <span className="text-purple-700 font-black bg-purple-50 px-3 py-1 rounded-md text-sm">{job.currentQty} တင်း</span>
                   <div className="text-xs text-slate-400 mt-1"><MapPin size={12} className="inline mr-1"/>{job.storage} မှ ယူမည်</div>
                   {session?.role === 'admin' && <button onClick={()=>handleDeleteJob(job.id)} className="text-rose-400 hover:text-rose-600 mt-2"><Trash2 size={16}/></button>}
                </div>
              </div>
              
              {activeJobId === job.id ? (
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div><label className="text-xs font-bold text-slate-700 mb-1 block">ဆန်အကြမ်း (အိတ်)</label><input type="number" value={millInput.rice} onChange={e=>setMillInput({...millInput, rice: e.target.value})} className="w-full p-2 border-2 border-purple-200 rounded font-bold outline-none"/></div>
                    <div><label className="text-xs font-bold text-sky-700 mb-1 block">၁၂ ဆန်ကွဲ (အိတ်)</label><input type="number" value={millInput.broken12} onChange={e=>setMillInput({...millInput, broken12: e.target.value})} className="w-full p-2 border border-sky-200 rounded font-bold outline-none"/></div>
                    <div><label className="text-xs font-bold text-blue-700 mb-1 block">၂၃၄ ဆန်ကွဲ (အိတ်)</label><input type="number" value={millInput.broken234} onChange={e=>setMillInput({...millInput, broken234: e.target.value})} className="w-full p-2 border border-blue-200 rounded font-bold outline-none"/></div>
                    <div><label className="text-xs font-bold text-amber-700 mb-1 block">ဖွဲနု (အိတ်)</label><input type="number" value={millInput.bran} onChange={e=>setMillInput({...millInput, bran: e.target.value})} className="w-full p-2 border border-amber-200 rounded font-bold outline-none"/></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-4 py-2 bg-white border border-slate-300 rounded font-bold text-xs text-slate-600">ပယ်ဖျက်</button>
                    <button disabled={isLoading} onClick={() => handleMillDone(job.id)} className="px-6 py-2 bg-purple-600 text-white rounded font-bold text-xs shadow">စာရင်းသွင်းမည်</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setActiveJobId(job.id)} className="w-full mt-3 bg-slate-50 text-purple-700 border border-purple-100 py-2 rounded-lg font-bold text-xs hover:bg-purple-100">ကြိတ်ခွဲမှု ရလဒ်များ စာရင်းသွင်းမည်</button>
              )}
            </div>
          ))}
          {millJobs.length === 0 && <p className="text-center text-slate-500 font-bold py-10 bg-white rounded-2xl">ကြိတ်ခွဲရန် စာရင်းမရှိပါ။</p>}
        </div>
      </div>
    );
  };

  const renderSortingView = () => {
    const handleSortDone = async (jobId) => {
      setIsLoading(true);
      try {
         await supabase.from('jobs').update({ status: 'ready_to_bill', sortingData: sortInput }).eq('id', jobId);
         setActiveJobId(null); setSortInput({ out1: '', storage1: '', out2: '', storage2: '', out3: '', storage3: '' });
         fetchData();
         showMessage("Sorting ရလဒ်များ ဂိုဒေါင်သို့ ပို့ဆောင်ပြီးပါပြီ။", "success");
      } catch (err) {
         showMessage("လုပ်ဆောင်မှု မအောင်မြင်ပါ။", "danger");
      } finally {
         setIsLoading(false);
      }
    };

    const sortJobs = jobs.filter(j => j.status === 'waiting_sort');

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><ScanLine className="mr-3 text-indigo-600"/> Color Sorting ဌာန</h2>
        <div className="space-y-4">
          {sortJobs.map(job => {
            const labels = getSortingLabels(job.paddyType);
            const isNawali = job.entryType === 'nawali';
            const rawBags = isNawali ? job.originalQty : (job.millingData?.rice || 0);

            return (
              <div key={job.id} className="bg-white p-5 rounded-2xl border-l-4 border-l-indigo-500 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-black text-xl text-slate-800">{job.customer}</h3>
                    <div className="text-xs font-bold text-slate-500 mt-1">{job.id} • {job.paddyType}</div>
                  </div>
                  <div className="text-right">
                     <span className="text-indigo-700 font-black bg-indigo-50 px-3 py-1 rounded-md text-sm">Raw အဝင်: {rawBags} အိတ်</span>
                     {session?.role === 'admin' && <button onClick={()=>handleDeleteJob(job.id)} className="text-rose-400 hover:text-rose-600 ml-4"><Trash2 size={16} className="inline"/></button>}
                  </div>
                </div>
                
                {activeJobId === job.id ? (
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white p-3 rounded-lg border border-indigo-100">
                        <label className="text-xs font-bold text-indigo-900 block mb-2">{labels[0]}</label>
                        <input type="number" value={sortInput.out1} onChange={e=>setSortInput({...sortInput, out1: e.target.value})} className="w-full p-2 border-2 border-indigo-200 rounded outline-none font-bold mb-2" placeholder="အိတ် အရေအတွက်"/>
                        <input type="text" list="riceStorage" value={sortInput.storage1} onChange={e=>setSortInput({...sortInput, storage1: e.target.value})} className="w-full p-2 border border-slate-200 rounded text-xs outline-none" placeholder="ဂိုဒေါင်နေရာ..."/>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <label className="text-xs font-bold text-slate-700 block mb-2">{labels[1]}</label>
                        <input type="number" value={sortInput.out2} onChange={e=>setSortInput({...sortInput, out2: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none font-bold mb-2" placeholder="အိတ် အရေအတွက်"/>
                        <input type="text" list="riceStorage" value={sortInput.storage2} onChange={e=>setSortInput({...sortInput, storage2: e.target.value})} className="w-full p-2 border border-slate-200 rounded text-xs outline-none" placeholder="ဂိုဒေါင်နေရာ..."/>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-red-100">
                        <label className="text-xs font-bold text-red-700 block mb-2">{labels[2]}</label>
                        <input type="number" value={sortInput.out3} onChange={e=>setSortInput({...sortInput, out3: e.target.value})} className="w-full p-2 border border-red-200 rounded outline-none font-bold mb-2" placeholder="အိတ် အရေအတွက်"/>
                        <input type="text" list="riceStorage" value={sortInput.storage3} onChange={e=>setSortInput({...sortInput, storage3: e.target.value})} className="w-full p-2 border border-slate-200 rounded text-xs outline-none" placeholder="ဂိုဒေါင်နေရာ..."/>
                      </div>
                    </div>
                    <datalist id="riceStorage">{RICE_STORAGE.map(s => <option key={s} value={s}/>)}</datalist>
                    <div className="flex justify-end gap-2">
                      <button disabled={isLoading} onClick={() => setActiveJobId(null)} className="px-4 py-2 bg-white border border-slate-300 rounded font-bold text-xs text-slate-600">ပယ်ဖျက်</button>
                      <button disabled={isLoading} onClick={() => handleSortDone(job.id)} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold text-xs shadow">ဂိုဒေါင်သို့ ပို့မည်</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setActiveJobId(job.id)} className="w-full mt-3 bg-white text-indigo-700 border border-indigo-100 py-2 rounded-lg font-bold text-xs hover:bg-indigo-50">Sorting ရလဒ် စာရင်းသွင်းမည်</button>
                )}
              </div>
            );
          })}
          {sortJobs.length === 0 && <p className="text-center text-slate-500 font-bold py-10 bg-white rounded-2xl">Color Sort ရန် စာရင်းမရှိပါ။</p>}
        </div>
      </div>
    );
  };

  const renderRiceWarehouseView = () => {
    const finishedJobs = jobs.filter(j => ['ready_to_bill', 'billed'].includes(j.status));

    return (
      <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Package className="mr-3 text-emerald-600"/> ဆန် နှင့် ထွက်ကုန် ဂိုဒေါင် (Delivery)</h2>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                   <th className="p-4 font-bold text-sm text-slate-600">ဘောက်ချာ / ဖောက်သည်</th>
                   <th className="p-4 font-bold text-sm text-slate-600">ထုတ်ယူရန်ကျန်ရှိသည့် ထွက်ကုန်များ (Remaining)</th>
                   <th className="p-4 font-bold text-sm text-slate-600 text-right">လုပ်ဆောင်ချက်</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {finishedJobs.map(job => {
                    const labels = getSortingLabels(job.paddyType);
                    // Calculate remaining
                    let rem1 = Number(job.sortingData?.out1 || 0);
                    let rem2 = Number(job.sortingData?.out2 || 0);
                    let rem3 = Number(job.sortingData?.out3 || 0);
                    let remBran = Number(job.millingData?.bran || 0);
                    let remB12 = Number(job.millingData?.broken12 || 0);
                    let remB234 = Number(job.millingData?.broken234 || 0);

                    // Deduct mill purchases
                    if (job.billData) {
                       if (job.billData.branOption === 'sell') remBran = 0;
                       if (job.billData.byproductOption === 'sell') rem2 = 0;
                       if (job.billData.rejectOption === 'sell') rem3 = 0;
                    }

                    // Deduct deliveries
                    (job.deliveryLogs || []).forEach(log => {
                       rem1 -= Number(log.out1 || 0);
                       rem2 -= Number(log.out2 || 0);
                       rem3 -= Number(log.out3 || 0);
                       remBran -= Number(log.bran || 0);
                       remB12 -= Number(log.b12 || 0);
                       remB234 -= Number(log.b234 || 0);
                    });

                    const hasRemaining = rem1>0 || rem2>0 || rem3>0 || remBran>0 || remB12>0 || remB234>0;

                    return (
                       <tr key={job.id} className="hover:bg-slate-50">
                          <td className="p-4 align-top w-1/3">
                             <div className="font-bold text-slate-800">{job.id}</div>
                             <div className="text-sm font-bold text-slate-600">{job.customer}</div>
                             <div className="text-xs text-slate-400 mt-1">{job.paddyType}</div>
                             {session?.role === 'admin' && <button onClick={()=>handleDeleteJob(job.id)} className="text-xs text-rose-500 mt-2 font-bold flex items-center hover:underline"><Trash2 size={12} className="mr-1"/> ဖျက်မည်</button>}
                             
                             {job.deliveryLogs?.length > 0 && (
                                <div className="mt-3 space-y-2">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ဆန်ထုတ်ပေးမှု မှတ်တမ်းများ</p>
                                   {job.deliveryLogs.map(log => (
                                      <div key={log.id} className="bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
                                         <div className="flex justify-between text-xs text-slate-500 mb-1">
                                           <span>{log.date} | 🚘 {log.carNo} | 👤 {log.driverName}</span>
                                         </div>
                                         <div className="text-xs font-bold flex flex-wrap gap-2">
                                            {log.out1 > 0 && <span className="text-emerald-600">{labels[0]}: {log.out1}</span>}
                                            {log.out2 > 0 && <span className="text-slate-600">By-product: {log.out2}</span>}
                                            {log.out3 > 0 && <span className="text-red-500">Reject: {log.out3}</span>}
                                            {log.bran > 0 && <span className="text-orange-500">ဖွဲနု: {log.bran}</span>}
                                            {log.b12 > 0 && <span className="text-sky-600">၁၂: {log.b12}</span>}
                                            {log.b234 > 0 && <span className="text-blue-600">၂၃၄: {log.b234}</span>}
                                         </div>
                                      </div>
                                   ))}
                                </div>
                             )}
                          </td>
                          <td className="p-4 align-middle">
                             <div className="flex flex-wrap gap-2">
                                {rem1 > 0 && <span className="text-emerald-700 font-bold text-sm bg-emerald-50 px-2 py-1 rounded">{labels[0]}: {rem1} အိတ်</span>}
                                {rem2 > 0 && <span className="text-slate-700 font-bold text-sm bg-slate-100 px-2 py-1 rounded">By-product: {rem2} အိတ်</span>}
                                {rem3 > 0 && <span className="text-red-600 font-bold text-sm bg-red-50 px-2 py-1 rounded">Reject: {rem3} အိတ်</span>}
                                {remBran > 0 && <span className="text-orange-600 font-bold text-sm bg-orange-50 px-2 py-1 rounded">ဖွဲနု: {remBran} အိတ်</span>}
                                {remB12 > 0 && <span className="text-sky-600 font-bold text-sm bg-sky-50 px-2 py-1 rounded">၁၂ ဆန်ကွဲ: {remB12} အိတ်</span>}
                                {remB234 > 0 && <span className="text-blue-600 font-bold text-sm bg-blue-50 px-2 py-1 rounded">၂၃၄ ဆန်ကွဲ: {remB234} အိတ်</span>}
                                {!hasRemaining && <span className="text-slate-400 font-bold text-sm bg-slate-100 px-3 py-1.5 rounded-lg">အားလုံး ထုတ်ယူပြီးပါပြီ</span>}
                             </div>
                          </td>
                          <td className="p-4 align-middle text-right">
                             {hasRemaining && (
                                <button onClick={() => setDeliveryModal({...job, rem1, rem2, rem3, remBran, remB12, remB234, labels})} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold text-xs flex items-center ml-auto hover:bg-blue-700 shadow-md">
                                   <Truck size={16} className="mr-2"/> ဆန်ထုတ်ပေးမည်
                                </button>
                             )}
                          </td>
                       </tr>
                    );
                 })}
                 {finishedJobs.length === 0 && (
                    <tr><td colSpan="3" className="p-8 text-center text-slate-500 font-bold">ထုတ်ယူရန် စာရင်းမရှိပါ။</td></tr>
                 )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivery Modal (Static Focus Fix with B12/B234) */}
        {deliveryModal && (
           <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                 <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-blue-50">
                    <div>
                       <h3 className="font-black text-lg text-blue-800">ဆန်ထုတ်ပေးမှု မှတ်တမ်း</h3>
                       <p className="text-xs font-bold text-blue-600">{deliveryModal.id} • {deliveryModal.customer}</p>
                    </div>
                    <button onClick={() => setDeliveryModal(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-full shadow-sm"><X size={20}/></button>
                 </div>
                 <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">ရက်စွဲ</label>
                          <input type="date" value={deliveryInput.date} onChange={e=>setDeliveryInput({...deliveryInput, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"/>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">ကားနံပါတ်</label>
                          <input type="text" value={deliveryInput.carNo} onChange={e=>setDeliveryInput({...deliveryInput, carNo: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none" placeholder="ဥပမာ - YGN 1Q-1234"/>
                       </div>
                       <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-1">လာရောက်ထုတ်ယူသူ အမည် / ဖုန်း</label>
                          <input type="text" value={deliveryInput.driverName} onChange={e=>setDeliveryInput({...deliveryInput, driverName: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none" placeholder="အမည်..."/>
                       </div>
                    </div>

                    <h4 className="text-xs font-bold bg-slate-100 p-2.5 rounded-lg text-slate-600 mt-4 mb-2">ထုတ်ပေးမည့် အရေအတွက် (အိတ်)</h4>
                    <div className="grid grid-cols-2 gap-4">
                       {deliveryModal.rem1 > 0 && <div><label className="block text-xs font-bold text-emerald-700 mb-1">{deliveryModal.labels[0]} (Max: {deliveryModal.rem1})</label><input type="number" max={deliveryModal.rem1} min="0" value={deliveryInput.out1Qty} onChange={e=>setDeliveryInput({...deliveryInput, out1Qty: e.target.value})} className="w-full p-2 border-2 border-emerald-200 rounded-lg outline-none font-bold text-slate-800" placeholder="0"/></div>}
                       {deliveryModal.rem2 > 0 && <div><label className="block text-xs font-bold text-slate-700 mb-1">By-product (Max: {deliveryModal.rem2})</label><input type="number" max={deliveryModal.rem2} min="0" value={deliveryInput.out2Qty} onChange={e=>setDeliveryInput({...deliveryInput, out2Qty: e.target.value})} className="w-full p-2 border-2 border-slate-200 rounded-lg outline-none font-bold text-slate-800" placeholder="0"/></div>}
                       {deliveryModal.rem3 > 0 && <div><label className="block text-xs font-bold text-red-700 mb-1">Reject (Max: {deliveryModal.rem3})</label><input type="number" max={deliveryModal.rem3} min="0" value={deliveryInput.out3Qty} onChange={e=>setDeliveryInput({...deliveryInput, out3Qty: e.target.value})} className="w-full p-2 border-2 border-red-200 rounded-lg outline-none font-bold text-slate-800" placeholder="0"/></div>}
                       {deliveryModal.remBran > 0 && <div><label className="block text-xs font-bold text-orange-700 mb-1">ဖွဲနု (Max: {deliveryModal.remBran})</label><input type="number" max={deliveryModal.remBran} min="0" value={deliveryInput.branQty} onChange={e=>setDeliveryInput({...deliveryInput, branQty: e.target.value})} className="w-full p-2 border-2 border-orange-200 rounded-lg outline-none font-bold text-slate-800" placeholder="0"/></div>}
                       {deliveryModal.remB12 > 0 && <div><label className="block text-xs font-bold text-sky-700 mb-1">၁၂ ဆန်ကွဲ (Max: {deliveryModal.remB12})</label><input type="number" max={deliveryModal.remB12} min="0" value={deliveryInput.b12Qty} onChange={e=>setDeliveryInput({...deliveryInput, b12Qty: e.target.value})} className="w-full p-2 border-2 border-sky-200 rounded-lg outline-none font-bold text-slate-800" placeholder="0"/></div>}
                       {deliveryModal.remB234 > 0 && <div><label className="block text-xs font-bold text-blue-700 mb-1">၂၃၄ ဆန်ကွဲ (Max: {deliveryModal.remB234})</label><input type="number" max={deliveryModal.remB234} min="0" value={deliveryInput.b234Qty} onChange={e=>setDeliveryInput({...deliveryInput, b234Qty: e.target.value})} className="w-full p-2 border-2 border-blue-200 rounded-lg outline-none font-bold text-slate-800" placeholder="0"/></div>}
                    </div>
                 </div>
                 <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                    <button onClick={() => setDeliveryModal(null)} className="px-6 py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-700">ပယ်ဖျက်</button>
                    <button onClick={handleDeliverySubmit} disabled={isLoading} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center">
                       <Truck size={18} className="mr-2"/> {isLoading ? 'Processing...' : 'အတည်ပြု ထုတ်ပေးမည်'}
                    </button>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  };

  const renderAdminPOSView = () => {
     const [searchQuery, setSearchQuery] = useState('');

     const handleBillSubmit = async (job, net, bal) => {
        setIsLoading(true);
        try {
           const finalBill = { ...billInput, netTotal: net, balance: bal, billDate: getToday() };
           await supabase.from('jobs').update({ status: 'billed', billData: finalBill }).eq('id', job.id);
           setActiveJobId(null); 
           setBillInput({ dryingRate: '', sortingRate: '', millingRate: '', branOption: 'take', branRate: '', byproductOption: 'take', byproductRate: '', rejectOption: 'take', rejectRate: '', otherExp: '', paidAmount: '' });
           fetchData();
           showMessage("ငွေစာရင်း သိမ်းဆည်းပြီးပါပြီ။", "success");
        } catch (err) {
           showMessage("လုပ်ဆောင်မှု မအောင်မြင်ပါ။", "danger");
        } finally {
           setIsLoading(false);
        }
     };

     const pendingJobs = jobs.filter(j => j.status === 'ready_to_bill');
     const searchedJobs = pendingJobs.filter(j => 
        j.id === activeJobId || 
        (searchQuery.trim() !== '' && (j.customer.toLowerCase().includes(searchQuery.toLowerCase()) || j.id.toLowerCase().includes(searchQuery.toLowerCase())))
     );

     return (
        <div className="animate-in fade-in duration-300">
           <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Calculator className="mr-3 text-blue-600"/> ငွေစာရင်း (Admin POS) ဌာန</h2>
           <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-8 shadow-sm">
              <label className="block text-sm font-bold text-slate-700 mb-3">ဘောက်ချာ ဖွင့်ရန် / ငွေရှင်းရန် ရှာဖွေပါ</label>
              <div className="relative max-w-xl">
                 <input type="text" placeholder="ဖောက်သည် အမည် (သို့) ဘောက်ချာ ID ရိုက်ထည့်ပါ..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl outline-none font-bold text-slate-900 bg-slate-50"/>
                 <Search className="absolute left-4 top-4 text-slate-400" size={20} />
              </div>
           </div>

           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {searchedJobs.map(job => {
                 const isNawali = job.entryType === 'nawali';
                 const isDryOnly = job.purpose === 'dry_only';
                 const dryingFee = job.wasWet ? (Number(job.originalQty) * (Number(billInput.dryingRate) || 0)) : 0;
                 let totalServiceFee = 0;
                 if (!isDryOnly) {
                    if (isNawali) totalServiceFee = Number(job.originalQty) * (Number(billInput.sortingRate) || 0);
                    else totalServiceFee = (Number(job.millingData?.rice||0) + Number(job.millingData?.broken12||0) + Number(job.millingData?.broken234||0)) * (Number(billInput.millingRate) || 0);
                 }
                 const branQty = isNawali || isDryOnly ? 0 : Number(job.millingData?.bran || 0);
                 const byproductQty = isDryOnly ? 0 : Number(job.sortingData?.out2 || 0);
                 const rejectQty = isDryOnly ? 0 : Number(job.sortingData?.out3 || 0);
                 const branDeduction = billInput.branOption === 'sell' ? (branQty * (Number(billInput.branRate) || 0)) : 0;
                 const byproductDeduction = billInput.byproductOption === 'sell' ? (byproductQty * (Number(billInput.byproductRate) || 0)) : 0;
                 const rejectDeduction = billInput.rejectOption === 'sell' ? (rejectQty * (Number(billInput.rejectRate) || 0)) : 0;
                 
                 const netTotal = totalServiceFee + dryingFee - (branDeduction + byproductDeduction + rejectDeduction) + (Number(billInput.otherExp) || 0);
                 const balance = netTotal > 0 ? (netTotal - (Number(billInput.paidAmount)||0)) : (netTotal + (Number(billInput.paidAmount)||0));

                 return (
                    <div key={job.id} className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                       <div style={{backgroundColor: '#1e293b', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <div>
                             <h3 style={{fontSize: '1.5rem', fontWeight: '900', color: 'white', marginBottom: '0.25rem'}}>{job.customer}</h3>
                             <p style={{fontSize: '0.875rem', fontWeight: 'bold', color: '#94a3b8'}}>ID: {job.id} | {job.paddyType} | {job.date}</p>
                          </div>
                       </div>
                       {activeJobId === job.id ? (
                          <div className="p-6 bg-slate-50">
                             <div className="space-y-4 mb-6">
                                {job.wasWet && (
                                   <div className="bg-white p-4 rounded-xl border border-slate-200">
                                      <label className="text-xs font-bold text-slate-700 block mb-2">အခြောက်ခံခ နှုန်း (၁ တင်း)</label>
                                      <input type="number" value={billInput.dryingRate} onChange={e=>setBillInput({...billInput, dryingRate: e.target.value})} className="w-full p-2 border rounded font-bold"/>
                                   </div>
                                )}
                                {!isDryOnly && (
                                   <div className="bg-white p-4 rounded-xl border border-slate-200">
                                      <label className="text-xs font-bold text-slate-700 block mb-2">{isNawali ? 'Sorting နှုန်း (၁ အိတ်)' : 'ကြိတ်ခွဲခ နှုန်း (၁ အိတ်)'}</label>
                                      <input type="number" value={isNawali ? billInput.sortingRate : billInput.millingRate} onChange={e=> isNawali ? setBillInput({...billInput, sortingRate: e.target.value}) : setBillInput({...billInput, millingRate: e.target.value})} className="w-full p-2 border rounded font-bold"/>
                                   </div>
                                )}
                                <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-200 space-y-4">
                                   <h4 className="text-xs font-black text-cyan-800">စက်သို့ ပြန်ရောင်း၍ ခုနှိမ်ခြင်း</h4>
                                   {branQty > 0 && (
                                      <div className="bg-white p-3 rounded border border-cyan-100">
                                         <p className="text-xs font-bold mb-2">ဖွဲနု ({branQty} အိတ်)</p>
                                         <select value={billInput.branOption} onChange={e=>setBillInput({...billInput, branOption: e.target.value})} className="w-full p-2 border rounded mb-2 text-xs font-bold"><option value="take">ဖောက်သည် ယူမည်</option><option value="sell">စက်သို့ ရောင်းမည်</option></select>
                                         {billInput.branOption==='sell' && <input type="number" placeholder="ဝယ်ယူမည့် နှုန်း" value={billInput.branRate} onChange={e=>setBillInput({...billInput, branRate: e.target.value})} className="w-full p-2 border rounded font-bold text-cyan-700"/>}
                                      </div>
                                   )}
                                   {byproductQty > 0 && (
                                      <div className="bg-white p-3 rounded border border-cyan-100">
                                         <p className="text-xs font-bold mb-2">By-product ({byproductQty} အိတ်)</p>
                                         <select value={billInput.byproductOption} onChange={e=>setBillInput({...billInput, byproductOption: e.target.value})} className="w-full p-2 border rounded mb-2 text-xs font-bold"><option value="take">ဖောက်သည် ယူမည်</option><option value="sell">စက်သို့ ရောင်းမည်</option></select>
                                         {billInput.byproductOption==='sell' && <input type="number" placeholder="ဝယ်ယူမည့် နှုန်း" value={billInput.byproductRate} onChange={e=>setBillInput({...billInput, byproductRate: e.target.value})} className="w-full p-2 border rounded font-bold text-cyan-700"/>}
                                      </div>
                                   )}
                                   {rejectQty > 0 && (
                                      <div className="bg-white p-3 rounded border border-cyan-100">
                                         <p className="text-xs font-bold mb-2">Reject ({rejectQty} အိတ်)</p>
                                         <select value={billInput.rejectOption} onChange={e=>setBillInput({...billInput, rejectOption: e.target.value})} className="w-full p-2 border rounded mb-2 text-xs font-bold"><option value="take">ဖောက်သည် ယူမည်</option><option value="sell">စက်သို့ ရောင်းမည်</option></select>
                                         {billInput.rejectOption==='sell' && <input type="number" placeholder="ဝယ်ယူမည့် နှုန်း" value={billInput.rejectRate} onChange={e=>setBillInput({...billInput, rejectRate: e.target.value})} className="w-full p-2 border rounded font-bold text-cyan-700"/>}
                                      </div>
                                   )}
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                   <label className="text-xs font-bold text-slate-700 block mb-2">အခြား ကုန်ကျစရိတ်</label>
                                   <input type="number" value={billInput.otherExp} onChange={e=>setBillInput({...billInput, otherExp: e.target.value})} className="w-full p-2 border rounded font-bold"/>
                                </div>
                             </div>
                             
                             <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-sm">
                                <div className="flex justify-between items-center mb-4 border-b pb-2"><span className="text-xs font-bold text-slate-500">ကျသင့်ငွေ (NET TOTAL)</span><span className="text-2xl font-black">{Math.abs(netTotal).toLocaleString()} Ks</span></div>
                                <label className="text-xs font-bold block mb-2">ပေးချေငွေ / ပြန်အမ်းငွေ</label>
                                <input type="number" value={billInput.paidAmount} onChange={e=>setBillInput({...billInput, paidAmount: e.target.value})} className="w-full p-3 border-2 border-blue-300 rounded-lg font-bold text-lg"/>
                             </div>
                             <div className="flex gap-3">
                                <button onClick={()=>setActiveJobId(null)} className="px-6 py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-700">ပယ်ဖျက်</button>
                                <button onClick={()=>handleBillSubmit(job, netTotal, balance)} disabled={isLoading} className="flex-1 bg-blue-600 text-white font-bold rounded-xl shadow-md">အတည်ပြုမည်</button>
                             </div>
                          </div>
                       ) : (
                          <div className="p-6 text-center bg-slate-50"><button onClick={()=>setActiveJobId(job.id)} className="bg-white text-blue-600 font-bold py-3 px-6 rounded-xl border-2 border-blue-200 shadow-sm w-full">ဘေလ်တွက်ရန် နှိပ်ပါ</button></div>
                       )}
                    </div>
                 );
              })}
           </div>
        </div>
     );
  };

  const renderCustomerLedgerView = () => {
     const [searchQuery, setSearchQuery] = useState('');
     const [expandedCustomer, setExpandedCustomer] = useState(null);

     const customerStats = {};
     jobs.forEach(job => {
       if(!customerStats[job.customer]) customerStats[job.customer] = { name: job.customer, totalPaddy: 0, totalDebt: 0, history: [] };
       const stat = customerStats[job.customer];
       if (job.entryType === 'paddy' && job.status !== 'payment' && job.status !== 'opening_stock') stat.totalPaddy += Number(job.originalQty||0);
       if (job.status === 'billed' && job.billData) stat.totalDebt += Number(job.billData.balance || 0);
       if (job.status === 'payment') stat.totalDebt -= Number(job.amount||0); 
       stat.history.push(job);
     });

     const handlePaymentSubmit = async () => {
         if(!paymentModal) return;
         setIsLoading(true);
         try {
             const amt = Number(paymentAmount);
             if(amt <= 0) throw new Error("Amount must be greater than 0");
             const newJob = {
                 id: `PAY-${Date.now().toString().slice(-6)}`, customer: paymentModal.customer,
                 status: 'payment', amount: paymentModal.type === 'receive' ? amt : -amt, date: getToday()
             };
             await supabase.from('jobs').insert([newJob]);
             setPaymentModal(null); setPaymentAmount(''); fetchData();
             showMessage("ငွေစာရင်း မှတ်တမ်းတင်ပြီးပါပြီ။", "success");
         } catch (err) {
             showMessage("လုပ်ဆောင်မှု မအောင်မြင်ပါ။", "danger");
         } finally {
             setIsLoading(false);
         }
     };

     const filteredCustomers = Object.values(customerStats).filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

     return (
        <div className="animate-in fade-in duration-300">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center"><Users className="mr-3 text-blue-600"/> ဖောက်သည် မှတ်တမ်း / အကြွေးစာရင်း</h2>
              <div className="relative w-72">
                 <input type="text" placeholder="အမည်ဖြင့် ရှာရန်..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl outline-none"/>
                 <Search className="absolute left-3.5 top-2.5 text-slate-400" size={18} />
              </div>
           </div>

           <div className="space-y-4">
              {filteredCustomers.map(cust => (
                 <div key={cust.name} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 flex justify-between items-center bg-slate-50 hover:bg-slate-100 cursor-pointer" onClick={() => setExpandedCustomer(expandedCustomer === cust.name ? null : cust.name)}>
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-xl">{cust.name.charAt(0)}</div>
                          <div><h3 className="font-black text-lg text-slate-800">{cust.name}</h3><p className="text-xs font-bold text-slate-500">လုပ်ငန်းစဉ်: {cust.history.length} ကြိမ်</p></div>
                       </div>
                       <div className="flex items-center gap-4">
                          {cust.totalDebt > 0 && <div className="text-right bg-rose-50 px-4 py-2 rounded-xl"><p className="text-[10px] font-bold text-rose-500">ဖောက်သည် အကြွေး</p><p className="font-black text-rose-600">{cust.totalDebt.toLocaleString()} Ks</p></div>}
                          {cust.totalDebt < 0 && <div className="text-right bg-emerald-50 px-4 py-2 rounded-xl"><p className="text-[10px] font-bold text-emerald-600">စက်မှ ပေးရန်ကျန်ငွေ</p><p className="font-black text-emerald-700">{Math.abs(cust.totalDebt).toLocaleString()} Ks</p></div>}
                          {session?.role === 'admin' && cust.totalDebt > 0 && <button onClick={(e) => { e.stopPropagation(); setPaymentModal({customer: cust.name, type: 'receive', debt: cust.totalDebt}); }} className="bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-lg">ကြွေးဆပ်မည်</button>}
                          {session?.role === 'admin' && cust.totalDebt < 0 && <button onClick={(e) => { e.stopPropagation(); setPaymentModal({customer: cust.name, type: 'pay', debt: Math.abs(cust.totalDebt)}); }} className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg">ငွေရှင်းပေးမည်</button>}
                          {expandedCustomer === cust.name ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                       </div>
                    </div>
                    {expandedCustomer === cust.name && (
                       <div className="p-4 border-t border-slate-200">
                          <table className="w-full text-left text-sm">
                             <thead className="text-slate-500 border-b"><tr><th className="pb-2">ရက်စွဲ/ID</th><th className="pb-2">အမျိုးအစား/အခြေအနေ</th><th className="pb-2 text-right">ကျသင့်ငွေ/ပေးချေငွေ</th><th className="pb-2 text-right">အကြွေး / ပေးရန်ကျန်</th></tr></thead>
                             <tbody className="divide-y">
                                {cust.history.map(h => (
                                   <tr key={h.id}>
                                      <td className="py-3"><div className="font-bold">{h.date}</div><div className="text-xs text-slate-500">{h.id}</div></td>
                                      <td className="py-3 font-bold text-slate-700">{h.status === 'payment' ? 'ငွေပေးချေမှု' : h.paddyType} <br/><span className="text-[10px] text-blue-500">{h.status}</span></td>
                                      <td className="py-3 text-right font-black">{h.status === 'payment' ? Math.abs(h.amount).toLocaleString() : h.billData?.netTotal?.toLocaleString() || '-'}</td>
                                      <td className="py-3 text-right font-black text-rose-500">{h.status !== 'payment' ? h.billData?.balance?.toLocaleString() || '-' : '-'}
                                         {session?.role === 'admin' && <button onClick={()=>handleDeleteJob(h.id)} className="ml-3 text-rose-400 hover:text-rose-600"><Trash2 size={14} className="inline"/></button>}
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    )}
                 </div>
              ))}
           </div>

           {/* Static Payment Modal */}
           {paymentModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                 <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                    <div className={`px-6 py-5 border-b flex justify-between items-center ${paymentModal.type === 'receive' ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                       <h3 className="font-black text-lg">{paymentModal.customer}</h3>
                       <button onClick={() => setPaymentModal(null)} className="text-slate-500"><X size={20}/></button>
                    </div>
                    <div className="p-6">
                       <p className="text-center text-sm font-bold text-slate-500 mb-1">လက်ရှိ ကျန်ငွေ</p>
                       <p className="text-center text-3xl font-black mb-6">{paymentModal.debt.toLocaleString()} Ks</p>
                       <input type="number" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} className="w-full p-4 border-2 border-slate-300 rounded-xl outline-none font-bold text-center text-xl mb-4" placeholder="ပေးချေငွေ..."/>
                       <button onClick={handlePaymentSubmit} disabled={isLoading} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl">{isLoading?'Processing...':'အတည်ပြုမည်'}</button>
                    </div>
                 </div>
              </div>
           )}
        </div>
     );
  };

  const renderInventoryView = () => {
     let totals = { fine: 0, b12: 0, b234: 0, bran: 0, byproduct: 0, reject: 0 };
     jobs.forEach(j => {
        // From billing deductions
        if (j.status === 'billed' && j.billData) {
           if (j.billData.branOption === 'sell') totals.bran += Number(j.millingData?.bran || 0);
           if (j.billData.byproductOption === 'sell') totals.byproduct += Number(j.sortingData?.out2 || 0);
           if (j.billData.rejectOption === 'sell') totals.reject += Number(j.sortingData?.out3 || 0);
        }
        // From opening stock directly inserted to inventory
        if (j.status === 'opening_stock' && j.ownerType === 'စက်ပိုင်') {
           if (j.itemType === 'ဆန်အချော') totals.fine += Number(j.currentQty);
           if (j.itemType === '၁၂ ဆန်ကွဲ') totals.b12 += Number(j.currentQty);
           if (j.itemType === '၂၃၄ ဆန်ကွဲ') totals.b234 += Number(j.currentQty);
           if (j.itemType === 'ဖွဲနု') totals.bran += Number(j.currentQty);
           if (j.itemType === 'By-product') totals.byproduct += Number(j.currentQty);
           if (j.itemType === 'Reject') totals.reject += Number(j.currentQty);
        }
     });

     return (
        <div className="animate-in fade-in duration-300">
           <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Package className="mr-3 text-emerald-600"/> စက်ပိုင် ဆန်/ဖွဲနု စာရင်း</h2>
           <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-6 flex items-center"><ArrowDownToLine size={16} className="mr-2"/> စက်မှ ဝယ်ယူထားသော / စက်ပိုင် လက်ကျန်များ</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                 <div className="border border-slate-200 p-5 rounded-2xl"><p className="text-xs font-bold text-slate-500 mb-1">ဆန်အချော</p><p className="text-3xl font-black text-slate-800">{totals.fine} <span className="text-sm font-bold">အိတ်</span></p></div>
                 <div className="border border-slate-200 p-5 rounded-2xl"><p className="text-xs font-bold text-slate-500 mb-1">၁၂ ဆန်ကွဲ</p><p className="text-3xl font-black text-slate-800">{totals.b12} <span className="text-sm font-bold">အိတ်</span></p></div>
                 <div className="border border-slate-200 p-5 rounded-2xl"><p className="text-xs font-bold text-slate-500 mb-1">၂၃၄ ဆန်ကွဲ</p><p className="text-3xl font-black text-slate-800">{totals.b234} <span className="text-sm font-bold">အိတ်</span></p></div>
                 <div className="border border-slate-200 p-5 rounded-2xl"><p className="text-xs font-bold text-slate-500 mb-1">ဖွဲနု စုစုပေါင်း</p><p className="text-3xl font-black text-blue-600">{totals.bran} <span className="text-sm font-bold">အိတ်</span></p></div>
                 <div className="border border-slate-200 p-5 rounded-2xl"><p className="text-xs font-bold text-slate-500 mb-1">ဗိုက်ဖြူ (BY-PRODUCT)</p><p className="text-3xl font-black text-orange-600">{totals.byproduct} <span className="text-sm font-bold">အိတ်</span></p></div>
                 <div className="border border-slate-200 p-5 rounded-2xl"><p className="text-xs font-bold text-slate-500 mb-1">REJECT ဆန်အမည်း</p><p className="text-3xl font-black text-red-600">{totals.reject} <span className="text-sm font-bold">အိတ်</span></p></div>
              </div>
           </div>
        </div>
     );
  };

  const renderOpeningStockView = () => {
     const handleAddOpeningStock = async (e) => {
         e.preventDefault();
         if(!openingStockInput.qty || !openingStockInput.storage) return showMessage("အချက်အလက် ပြည့်စုံစွာ ထည့်ပါ။", "danger");
         setIsLoading(true);
         try {
             const newJobId = `OP-${Date.now().toString().slice(-6)}`;
             let status = 'opening_stock'; 
             // If customer paddy, put it in waiting_dry to show in Paddy Warehouse
             if (openingStockInput.ownerType === 'ကုန်သည်ပိုင်' && openingStockInput.itemType === 'စပါး') status = 'waiting_dry';
             // If customer rice/broken, put it in ready_to_bill to show in Rice Warehouse
             if (openingStockInput.ownerType === 'ကုန်သည်ပိုင်' && openingStockInput.itemType !== 'စပါး') status = 'ready_to_bill';

             const jobData = {
                 id: newJobId, customer: openingStockInput.ownerType === 'စက်ပိုင်' ? 'စက်ပိုင်' : openingStockInput.customerName,
                 entryType: openingStockInput.itemType === 'စပါး' ? 'paddy' : 'nawali', paddyType: openingStockInput.itemType,
                 originalQty: Number(openingStockInput.qty), currentQty: Number(openingStockInput.qty),
                 storage: openingStockInput.storage, status: status, date: getToday(),
                 ownerType: openingStockInput.ownerType, itemType: openingStockInput.itemType
             };

             // If it's customer rice products, we need to map to sortingData or millingData so it shows in Rice Warehouse remaining logic
             if (status === 'ready_to_bill') {
                 if(openingStockInput.itemType === 'ဆန်အချော') jobData.sortingData = { out1: openingStockInput.qty, storage1: openingStockInput.storage };
                 else if(openingStockInput.itemType === '၁၂ ဆန်ကွဲ') jobData.millingData = { broken12: openingStockInput.qty };
                 else if(openingStockInput.itemType === '၂၃၄ ဆန်ကွဲ') jobData.millingData = { broken234: openingStockInput.qty };
                 else if(openingStockInput.itemType === 'ဖွဲနု') jobData.millingData = { bran: openingStockInput.qty };
                 else if(openingStockInput.itemType === 'By-product') jobData.sortingData = { out2: openingStockInput.qty, storage2: openingStockInput.storage };
                 else if(openingStockInput.itemType === 'Reject') jobData.sortingData = { out3: openingStockInput.qty, storage3: openingStockInput.storage };
             }

             await supabase.from('jobs').insert([jobData]);
             setOpeningStockInput({ ownerType: 'စက်ပိုင်', customerName: '', itemType: 'စပါး', qty: '', storage: '' });
             fetchData();
             showMessage("လက်ကျန်စာရင်း ထည့်သွင်းပြီးပါပြီ။", "success");
         } catch (err) {
             showMessage("လုပ်ဆောင်မှု မအောင်မြင်ပါ။", "danger");
         } finally {
             setIsLoading(false);
         }
     };

     return (
        <div className="animate-in fade-in duration-300">
           <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><Database className="mr-3 text-blue-600"/> လက်ကျန်စာရင်း (Opening Stock) ထည့်ရန်</h2>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-2xl">
              <form onSubmit={handleAddOpeningStock} className="space-y-4">
                 <div className="flex bg-slate-100 p-1 rounded-xl w-full border border-slate-200 mb-6">
                    <button type="button" onClick={() => setOpeningStockInput({...openingStockInput, ownerType: 'စက်ပိုင်', customerName: ''})} className={`flex-1 py-2 text-sm font-bold rounded-lg ${openingStockInput.ownerType === 'စက်ပိုင်' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-500'}`}>စက်ပိုင် ပစ္စည်း</button>
                    <button type="button" onClick={() => setOpeningStockInput({...openingStockInput, ownerType: 'ကုန်သည်ပိုင်'})} className={`flex-1 py-2 text-sm font-bold rounded-lg ${openingStockInput.ownerType === 'ကုန်သည်ပိုင်' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-500'}`}>ကုန်သည်ပိုင် (အပ်နှံ)</button>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-600 block mb-1">အမျိုးအစား ရွေးပါ</label>
                       <select value={openingStockInput.itemType} onChange={e=>setOpeningStockInput({...openingStockInput, itemType: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold">
                          <option value="စပါး">စပါး</option>
                          <option value="ဆန်အချော">ဆန်အချော</option>
                          <option value="၁၂ ဆန်ကွဲ">၁၂ ဆန်ကွဲ</option>
                          <option value="၂၃၄ ဆန်ကွဲ">၂၃၄ ဆန်ကွဲ</option>
                          <option value="ဖွဲနု">ဖွဲနု</option>
                          <option value="By-product">By-product</option>
                          <option value="Reject">Reject</option>
                       </select>
                    </div>
                    {openingStockInput.ownerType === 'ကုန်သည်ပိုင်' && (
                       <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">စပါး/ဆန် အမည် (ဖောက်သည်မည်)</label>
                          <input type="text" value={openingStockInput.customerName} onChange={e=>setOpeningStockInput({...openingStockInput, customerName: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold" placeholder="ဥပမာ - ပေါ်ဆန်း..." required/>
                       </div>
                    )}
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-600 block mb-1">အရေအတွက် (တင်း/အိတ်)</label>
                       <input type="number" value={openingStockInput.qty} onChange={e=>setOpeningStockInput({...openingStockInput, qty: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold text-blue-700" placeholder="0" required/>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-600 block mb-1">ဂိုဒေါင် / နေရာ</label>
                       <input type="text" value={openingStockInput.storage} onChange={e=>setOpeningStockInput({...openingStockInput, storage: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold" placeholder="နေရာ" required/>
                    </div>
                 </div>
                 <button disabled={isLoading} type="submit" className="w-full mt-4 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50">{isLoading ? 'လုပ်ဆောင်နေသည်...' : 'လက်ကျန်စာရင်း ထည့်သွင်းမည်'}</button>
              </form>
           </div>
        </div>
     );
  };

  const menuItems = [
     { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'paddy', 'rice'] },
     { id: 'gate', name: 'စပါးအဝင်/ဂိတ်', icon: Home, roles: ['admin', 'paddy'] },
     { id: 'paddy_warehouse', name: 'စပါး/နဝလီ ဂိုဒေါင်', icon: Package, roles: ['admin', 'paddy'] },
     { id: 'milling', name: 'ကြိတ်ခွဲရေး ဌာန', icon: Tractor, roles: ['admin', 'rice'] },
     { id: 'sorting', name: 'Color Sorting', icon: ScanLine, roles: ['admin', 'rice'] },
     { id: 'rice_warehouse', name: 'ဆန်/ထွက်ကုန် ဂိုဒေါင်', icon: Package, roles: ['admin', 'rice'] },
     { id: 'inventory', name: 'စက်ပိုင် ဆန်စာရင်း', icon: Database, roles: ['admin'] },
     { id: 'admin', name: 'ငွေစာရင်း (POS)', icon: Calculator, roles: ['admin'] },
     { id: 'customers', name: 'ဖောက်သည် အကြွေး', icon: Users, roles: ['admin'] },
     { id: 'opening', name: 'လက်ကျန်စာရင်း (Opening)', icon: Database, roles: ['admin'] }
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans">
      <div className="w-[260px] bg-white border-r border-slate-200 flex flex-col shadow-sm z-20 shrink-0">
        <div className="p-5 border-b border-slate-100 bg-blue-600 text-white flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-700 font-black text-xl shadow-inner">စက်</div>
          <div>
             <h1 className="font-black text-lg tracking-tight leading-tight">Mill ERP</h1>
             <p className="text-[10px] font-bold opacity-80 uppercase">ROLE: {session.role.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.filter(m => m.roles.includes(session.role)).map(menu => (
            <button 
              key={menu.id} onClick={() => setActiveView(menu.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeView === menu.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <menu.icon size={18} strokeWidth={activeView === menu.id ? 2.5 : 2}/>
              <span>{menu.name}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setSession(null)} className="m-4 flex items-center justify-center p-3 text-rose-500 font-bold text-sm hover:bg-rose-50 rounded-xl transition-colors"><LogOut size={16} className="mr-2"/> ထွက်မည် (Logout)</button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-6xl mx-auto">
          {activeView === 'dashboard' && session.role === 'admin' && renderAdminDashboard()}
          {activeView === 'dashboard' && session.role === 'paddy' && renderPaddyDashboard()}
          {activeView === 'dashboard' && session.role === 'rice' && renderRiceDashboard()}
          {activeView === 'gate' && renderPaddyGateView()}
          {activeView === 'paddy_warehouse' && renderPaddyWarehouseView()}
          {activeView === 'milling' && renderMillingView()}
          {activeView === 'sorting' && renderSortingView()}
          {activeView === 'rice_warehouse' && renderRiceWarehouseView()}
          {activeView === 'admin' && renderAdminPOSView()}
          {activeView === 'customers' && renderCustomerLedgerView()}
          {activeView === 'inventory' && renderInventoryView()}
          {activeView === 'opening' && renderOpeningStockView()}
        </div>
      </div>

      {/* Global Alert Modal (Static Focus Fix) */}
      {alertConfig && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 p-6 text-center">
                {alertConfig.type === 'danger' ? <AlertCircle size={48} className="mx-auto text-rose-500 mb-4"/> : <CheckSquare size={48} className="mx-auto text-emerald-500 mb-4"/>}
                <p className="font-bold text-slate-800 text-lg mb-6">{alertConfig.message}</p>
                <div className="flex justify-center gap-3">
                   {alertConfig.confirmAction && <button onClick={() => setAlertConfig(null)} className="px-6 py-2 border border-slate-300 rounded-lg font-bold text-slate-600">မလုပ်တော့ပါ</button>}
                   <button onClick={() => { if(alertConfig.confirmAction) alertConfig.confirmAction(); else setAlertConfig(null); }} className={`px-6 py-2 rounded-lg font-bold text-white shadow-md ${alertConfig.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                      {alertConfig.confirmAction ? 'ဖျက်မည်' : 'အိုကေ'}
                   </button>
                </div>
             </div>
          </div>
      )}
    </div>
  );
}

render(<MillERP />, document.getElementById('root'));
