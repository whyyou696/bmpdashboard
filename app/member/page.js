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

export default function MemberPage() {
  const [mounted, setMounted] = useState(false);
  const [themeTick, setThemeTick] = useState(0);

  // States
  const [originalModules, setOriginalModules] = useState([]);
  const [summary, setSummary] = useState({
    totalSaldo: 0,
    activeCount: 0,
    inactiveCount: 0,
    potentialActiveCount: 0,
    nonPotentialCount: 0,
    totalTrx30Days: 0
  });

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all'); // 'all', 'active', 'inactive'
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Fetch all data once (since search & filter are client-side in original project)
  const fetchMemberStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/member/stats');
      if (res.ok) {
        const json = await res.json();
        setOriginalModules(json.modules || []);
        setSummary(json.summary || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchMemberStats();
  }, [mounted]);

  // Hook Force Sync events
  useEffect(() => {
    const handleSync = () => {
      fetchMemberStats();
    };
    window.addEventListener('bmp-force-sync', handleSync);
    return () => window.removeEventListener('bmp-force-sync', handleSync);
  }, [mounted]);

  // Theme Change listener (to force chart update if needed)
  useEffect(() => {
    const handleTheme = () => setThemeTick(prev => prev + 1);
    window.addEventListener('bmp-theme-change', handleTheme);
    return () => window.removeEventListener('bmp-theme-change', handleTheme);
  }, []);

  const handleReset = () => {
    setSearch('');
    setStatus('all');
    setLimit(10);
    setCurrentPage(1);
  };

  if (!mounted) return null;

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return 'Rp 0';
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
  };

  // Perform client-side filtering
  let filteredModules = originalModules.filter(m => {
    // 1. Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchLabel = m.label && m.label.toLowerCase().includes(q);
      const matchKode = m.kode && String(m.kode).includes(q);
      const matchTujuan = m.tujuan && m.tujuan.toLowerCase().includes(q);
      if (!matchLabel && !matchKode && !matchTujuan) return false;
    }

    // 2. Status filter
    if (status === 'active' && m.aktif !== 1) return false;
    if (status === 'inactive' && m.aktif !== 0) return false;

    return true;
  });

  // Perform client-side pagination
  const totalItems = filteredModules.length;
  const totalPages = Math.ceil(totalItems / limit);
  const startIdx = (currentPage - 1) * limit;
  const paginatedModules = filteredModules.slice(startIdx, startIdx + limit);

  // Calculations for supporting cards (dynamic, based on filteredModules)
  const filteredActiveModules = filteredModules.filter(m => m.aktif === 1);
  const dynamicTotalSaldo = filteredActiveModules.reduce((sum, m) => sum + (m.saldo || 0), 0);
  const dynamicPotentialActiveCount = filteredModules.filter(m => m.aktif === 1 && ((m.saldo && m.saldo > 0) || m.total_trx > 0)).length;
  const dynamicNonPotentialCount = filteredModules.filter(m => m.aktif === 0 || (m.aktif === 1 && (!m.saldo || m.saldo <= 0) && m.total_trx === 0)).length;
  const dynamicTotalTrx30Days = filteredModules.reduce((sum, m) => sum + (m.total_trx || 0), 0);

  const averageSaldo = filteredActiveModules.length > 0 ? (dynamicTotalSaldo / filteredActiveModules.length) : 0;
  const highestSaldoModule = filteredModules.reduce((max, m) => (m.saldo > (max?.saldo || 0)) ? m : max, null);

  // Theme support for charts
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const textColor = isDarkMode ? '#94a3b8' : '#475569';
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';

  // Chart 1: Horizontal Bar Chart of Member Balances
  const sortedModulesByBalance = [...filteredModules].sort((a, b) => b.saldo - a.saldo);
  const barChartLabels = sortedModulesByBalance.slice(0, 10).map(m => m.label);
  const barChartValues = sortedModulesByBalance.slice(0, 10).map(m => m.saldo);

  const memberBalanceChartData = {
    labels: barChartLabels,
    datasets: [
      {
        label: 'Saldo Member',
        data: barChartValues,
        backgroundColor: 'rgba(99, 102, 241, 0.75)', // Indigo
        hoverBackgroundColor: '#6366f1',
        borderRadius: 4
      }
    ]
  };

  const memberBalanceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', // Horizontal Bar Chart
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => ` Saldo: ${formatCurrency(context.raw)}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { 
          color: textColor, 
          font: { family: 'Inter', size: 9 },
          callback: (value) => {
            if (value >= 1e6) return `Rp ${(value / 1e6).toFixed(0)}Jt`;
            return `Rp ${value.toLocaleString('id-ID')}`;
          }
        }
      },
      y: {
        grid: { display: false },
        ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
      }
    }
  };

  // Chart 2: Doughnut Chart of Balance Share
  const doughnutLabels = sortedModulesByBalance.slice(0, 5).map(m => m.label);
  const doughnutValues = sortedModulesByBalance.slice(0, 5).map(m => m.saldo);
  if (sortedModulesByBalance.length > 5) {
    doughnutLabels.push('Lainnya');
    doughnutValues.push(sortedModulesByBalance.slice(5).reduce((sum, m) => sum + m.saldo, 0));
  }

  const memberBalanceShareData = {
    labels: doughnutLabels,
    datasets: [
      {
        data: doughnutValues,
        backgroundColor: [
          '#0052ff', // Brand Blue
          '#06b6d4', // Brand Cyan
          '#10b981', // Emerald
          '#f59e0b', // Amber
          '#818cf8', // Indigo
          '#94a3b8'  // Slate
        ],
        borderWidth: 0
      }
    ]
  };

  const memberBalanceShareOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: textColor,
          font: { family: 'Inter', size: 10 },
          boxWidth: 10,
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
          label: (context) => {
            const value = context.raw;
            const total = context.dataset.data.reduce((sum, v) => sum + v, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return ` ${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '65%'
  };

  return (
    <>
      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5" aria-label="Key Performance Indicators">
        <div className="stat-card" id="card-total-saldo">
          <div className="stat-icon-wrapper total"><i className="fa-solid fa-wallet"></i></div>
          <div className="stat-info">
            <span className="stat-label">Total Saldo Aktif</span>
            <h2 className="stat-value text-indigo">{formatCurrency(dynamicTotalSaldo)}</h2>
            <span className="stat-meta">Active suppliers balance</span>
          </div>
        </div>

        <div className="stat-card" id="card-potential-active">
          <div className="stat-icon-wrapper success"><i className="fa-solid fa-circle-check"></i></div>
          <div className="stat-info">
            <span className="stat-label">Potential Active Modules</span>
            <h2 className="stat-value text-success">{dynamicPotentialActiveCount}</h2>
            <span className="stat-meta">Active with transactions</span>
          </div>
        </div>

        <div className="stat-card" id="card-non-potential">
          <div className="stat-icon-wrapper failed"><i className="fa-solid fa-triangle-exclamation"></i></div>
          <div className="stat-info">
            <span className="stat-label">Inactive / Empty Saldo</span>
            <h2 className="stat-value text-danger">{dynamicNonPotentialCount}</h2>
            <span className="stat-meta">Requires balance top-up</span>
          </div>
        </div>

        <div className="stat-card" id="card-trx-30d">
          <div className="stat-icon-wrapper pending"><i className="fa-solid fa-arrows-spin"></i></div>
          <div className="stat-info">
            <span className="stat-label">Total Trx (30 Days)</span>
            <h2 className="stat-value">{dynamicTotalTrx30Days.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">Gateway traffic volume</span>
          </div>
        </div>

        <div className="stat-card" id="card-avg-saldo">
          <div className="stat-icon-wrapper retail"><i className="fa-solid fa-calculator"></i></div>
          <div className="stat-info">
            <span className="stat-label">Rata-rata Saldo</span>
            <h2 className="stat-value text-indigo">{formatCurrency(averageSaldo)}</h2>
            <span className="stat-meta">Avg active member balance</span>
          </div>
        </div>

        <div className="stat-card" id="card-max-saldo" style={{ minWidth: 0 }}>
          <div className="stat-icon-wrapper cost"><i className="fa-solid fa-crown"></i></div>
          <div className="stat-info" style={{ minWidth: 0 }}>
            <span className="stat-label">Saldo Tertinggi</span>
            <h2 className="stat-value text-indigo truncate" style={{ maxWidth: '100%' }}>
              {highestSaldoModule ? formatCurrency(highestSaldoModule.saldo) : 'Rp 0'}
            </h2>
            <span className="stat-meta truncate" style={{ maxWidth: '100%' }} title={highestSaldoModule ? highestSaldoModule.label : 'No active member'}>
              {highestSaldoModule ? highestSaldoModule.label : 'No active member'}
            </span>
          </div>
        </div>
      </section>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ marginTop: '20px' }}>
        {/* Chart 1: Reseller Balances */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm flex flex-col hover:border-brandBlue/15 transition-all"
          style={{ padding: '24px' }}
        >
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 font-heading" style={{ letterSpacing: '1px' }}>
            Saldo per Member (Top 10)
          </h3>
          <div className="h-64 relative">
            {filteredModules.length > 0 ? (
              <Bar key={`bar-${themeTick}`} data={memberBalanceChartData} options={memberBalanceChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                No member data available
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Distribusi Saldo */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm flex flex-col hover:border-brandBlue/15 transition-all"
          style={{ padding: '24px' }}
        >
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 font-heading" style={{ letterSpacing: '1px' }}>
            Distribusi Saldo Member
          </h3>
          <div className="h-64 relative flex items-center justify-center">
            {filteredModules.length > 0 && filteredModules.some(m => m.saldo > 0) ? (
              <Doughnut key={`doughnut-${themeTick}`} data={memberBalanceShareData} options={memberBalanceShareOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                No balance distribution data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced filters and modules table */}
      <section className="table-section" aria-label="Transaction Records" style={{ marginTop: '20px' }}>
        <div className="table-controls">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              id="search-input"
              placeholder="Search by ID, label, target IP..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="filter-actions flex flex-wrap gap-2 items-center">
            {/* Status select */}
            <div className="select-wrapper">
              <i className="fa-solid fa-filter select-icon"></i>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}>
                <option value="all">All Modules</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* limit selection */}
            <div className="select-wrapper">
              <i className="fa-solid fa-list select-icon"></i>
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setCurrentPage(1); }}>
                <option value={5}>5 Rows</option>
                <option value={10}>10 Rows</option>
                <option value={20}>20 Rows</option>
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
              <tr>
                <th>Module Label</th>
                <th>Target / Tujuan</th>
                <th>Status</th>
                <th className="text-right">Current Saldo</th>
                <th>30 Days Transactions</th>
                <th>Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="placeholder-row">
                  <td colSpan={6}>
                    <div className="table-loader-wrapper">
                      <div className="spinner"></div>
                      <span>Fetching supplier report data...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedModules.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <i className="fa-regular fa-folder-open empty-icon"></i>
                      <p>No supplier modules found matching the criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedModules.map((m) => {
                  return (
                    <tr key={m.kode} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="font-semibold text-slate-700 dark:text-slate-300">{m.label}</td>
                      <td>{m.tujuan || '-'}</td>
                      <td>
                        {m.aktif === 1 ? (
                          <span className="badge status-success"><i className="fa-solid fa-circle-check"></i> Active</span>
                        ) : (
                          <span className="badge status-failed"><i className="fa-solid fa-circle-xmark"></i> Inactive</span>
                        )}
                      </td>
                      <td className="text-right font-medium">{formatCurrency(m.saldo)}</td>
                      <td>{m.total_trx.toLocaleString('id-ID')} Txs</td>
                      <td className="font-bold text-brandBlue dark:text-brandCyan">{m.success_rate}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <footer className="table-footer" style={{ marginTop: '16px' }}>
            <div className="pagination-info">
              Showing {startIdx + 1} to {Math.min(startIdx + limit, totalItems)} of {totalItems} modules
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
