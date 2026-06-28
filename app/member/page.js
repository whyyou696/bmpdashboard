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

  return (
    <>
      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" aria-label="Key Performance Indicators">
        <div className="stat-card" id="card-total-saldo">
          <div className="stat-icon-wrapper total"><i className="fa-solid fa-wallet"></i></div>
          <div className="stat-info">
            <span className="stat-label">Total Saldo Aktif</span>
            <h2 className="stat-value text-indigo">{formatCurrency(summary.totalSaldo)}</h2>
            <span className="stat-meta">Active suppliers balance</span>
          </div>
        </div>

        <div className="stat-card" id="card-potential-active">
          <div className="stat-icon-wrapper success"><i className="fa-solid fa-circle-check"></i></div>
          <div className="stat-info">
            <span className="stat-label">Potential Active Modules</span>
            <h2 className="stat-value text-success">{summary.potentialActiveCount}</h2>
            <span className="stat-meta">Active with transactions</span>
          </div>
        </div>

        <div className="stat-card" id="card-non-potential">
          <div className="stat-icon-wrapper failed"><i className="fa-solid fa-triangle-exclamation"></i></div>
          <div className="stat-info">
            <span className="stat-label">Inactive / Empty Saldo</span>
            <h2 className="stat-value text-danger">{summary.nonPotentialCount}</h2>
            <span className="stat-meta">Requires balance top-up</span>
          </div>
        </div>

        <div className="stat-card" id="card-trx-30d">
          <div className="stat-icon-wrapper pending"><i className="fa-solid fa-arrows-spin"></i></div>
          <div className="stat-info">
            <span className="stat-label">Total Trx (30 Days)</span>
            <h2 className="stat-value">{summary.totalTrx30Days.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">Gateway traffic volume</span>
          </div>
        </div>
      </section>

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
                <th>Modul ID</th>
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
                  <td colSpan={7}>
                    <div className="table-loader-wrapper">
                      <div className="spinner"></div>
                      <span>Fetching supplier report data...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedModules.length === 0 ? (
                <tr>
                  <td colSpan={7}>
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
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{m.kode}</td>
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
