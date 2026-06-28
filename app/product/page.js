'use client';

import { useState, useEffect, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function ProductPage() {
  const [mounted, setMounted] = useState(false);

  // Filters Lists
  const [productsList, setProductsList] = useState([]);
  const [modulesList, setModulesList] = useState([]);
  const [resellersList, setResellersList] = useState([]);

  // Active filters
  const [search, setSearch] = useState('');
  const [dateMode, setDateMode] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [modulFilter, setModulFilter] = useState('');
  const [resellerFilter, setResellerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [snEmpty, setSnEmpty] = useState(true);
  const [limit, setLimit] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Chart-driven filter state
  const [chartFilteredProduct, setChartFilteredProduct] = useState('');
  const [chartPage, setChartPage] = useState(1);

  // Data States
  const [transactions, setTransactions] = useState([]);
  const [productivity, setProductivity] = useState({
    totalTrx: 0,
    successTrx: 0,
    failedTrx: 0,
    successRate: 0,
    totalOmset: 0,
    totalLaba: 0,
    uniqueProducts: 0,
    topProduct: '-',
    topProductTrx: 0,
    topProductProfit: 0,
    avgTrxPerProduct: 0
  });
  const [allProducts, setAllProducts] = useState([]); // for chart pagination
  const [topLists, setTopLists] = useState({
    products: [],
    modules: [],
    resellers: []
  });
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

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

  // Fetch filters init options
  const fetchFilterInit = async () => {
    try {
      const res = await fetch('/api/product/init');
      if (res.ok) {
        const json = await res.json();
        setProductsList(json.products || []);
        setModulesList(json.modules || []);
        setResellersList(json.resellers || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch data metrics & logs
  const fetchProductData = async (noLoading = false) => {
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
      // If we clicked a product bar in the chart, that overrides the product filter dropdown!
      const activeProductFilter = chartFilteredProduct || productFilter;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: search.trim(),
        product: activeProductFilter,
        modul: modulFilter,
        reseller: resellerFilter,
        status: statusFilter,
        startDate: startVal,
        endDate: endVal,
        dateMode,
        sn_empty: snEmpty ? 'true' : 'false'
      });

      const res = await fetch(`/api/product/transactions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data || []);
        setProductivity(json.productivity || {});
        setAllProducts(json.allProducts || []);
        setTopLists(json.topLists || { products: [], modules: [], resellers: [] });
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
    fetchProductData();
  }, [mounted]);

  // Hook dependencies to reload
  useEffect(() => {
    if (!mounted) return;
    setCurrentPage(1);
    fetchProductData();
  }, [search, dateMode, startDate, endDate, productFilter, modulFilter, resellerFilter, statusFilter, snEmpty, limit, chartFilteredProduct, mounted]);

  // Hook pagination
  useEffect(() => {
    if (!mounted) return;
    fetchProductData(false);
  }, [currentPage]);

  // Force Sync listener
  useEffect(() => {
    const handleSync = () => {
      setCurrentPage(1);
      fetchProductData();
    };
    window.addEventListener('bmp-force-sync', handleSync);
    return () => window.removeEventListener('bmp-force-sync', handleSync);
  }, [mounted, search, dateMode, startDate, endDate, productFilter, modulFilter, resellerFilter, statusFilter, snEmpty, limit, chartFilteredProduct]);

  // Reset function
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
    setProductFilter('');
    setModulFilter('');
    setResellerFilter('');
    setStatusFilter('all');
    setSnEmpty(true);
    setLimit(20);
    setCurrentPage(1);
    setChartFilteredProduct('');
    setChartPage(1);
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

  // --- Paginate products for the bar chart (5 items per page) ---
  const chartLimit = 5;
  const totalChartPages = Math.ceil(allProducts.length / chartLimit);
  const startIdx = (chartPage - 1) * chartLimit;
  const currentChartProducts = allProducts.slice(startIdx, startIdx + chartLimit);

  const chartLabels = currentChartProducts.map(p => p.name);
  const chartTxCounts = currentChartProducts.map(p => p.total_trx);
  const chartProfit = currentChartProducts.map(p => p.total_profit);

  // Setup theme variables for styling Chart
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const textColor = isDarkMode ? '#94a3b8' : '#475569';
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';

  const chartConfig = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Total Txs Volume',
        data: chartTxCounts,
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        hoverBackgroundColor: '#3b82f6',
        borderRadius: 4,
        yAxisID: 'y'
      },
      {
        label: 'Total Profit',
        data: chartProfit,
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        hoverBackgroundColor: '#10b981',
        borderRadius: 4,
        yAxisID: 'y1'
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
          font: { family: 'Inter', size: 10, weight: '500' },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const val = context.raw || 0;
            if (context.datasetIndex === 1) {
              return ` ${label}: ${formatCurrency(val)}`;
            }
            return ` ${label}: ${val} Trx`;
          },
          afterBody: (context) => {
            const index = context[0].dataIndex;
            const item = currentChartProducts[index];
            if (item) {
              return `Success Rate: ${((item.success_trx / item.total_trx) * 100).toFixed(1)}%`;
            }
            return '';
          }
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const clickedProduct = currentChartProducts[index].name;
        setChartFilteredProduct(clickedProduct);
        setCurrentPage(1);
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textColor, font: { family: 'Inter', size: 9 } }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: gridColor },
        ticks: { 
          color: textColor, 
          font: { family: 'Inter', size: 9 },
          callback: (value) => value + ' Trx'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { 
          color: textColor, 
          font: { family: 'Inter', size: 9 },
          callback: (value) => 'Rp ' + (value >= 1000 ? (value / 1000) + 'k' : value)
        }
      }
    }
  };

  return (
    <>
      {/* Metrics Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" aria-label="Key Performance Indicators">
        <div className="stat-card" id="card-total">
          <div className="stat-icon-wrapper total"><i className="fa-solid fa-box"></i></div>
          <div className="stat-info">
            <span className="stat-label">Jumlah Product</span>
            <h2 className="stat-value">{productivity.uniqueProducts.toLocaleString('id-ID')}</h2>
            <span className="stat-meta">Active product codes</span>
          </div>
        </div>

        <div className="stat-card" id="card-success">
          <div className="stat-icon-wrapper success"><i className="fa-solid fa-chart-bar"></i></div>
          <div className="stat-info">
            <span className="stat-label">Top Product By Volume</span>
            <h2 className="stat-value text-indigo">{productivity.topProduct}</h2>
            <span className="stat-meta">{productivity.topProductTrx.toLocaleString('id-ID')} Transactions ({productivity.successRate}% Success Rate)</span>
          </div>
        </div>

        <div className="stat-card" id="card-failed">
          <div className="stat-icon-wrapper profit"><i className="fa-solid fa-money-bill-trend-up"></i></div>
          <div className="stat-info">
            <span className="stat-label">Top Product By Profit</span>
            <h2 className="stat-value text-success">{productivity.topProduct}</h2>
            <span className="stat-meta">{formatCurrency(productivity.topProductProfit)} profit margin</span>
          </div>
        </div>

        <div className="stat-card" id="card-canceled">
          <div className="stat-icon-wrapper retail"><i className="fa-solid fa-wallet"></i></div>
          <div className="stat-info">
            <span className="stat-label">Jumlah Profit Product</span>
            <h2 className="stat-value text-indigo">{formatCurrency(productivity.totalLaba)}</h2>
            <span className="stat-meta">Total profit margins</span>
          </div>
        </div>
      </section>

      {/* Product Chart */}
      <section className="chart-section" aria-label="Product Transaction Volumne" style={{ marginTop: '20px' }}>
        <div className="chart-header flex justify-between items-center flex-wrap gap-4">
          <div className="chart-title-container">
            <h2 className="chart-title">Product Sales & Productivity Distribution</h2>
            <p className="subtitle">Click a bar to filter ledger logs. Showing products {startIdx + 1} to {Math.min(startIdx + chartLimit, allProducts.length)} of {allProducts.length}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {chartFilteredProduct && (
              <span className="text-xs bg-brandBlue/10 text-brandBlue px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5">
                Filtered: {chartFilteredProduct}
                <button onClick={() => setChartFilteredProduct('')} className="text-red-500 hover:text-red-700 cursor-pointer">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            )}

            {/* Chart pagination */}
            {totalChartPages > 1 && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => setChartPage(p => Math.max(1, p - 1))}
                  disabled={chartPage === 1}
                  className="px-2 py-1 text-xs font-semibold rounded disabled:opacity-50"
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <span className="text-[10px] font-bold text-slate-500 px-2">{chartPage} / {totalChartPages}</span>
                <button 
                  onClick={() => setChartPage(p => Math.min(totalChartPages, p + 1))}
                  disabled={chartPage === totalChartPages}
                  className="px-2 py-1 text-xs font-semibold rounded disabled:opacity-50"
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="chart-body" style={{ height: '300px', position: 'relative' }}>
          {allProducts.length > 0 ? (
            <Bar data={chartConfig} options={chartOptions} />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">No chart data available</div>
          )}
        </div>
      </section>

      {/* Filters and logs table */}
      <section className="table-section" aria-label="Transaction Records" style={{ marginTop: '20px' }}>
        <div className="table-controls">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              id="search-input"
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

            {/* Product Select */}
            <div className="select-wrapper">
              <i className="fa-solid fa-box select-icon"></i>
              <select value={productFilter} onChange={(e) => { setProductFilter(e.target.value); setChartFilteredProduct(''); }}>
                <option value="">All Products</option>
                {productsList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

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
                <th>SN / Reference</th>
                <th>Status</th>
                <th>Reseller</th>
                <th>Modul</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="placeholder-row">
                  <td colSpan={11}>
                    <div className="table-loader-wrapper">
                      <div className="spinner"></div>
                      <span>Fetching product transaction records...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={11}>
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
