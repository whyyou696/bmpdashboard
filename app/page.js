'use client';

import { useState, useEffect, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  BarController,
  LineController,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  BarController,
  LineController,
  Filler
);

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);

  // States for filter and search controls
  const [search, setSearch] = useState('');
  const [dateMode, setDateMode] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('all');
  const [limit, setLimit] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Data States
  const [transactions, setTransactions] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState('');

  // Stats Counters States
  const [stats, setStats] = useState({
    total: 0,
    successCount: 0,
    failedCount: 0,
    canceledCount: 0,
    suspectCount: 0,
    wrongNumberCount: 0,
    pendingCount: 0,
    successRate: 0,
    totalRetail: 0,
    totalCost: 0,
    totalProfit: 0
  });

  // Chart State
  const [chartData, setChartData] = useState([]);

  // Time management for filters
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

  // Fetch logic
  const fetchData = async (updateStats = true) => {
    setTableLoading(true);
    setTableError('');

    let startDateVal = '';
    let endDateVal = '';

    if (dateMode === 'today') {
      const todayStr = getTodayString();
      startDateVal = todayStr;
      endDateVal = todayStr;
    } else if (dateMode === 'custom') {
      startDateVal = startDate;
      endDateVal = endDate;
    }

    try {
      // 1. Fetch stats if updateStats is requested
      if (updateStats && mounted) {
        const statsParams = new URLSearchParams({
          status: status,
          search: search.trim()
        });
        if (startDateVal && endDateVal) {
          statsParams.append('startDate', startDateVal);
          statsParams.append('endDate', endDateVal);
        }
        const statsRes = await fetch(`/api/transactions/stats?${statsParams.toString()}`);
        if (statsRes.ok) {
          const statsJson = await statsRes.json();
          setStats(statsJson);
        }

        // 2. Fetch chart data
        const chartParams = new URLSearchParams({
          status: status,
          search: search.trim()
        });
        if (dateMode === 'all') {
          chartParams.append('dateMode', 'all');
        } else if (startDateVal && endDateVal) {
          chartParams.append('startDate', startDateVal);
          chartParams.append('endDate', endDateVal);
        }
        const chartRes = await fetch(`/api/transactions/chart?${chartParams.toString()}`);
        if (chartRes.ok) {
          const chartJson = await chartRes.json();
          setChartData(chartJson);
        }
      }

      // 3. Fetch paginated transactions
      const txParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        status: status,
        search: search.trim(),
        startDate: startDateVal,
        endDate: endDateVal,
        dateMode: dateMode
      });

      const txRes = await fetch(`/api/transactions?${txParams.toString()}`);
      if (!txRes.ok) throw new Error(`API Error: ${txRes.status}`);
      const txJson = await txRes.json();

      setTransactions(txJson.data || []);
      setTotalItems(txJson.pagination?.total || 0);
      setTotalPages(txJson.pagination?.totalPages || 0);
    } catch (err) {
      console.error(err);
      setTableError(err.message || 'Failed to connect to backend api');
    } finally {
      setTableLoading(false);
    }
  };

  // Refetch when dependencies update
  useEffect(() => {
    if (!mounted) return;
    setCurrentPage(1);
    fetchData(true);
  }, [search, status, limit, dateMode, startDate, endDate, mounted]);

  // Refetch when page changes
  useEffect(() => {
    if (!mounted) return;
    fetchData(false);
  }, [currentPage]);

  // Force Sync listener
  useEffect(() => {
    const handleSync = () => {
      setCurrentPage(1);
      fetchData(true);
    };
    window.addEventListener('bmp-force-sync', handleSync);
    return () => window.removeEventListener('bmp-force-sync', handleSync);
  }, [mounted, search, status, limit, dateMode, startDate, endDate]);

  // Theme Change listener (to force chart update if needed)
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => {
    const handleTheme = () => setThemeTick(prev => prev + 1);
    window.addEventListener('bmp-theme-change', handleTheme);
    return () => window.removeEventListener('bmp-theme-change', handleTheme);
  }, []);

  // Auto Refresh Interval
  useEffect(() => {
    if (!autoRefresh || !mounted) return;
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, search, status, limit, dateMode, startDate, endDate, mounted]);

  // Helpers
  const getStatsMetaLabel = () => {
    if (dateMode === 'today') return 'Records for today';
    if (dateMode === 'all') return 'Lifetime records';
    if (dateMode === 'custom') {
      if (startDate === endDate) return 'Records for today';
      return 'Records for date range';
    }
    return 'Lifetime records';
  };

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
    const suspectSns = ['N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND'];
    const isSuspectSn = sn && suspectSns.includes(sn.toUpperCase().trim());

    if (txStatus === 52 || txStatus === 54) {
      return <span className="badge status-failed"><i className="fa-solid fa-circle-xmark"></i> Tujuan Salah</span>;
    } else if (isSuspectSn && txStatus !== 40 && txStatus !== 50) {
      return <span className="badge status-suspect"><i className="fa-solid fa-triangle-exclamation"></i> Suspect</span>;
    } else if (txStatus === 20) {
      return <span className="badge status-success"><i className="fa-solid fa-circle-check"></i> Success</span>;
    } else if (txStatus === 40) {
      return <span className="badge status-failed"><i className="fa-solid fa-circle-xmark"></i> Failed</span>;
    } else if (txStatus === 50) {
      return <span className="badge status-failed"><i className="fa-solid fa-ban"></i> Canceled</span>;
    } else if (txStatus === 55) {
      return <span className="badge status-pending"><i className="fa-solid fa-clock"></i> Timeout</span>;
    } else {
      return <span className="badge status-pending"><i className="fa-solid fa-clock"></i> Code {txStatus}</span>;
    }
  };

  // Reset Filters action
  const handleReset = () => {
    const todayStr = getTodayString();
    setSearch('');
    setStatus('all');
    setDateMode('today');
    setStartDate(todayStr);
    setEndDate(todayStr);
    setLimit(5);
    setCurrentPage(1);
  };

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 font-semibold">
        Loading Dashboard...
      </div>
    );
  }

  // Set up chart data configurations
  const isHourly = dateMode === 'today' || (dateMode === 'custom' && startDate === endDate);
  let chartLabels = [];
  let successChartData = [];
  let failedChartData = [];
  let profitChartData = [];

  if (isHourly) {
    const hourlyMap = {};
    chartData.forEach(item => {
      hourlyMap[item.label] = item;
    });
    for (let h = 0; h < 24; h++) {
      chartLabels.push(`${String(h).padStart(2, '0')}:00`);
      const item = hourlyMap[h];
      successChartData.push(item ? item.success : 0);
      failedChartData.push(item ? item.failed : 0);
      profitChartData.push(item ? item.profit : 0);
    }
  } else {
    chartData.forEach(item => {
      let dateLabel = item.label;
      try {
        const dateObj = new Date(item.label);
        if (!isNaN(dateObj.getTime())) {
          dateLabel = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        }
      } catch (e) {}
      chartLabels.push(dateLabel);
      successChartData.push(item.success);
      failedChartData.push(item.failed);
      profitChartData.push(item.profit);
    });
  }

  // Get theme status
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const textColor = isDarkMode ? '#94a3b8' : '#475569';
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';

  const barChartConfig = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Successful',
        data: successChartData,
        backgroundColor: 'rgba(16, 185, 129, 0.65)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
        order: 2
      },
      {
        label: 'Failed',
        data: failedChartData,
        backgroundColor: 'rgba(239, 68, 68, 0.65)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
        order: 3
      },
      {
        label: 'Profit (Rp)',
        data: profitChartData,
        type: 'line',
        borderColor: '#0052ff',
        borderWidth: 3,
        pointBackgroundColor: '#0052ff',
        pointBorderColor: '#fff',
        pointHoverRadius: 7,
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(0, 82, 255, 0.08)',
        yAxisID: 'yProfit',
        order: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: textColor,
          font: {
            family: 'Inter',
            size: 11
          },
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.datasetIndex === 2) {
              label += formatCurrency(context.parsed.y);
            } else {
              label += context.parsed.y.toLocaleString('id-ID');
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { family: 'Inter', size: 10 },
          callback: (value) => value.toLocaleString('id-ID')
        },
        title: {
          display: true,
          text: 'Txs Count',
          color: textColor,
          font: { family: 'Inter', size: 10 }
        }
      },
      yProfit: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          color: '#2563eb',
          font: { family: 'Inter', size: 10 },
          callback: (value) => {
            if (value >= 1000000) return 'Rp ' + (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return 'Rp ' + (value / 1000).toFixed(0) + 'K';
            return 'Rp ' + value;
          }
        },
        title: {
          display: true,
          text: 'Profit (IDR)',
          color: '#2563eb',
          font: { family: 'Inter', size: 10 }
        }
      }
    }
  };

  const getPageRange = () => {
    const start = totalItems === 0 ? 0 : (currentPage - 1) * limit + 1;
    const end = Math.min(currentPage * limit, totalItems);
    return `Showing ${start} to ${end} of ${totalItems} transactions`;
  };

  const getChartSubtitle = () => {
    if (dateMode === 'all') return 'Showing trends for all dates';
    if (startDate && endDate) {
      if (startDate === endDate) {
        const d = new Date(startDate);
        return `Showing hourly trends for ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
      const s = new Date(startDate);
      const e = new Date(endDate);
      const sFmt = s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const eFmt = e.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      return `Showing trends from ${sFmt} to ${eFmt}`;
    }
    return 'Showing trends for the last 7 days';
  };

  return (
    <>
      {/* KPI Summary Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" aria-label="Key Performance Indicators">
        <div className="stat-card" id="card-total">
          <div className="stat-icon-wrapper total"><i className="fa-solid fa-list-check"></i></div>
          <div className="stat-info">
            <span className="stat-label">Total TRX</span>
            <h2 className="stat-value">{stats.total.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">{getStatsMetaLabel()}</span>
          </div>
        </div>

        <div className="stat-card" id="card-success">
          <div className="stat-icon-wrapper success"><i className="fa-solid fa-circle-check"></i></div>
          <div className="stat-info">
            <span className="stat-label">Successful</span>
            <h2 className="stat-value">{stats.successCount.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">{stats.successRate}% Success rate</span>
          </div>
        </div>

        <div className="stat-card" id="card-failed">
          <div className="stat-icon-wrapper failed"><i className="fa-solid fa-circle-xmark"></i></div>
          <div className="stat-info">
            <span className="stat-label">Failed</span>
            <h2 className="stat-value">{stats.failedCount.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">
              {(stats.total > 0 ? (stats.failedCount / stats.total * 100) : 0).toFixed(1)}% Failed
            </span>
          </div>
        </div>

        <div className="stat-card" id="card-canceled">
          <div className="stat-icon-wrapper canceled"><i className="fa-solid fa-ban"></i></div>
          <div className="stat-info">
            <span className="stat-label">Canceled</span>
            <h2 className="stat-value">{stats.canceledCount.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">
              {(stats.total > 0 ? (stats.canceledCount / stats.total * 100) : 0).toFixed(1)}% Canceled
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5" style={{ marginTop: '20px' }} aria-label="Secondary Performance Indicators">
        <div className="stat-card" id="card-suspect">
          <div className="stat-icon-wrapper suspect"><i className="fa-solid fa-triangle-exclamation"></i></div>
          <div className="stat-info">
            <span className="stat-label">Suspect</span>
            <h2 className="stat-value">{stats.suspectCount.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">
              {(stats.total > 0 ? (stats.suspectCount / stats.total * 100) : 0).toFixed(1)}% Suspect
            </span>
          </div>
        </div>

        <div className="stat-card" id="card-wrong-number">
          <div className="stat-icon-wrapper wrong-number"><i className="fa-solid fa-phone-slash"></i></div>
          <div className="stat-info">
            <span className="stat-label">Tujuan Salah</span>
            <h2 className="stat-value">{stats.wrongNumberCount.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">
              {(stats.total > 0 ? (stats.wrongNumberCount / stats.total * 100) : 0).toFixed(1)}% Wrong Number
            </span>
          </div>
        </div>

        <div className="stat-card" id="card-pending">
          <div className="stat-icon-wrapper pending"><i className="fa-solid fa-spinner fa-spin-slow"></i></div>
          <div className="stat-info">
            <span className="stat-label">Timeout</span>
            <h2 className="stat-value">{stats.pendingCount.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">Awaiting response</span>
          </div>
        </div>
      </section>

      {/* Financial Summary Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5" aria-label="Financial Indicators" style={{ marginTop: '20px' }}>
        <div className="stat-card" id="card-retail">
          <div className="stat-icon-wrapper retail"><i className="fa-solid fa-cash-register"></i></div>
          <div className="stat-info">
            <span className="stat-label">Total Retail Price</span>
            <h2 className="stat-value text-indigo">{formatCurrency(stats.totalRetail)}</h2>
            <span className="stat-meta">From successful txs</span>
          </div>
        </div>

        <div className="stat-card" id="card-cost">
          <div className="stat-icon-wrapper cost"><i className="fa-solid fa-tags"></i></div>
          <div className="stat-info">
            <span className="stat-label">Total Cost Price</span>
            <h2 className="stat-value text-purple">{formatCurrency(stats.totalCost)}</h2>
            <span className="stat-meta">From successful txs</span>
          </div>
        </div>

        <div className="stat-card" id="card-profit">
          <div className="stat-icon-wrapper profit"><i className="fa-solid fa-money-bill-trend-up"></i></div>
          <div className="stat-info">
            <span className="stat-label">Total Profit</span>
            <h2 className="stat-value text-success">{formatCurrency(stats.totalProfit)}</h2>
            <span className="stat-meta">Earnings from sales</span>
          </div>
        </div>
      </section>

      {/* Trend Chart */}
      <section className="chart-section" aria-label="Transaction Trend Chart" style={{ marginTop: '20px' }}>
        <div className="chart-header">
          <div className="chart-title-container">
            <h2 className="chart-title">Transaction Trends</h2>
            <p className="subtitle" id="chart-subtitle">{getChartSubtitle()}</p>
          </div>
        </div>
        <div className="chart-body" style={{ height: '320px', position: 'relative' }}>
          <Bar key={themeTick} data={barChartConfig} options={chartOptions} />
        </div>
      </section>

      {/* Filters and Data Table */}
      <section className="table-section" aria-label="Transaction Records" style={{ marginTop: '20px' }}>
        <div className="table-controls">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              id="search-input"
              placeholder="Search by destination, TRXID, product..."
              aria-label="Search transactions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-actions flex flex-wrap gap-3 items-center">
            <div className="select-wrapper">
              <i className="fa-solid fa-calendar select-icon"></i>
              <select
                id="date-mode-select"
                aria-label="Date Filter Mode"
                value={dateMode}
                onChange={(e) => setDateMode(e.target.value)}
              >
                <option value="today">Hari Ini</option>
                <option value="all">Semua Tanggal</option>
                <option value="custom">Rentang Tanggal</option>
              </select>
            </div>

            {dateMode === 'custom' && (
              <div id="custom-date-inputs" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="date-filter-wrapper">
                  <i className="fa-solid fa-calendar-days date-icon"></i>
                  <input
                    type="date"
                    id="start-date-filter"
                    aria-label="Start Date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>s/d</span>
                <div className="date-filter-wrapper">
                  <i className="fa-solid fa-calendar-days date-icon"></i>
                  <input
                    type="date"
                    id="end-date-filter"
                    aria-label="End Date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="select-wrapper">
              <i className="fa-solid fa-filter select-icon"></i>
              <select
                id="status-filter"
                aria-label="Filter by Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="20">Success (20)</option>
                <option value="40">Failed (40)</option>
                <option value="50">Canceled (50)</option>
                <option value="suspect">Suspect (51)</option>
                <option value="54">Tujuan Salah (54)</option>
                <option value="55">Timeout (55)</option>
              </select>
            </div>

            <div className="select-wrapper">
              <i className="fa-solid fa-list select-icon"></i>
              <select
                id="limit-filter"
                aria-label="Rows per page"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                <option value={5}>5 Rows</option>
                <option value={10}>10 Rows</option>
              </select>
            </div>

            <div className="switch-container flex items-center gap-2">
              <span>Auto Refresh</span>
              <label className="switch">
                <input
                  type="checkbox"
                  id="auto-refresh-toggle"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <button onClick={() => fetchData(true)} className="btn-refresh-dash" title="Refresh Data">
              <i className="fa-solid fa-arrows-rotate"></i> Refresh
            </button>
            <button onClick={handleReset} className="btn-reset-dash" title="Reset Filters">
              <i className="fa-solid fa-arrow-rotate-left"></i> Reset
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="table-container" style={{ marginTop: '16px' }}>
          <table id="transactions-table">
            <thead>
              <tr>
                <th scope="col">TRXID</th>
                <th scope="col">Date & Time</th>
                <th scope="col">Product</th>
                <th scope="col">Destination</th>
                <th scope="col" className="text-right">Retail Price</th>
                <th scope="col" className="text-right">Cost Price</th>
                <th scope="col" className="text-right">Profit</th>
                <th scope="col">SN / Reference</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr className="placeholder-row">
                  <td colSpan={9}>
                    <div className="table-loader-wrapper">
                      <div className="spinner"></div>
                      <span>Fetching database records...</span>
                    </div>
                  </td>
                </tr>
              ) : tableError ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state" style={{ color: 'var(--failed)' }}>
                      <i className="fa-solid fa-circle-exclamation empty-icon" style={{ color: 'var(--failed)' }}></i>
                      <p style={{ fontWeight: 600 }}>Failed to Load Transactions</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{tableError}</p>
                      <button className="btn-pagination" onClick={() => fetchData(true)} style={{ margin: '16px auto 0 auto', display: 'flex' }}>
                        <i className="fa-solid fa-rotate"></i> Retry Connection
                      </button>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <i className="fa-regular fa-folder-open empty-icon"></i>
                      <p>No transactions found matching the criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((item) => {
                  const profit = (item.status === 20 && item.harga && item.harga_beli) ? (item.harga - item.harga_beli) : 0;
                  const profitClass = profit >= 0 ? 'text-success' : 'text-danger';

                  return (
                    <tr key={item.kode}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.kode || '-'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{formatDateTime(item.tgl_entri)}</td>
                      <td>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontWeight: 500 }}>
                          {item.kode_produk || '-'}
                        </span>
                      </td>
                      <td>{item.tujuan || '-'}</td>
                      <td className="text-right" style={{ fontWeight: 500 }}>{formatCurrency(item.harga)}</td>
                      <td className="text-right" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.harga_beli)}</td>
                      <td className={`text-right ${profitClass}`} style={{ fontWeight: 600 }}>{formatCurrency(profit)}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {item.sn || <span className="text-muted">-</span>}
                      </td>
                      <td>{getStatusBadge(item.status, item.sn)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!tableLoading && !tableError && totalPages > 1 && (
          <footer className="table-footer" style={{ marginTop: '16px' }}>
            <div className="pagination-info" id="pagination-info">
              {getPageRange()}
            </div>
            <nav className="pagination-controls" aria-label="Pagination Navigation">
              <button
                className="btn-pagination"
                id="btn-prev"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <i className="fa-solid fa-chevron-left"></i> Previous
              </button>
              <div className="page-numbers" id="page-numbers">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                  .map((p, i, arr) => {
                    // Inject ellipses if needed
                    const showEllipsis = i > 0 && p - arr[i - 1] > 1;
                    return (
                      <span key={p} className="flex items-center">
                        {showEllipsis && <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>...</span>}
                        <button
                          className={`btn-page ${p === currentPage ? 'active' : ''}`}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}
              </div>
              <button
                className="btn-pagination"
                id="btn-next"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
