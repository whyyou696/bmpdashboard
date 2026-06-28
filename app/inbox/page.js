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
  const [terminalsList, setTerminalsList] = useState([]);
  const [serviceCentersList, setServiceCentersList] = useState([]);

  // States for filters selection
  const [search, setSearch] = useState('');
  const [reseller, setReseller] = useState('');
  const [product, setProduct] = useState('');
  const [terminal, setTerminal] = useState('');
  const [serviceCenter, setServiceCenter] = useState('');
  const [status, setStatus] = useState('');
  const [msgType, setMsgType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  useEffect(() => {
    setMounted(true);
    // Populate today's date for range picker
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
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
        setTerminalsList(json.terminals || []);
        setServiceCentersList(json.serviceCenters || []);
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
      terminal,
      serviceCenter,
      startDate,
      endDate,
      msgType
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
      terminal,
      serviceCenter,
      startDate,
      endDate,
      msgType
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
  const openRowDetails = async (rowId) => {
    setSelectedRow(rowId);
    setModalLoading(true);
    setModalDetails(null);
    try {
      const res = await fetch(`/api/inbox/${rowId}`);
      if (res.ok) {
        const json = await res.json();
        setModalDetails(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  // Fetch initial filters, live polling metadata, stats
  useEffect(() => {
    if (!mounted) return;
    fetchFiltersMetadata();
    fetchInboxBI();

    // Pull first live feed details to establish baseline maxId
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
  }, [search, reseller, product, terminal, serviceCenter, status, msgType, startDate, endDate, limit, sortCol, sortDir, mounted]);

  // Handle pagination updates
  useEffect(() => {
    if (!mounted) return;
    fetchInboxLogs(false);
  }, [currentPage]);

  // Listen to Force Sync sidebar events
  useEffect(() => {
    const handleSync = () => {
      setCurrentPage(1);
      fetchInboxBI();
      fetchInboxLogs();
    };
    window.addEventListener('bmp-force-sync', handleSync);
    return () => window.removeEventListener('bmp-force-sync', handleSync);
  }, [mounted, search, reseller, product, terminal, serviceCenter, status, msgType, startDate, endDate]);

  // Polling checks (runs every 30 seconds for live new messages)
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/inbox/live?lastId=${maxInboxId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.newRequests && json.newRequests.length > 0) {
            setMaxInboxId(json.maxId);
            // Refresh table logs and BI stats
            fetchInboxBI();
            fetchInboxLogs(true);
          }
        }
      } catch (err) {}
    }, 30000);
    return () => clearInterval(interval);
  }, [maxInboxId, mounted]);

  const handleReset = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    setSearch('');
    setReseller('');
    setProduct('');
    setTerminal('');
    setServiceCenter('');
    setStatus('');
    setMsgType('');
    setStartDate(todayStr);
    setEndDate(todayStr);
    setLimit(20);
    setCurrentPage(1);
  };

  if (!mounted) return null;

  // Formatting helpers
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
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 9 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 9 } } }
    }
  };

  // 2. Status Distribution Pie
  const dist = statusDistribution || { success: 0, failed: 0, duplicate: 0, processing: 0, pending: 0 };
  const pieConfig = {
    labels: ['Success', 'Failed', 'Duplicate', 'Processing', 'Pending'],
    datasets: [
      {
        data: [dist.success, dist.failed, dist.duplicate, dist.processing, dist.pending],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#94a3b8'],
        borderWidth: 0
      }
    ]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { color: textColor, font: { size: 10 } } } }
  };

  // 3. Top Resellers Bar Chart
  const topResellersLabels = topResellers.map(d => d.reseller_name);
  const topResellersCounts = topResellers.map(d => d.count);
  const topResellersConfig = {
    labels: topResellersLabels,
    datasets: [
      {
        data: topResellersCounts,
        backgroundColor: 'rgba(37, 99, 235, 0.7)',
        borderRadius: 4
      }
    ]
  };

  const topResellersOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor, font: { size: 8 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 8 } } }
    }
  };

  // 4. Most Used Products
  const topProductsLabels = topProducts.map(d => d.product_code);
  const topProductsCounts = topProducts.map(d => d.count);
  const topProductsConfig = {
    labels: topProductsLabels,
    datasets: [
      {
        data: topProductsCounts,
        backgroundColor: 'rgba(6, 182, 212, 0.7)',
        borderRadius: 4
      }
    ]
  };

  const topProductsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor, font: { size: 8 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 8 } } }
    }
  };

  return (
    <>
      {/* Metric Cards grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5" aria-label="Key Performance Indicators">
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

      {/* Log list with filters */}
      <section className="table-section" aria-label="Transaction Records" style={{ marginTop: '20px' }}>
        <div className="table-controls">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              id="search-input"
              placeholder="Search sender, message, reseller, destination..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-actions flex flex-wrap gap-2 items-center">
            {/* Reseller select */}
            <div className="select-wrapper">
              <i className="fa-solid fa-user select-icon"></i>
              <select value={reseller} onChange={(e) => setReseller(e.target.value)}>
                <option value="">All Resellers</option>
                {resellersList.map(r => (
                  <option key={r.kode} value={r.kode}>{r.nama} ({r.kode})</option>
                ))}
              </select>
            </div>

            {/* Product select */}
            <div className="select-wrapper">
              <i className="fa-solid fa-box select-icon"></i>
              <select value={product} onChange={(e) => setProduct(e.target.value)}>
                <option value="">All Products</option>
                {productsList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Terminal select */}
            <div className="select-wrapper">
              <i className="fa-solid fa-cubes select-icon"></i>
              <select value={terminal} onChange={(e) => setTerminal(e.target.value)}>
                <option value="">All Terminals</option>
                {terminalsList.map(t => (
                  <option key={t} value={t}>Terminal {t}</option>
                ))}
              </select>
            </div>

            {/* SC select */}
            <div className="select-wrapper">
              <i className="fa-solid fa-rss select-icon"></i>
              <select value={serviceCenter} onChange={(e) => setServiceCenter(e.target.value)}>
                <option value="">All Service Centers</option>
                {serviceCentersList.map(sc => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>

            {/* Status select */}
            <div className="select-wrapper">
              <i className="fa-solid fa-filter select-icon"></i>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Success">Success</option>
                <option value="Duplicate Transaction">Duplicate Transaction</option>
                <option value="Failed">Failed</option>
                <option value="Processing">Processing</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {/* MsgType select */}
            <div className="select-wrapper">
              <i className="fa-solid fa-envelope select-icon"></i>
              <select value={msgType} onChange={(e) => setMsgType(e.target.value)}>
                <option value="">All Message Types</option>
                <option value="reseller">Reseller Requests</option>
                <option value="provider">Provider Replies</option>
              </select>
            </div>

            {/* Date limits */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="date-filter-wrapper">
                <i className="fa-solid fa-calendar-days date-icon"></i>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>s/d</span>
              <div className="date-filter-wrapper">
                <i className="fa-solid fa-calendar-days date-icon"></i>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {/* Rows Limit */}
            <div className="select-wrapper">
              <i className="fa-solid fa-list select-icon"></i>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                <option value={20}>20 Rows</option>
                <option value={50}>50 Rows</option>
                <option value={100}>100 Rows</option>
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
                  ID <i className={`fa-solid ${sortCol === 'inbox_id' ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th onClick={() => { setSortCol('created_at'); setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                  Created At <i className={`fa-solid ${sortCol === 'created_at' ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th>Sender / Port</th>
                <th onClick={() => { setSortCol('reseller_name'); setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                  Reseller <i className={`fa-solid ${sortCol === 'reseller_name' ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th onClick={() => { setSortCol('product_code'); setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                  Product <i className={`fa-solid ${sortCol === 'product_code' ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th onClick={() => { setSortCol('destination'); setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                  Destination <i className={`fa-solid ${sortCol === 'destination' ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th>Message Content</th>
                <th onClick={() => { setSortCol('status'); setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                  Status <i className={`fa-solid ${sortCol === 'status' ? (sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr className="placeholder-row">
                  <td colSpan={8}>
                    <div className="table-loader-wrapper">
                      <div className="spinner"></div>
                      <span>Fetching message records...</span>
                    </div>
                  </td>
                </tr>
              ) : inboxLogs.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <i className="fa-regular fa-folder-open empty-icon"></i>
                      <p>No inbox messages found matching the filters</p>
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
                    <tr key={log.inbox_id} onClick={() => openRowDetails(log.inbox_id)} className="inbox-row-clickable">
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{log.inbox_id}</td>
                      <td>{formatDateTime(log.created_at)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{log.sender_ip} (T{log.terminal})</td>
                      <td className="font-semibold">{log.reseller_name} ({log.reseller_code})</td>
                      <td>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontWeight: 500 }}>
                          {log.product_code}
                        </span>
                      </td>
                      <td>{log.destination}</td>
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

      {/* Detailed Modal Window */}
      {selectedRow && (
        <div className="detail-modal-overlay" onClick={() => setSelectedRow(null)}>
          <div className="detail-modal-card" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="detail-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="detail-modal-header-icon">
                  <i className="fa-solid fa-envelope-open-text"></i>
                </div>
                <div>
                  <h3 className="detail-modal-header-title">Message Details</h3>
                  <span className="detail-modal-header-subtitle">ID #{selectedRow}</span>
                </div>
              </div>
              <button className="detail-modal-close-x" onClick={() => setSelectedRow(null)} title="Close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Body */}
            <div className="detail-modal-body">
              {modalLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: '16px' }}>
                  <div className="spinner"></div>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Fetching reply details...</span>
                </div>
              ) : modalDetails ? (
                <>
                  {/* Row 1: Transaction ID + Timestamp */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div className="detail-modal-info-card blue">
                      <div className="detail-modal-label">
                        <i className="fa-solid fa-hashtag" style={{ fontSize: '11px', color: '#3b82f6' }}></i>
                        <span>Transaction ID</span>
                      </div>
                      <p className="detail-modal-value">{modalDetails.transaction_id}</p>
                    </div>
                    <div className="detail-modal-info-card indigo">
                      <div className="detail-modal-label">
                        <i className="fa-solid fa-clock" style={{ fontSize: '11px', color: '#6366f1' }}></i>
                        <span>Timestamp</span>
                      </div>
                      <p className="detail-modal-value sm">{formatDateTime(modalDetails.created_at)}</p>
                    </div>
                  </div>

                  {/* Row 2: Reseller + Sender */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div className="detail-modal-info-card green">
                      <div className="detail-modal-label">
                        <i className="fa-solid fa-user-tag" style={{ fontSize: '11px', color: '#10b981' }}></i>
                        <span>Reseller</span>
                      </div>
                      <p className="detail-modal-value md">{modalDetails.reseller_code}</p>
                      <p className="detail-modal-sub">{modalDetails.reseller_name}</p>
                    </div>
                    <div className="detail-modal-info-card amber">
                      <div className="detail-modal-label">
                        <i className="fa-solid fa-server" style={{ fontSize: '11px', color: '#f59e0b' }}></i>
                        <span>Sender IP / Terminal</span>
                      </div>
                      <p className="detail-modal-value sm" style={{ fontFamily: 'monospace' }}>{modalDetails.sender_ip}</p>
                      <p className="detail-modal-sub">Terminal {modalDetails.terminal}</p>
                    </div>
                  </div>

                  {/* Row 3: Product + Destination */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div className="detail-modal-info-card pink">
                      <div className="detail-modal-label">
                        <i className="fa-solid fa-box" style={{ fontSize: '11px', color: '#ec4899' }}></i>
                        <span>Product Code</span>
                      </div>
                      <p className="detail-modal-value">{modalDetails.product_code}</p>
                    </div>
                    <div className="detail-modal-info-card sky">
                      <div className="detail-modal-label">
                        <i className="fa-solid fa-mobile-screen" style={{ fontSize: '11px', color: '#0ea5e9' }}></i>
                        <span>Destination</span>
                      </div>
                      <p className="detail-modal-value md" style={{ fontFamily: 'monospace' }}>{modalDetails.destination}</p>
                    </div>
                  </div>

                  {/* Request Message */}
                  <div style={{ marginBottom: '16px' }}>
                    <div className="detail-modal-label" style={{ marginBottom: '10px' }}>
                      <i className="fa-solid fa-arrow-right-to-bracket" style={{ fontSize: '11px', color: 'var(--text-muted)' }}></i>
                      <span>Request Message</span>
                    </div>
                    <div className="detail-modal-msg-box request">
                      {modalDetails.message || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No message content</span>}
                    </div>
                  </div>

                  {/* Outbox Response */}
                  <div style={{ marginBottom: '20px' }}>
                    <div className="detail-modal-label" style={{ marginBottom: '10px' }}>
                      <i className="fa-solid fa-arrow-right-from-bracket" style={{ fontSize: '11px', color: '#10b981' }}></i>
                      <span>Outbox Response Reply</span>
                    </div>
                    <div className="detail-modal-msg-box response">
                      {modalDetails.response_message || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Awaiting response...</span>}
                    </div>
                  </div>

                  {/* Footer metadata row */}
                  <div className="detail-modal-meta-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-satellite-dish" style={{ fontSize: '10px' }}></i>
                      <span>{modalDetails.service_center}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '10px' }}></i>
                      <span>{formatDateTime(modalDetails.status_timestamp)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#ef4444', fontWeight: 600, fontSize: '14px' }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '24px', marginBottom: '12px', display: 'block' }}></i>
                  Gagal memuat detail data dari server.
                </div>
              )}
            </div>

            {/* Close button footer */}
            <div className="detail-modal-footer">
              <button className="detail-modal-close-btn" onClick={() => setSelectedRow(null)}>
                <i className="fa-solid fa-xmark"></i>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
