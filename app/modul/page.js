'use client';

import { useState, useEffect, useRef } from 'react';

export default function ModulPage() {
  const [mounted, setMounted] = useState(false);

  // Filter Dropdown Lists
  const [modulesList, setModulesList] = useState([]);
  const [resellersList, setResellersList] = useState([]);

  // Active Filters state
  const [search, setSearch] = useState('');
  const [dateMode, setDateMode] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [modulFilter, setModulFilter] = useState('');
  const [resellerFilter, setResellerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [snEmpty, setSnEmpty] = useState(true);
  const [limit, setLimit] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Data States
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
    resellers: []
  });
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

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
  }, []);

  // Fetch filter dropdown options
  const fetchFilterInit = async () => {
    try {
      const res = await fetch('/api/modul/init');
      if (res.ok) {
        const json = await res.json();
        setModulesList(json.modules || []);
        setResellersList(json.resellers || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch metrics & logs
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
        modul: modulFilter,
        reseller: resellerFilter,
        status: statusFilter,
        startDate: startVal,
        endDate: endVal,
        dateMode,
        sn_empty: snEmpty ? 'true' : 'false'
      });

      const res = await fetch(`/api/modul/transactions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data || []);
        setProductivity(json.productivity || {});
        setTopLists(json.topLists || { modules: [], products: [], resellers: [] });
        setTotalItems(json.pagination?.total || 0);
        setTotalPages(json.pagination?.totalPages || 0);
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
  }, [mounted]);

  // Hook dependencies to reload
  useEffect(() => {
    if (!mounted) return;
    setCurrentPage(1);
    fetchModulData();
  }, [search, dateMode, startDate, endDate, modulFilter, resellerFilter, statusFilter, snEmpty, limit, mounted]);

  // Hook pagination
  useEffect(() => {
    if (!mounted) return;
    fetchModulData(false);
  }, [currentPage]);

  // Force Sync listener
  useEffect(() => {
    const handleSync = () => {
      setCurrentPage(1);
      fetchModulData();
    };
    window.addEventListener('bmp-force-sync', handleSync);
    return () => window.removeEventListener('bmp-force-sync', handleSync);
  }, [mounted, search, dateMode, startDate, endDate, modulFilter, resellerFilter, statusFilter, snEmpty, limit]);

  const handleReset = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    setSearch('');
    setDateMode('today');
    setStartDate(todayStr);
    setEndDate(todayStr);
    setModulFilter('');
    setResellerFilter('');
    setStatusFilter('all');
    setSnEmpty(true);
    setLimit(20);
    setCurrentPage(1);
  };

  if (!mounted) return null;

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

  const getStatusBadge = (txStatus) => {
    if (txStatus === 20) {
      return <span className="badge status-success"><i className="fa-solid fa-circle-check"></i> Success</span>;
    } else if (txStatus === 40 || txStatus === 50 || txStatus === 52 || txStatus === 54) {
      return <span className="badge status-failed"><i className="fa-solid fa-circle-xmark"></i> Failed</span>;
    } else {
      return <span className="badge status-pending"><i className="fa-solid fa-clock"></i> Code {txStatus}</span>;
    }
  };

  // Render horizontal visual progress list
  const renderProgressList = (title, items) => {
    // Find max transactions to scale progress bars relative to top volume
    const maxTx = items.length > 0 ? Math.max(...items.map(i => i.total_trx)) : 1;

    return (
      <div className="bg-white dark:bg-darkCard p-5 rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative overflow-hidden flex flex-col hover:border-brandBlue/15 transition-all">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">{title}</h3>
        <div className="space-y-4 flex-grow">
          {items.length === 0 ? (
            <div className="text-center py-6 text-slate-400">No items available</div>
          ) : (
            items.map((item, idx) => {
              const pct = maxTx > 0 ? (item.total_trx / maxTx) * 100 : 0;
              const successRate = item.total_trx > 0 ? ((item.success_trx / item.total_trx) * 100).toFixed(1) : 0;
              return (
                <div key={item.name + idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{item.total_trx} Trx (SR: {successRate}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-brandBlue h-full rounded-full transition-all duration-500" 
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
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

        <div className="stat-card" id="card-success">
          <div className="stat-icon-wrapper success"><i className="fa-solid fa-money-bill-trend-up"></i></div>
          <div className="stat-info">
            <span className="stat-label">Total Laba</span>
            <h2 className="stat-value text-success">{formatCurrency(productivity.totalLaba)}</h2>
            <span className="stat-meta">{productivity.successRate}% Success rate ({productivity.totalTrx} Trxs)</span>
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
      </section>

      {/* Progress list boxes for top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginTop: '20px' }}>
        {renderProgressList('Top 5 Modules By Volume', topLists.modules)}
        {renderProgressList('Top 5 Products By Volume', topLists.products)}
        {renderProgressList('Top 5 Resellers By Volume', topLists.resellers)}
      </div>

      {/* Filters and logs table */}
      <section className="table-section" aria-label="Transaction Records" style={{ marginTop: '20px' }}>
        <div className="table-controls">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              placeholder="Search by destination, product, TRXID, reseller..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-actions flex flex-wrap gap-2 items-center">
            {/* Date Mode Toggle */}
            <div className="select-wrapper">
              <i className="fa-solid fa-calendar select-icon"></i>
              <select value={dateMode} onChange={(e) => setDateMode(e.target.value)}>
                <option value="today">Hari Ini</option>
                <option value="all">Semua Tanggal</option>
                <option value="custom">Rentang Tanggal</option>
              </select>
            </div>

            {/* Custom Dates */}
            {dateMode === 'custom' && (
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
            )}

            {/* Modul Select */}
            <div className="select-wrapper">
              <i className="fa-solid fa-cubes select-icon"></i>
              <select value={modulFilter} onChange={(e) => setModulFilter(e.target.value)}>
                <option value="">All Modules</option>
                {modulesList.map(m => (
                  <option key={m.kode} value={m.kode}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Reseller Select */}
            <div className="select-wrapper">
              <i className="fa-solid fa-user select-icon"></i>
              <select value={resellerFilter} onChange={(e) => setResellerFilter(e.target.value)}>
                <option value="">All Resellers</option>
                {resellersList.map(r => (
                  <option key={r.kode} value={r.kode}>{r.nama}</option>
                ))}
              </select>
            </div>

            {/* Status select */}
            <div className="select-wrapper">
              <i className="fa-solid fa-filter select-icon"></i>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="sukses">Success</option>
                <option value="gagal">Failed</option>
                <option value="proses">Processing</option>
              </select>
            </div>

            {/* Exclude empty SN checkbox */}
            <div className="switch-container flex items-center gap-2">
              <span>Exclude Empty SN</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={!snEmpty}
                  onChange={(e) => setSnEmpty(!e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* limit selection */}
            <div className="select-wrapper">
              <i className="fa-solid fa-list select-icon"></i>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
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
                <th>Modul</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="placeholder-row">
                  <td colSpan={12}>
                    <div className="table-loader-wrapper">
                      <div className="spinner"></div>
                      <span>Fetching module transaction records...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <div className="empty-state">
                      <i className="fa-regular fa-folder-open empty-icon"></i>
                      <p>No transactions found matching the criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  return (
                    <tr key={tx.TrxID} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{tx.TrxID}</td>
                      <td>{formatDateTime(tx.tgl_entri)}</td>
                      <td>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontWeight: 500 }}>
                          {tx.kode_produk}
                        </span>
                      </td>
                      <td>{tx.tujuan}</td>
                      <td className="text-right">{formatCurrency(tx.harga)}</td>
                      <td className="text-right">{formatCurrency(tx.harga_beli)}</td>
                      <td className={`text-right font-bold ${tx.laba >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(tx.laba)}</td>
                      <td>{formatCurrency(tx.saldo_supplier)}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {tx.sn || <span className="text-muted">-</span>}
                      </td>
                      <td>{getStatusBadge(tx.status)}</td>
                      <td className="font-semibold">{tx.nama_reseller || '-'}</td>
                      <td>{tx.nama_modul || '-'}</td>
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
