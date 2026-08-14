'use client';

import { useState, useEffect } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

// Register Chart.js elements
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ArcElement);

export default function ModulPage() {
  const [mounted, setMounted] = useState(false);

  // Filter Dropdown Lists
  const [modulesList, setModulesList] = useState([]);
  const [resellersList, setResellersList] = useState([]);
  const [productsList, setProductsList] = useState([]);

  // Active Filters state (1. Tanggal, 2. Product, 3. Reseller, 4. Modul, 5. Search, 6. Auto Refresh)
  const [dateMode, setDateMode] = useState('today'); // Default: 'today' (Hari ini)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [resellerFilter, setResellerFilter] = useState('');
  const [modulFilter, setModulFilter] = useState('');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Pagination & Data States
  const [limit, setLimit] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [transactions, setTransactions] = useState([]);
  const [productivity, setProductivity] = useState({
    totalTrx: 0,
    successTrx: 0,
    failedTrx: 0,
    successRate: 0,
    totalOmset: 0,
    totalLaba: 0,
    totalSaldo: 0
  });
  const [topLists, setTopLists] = useState({
    modules: [],
    products: [],
    resellers: [],
    profitMembers: []
  });
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Reseller / Member Summary Table States
  const [resellersSummary, setResellersSummary] = useState([]);
  const [resellerSummaryFilter, setResellerSummaryFilter] = useState('');
  const [resellerDateMode, setResellerDateMode] = useState('today'); // Default: 'today' (Hari Ini)
  const [resellerStartDate, setResellerStartDate] = useState('');
  const [resellerEndDate, setResellerEndDate] = useState('');
  const [resellerCurrentPage, setResellerCurrentPage] = useState(1);
  const [resellerLimit, setResellerLimit] = useState(10);
  const [loadingResellers, setLoadingResellers] = useState(true);

  // Set default dates
  useEffect(() => {
    setMounted(true);
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    setStartDate(todayStr);
    setEndDate(todayStr);
    setResellerStartDate(todayStr);
    setResellerEndDate(todayStr);
  }, []);

  // Fetch filter dropdown options
  const fetchFilterInit = async () => {
    try {
      const res = await fetch('/api/modul/init');
      if (res.ok) {
        const json = await res.json();
        setModulesList(json.modules || []);
        setResellersList(json.resellers || []);
        setProductsList(json.products || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch reseller performance summary
  const fetchResellersSummary = async () => {
    setLoadingResellers(true);
    let startVal = '';
    let endVal = '';
    if (resellerDateMode === 'today') {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      startVal = `${yyyy}-${mm}-${dd}`;
      endVal = startVal;
    } else if (resellerDateMode === 'custom') {
      startVal = resellerStartDate;
      endVal = resellerEndDate;
    }

    try {
      const params = new URLSearchParams({
        dateMode: resellerDateMode,
        startDate: startVal,
        endDate: endVal
      });
      const res = await fetch(`/api/modul/resellers?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setResellersSummary(json.resellers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingResellers(false);
    }
  };

  // Fetch metrics & logs with filters
  const fetchModulData = async (noLoading = false) => {
    if (!noLoading) setLoading(true);

    let startVal = '';
    let endVal = '';
    if (dateMode === 'today') {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      startVal = `${yyyy}-${mm}-${dd}`;
      endVal = startVal;
    } else if (dateMode === 'custom') {
      startVal = startDate;
      endVal = endDate;
    }

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: search.trim(),
        dateMode,
        startDate: startVal,
        endDate: endVal,
        product: productFilter,
        reseller: resellerFilter,
        modul: modulFilter
      });

      const res = await fetch(`/api/modul/transactions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const dataList = json.data || [];
        setTransactions(dataList);
        setProductivity(json.productivity || {});
        setTopLists(json.topLists || { modules: [], products: [], resellers: [], profitMembers: [] });
        setTotalItems(json.pagination?.total || 0);
        setTotalPages(json.pagination?.totalPages || 0);

        // Dynamically merge unique filter options from active dataset
        if (dataList.length > 0) {
          setModulesList(prev => {
            const set = new Set(prev.map(m => m.label || m.nama || m));
            const arr = [...prev];
            dataList.forEach(t => {
              if (t.nama_modul && !set.has(t.nama_modul)) {
                set.add(t.nama_modul);
                arr.push({ kode: t.kode_modul || t.nama_modul, label: t.nama_modul });
              }
            });
            return arr;
          });

          setResellersList(prev => {
            const set = new Set(prev.map(r => r.nama || r.label || r));
            const arr = [...prev];
            dataList.forEach(t => {
              if (t.nama_reseller && !set.has(t.nama_reseller)) {
                set.add(t.nama_reseller);
                arr.push({ kode: t.kode_reseller || t.nama_reseller, nama: t.nama_reseller });
              }
            });
            return arr;
          });

          setProductsList(prev => {
            const set = new Set(prev.map(p => p.nama || p.kode || p));
            const arr = [...prev];
            dataList.forEach(t => {
              if (t.kode_produk && !set.has(t.kode_produk)) {
                set.add(t.kode_produk);
                arr.push({ kode: t.kode_produk, nama: t.kode_produk });
              }
            });
            return arr;
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!mounted) return;
    fetchFilterInit();
    fetchModulData();
    fetchResellersSummary();
  }, [mounted]);

  // Hook filter dependencies to reload
  useEffect(() => {
    if (!mounted) return;
    setCurrentPage(1);
    fetchModulData();
  }, [dateMode, startDate, endDate, productFilter, resellerFilter, modulFilter, search, limit, mounted]);

  // Hook reseller filter dependencies to reload summary
  useEffect(() => {
    if (!mounted) return;
    setResellerCurrentPage(1);
    fetchResellersSummary();
  }, [resellerDateMode, resellerStartDate, resellerEndDate, mounted]);

  // Hook pagination
  useEffect(() => {
    if (!mounted) return;
    fetchModulData(false);
  }, [currentPage]);

  // Auto Refresh Interval (every 10 seconds)
  useEffect(() => {
    if (!autoRefresh || !mounted) return;
    const interval = setInterval(() => {
      fetchModulData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, dateMode, startDate, endDate, productFilter, resellerFilter, modulFilter, search, limit, mounted]);

  // Force Sync listener
  useEffect(() => {
    const handleSync = () => {
      setCurrentPage(1);
      fetchModulData();
      fetchResellersSummary();
    };
    window.addEventListener('bmp-force-sync', handleSync);
    return () => window.removeEventListener('bmp-force-sync', handleSync);
  }, [mounted, dateMode, startDate, endDate, productFilter, resellerFilter, modulFilter, search, limit]);

  const handleReset = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    setDateMode('today');
    setStartDate(todayStr);
    setEndDate(todayStr);
    setProductFilter('');
    setResellerFilter('');
    setModulFilter('');
    setSearch('');
    setAutoRefresh(false);
    setLimit(20);
    setCurrentPage(1);
  };

  const handleResetResellerFilter = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    setResellerDateMode('today');
    setResellerStartDate(todayStr);
    setResellerEndDate(todayStr);
    setResellerSummaryFilter('');
    setResellerLimit(10);
    setResellerCurrentPage(1);
  };

  if (!mounted) return null;

  // Reseller summary filtering and pagination
  const filteredResellers = resellersSummary.filter(r => {
    if (!resellerSummaryFilter) return true;
    const filterVal = String(resellerSummaryFilter).toLowerCase().trim();
    return (
      (r.kode && String(r.kode).toLowerCase() === filterVal) ||
      (r.nama && String(r.nama).toLowerCase() === filterVal) ||
      (r.kode && String(r.kode).toLowerCase().includes(filterVal)) ||
      (r.nama && String(r.nama).toLowerCase().includes(filterVal))
    );
  });

  const totalResellerItems = filteredResellers.length;
  const totalResellerPages = Math.ceil(totalResellerItems / resellerLimit);
  const startResellerIdx = (resellerCurrentPage - 1) * resellerLimit;
  const paginatedResellers = filteredResellers.slice(startResellerIdx, startResellerIdx + resellerLimit);

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return 'Rp 0';
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const pad = (n) => String(n).padStart(2, '0');
    const dd = pad(date.getDate());
    const mm = pad(date.getMonth() + 1);
    const yyyy = date.getFullYear();
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  };

  const getStatusBadge = (txStatus, sn) => {
    const suspectSns = ['N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND', '-', 'NONE', '', '0'];
    const cleanSn = sn ? String(sn).trim().toUpperCase() : '';
    const isSuspectSn = !cleanSn || suspectSns.includes(cleanSn);

    if (txStatus === 52 || txStatus === 54) {
      return <span className="badge status-failed"><i className="fa-solid fa-circle-xmark"></i> Tujuan Salah</span>;
    } else if (txStatus === 20 && isSuspectSn) {
      return <span className="badge status-suspect"><i className="fa-solid fa-triangle-exclamation"></i> Suspect</span>;
    } else if (txStatus === 20) {
      return <span className="badge status-success"><i className="fa-solid fa-circle-check"></i> Success</span>;
    } else if (txStatus === 40) {
      return <span className="badge status-failed"><i className="fa-solid fa-circle-xmark"></i> Failed</span>;
    } else if (txStatus === 50) {
      return <span className="badge status-failed"><i className="fa-solid fa-ban"></i> Canceled</span>;
    } else if (txStatus === 55) {
      return <span className="badge status-pending"><i className="fa-solid fa-clock"></i> Timeout</span>;
    } else if (txStatus === 0 || txStatus === 1 || txStatus === 2 || txStatus === 3) {
      return <span className="badge status-pending"><i className="fa-solid fa-spinner fa-spin-slow"></i> Pending</span>;
    } else {
      return <span className="badge status-pending"><i className="fa-solid fa-clock"></i> Pending ({txStatus})</span>;
    }
  };

  // Reseller / Member Doughnut Data (Chart 1 - Left)
  const resellersDoughnutData = {
    labels: (topLists.resellers || []).map(r => r.name),
    datasets: [
      {
        data: (topLists.resellers || []).map(r => r.total_trx),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',  // blue
          'rgba(6, 182, 212, 0.8)',   // cyan
          'rgba(16, 185, 129, 0.8)',  // green
          'rgba(245, 158, 11, 0.8)',  // yellow/amber
          'rgba(236, 72, 153, 0.8)'   // pink
        ],
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        hoverOffset: 6
      }
    ]
  };

  const resellersDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const selectedRes = (topLists.resellers || [])[index];
        if (selectedRes) {
          const matched = resellersList.find(r => (r.nama && r.nama.toLowerCase() === selectedRes.name.toLowerCase()) || r.kode === selectedRes.kode);
          if (matched) setResellerFilter(matched.kode);
          else setResellerFilter(selectedRes.kode || selectedRes.name);
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 10, weight: '500' },
          padding: 10,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((sum, v) => sum + v, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return ` ${label}: ${value} Trx (${percentage}%)`;
          }
        }
      }
    },
    cutout: '65%'
  };

  // Products Horizontal Bar Data (Chart 2 - Middle)
  const productsBarData = {
    labels: (topLists.products || []).map(p => p.name),
    datasets: [
      {
        data: (topLists.products || []).map(p => p.total_trx),
        backgroundColor: 'rgba(6, 182, 212, 0.75)',
        hoverBackgroundColor: '#06b6d4',
        borderRadius: 4
      }
    ]
  };

  const productsBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    onClick: (event, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const selectedProd = (topLists.products || [])[index];
        if (selectedProd && selectedProd.name) {
          setProductFilter(selectedProd.name);
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.raw} Trx`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(148, 163, 184, 0.05)' },
        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 9 } }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 9 } }
      }
    }
  };

  // Profit Members Vertical Bar Data (Chart 3 - Right)
  const profitMembersBarData = {
    labels: (topLists.profitMembers || []).map(m => m.name),
    datasets: [
      {
        label: 'Profit Member',
        data: (topLists.profitMembers || []).map(m => m.total_profit || 0),
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        hoverBackgroundColor: '#10b981',
        borderRadius: 4
      }
    ]
  };

  const profitMembersBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const selectedMember = (topLists.profitMembers || [])[index];
        if (selectedMember && selectedMember.name) {
          const matched = resellersList.find(r => r.nama && r.nama.toLowerCase() === selectedMember.name.toLowerCase());
          setResellerFilter(matched ? String(matched.kode) : selectedMember.name);
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Profit: ${formatCurrency(context.raw)}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 9 } }
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.05)' },
        ticks: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 9 },
          callback: (value) => {
            if (value >= 1e6) return `Rp ${(value / 1e6).toFixed(1)}Jt`;
            if (value >= 1e3) return `Rp ${(value / 1e3).toFixed(0)}rb`;
            return `Rp ${value}`;
          }
        }
      }
    }
  };

  return (
    <>
      {/* Metric stats cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5" aria-label="Key Performance Indicators">
        <div className="stat-card" id="card-total">
          <div className="stat-icon-wrapper total"><i className="fa-solid fa-cash-register"></i></div>
          <div className="stat-info">
            <span className="stat-label">Total Omset</span>
            <h2 className="stat-value">{formatCurrency(productivity.totalOmset)}</h2>
            <span className="stat-meta">From successful transactions</span>
          </div>
        </div>

        <div className="stat-card" id="card-failed">
          <div className="stat-icon-wrapper retail"><i className="fa-solid fa-wallet"></i></div>
          <div className="stat-info">
            <span className="stat-label">Supplier Balance (Saldo)</span>
            <h2 className="stat-value text-indigo">{formatCurrency(productivity.totalSaldo)}</h2>
            <span className="stat-meta">Available supplier limits</span>
          </div>
        </div>


        <div className="stat-card" id="card-success">
          <div className="stat-icon-wrapper success"><i className="fa-solid fa-money-bill-trend-up"></i></div>
          <div className="stat-info">
            <span className="stat-label">Total Laba</span>
            <h2 className="stat-value text-success">{formatCurrency(productivity.totalLaba)}</h2>
            <span className="stat-meta">{productivity.successRate}% Success rate ({productivity.totalTrx} Trxs)</span>
          </div>
        </div>
      </section>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginTop: '20px' }}>
        {/* Chart 1: Reseller / Member Doughnut */}
        <div
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm flex flex-col hover:border-brandBlue/15 transition-all"
          style={{ padding: '32px' }}
        >
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5" style={{ letterSpacing: '1px' }}>Top 5 Reseller/Member By Volume</h3>
          <div className="h-48 relative flex items-center justify-center">
            {topLists.resellers && topLists.resellers.length > 0 ? (
              <Doughnut data={resellersDoughnutData} options={resellersDoughnutOptions} />
            ) : (
              <span className="text-slate-400 text-xs">No data available</span>
            )}
          </div>
        </div>

        {/* Chart 2: Products Horizontal Bar */}
        <div
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm flex flex-col hover:border-brandBlue/15 transition-all"
          style={{ padding: '32px' }}
        >
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5" style={{ letterSpacing: '1px' }}>Top 5 Products By Volume</h3>
          <div className="h-48 relative">
            {topLists.products && topLists.products.length > 0 ? (
              <Bar data={productsBarData} options={productsBarOptions} />
            ) : (
              <span className="text-slate-400 text-xs">No data available</span>
            )}
          </div>
        </div>

        {/* Chart 3: Top 5 Profit Member Vertical Bar */}
        <div
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm flex flex-col hover:border-brandBlue/15 transition-all"
          style={{ padding: '32px' }}
        >
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5" style={{ letterSpacing: '1px' }}>Top 5 Profit Member</h3>
          <div className="h-48 relative">
            {topLists.profitMembers && topLists.profitMembers.length > 0 ? (
              <Bar data={profitMembersBarData} options={profitMembersBarOptions} />
            ) : (
              <span className="text-slate-400 text-xs">No data available</span>
            )}
          </div>
        </div>
      </div>

      {/* Reseller / Member Performance Summary Table (with Profit Column & Date Filters) */}
      <section className="table-section" aria-label="Reseller / Member Performance Records" style={{ marginTop: '24px' }}>
        <div style={{ padding: '24px 32px 12px 32px' }}>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 font-heading">
            <i className="fa-solid fa-users text-brandBlue dark:text-brandCyan"></i>
            Reseller / Member Performance
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Data performa {resellerDateMode === 'today' ? 'hari ini' : resellerDateMode === 'all' ? 'semua tanggal' : `${resellerStartDate} s/d ${resellerEndDate}`}, status saldo, dan total profit per reseller/member (klik baris untuk memfilter log transaksi di bawah)
          </p>
        </div>

        {/* Active Filter Badges for Reseller Table */}
        {(resellerSummaryFilter || resellerDateMode !== 'today' || resellerFilter) && (
          <div className="flex items-center gap-2 mb-3 flex-wrap text-xs px-8">
            <span className="text-slate-400 font-medium">Filter Aktif Reseller:</span>
            {resellerSummaryFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 font-semibold border border-blue-500/20">
                <i className="fa-solid fa-user"></i> Reseller: {resellersList.find(r => r.kode === resellerSummaryFilter || r.nama === resellerSummaryFilter)?.nama || resellerSummaryFilter}
                <button onClick={() => setResellerSummaryFilter('')} className="hover:text-red-500 ml-1 cursor-pointer" title="Hapus filter reseller">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
            {resellerDateMode !== 'today' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                <i className="fa-solid fa-calendar"></i> Tanggal: {resellerDateMode === 'all' ? 'Semua Tanggal' : `${resellerStartDate} s/d ${resellerEndDate}`}
                <button onClick={() => setResellerDateMode('today')} className="hover:text-red-500 ml-1 cursor-pointer" title="Reset ke Hari Ini">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
            {resellerFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20">
                <i className="fa-solid fa-user-check"></i> Filter Log: {resellersList.find(r => r.kode === resellerFilter)?.nama || resellerFilter}
                <button onClick={() => setResellerFilter('')} className="hover:text-red-500 ml-1 cursor-pointer" title="Hapus filter log terpilih">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
            <button
              onClick={handleResetResellerFilter}
              className="text-slate-400 hover:text-slate-200 underline text-xs ml-2 cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}

        {/* Filter Controls Bar for Reseller Table (without Search input) */}
        <div className="table-controls mb-4 px-8">
          <div className="filter-actions flex flex-wrap gap-2.5 items-center w-full">
            {/* 1. Filter Tanggal */}
            <div className="select-wrapper">
              <i className="fa-solid fa-calendar select-icon"></i>
              <select value={resellerDateMode} onChange={(e) => setResellerDateMode(e.target.value)}>
                <option value="today">Hari Ini</option>
                <option value="all">Semua Tanggal</option>
                <option value="custom">Rentang Tanggal</option>
              </select>
            </div>

            {/* Custom Date Pickers */}
            {resellerDateMode === 'custom' && (
              <div className="flex items-center gap-2">
                <div className="date-filter-wrapper">
                  <i className="fa-solid fa-calendar-days date-icon"></i>
                  <input type="date" value={resellerStartDate} onChange={(e) => setResellerStartDate(e.target.value)} />
                </div>
                <span className="text-slate-400 text-xs">s/d</span>
                <div className="date-filter-wrapper">
                  <i className="fa-solid fa-calendar-days date-icon"></i>
                  <input type="date" value={resellerEndDate} onChange={(e) => setResellerEndDate(e.target.value)} />
                </div>
              </div>
            )}

            {/* 2. Filter Reseller / Member Dropdown */}
            <div className="select-wrapper">
              <i className="fa-solid fa-user select-icon"></i>
              <select 
                value={resellerSummaryFilter} 
                onChange={(e) => {
                  setResellerSummaryFilter(e.target.value);
                  setResellerCurrentPage(1);
                }}
              >
                <option value="">Semua Reseller</option>
                {(resellersList.length > 0 ? resellersList : resellersSummary).map((r, idx) => (
                  <option key={r.kode || r.nama || idx} value={r.kode || r.nama}>
                    {r.nama || r.label || r.kode}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Rows Limit Selection */}
            <div className="select-wrapper">
              <i className="fa-solid fa-list select-icon"></i>
              <select value={resellerLimit} onChange={(e) => { setResellerLimit(Number(e.target.value)); setResellerCurrentPage(1); }}>
                <option value={5}>5 Rows</option>
                <option value={10}>10 Rows</option>
                <option value={20}>20 Rows</option>
              </select>
            </div>

            {/* 4. Reset Button */}
            <button onClick={handleResetResellerFilter} className="btn-reset-dash" title="Reset Filter Reseller">
              <i className="fa-solid fa-arrow-rotate-left"></i> Reset
            </button>
          </div>
        </div>

        <div className="table-container">
          <table id="resellers-table">
            <thead>
              <tr>
                <th>Reseller / Member Name</th>
                <th>Kode Reseller</th>
                <th>Status</th>
                <th className="text-right">Current Saldo</th>
                <th>
                  {resellerDateMode === 'today' ? 'Today\'s Transactions' : resellerDateMode === 'all' ? 'All-Time Transactions' : 'Transactions'}
                </th>
                <th className="text-right">Profit</th>
                <th>Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {loadingResellers ? (
                <tr className="placeholder-row">
                  <td colSpan={7}>
                    <div className="table-loader-wrapper">
                      <div className="spinner"></div>
                      <span>Fetching reseller performance data...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedResellers.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <i className="fa-regular fa-folder-open empty-icon"></i>
                      <p>No reseller found matching the filter criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedResellers.map((r) => {
                  const isSelected = resellerFilter && (String(resellerFilter).toLowerCase() === String(r.kode).toLowerCase() || String(resellerFilter).toLowerCase() === String(r.nama).toLowerCase());
                  return (
                    <tr
                      key={r.kode}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/10 border-l-4 border-brandBlue' : ''}`}
                      onClick={() => {
                        if (isSelected) {
                          setResellerFilter('');
                        } else {
                          setResellerFilter(r.kode);
                        }
                      }}
                      title="Klik untuk memfilter log transaksi reseller ini"
                    >
                      <td className="font-semibold text-slate-700 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-user-tag text-xs text-brandBlue dark:text-brandCyan"></i>
                          <span className="hover:underline">{r.nama}</span>
                          {isSelected && (
                            <span className="text-[10px] bg-brandBlue text-white px-1.5 py-0.5 rounded font-bold ml-1">Filtered</span>
                          )}
                        </div>
                      </td>
                      <td className="font-mono text-xs text-blue-400 font-semibold">{r.kode || '-'}</td>
                      <td>
                        {r.aktif === 1 ? (
                          <span className="badge status-success"><i className="fa-solid fa-circle-check"></i> Active</span>
                        ) : (
                          <span className="badge status-failed"><i className="fa-solid fa-circle-xmark"></i> Inactive</span>
                        )}
                      </td>
                      <td className="text-right font-medium">{formatCurrency(r.saldo)}</td>
                      <td>{r.total_trx.toLocaleString('id-ID')} Txs</td>
                      <td className={`text-right font-bold ${r.total_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(r.total_profit)}
                      </td>
                      <td className="font-bold text-brandBlue dark:text-brandCyan">{r.success_rate}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Reseller Pagination Controls */}
        {!loadingResellers && totalResellerPages > 1 && (
          <footer className="table-footer">
            <div className="pagination-info">
              Showing {startResellerIdx + 1} to {Math.min(startResellerIdx + resellerLimit, totalResellerItems)} of {totalResellerItems} resellers
            </div>
            <nav className="pagination-controls" aria-label="Reseller Pagination Navigation">
              <button
                className="btn-pagination"
                disabled={resellerCurrentPage === 1}
                onClick={() => setResellerCurrentPage(p => Math.max(1, p - 1))}
              >
                <i className="fa-solid fa-chevron-left"></i> Previous
              </button>
              <div className="page-numbers">
                {Array.from({ length: totalResellerPages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - resellerCurrentPage) <= 2 || p === 1 || p === totalResellerPages)
                  .map((p, idx, arr) => {
                    const el = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <span key={p} className="flex items-center">
                        {el && <span className="mx-1 text-slate-400">...</span>}
                        <button
                          onClick={() => setResellerCurrentPage(p)}
                          className={`btn-page ${p === resellerCurrentPage ? 'active' : ''}`}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}
              </div>
              <button
                className="btn-pagination"
                disabled={resellerCurrentPage === totalResellerPages}
                onClick={() => setResellerCurrentPage(p => Math.min(totalResellerPages, p + 1))}
              >
                Next <i className="fa-solid fa-chevron-right"></i>
              </button>
            </nav>
          </footer>
        )}
      </section>

      {/* Realtime Transactions Ledger Section with filters, search and auto refresh */}
      <section className="table-section" aria-label="Transaction Records" style={{ marginTop: '24px' }}>
        <div style={{ padding: '24px 32px 12px 32px' }}>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 font-heading">
            <i className="fa-solid fa-list-check text-brandBlue dark:text-brandCyan"></i>
            Realtime Transactions Ledger
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Log mutasi dan status transaksi realtime dari member/reseller & supplier
          </p>
        </div>
        {/* Active Filter Badges */}
        {(productFilter || resellerFilter || modulFilter || search || dateMode !== 'today' || autoRefresh) && (
          <div className="flex items-center gap-2 mb-3 flex-wrap text-xs px-1">
            <span className="text-slate-400 font-medium">Filter Aktif:</span>
            {search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                <i className="fa-solid fa-magnifying-glass"></i> Cari: "{search}"
                <button onClick={() => setSearch('')} className="hover:text-red-500 ml-1 cursor-pointer" title="Hapus pencarian">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
            {dateMode !== 'today' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                <i className="fa-solid fa-calendar"></i> Tanggal: {dateMode === 'all' ? 'Semua Tanggal' : `${startDate} s/d ${endDate}`}
                <button onClick={() => setDateMode('today')} className="hover:text-red-500 ml-1 cursor-pointer" title="Reset ke Hari Ini">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
            {productFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20">
                <i className="fa-solid fa-box"></i> Produk: {productFilter}
                <button onClick={() => setProductFilter('')} className="hover:text-red-500 ml-1 cursor-pointer" title="Hapus filter produk">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
            {resellerFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 font-semibold border border-blue-500/20">
                <i className="fa-solid fa-user"></i> Reseller: {resellersList.find(r => r.kode === resellerFilter)?.nama || resellerFilter}
                <button onClick={() => setResellerFilter('')} className="hover:text-red-500 ml-1 cursor-pointer" title="Hapus filter reseller">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
            {modulFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-500 font-semibold border border-cyan-500/20">
                <i className="fa-solid fa-truck-field"></i> Supplier: {modulesList.find(m => String(m.kode) === String(modulFilter))?.label || modulFilter}
                <button onClick={() => setModulFilter('')} className="hover:text-red-500 ml-1 cursor-pointer" title="Hapus filter supplier">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
            {autoRefresh && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                <i className="fa-solid fa-arrows-rotate animate-spin"></i> Auto Refresh (10s)
                <button onClick={() => setAutoRefresh(false)} className="hover:text-red-500 ml-1 cursor-pointer" title="Matikan Auto Refresh">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
            <button
              onClick={handleReset}
              className="text-slate-400 hover:text-slate-200 underline text-xs ml-2 cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}

        {/* Filter Controls Bar with Search & Auto Refresh */}
        <div className="table-controls mb-4">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              id="search-input"
              placeholder="Search destination, product, TRXID, reseller, SN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-actions flex flex-wrap gap-2.5 items-center">
            {/* 1. Filter Tanggal */}
            <div className="select-wrapper">
              <i className="fa-solid fa-calendar select-icon"></i>
              <select value={dateMode} onChange={(e) => setDateMode(e.target.value)}>
                <option value="today">Hari Ini</option>
                <option value="all">Semua Tanggal</option>
                <option value="custom">Rentang Tanggal</option>
              </select>
            </div>

            {/* Custom Date Pickers */}
            {dateMode === 'custom' && (
              <div className="flex items-center gap-2">
                <div className="date-filter-wrapper">
                  <i className="fa-solid fa-calendar-days date-icon"></i>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <span className="text-slate-400 text-xs">s/d</span>
                <div className="date-filter-wrapper">
                  <i className="fa-solid fa-calendar-days date-icon"></i>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            )}

            {/* 2. Filter Product */}
            <div className="select-wrapper">
              <i className="fa-solid fa-box select-icon"></i>
              <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
                <option value="">Semua Product</option>
                {productsList.map((p, idx) => (
                  <option key={p.kode || p.nama || idx} value={p.kode || p.nama}>{p.nama || p.kode}</option>
                ))}
              </select>
            </div>

            {/* 3. Filter Reseller */}
            <div className="select-wrapper">
              <i className="fa-solid fa-user select-icon"></i>
              <select value={resellerFilter} onChange={(e) => setResellerFilter(e.target.value)}>
                <option value="">Semua Reseller</option>
                {resellersList.map((r, idx) => (
                  <option key={r.kode || r.nama || idx} value={r.nama || r.kode}>{r.nama || r.label || r.kode}</option>
                ))}
              </select>
            </div>

            {/* 4. Filter Supplier */}
            <div className="select-wrapper">
              <i className="fa-solid fa-truck-field select-icon"></i>
              <select value={modulFilter} onChange={(e) => setModulFilter(e.target.value)}>
                <option value="">Semua Supplier</option>
                {modulesList.map((m, idx) => (
                  <option key={m.kode || m.label || idx} value={m.label || m.kode}>{m.label || m.nama || m.kode}</option>
                ))}
              </select>
            </div>

            {/* Auto Refresh Toggle */}
            <div className="switch-container flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Auto Refresh</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* Rows Limit Selection */}
            <div className="select-wrapper">
              <i className="fa-solid fa-list select-icon"></i>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                <option value={5}>5 Rows</option>
                <option value={10}>10 Rows</option>
                <option value={20}>20 Rows</option>
              </select>
            </div>

            {/* Reset Button */}
            <button onClick={handleReset} className="btn-reset-dash" title="Reset Filters">
              <i className="fa-solid fa-arrow-rotate-left"></i> Reset
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-container">
          <table id="transactions-table">
            <thead>
              <tr>
                <th>TRXID</th>
                <th>Date & Time</th>
                <th>Product</th>
                <th>Destination</th>
                <th className="text-right">Retail</th>
                <th className="text-right">Cost</th>
                <th className="text-right">Profit</th>
                <th>Supplier Saldo</th>
                <th>SN / Reference</th>
                <th>Status</th>
                <th>Reseller</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="placeholder-row">
                  <td colSpan={12}>
                    <div className="table-loader-wrapper">
                      <div className="spinner"></div>
                      <span>Fetching supplier transaction records...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <div className="empty-state">
                      <i className="fa-regular fa-folder-open empty-icon"></i>
                      <p>No transactions found matching the filter criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx, idx) => {
                  const profit = (tx.status === 20 && tx.harga && tx.harga_beli) ? (tx.harga - tx.harga_beli) : (tx.laba || 0);
                  const profitClass = profit >= 0 ? 'text-success' : 'text-danger';

                  return (
                    <tr key={tx.kode || tx.TrxID || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td
                        className="font-mono font-semibold cursor-pointer text-blue-400 hover:underline"
                        onClick={() => setSearch(String(tx.kode || tx.TrxID || ''))}
                        title="Klik untuk cari TRXID ini"
                      >
                        {tx.kode || tx.TrxID || '-'}
                      </td>
                      <td>{formatDateTime(tx.tgl_entri)}</td>
                      <td>
                        <span
                          className="cursor-pointer hover:bg-purple-500/20 hover:text-purple-300 transition-colors"
                          onClick={() => { if (tx.kode_produk) setProductFilter(tx.kode_produk); }}
                          style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontWeight: 500 }}
                          title="Klik untuk filter produk ini"
                        >
                          {tx.kode_produk || '-'}
                        </span>
                      </td>
                      <td
                        className="cursor-pointer hover:text-blue-400 hover:underline"
                        onClick={() => { if (tx.tujuan) setSearch(tx.tujuan); }}
                        title="Klik untuk cari nomor tujuan ini"
                      >
                        {tx.tujuan || '-'}
                      </td>
                      <td className="text-right">{formatCurrency(tx.harga)}</td>
                      <td className="text-right">{formatCurrency(tx.harga_beli)}</td>
                      <td className={`text-right font-bold ${profitClass}`}>{formatCurrency(profit)}</td>
                      <td>{formatCurrency(tx.saldo_supplier)}</td>
                      <td
                        style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                        className="cursor-pointer hover:text-blue-400 hover:underline"
                        onClick={() => { if (tx.sn && tx.sn !== '-') setSearch(tx.sn); }}
                        title="Klik untuk cari SN ini"
                      >
                        {tx.sn || <span className="text-muted">-</span>}
                      </td>
                      <td>
                        {getStatusBadge(tx.status, tx.sn)}
                      </td>
                      <td
                        className="font-semibold text-blue-500 dark:text-blue-400 cursor-pointer hover:underline"
                        onClick={() => setResellerFilter(tx.kode_reseller || tx.nama_reseller)}
                        title="Klik untuk filter reseller ini"
                      >
                        {tx.nama_reseller || '-'}
                      </td>
                      <td
                        className="cursor-pointer hover:text-blue-500 hover:underline"
                        onClick={() => { if (tx.kode_modul) setModulFilter(String(tx.kode_modul)); }}
                        title="Klik untuk filter supplier ini"
                      >
                        {tx.nama_modul || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {!loading && totalPages > 1 && (
          <footer className="table-footer" style={{ marginTop: '16px' }}>
            <div className="pagination-info">
              Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalItems)} of {totalItems} transactions
            </div>
            <nav className="pagination-controls" aria-label="Pagination Navigation">
              <button
                className="btn-pagination"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <i className="fa-solid fa-chevron-left"></i> Previous
              </button>
              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                  .map((p, idx, arr) => {
                    const el = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <span key={p} className="flex items-center">
                        {el && <span className="mx-1 text-slate-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`btn-page ${p === currentPage ? 'active' : ''}`}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}
              </div>
              <button
                className="btn-pagination"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next <i className="fa-solid fa-chevron-right"></i>
              </button>
            </nav>
          </footer>
        )}
      </section>
    </>
  );
}
