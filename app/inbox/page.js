'use client';

import { useState, useEffect, useRef } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';

// Register Chart.js elements
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler, ArcElement);

export default function InboxPage() {
  const [mounted, setMounted] = useState(false);

  // States for filter lists (from API)
  const [resellersList, setResellersList] = useState([]);
  const [productsList, setProductsList] = useState([]);

  // States for filters selection
  const [search, setSearch] = useState('');
  const [reseller, setReseller] = useState('');
  const [product, setProduct] = useState('');
  const [status, setStatus] = useState('');
  const [dateMode, setDateMode] = useState('today'); // Default: Hari Ini
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Paginated inbox data
  const [inboxLogs, setInboxLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortCol, setSortCol] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [loadingTable, setLoadingTable] = useState(true);

  // Stats Counters
  const [stats, setStats] = useState({
    totalRequestsToday: 0,
    successfulTxs: 0,
    duplicateTxs: 0,
    failedTxs: 0,
    pendingTxs: 0
  });

  // Chart data states
  const [hourlyData, setHourlyData] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState(null);
  const [topResellers, setTopResellers] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  // Detail Modal state
  const [selectedRow, setSelectedRow] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDetails, setModalDetails] = useState(null);

  // Live polling parameters
  const [maxInboxId, setMaxInboxId] = useState(0);

  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    setMounted(true);
    const todayStr = getTodayString();
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, []);

  // Fetch filter dropdown configurations
  const fetchFiltersMetadata = async () => {
    try {
      const res = await fetch('/api/inbox/filters');
      if (res.ok) {
        const json = await res.json();
        setResellersList(json.resellers || []);
        setProductsList(json.products || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch stats metrics & charts
  const fetchInboxBI = async () => {
    const params = new URLSearchParams({
      search,
      reseller,
      product,
      status,
      dateMode,
      startDate: dateMode === 'all' ? '' : startDate,
      endDate: dateMode === 'all' ? '' : endDate
    });

    try {
      // 1. KPI Stats
      const statsRes = await fetch(`/api/inbox/statistics?${params.toString()}`);
      if (statsRes.ok) {
        const json = await statsRes.json();
        setStats(json);
      }

      // 2. Charts Data
      const chartsRes = await fetch(`/api/inbox/charts?${params.toString()}`);
      if (chartsRes.ok) {
        const json = await chartsRes.json();
        setHourlyData(json.hourlyRequests || []);
        setStatusDistribution(json.statusDistribution || null);
        setTopResellers(json.topResellers || []);
        setTopProducts(json.topProducts || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch table logs
  const fetchInboxLogs = async (noLoading = false) => {
    if (!noLoading) setLoadingTable(true);
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: limit.toString(),
      sortCol,
      sortDir,
      search,
      reseller,
      product,
      status,
      dateMode,
      startDate: dateMode === 'all' ? '' : startDate,
      endDate: dateMode === 'all' ? '' : endDate
    });

    try {
      const res = await fetch(`/api/inbox?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setInboxLogs(json.data || []);
        setTotalItems(json.pagination?.total || 0);
        setTotalPages(json.pagination?.totalPages || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTable(false);
    }
  };

  // Open detail row modal
  const openRowDetails = async (rowId, rowData = null) => {
    setSelectedRow(rowId);
    setModalLoading(true);
    if (rowData) {
      setModalDetails({
        inbox_id: rowData.inbox_id,
        transaction_id: rowData.transaction_id || rowData.inbox_id,
        created_at: rowData.created_at,
        sender_ip: rowData.sender_ip,
        reseller_code: rowData.reseller_code,
        reseller_name: rowData.reseller_name,
        product_code: rowData.product_code,
        destination: rowData.destination,
        message: rowData.message,
        status: rowData.status,
        terminal: rowData.terminal || '-',
        service_center: rowData.service_center || '-',
        reference_id: rowData.reference_id || '-'
      });
    } else {
      setModalDetails(null);
    }
    try {
      const res = await fetch(`/api/inbox/${rowId}`);
      if (res.ok) {
        const json = await res.json();
        setModalDetails(json);
      }
    } catch (err) {
      console.error("Failed to load inbox details:", err);
    } finally {
      setModalLoading(false);
    }
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedRow(null);
    };
    if (selectedRow) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRow]);

  // Fetch initial filters, live polling metadata, stats
  useEffect(() => {
    if (!mounted) return;
    fetchFiltersMetadata();
    fetchInboxBI();

    const checkLiveFeed = async () => {
      try {
        const res = await fetch('/api/inbox/live');
        if (res.ok) {
          const json = await res.json();
          setMaxInboxId(json.maxId);
        }
      } catch (e) {}
    };
    checkLiveFeed();
  }, [mounted]);

  // Hook filters to reload
  useEffect(() => {
    if (!mounted) return;
    setCurrentPage(1);
    fetchInboxBI();
    fetchInboxLogs();
  }, [search, reseller, product, status, dateMode, startDate, endDate, limit, sortCol, sortDir, mounted]);

  // Handle pagination updates
  useEffect(() => {
    if (!mounted) return;
    fetchInboxLogs(false);
  }, [currentPage]);

  // Auto Refresh interval effect (polls every 10s silently)
  useEffect(() => {
    if (!mounted || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchInboxLogs(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, mounted, currentPage, limit, sortCol, sortDir, search, reseller, product, status, dateMode, startDate, endDate]);

  // Listen to Force Sync sidebar events
  useEffect(() => {
    const handleSync = () => {
      setCurrentPage(1);
      fetchInboxBI();
      fetchInboxLogs();
    };
    window.addEventListener('bmp-force-sync', handleSync);
    return () => window.removeEventListener('bmp-force-sync', handleSync);
  }, [mounted, search, reseller, product, status, dateMode, startDate, endDate]);

  // Enforce Max 2 Days Date Range Constraint
  const handleStartDateChange = (newStart) => {
    setStartDate(newStart);
    if (newStart && endDate) {
      const d1 = new Date(newStart);
      const d2 = new Date(endDate);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      
      // If range is more than 1 day difference (more than 2 calendar days) or end is before start
      if (diffDays > 1 || diffDays < 0) {
        const nextDay = new Date(d1);
        nextDay.setDate(nextDay.getDate() + 1);
        const yyyy = nextDay.getFullYear();
        const mm = String(nextDay.getMonth() + 1).padStart(2, '0');
        const dd = String(nextDay.getDate()).padStart(2, '0');
        setEndDate(`${yyyy}-${mm}-${dd}`);
      }
    }
  };

  const handleEndDateChange = (newEnd) => {
    setEndDate(newEnd);
    if (newEnd && startDate) {
      const d1 = new Date(startDate);
      const d2 = new Date(newEnd);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      
      if (diffDays > 1) {
        const prevDay = new Date(d2);
        prevDay.setDate(prevDay.getDate() - 1);
        const yyyy = prevDay.getFullYear();
        const mm = String(prevDay.getMonth() + 1).padStart(2, '0');
        const dd = String(prevDay.getDate()).padStart(2, '0');
        setStartDate(`${yyyy}-${mm}-${dd}`);
      } else if (diffDays < 0) {
        setStartDate(newEnd);
      }
    }
  };

  const handleReset = () => {
    const todayStr = getTodayString();
    setSearch('');
    setReseller('');
    setProduct('');
    setStatus('');
    setDateMode('today');
    setStartDate(todayStr);
    setEndDate(todayStr);
    setAutoRefresh(false);
    setLimit(20);
    setCurrentPage(1);
  };

  if (!mounted) return null;

  // Formatting helpers
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

  // Chart configuration settings
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const textColor = isDarkMode ? '#94a3b8' : '#475569';
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';

  // 1. Hourly chart config
  const hourlyLabels = hourlyData.map(d => `${String(d.hour).padStart(2, '0')}:00`);
  const hourlyCounts = hourlyData.map(d => d.count);
  const hourlyConfig = {
    labels: hourlyLabels,
    datasets: [
      {
        label: 'Requests Count',
        data: hourlyCounts,
        borderColor: '#0052ff',
        borderWidth: 2.5,
        backgroundColor: 'rgba(0, 82, 255, 0.05)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const hourlyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } }, beginAtZero: true }
    }
  };

  // 2. Pie chart config
  const pieLabels = ['Success', 'Duplicate', 'Failed', 'Pending'];
  const pieCounts = statusDistribution ? [
    statusDistribution.success || 0,
    statusDistribution.duplicate || 0,
    statusDistribution.failed || 0,
    statusDistribution.pending || 0
  ] : [0, 0, 0, 0];

  const pieConfig = {
    labels: pieLabels,
    datasets: [
      {
        data: pieCounts,
        backgroundColor: ['#10b981', '#f97316', '#ef4444', '#f59e0b'],
        borderWidth: 0
      }
    ]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: textColor, boxWidth: 12, font: { size: 11 } }
      }
    }
  };

  // 3. Top resellers chart
  const topResellersConfig = {
    labels: topResellers.map(r => r.name),
    datasets: [
      {
        label: 'Requests',
        data: topResellers.map(r => r.count),
        backgroundColor: '#0052ff',
        borderRadius: 4
      }
    ]
  };

  const topResellersOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } }, beginAtZero: true }
    }
  };

  // 4. Top products chart
  const topProductsConfig = {
    labels: topProducts.map(p => p.product),
    datasets: [
      {
        label: 'Requests',
        data: topProducts.map(p => p.count),
        backgroundColor: '#6366f1',
        borderRadius: 4
      }
    ]
  };

  const topProductsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } }, beginAtZero: true }
    }
  };

  return (
    <main className="dashboard-layout">
      {/* Top metrics / KPIs */}
      <section className="stats-grid" aria-label="Key Performance Indicators">
        <div className="stat-card" id="card-total">
          <div className="stat-icon-wrapper total"><i className="fa-solid fa-list-check"></i></div>
          <div className="stat-info">
            <span className="stat-label">Requests Today</span>
            <h2 className="stat-value">{stats.totalRequestsToday.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">Inbox inquiries</span>
          </div>
        </div>

        <div className="stat-card" id="card-success">
          <div className="stat-icon-wrapper success"><i className="fa-solid fa-circle-check"></i></div>
          <div className="stat-info">
            <span className="stat-label">Successful Trx</span>
            <h2 className="stat-value">{stats.successfulTxs.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">Status Code 20</span>
          </div>
        </div>

        <div className="stat-card" id="card-failed">
          <div className="stat-icon-wrapper failed"><i className="fa-solid fa-circle-xmark"></i></div>
          <div className="stat-info">
            <span className="stat-label">Failed Requests</span>
            <h2 className="stat-value">{stats.failedTxs.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">Invalid code responses</span>
          </div>
        </div>

        <div className="stat-card" id="card-canceled">
          <div className="stat-icon-wrapper wrong-number"><i className="fa-solid fa-clone"></i></div>
          <div className="stat-info">
            <span className="stat-label">Duplicate Trx</span>
            <h2 className="stat-value">{stats.duplicateTxs.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">Blocked double transactions</span>
          </div>
        </div>

        <div className="stat-card" id="card-suspect">
          <div className="stat-icon-wrapper pending"><i className="fa-solid fa-spinner fa-spin-slow"></i></div>
          <div className="stat-info">
            <span className="stat-label">Pending Requests</span>
            <h2 className="stat-value">{stats.pendingTxs.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">Waiting in queue</span>
          </div>
        </div>
      </section>

      {/* Inbox Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" style={{ marginTop: '20px' }}>
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm"
          style={{ padding: '32px' }}
        >
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Requests Per Hour (Today)</h3>
          <div className="h-48">
            {hourlyData.length > 0 && <Line data={hourlyConfig} options={hourlyOptions} />}
          </div>
        </div>

        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm"
          style={{ padding: '32px' }}
        >
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Inbox Status Distribution (Today)</h3>
          <div className="h-48">
            {statusDistribution && <Pie data={pieConfig} options={pieOptions} />}
          </div>
        </div>

        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm"
          style={{ padding: '32px' }}
        >
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Top 5 Resellers Today</h3>
          <div className="h-48">
            {topResellers.length > 0 && <Bar data={topResellersConfig} options={topResellersOptions} />}
          </div>
        </div>

        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm"
          style={{ padding: '32px' }}
        >
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Top 5 Products Today</h3>
          <div className="h-48">
            {topProducts.length > 0 && <Bar data={topProductsConfig} options={topProductsOptions} />}
          </div>
        </div>
      </div>

      {/* Log list with filters, search, date range & auto refresh */}
      <section className="table-section" aria-label="Transaction Records" style={{ marginTop: '20px' }}>
        {/* Active Filter Badges */}
        {(search || product || reseller || status || dateMode !== 'today' || autoRefresh) && (
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
            {product && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20">
                <i className="fa-solid fa-box"></i> Produk: {product}
                <button onClick={() => setProduct('')} className="hover:text-red-500 ml-1 cursor-pointer" title="Hapus filter produk">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
            {reseller && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 font-semibold border border-blue-500/20">
                <i className="fa-solid fa-user"></i> Reseller: {resellersList.find(r => r.kode === reseller)?.nama || reseller}
                <button onClick={() => setReseller('')} className="hover:text-red-500 ml-1 cursor-pointer" title="Hapus filter reseller">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}
            {status && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 font-semibold border border-teal-500/20">
                <i className="fa-solid fa-filter"></i> Status: {status}
                <button onClick={() => setStatus('')} className="hover:text-red-500 ml-1 cursor-pointer" title="Hapus filter status">
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

        {/* Filter Controls Bar */}
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
            {/* 1. Filter Tanggal: Hari Ini (Default), Semua Tanggal, Rentang Tanggal */}
            <div className="select-wrapper">
              <i className="fa-solid fa-calendar select-icon"></i>
              <select value={dateMode} onChange={(e) => setDateMode(e.target.value)}>
                <option value="today">Hari Ini (Default)</option>
                <option value="all">Semua Tanggal</option>
                <option value="custom">Rentang Tanggal (Maks 2 Hari)</option>
              </select>
            </div>

            {/* Custom Date Pickers (Maks 2 Hari Saja) */}
            {dateMode === 'custom' && (
              <div className="flex items-center gap-2">
                <div className="date-filter-wrapper">
                  <i className="fa-solid fa-calendar-days date-icon"></i>
                  <input
                    type="date"
                    value={startDate}
                    max={getTodayString()}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    title="Tanggal Mulai"
                  />
                </div>
                <span className="text-slate-400 text-xs font-semibold">s/d</span>
                <div className="date-filter-wrapper">
                  <i className="fa-solid fa-calendar-days date-icon"></i>
                  <input
                    type="date"
                    value={endDate}
                    max={getTodayString()}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    title="Tanggal Akhir (Maksimal 2 Hari)"
                  />
                </div>
              </div>
            )}

            {/* 2. Reseller select (Best Multipayment only) */}
            <div className="select-wrapper">
              <i className="fa-solid fa-user select-icon"></i>
              <select value={reseller} onChange={(e) => setReseller(e.target.value)}>
                <option value="">Semua Reseller</option>
                {resellersList.map(r => (
                  <option key={r.kode} value={r.kode}>{r.nama} ({r.kode})</option>
                ))}
              </select>
            </div>

            {/* 3. Product select */}
            <div className="select-wrapper">
              <i className="fa-solid fa-box select-icon"></i>
              <select value={product} onChange={(e) => setProduct(e.target.value)}>
                <option value="">Semua Produk</option>
                {productsList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* 4. Status select */}
            <div className="select-wrapper">
              <i className="fa-solid fa-filter select-icon"></i>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Semua Status</option>
                <option value="Success">Success</option>
                <option value="Duplicate Transaction">Duplicate Transaction</option>
                <option value="Failed">Failed</option>
                <option value="Processing">Processing</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {/* 5. Auto Refresh Toggle Switch */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700/50">
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Auto Refresh:</span>
              <label className="switch" title="Auto refresh data setiap 10 detik">
                <input 
                  type="checkbox" 
                  checked={autoRefresh} 
                  onChange={(e) => setAutoRefresh(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Rows Limit */}
            <div className="select-wrapper">
              <i className="fa-solid fa-list select-icon"></i>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                <option value={20}>20 Baris</option>
                <option value={50}>50 Baris</option>
                <option value={100}>100 Baris</option>
              </select>
            </div>

            <button onClick={handleReset} className="btn-reset-dash" title="Reset Filters">
              <i className="fa-solid fa-arrow-rotate-left"></i> Reset
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-container" style={{ marginTop: '16px' }}>
          <table id="transactions-table">
            <thead>
              <tr className="cursor-pointer">
                <th onClick={() => { setSortCol('inbox_id'); setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                  Kode <i className={`fa-solid ${sortCol === 'inbox_id' ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th onClick={() => { setSortCol('created_at'); setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                  Tgl. Entri <i className={`fa-solid ${sortCol === 'created_at' ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th>Pengirim</th>
                <th>Kode Reseller</th>
                <th onClick={() => { setSortCol('reseller_name'); setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                  Nama Reseller <i className={`fa-solid ${sortCol === 'reseller_name' ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th onClick={() => { setSortCol('product_code'); setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                  Produk <i className={`fa-solid ${sortCol === 'product_code' ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th onClick={() => { setSortCol('destination'); setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                  Tujuan <i className={`fa-solid ${sortCol === 'destination' ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th>Pesan / Isi Inbox</th>
                <th onClick={() => { setSortCol('status'); setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                  Status <i className={`fa-solid ${sortCol === 'status' ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th style={{ textAlign: 'center', width: '60px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr className="placeholder-row">
                  <td colSpan={10}>
                    <div className="table-loader-wrapper">
                      <div className="spinner"></div>
                      <span>Mengambil data inbox OtomaX...</span>
                    </div>
                  </td>
                </tr>
              ) : inboxLogs.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state">
                      <i className="fa-regular fa-folder-open empty-icon"></i>
                      <p>Tidak ada data inbox yang ditemukan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                inboxLogs.map((log) => {
                  let statusStyle = {};
                  if (log.status === 'Success') {
                    statusStyle = { background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' };
                  } else if (log.status === 'Failed') {
                    statusStyle = { background: 'rgba(239,68,68,0.12)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.25)' };
                  } else if (log.status === 'Duplicate Transaction') {
                    statusStyle = { background: 'rgba(249,115,22,0.12)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.25)' };
                  } else if (log.status === 'Pending') {
                    statusStyle = { background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)' };
                  } else if (log.status === 'Processing') {
                    statusStyle = { background: 'rgba(59,130,246,0.12)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.25)' };
                  }
                  
                  return (
                    <tr 
                      key={log.inbox_id} 
                      onClick={() => openRowDetails(log.inbox_id, log)} 
                      className="inbox-row-clickable hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer"
                      title="Klik baris untuk melihat detail log inbox"
                    >
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }} className="text-blue-500 font-semibold">{log.inbox_id}</td>
                      <td className="text-slate-300 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                      <td style={{ color: 'var(--text-secondary)' }} className="font-mono">{log.sender_ip}</td>
                      <td className="font-mono text-blue-400 font-semibold">{log.reseller_code}</td>
                      <td className="font-semibold text-slate-700 dark:text-slate-200">{log.reseller_name}</td>
                      <td>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontWeight: 500 }}>
                          {log.product_code}
                        </span>
                      </td>
                      <td className="font-mono">{log.destination}</td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.message}>
                        {log.message}
                      </td>
                      <td>
                        <span style={{
                          ...statusStyle,
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="inbox-detail-btn"
                          title="Lihat Detail Log"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRowDetails(log.inbox_id, log);
                          }}
                        >
                          <i className="fa-solid fa-eye text-blue-500"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loadingTable && totalPages > 1 && (
          <footer className="table-footer" style={{ marginTop: '16px' }}>
            <div className="pagination-info">
              Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalItems)} of {totalItems} entries
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
                          className={`btn-page-number ${currentPage === p ? 'active' : ''}`}
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

      {/* Row details popup modal */}
      {selectedRow && (
        <div className="detail-modal-overlay" onClick={() => setSelectedRow(null)}>
          <div className="detail-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div className="flex items-center gap-3">
                <div className="detail-modal-header-icon">
                  <i className="fa-solid fa-envelope-open-text"></i>
                </div>
                <div>
                  <h3 className="detail-modal-header-title">Detail Log Pesan #{selectedRow}</h3>
                  <p className="detail-modal-header-subtitle">Informasi lengkap transaksi & pesan inbox OtomaX</p>
                </div>
              </div>
              <button className="detail-modal-close-x" onClick={() => setSelectedRow(null)} title="Tutup Modal (Esc)">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="detail-modal-body">
              {modalLoading && !modalDetails ? (
                <div className="flex flex-col items-center justify-center p-10 gap-3">
                  <div className="spinner"></div>
                  <span className="text-xs text-slate-400">Memuat rincian pesan inbox...</span>
                </div>
              ) : modalDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="detail-modal-info-card blue">
                      <div className="detail-modal-label">
                        <i className="fa-solid fa-hashtag text-blue-500"></i>
                        <span>ID Log / Trx</span>
                      </div>
                      <p className="detail-modal-value font-mono">#{modalDetails.transaction_id || modalDetails.inbox_id || selectedRow}</p>
                      <p className="detail-modal-sub font-mono">Inbox: #{modalDetails.inbox_id || selectedRow}</p>
                    </div>

                    <div className="detail-modal-info-card indigo">
                      <div className="detail-modal-label">
                        <i className="fa-solid fa-clock text-indigo-500"></i>
                        <span>Waktu Entri</span>
                      </div>
                      <p className="detail-modal-value sm">{formatDateTime(modalDetails.created_at)}</p>
                      <p className="detail-modal-sub font-mono">IP: {modalDetails.sender_ip || '-'}</p>
                    </div>

                    <div className="detail-modal-info-card green">
                      <div className="detail-modal-label">
                        <i className="fa-solid fa-user text-emerald-500"></i>
                        <span>Reseller</span>
                      </div>
                      <p className="detail-modal-value md" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {modalDetails.reseller_name || '-'}
                      </p>
                      <p className="detail-modal-sub font-mono font-semibold text-blue-400">{modalDetails.reseller_code || '-'}</p>
                    </div>

                    <div className="detail-modal-info-card amber">
                      <div className="detail-modal-label">
                        <i className="fa-solid fa-box text-amber-500"></i>
                        <span>Produk & Tujuan</span>
                      </div>
                      <p className="detail-modal-value font-mono">{modalDetails.product_code || '-'}</p>
                      <p className="detail-modal-sub font-mono font-semibold">{modalDetails.destination || '-'}</p>
                    </div>

                    <div className="detail-modal-info-card sky">
                      <div className="detail-modal-label">
                        <i className="fa-solid fa-shield-halved text-sky-500"></i>
                        <span>Status</span>
                      </div>
                      <div className="mt-1">
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '16px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-block',
                          ...(modalDetails.status === 'Success'
                            ? { background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }
                            : modalDetails.status === 'Duplicate Transaction'
                            ? { background: 'rgba(249,115,22,0.15)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.3)' }
                            : modalDetails.status === 'Failed'
                            ? { background: 'rgba(239,68,68,0.15)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.3)' }
                            : { background: 'rgba(59,130,246,0.15)', color: '#2563eb', border: '1px solid rgba(59,130,246,0.3)' })
                        }}>
                          {modalDetails.status || 'Pending'}
                        </span>
                      </div>
                      {modalDetails.reference_id && modalDetails.reference_id !== '-' && (
                        <p className="detail-modal-sub font-mono mt-1" title={modalDetails.reference_id}>Ref: {modalDetails.reference_id}</p>
                      )}
                    </div>

                    <div className="detail-modal-info-card pink">
                      <div className="detail-modal-label">
                        <i className="fa-solid fa-server text-pink-500"></i>
                        <span>Terminal / Center</span>
                      </div>
                      <p className="detail-modal-value sm">Terminal: {modalDetails.terminal || '-'}</p>
                      <p className="detail-modal-sub">Center: {modalDetails.service_center || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <div className="detail-modal-label mb-1.5">
                      <i className="fa-solid fa-comment-dots text-blue-500"></i>
                      <span>Isi Pesan Masuk (Request)</span>
                    </div>
                    <div className="detail-modal-msg-box request select-all">
                      {modalDetails.message || '-'}
                    </div>
                  </div>

                  {modalDetails.response_message && modalDetails.response_message !== '-' && (
                    <div>
                      <div className="detail-modal-label mb-1.5">
                        <i className="fa-solid fa-reply text-emerald-500"></i>
                        <span>Balasan Outbox (Response)</span>
                      </div>
                      <div className="detail-modal-msg-box response select-all">
                        {modalDetails.response_message}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">
                  <i className="fa-regular fa-circle-question text-2xl mb-2 block"></i>
                  Data log inbox tidak ditemukan.
                </div>
              )}
            </div>

            <div className="detail-modal-footer">
              <button className="detail-modal-close-btn" onClick={() => setSelectedRow(null)}>
                <i className="fa-solid fa-check"></i> Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

