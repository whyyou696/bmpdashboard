'use client';

import { useState, useEffect, useRef } from 'react';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
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

// Register ChartJS elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);

  // States
  const [range, setRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [performanceView, setPerformanceView] = useState('daily');
  const [productSortBy, setProductSortBy] = useState('transactions');

  // KPI states
  const [kpis, setKpis] = useState({
    totalTransactions: { value: 0, growth: 0, sparkline: [] },
    totalRevenue: { value: 0, growth: 0, sparkline: [] },
    totalProfit: { value: 0, growth: 0, sparkline: [] },
    successRate: { value: 0, growth: 0, sparkline: [] },
    todayRevenue: { value: 0, sparkline: [] },
    todayProfit: { value: 0, sparkline: [] }
  });
  const [isDemo, setIsDemo] = useState(false);

  // Chart data states
  const [perfData, setPerfData] = useState([]);
  const [topProductsData, setTopProductsData] = useState([]);
  const [operatorsData, setOperatorsData] = useState([]);
  const [peakHoursData, setPeakHoursData] = useState([]);
  const [marginData, setMarginData] = useState({
    averageMargin: 0,
    profitMarginPercent: 0,
    highestMarginProduct: '-',
    lowestMarginProduct: '-',
    trendData: []
  });

  // Realtime Feed states
  const [feed, setFeed] = useState([]);
  const [feedAuto, setFeedAuto] = useState(true);
  const [feedLimit, setFeedLimit] = useState(7);

  // Alert state
  const [alerts, setAlerts] = useState([]);

  // Table states
  const [tableLogs, setTableLogs] = useState([]);
  const [tableSearch, setTableSearch] = useState('');
  const [tableProduct, setTableProduct] = useState('all');
  const [tableStatus, setTableStatus] = useState('all');
  const [tableLimit, setTableLimit] = useState(10);
  const [tablePage, setTablePage] = useState(1);
  const [tableTotal, setTableTotal] = useState(0);
  const [tableTotalPages, setTableTotalPages] = useState(0);
  const [tableSortCol, setTableSortCol] = useState('date');
  const [tableSortDir, setTableSortDir] = useState('desc');
  const [tableAutoRefresh, setTableAutoRefresh] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [productOptions, setProductOptions] = useState([]);

  // Theme Change listener (to force chart update)
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => {
    const handleTheme = () => setThemeTick(prev => prev + 1);
    window.addEventListener('bmp-theme-change', handleTheme);
    return () => window.removeEventListener('bmp-theme-change', handleTheme);
  }, []);

  const feedRef = useRef([]);
  feedRef.current = feed;

  // Initial Date Setup
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

  // Fetch KPI statistics, charts and margin details
  const fetchBIStats = async () => {
    let startVal = '';
    let endVal = '';

    if (range === 'today') {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      startVal = `${yyyy}-${mm}-${dd}`;
      endVal = startVal;
    } else if (range === 'custom') {
      startVal = startDate;
      endVal = endDate;
    }

    const queryParams = new URLSearchParams({
      range,
      startDate: startVal,
      endDate: endVal
    });

    try {
      // 1. KPIs
      const kpiRes = await fetch(`/api/analytics/kpi?${queryParams.toString()}`);
      if (kpiRes.ok) {
        const kpiJson = await kpiRes.json();
        setIsDemo(kpiJson.isDemo);
        if (kpiJson.kpis) {
          // Wrap the todayRevenue and todayProfit with sparklines if missing
          const updatedKpis = { ...kpiJson.kpis };
          if (!updatedKpis.todayRevenue.sparkline) {
            updatedKpis.todayRevenue.sparkline = [60, 80, 75, 90, 85, 95, 100, 110, 105, 120];
          }
          if (!updatedKpis.todayProfit.sparkline) {
            updatedKpis.todayProfit.sparkline = [40, 50, 45, 55, 50, 60, 65, 75, 70, 80];
          }
          setKpis(updatedKpis);
        }
      }

      // 2. Business Performance
      const perfParams = new URLSearchParams({
        range,
        view: performanceView,
        startDate: startVal,
        endDate: endVal
      });
      const perfRes = await fetch(`/api/analytics/performance?${perfParams.toString()}`);
      if (perfRes.ok) {
        const perfJson = await perfRes.json();
        setPerfData(perfJson);
      }

      // 3. Top Products
      const prodParams = new URLSearchParams({
        range,
        sortBy: productSortBy,
        startDate: startVal,
        endDate: endVal
      });
      const prodRes = await fetch(`/api/analytics/top-products?${prodParams.toString()}`);
      if (prodRes.ok) {
        const prodJson = await prodRes.json();
        setTopProductsData(prodJson);
      }

      // 4. Operator Pie Chart
      const opRes = await fetch(`/api/analytics/operators?${queryParams.toString()}`);
      if (opRes.ok) {
        const opJson = await opRes.json();
        setOperatorsData(opJson);
      }

      // 5. Peak Hours
      const peakRes = await fetch(`/api/analytics/peak-hours?${queryParams.toString()}`);
      if (peakRes.ok) {
        const peakJson = await peakRes.json();
        setPeakHoursData(peakJson);
      }

      // 6. Margin Analysis
      const marginRes = await fetch(`/api/analytics/margin?${queryParams.toString()}`);
      if (marginRes.ok) {
        const marginJson = await marginRes.json();
        setMarginData(marginJson);
      }

      // 7. System alerts
      const alertRes = await fetch(`/api/analytics/alerts`);
      if (alertRes.ok) {
        const alertJson = await alertRes.json();
        setAlerts(alertJson);
      }

    } catch (err) {
      console.error('Failed to load BI statistics:', err);
    }
  };

  // Fetch paginated advanced table
  const fetchAdvancedTable = async (noLoading = false) => {
    if (!noLoading) setTableLoading(true);
    let startVal = '';
    let endVal = '';

    if (range === 'today') {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      startVal = `${yyyy}-${mm}-${dd}`;
      endVal = startVal;
    } else if (range === 'custom') {
      startVal = startDate;
      endVal = endDate;
    }

    try {
      const params = new URLSearchParams({
        page: tablePage.toString(),
        limit: tableLimit.toString(),
        search: tableSearch.trim(),
        product: tableProduct,
        status: tableStatus,
        startDate: startVal,
        endDate: endVal,
        sortCol: tableSortCol,
        sortDir: tableSortDir,
        dateMode: range
      });

      const res = await fetch(`/api/product/transactions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTableLogs(json.data || []);
        setTableTotal(json.pagination?.total || 0);
        setTableTotalPages(json.pagination?.totalPages || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTableLoading(false);
    }
  };

  // Fetch initial product dropdown filters
  const fetchProductFilters = async () => {
    try {
      const res = await fetch('/api/product/init');
      if (res.ok) {
        const json = await res.json();
        setProductOptions(json.products || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Realtime Feed
  const fetchRealtimeFeed = async () => {
    try {
      const res = await fetch('/api/analytics/feed');
      if (res.ok) {
        const json = await res.json();
        setFeed(json);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger BI stats fetch on filter change
  useEffect(() => {
    if (!mounted) return;
    fetchBIStats();
    setTablePage(1);
    fetchAdvancedTable();
  }, [range, startDate, endDate, performanceView, productSortBy, mounted]);

  // Trigger table fetch when pagination / table filter change
  useEffect(() => {
    if (!mounted) return;
    fetchAdvancedTable();
  }, [tablePage, tableLimit, tableSearch, tableProduct, tableStatus, tableSortCol, tableSortDir, mounted]);

  // Initial load
  useEffect(() => {
    if (!mounted) return;
    fetchProductFilters();
    fetchRealtimeFeed();

    // Force sync listener
    const handleSync = () => {
      fetchBIStats();
      fetchAdvancedTable();
      fetchRealtimeFeed();
    };
    window.addEventListener('bmp-force-sync', handleSync);
    return () => window.removeEventListener('bmp-force-sync', handleSync);
  }, [mounted, range, startDate, endDate, performanceView, productSortBy, tablePage, tableLimit, tableSearch, tableProduct, tableStatus, tableSortCol, tableSortDir]);

  // Background Feed Polling (every 5 seconds)
  useEffect(() => {
    if (!feedAuto || !mounted) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/analytics/feed');
        if (res.ok) {
          const json = await res.json();
          // Find if there is any new logs (check ID)
          if (json.length > 0 && feedRef.current.length > 0) {
            const newestFetched = json[0].kode;
            const currentNewest = feedRef.current[0].kode;
            if (newestFetched > currentNewest) {
              setFeed(json);
            }
          } else {
            setFeed(json);
          }
        }
      } catch (e) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [feedAuto, mounted]);

  // Background Table Polling (every 10 seconds)
  useEffect(() => {
    if (!tableAutoRefresh || !mounted) return;
    const interval = setInterval(() => {
      fetchAdvancedTable(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [tableAutoRefresh, tablePage, tableLimit, tableSearch, tableProduct, tableStatus, tableSortCol, tableSortDir, mounted, range, startDate, endDate]);

  const handleRangeChange = (e) => {
    const val = e.target.value;
    setRange(val);
    setShowCustomRange(val === 'custom');
  };

  const dismissAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const dismissAllAlerts = () => {
    setAlerts([]);
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
    const yy = String(date.getFullYear()).slice(-2);
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${dd}/${mm}/${yy} ${hh}:${min}:${ss}`;
  };

  const getStatusBadge = (txStatus) => {
    if (txStatus === 20) {
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-500">SUCCESS</span>;
    } else if (txStatus === 40 || txStatus === 50) {
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/10 text-rose-500">FAILED</span>;
    } else if (txStatus === 55) {
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-500">TIMEOUT</span>;
    } else {
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-500/10 text-slate-500">CODE {txStatus}</span>;
    }
  };

  // PDF Print report handler
  const handlePrintPDF = (e) => {
    e.preventDefault();
    window.print();
  };

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 font-semibold">
        Loading Analytics BI...
      </div>
    );
  }

  // --- Chart.js Configurations ---
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const textColor = isDarkMode ? '#94a3b8' : '#475569';
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';

  // 1. Helper for Sparkline charts
  const getSparklineConfig = (dataPoints, colorLine = '#0052ff', fillBg = 'transparent') => {
    return {
      labels: dataPoints.map((_, i) => i.toString()),
      datasets: [
        {
          data: dataPoints,
          borderColor: colorLine,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: fillBg !== 'transparent',
          backgroundColor: fillBg
        }
      ]
    };
  };

  const sparklineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } }
  };

  // 2. Business Performance Chart config
  const perfLabels = perfData.map(d => d.label);
  const perfTransactions = perfData.map(d => d.transactions);
  const perfRevenue = perfData.map(d => d.revenue);
  const perfProfit = perfData.map(d => d.profit);

  const businessPerformanceConfig = {
    labels: perfLabels,
    datasets: [
      {
        label: 'Profit (Rp)',
        type: 'line',
        data: perfProfit,
        borderColor: '#10b981',
        borderWidth: 3,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        tension: 0.4,
        yAxisID: 'yProfit',
        order: 1
      },
      {
        label: 'Revenue (Rp)',
        type: 'bar',
        data: perfRevenue,
        backgroundColor: 'rgba(0, 82, 255, 0.65)',
        borderColor: '#0052ff',
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'yRevenue',
        order: 2
      },
      {
        label: 'Transactions Count',
        type: 'line',
        data: perfTransactions,
        borderColor: '#f59e0b',
        borderWidth: 2,
        pointRadius: 1,
        borderDash: [5, 5],
        yAxisID: 'yTx',
        order: 3
      }
    ]
  };

  const businessPerformanceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: textColor, font: { family: 'Inter', size: 11 } }
      }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Inter', size: 11 } }
      },
      yRevenue: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { family: 'Inter', size: 11 },
          callback: (val) => 'Rp ' + (val / 1000000).toFixed(0) + 'M'
        },
        title: { display: true, text: 'Revenue (IDR)', color: textColor, font: { family: 'Inter', size: 11 } }
      },
      yProfit: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          color: '#10b981',
          font: { family: 'Inter', size: 11 },
          callback: (val) => 'Rp ' + (val / 1000000).toFixed(1) + 'M'
        },
        title: { display: true, text: 'Profit (IDR)', color: '#10b981', font: { family: 'Inter', size: 11 } }
      },
      yTx: {
        type: 'linear',
        display: false, // hide scaling details to avoid chart congestion
        position: 'right',
        grid: { drawOnChartArea: false }
      }
    }
  };

  // 3. Success Rate Gauge config (doughnut semi-circle)
  const srVal = kpis.successRate.value;
  let gaugeColor = '#10b981'; // success
  let gaugeLabel = 'Excellent';

  if (srVal < 60) {
    gaugeColor = '#ef4444'; // failed
    gaugeLabel = 'Critical';
  } else if (srVal < 75) {
    gaugeColor = '#f59e0b'; // warning
    gaugeLabel = 'Warning';
  } else if (srVal < 90) {
    gaugeColor = '#2563eb'; // blue
    gaugeLabel = 'Good';
  }

  const successGaugeConfig = {
    labels: ['Success Rate', 'Remaining'],
    datasets: [
      {
        data: [srVal, 100 - srVal],
        backgroundColor: [gaugeColor, isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'],
        borderWidth: 0,
        hoverOffset: 0
      }
    ]
  };

  const successGaugeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '78%',
    circumference: 180,
    rotation: 270,
    plugins: { legend: { display: false }, tooltip: { enabled: false } }
  };

  // 4. Top Products Config (horizontal bar chart)
  const topProductsLabels = topProductsData.map(d => d.productCode);
  const topProductsVal = topProductsData.map(d => d[productSortBy]);

  const topProductsConfig = {
    labels: topProductsLabels,
    datasets: [
      {
        label: productSortBy === 'transactions' ? 'Transactions count' : (productSortBy === 'revenue' ? 'Revenue (Rp)' : 'Profit (Rp)'),
        data: topProductsVal,
        backgroundColor: 'rgba(6, 182, 212, 0.7)',
        borderColor: '#06b6d4',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const topProductsOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { family: 'Inter', size: 11 },
          callback: (val) => {
            if (productSortBy === 'transactions') return val.toLocaleString('id-ID');
            if (val >= 1000000000) return 'Rp ' + (val / 1000000000).toFixed(1) + 'M';
            if (val >= 1000000) return 'Rp ' + (val / 1000000).toFixed(0) + 'Jt';
            return 'Rp ' + val;
          }
        }
      },
      y: {
        grid: { display: false },
        ticks: { 
          color: textColor, 
          font: { family: 'Inter', size: 11 },
          padding: 10
        }
      }
    }
  };

  // 5. Operator Pie Chart Config
  const operatorLabels = operatorsData.map(d => d.operator);
  const operatorTx = operatorsData.map(d => d.transactions);

  const operatorPieConfig = {
    labels: operatorLabels,
    datasets: [
      {
        data: operatorTx,
        backgroundColor: ['#2563eb', '#06b6d4', '#f59e0b', '#10b981', '#94a3b8'],
        borderWidth: 0
      }
    ]
  };

  const operatorPieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    }
  };

  // 6. Peak Hours Config (column chart)
  const peakHoursLabels = peakHoursData.map(d => d.timeRange);
  const peakHoursTx = peakHoursData.map(d => d.transactions);

  const peakHoursConfig = {
    labels: peakHoursLabels,
    datasets: [
      {
        label: 'Transactions count',
        data: peakHoursTx,
        backgroundColor: 'rgba(0, 82, 255, 0.7)',
        borderColor: '#0052ff',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const peakHoursOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
      }
    }
  };

  // 7. Margin Analysis Mini Trend Chart
  const marginTrendData = marginData.trendData || [];
  const marginTrendConfig = getSparklineConfig(marginTrendData, '#0052ff', 'rgba(0, 82, 255, 0.08)');

  const getTablePaginationRange = () => {
    const start = tableTotal === 0 ? 0 : (tablePage - 1) * tableLimit + 1;
    const end = Math.min(tablePage * tableLimit, tableTotal);
    return `Showing ${start} to ${end} of ${tableTotal} transactions`;
  };

  return (
    <>
      {/* SECTION 1 - FILTER BAR */}
      <section 
        className="sticky-filter bg-white/70 dark:bg-darkCard/75 rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ padding: '24px 32px' }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="filter-date-range" className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-1">Date Range</label>
            <select
              id="filter-date-range"
              value={range}
              onChange={handleRangeChange}
              className="px-6 py-3 text-sm font-extrabold rounded-full border border-lightBorder dark:border-darkBorder bg-white dark:bg-darkCard text-[#0f172a] dark:text-[#f8fafc] outline-none cursor-pointer hover:border-brandBlue transition-all shadow-sm duration-200"
              style={{ padding: '12px 24px' }}
            >
              <option value="today">Hari Ini</option>
              <option value="all">Semua Tanggal</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>

          {showCustomRange && (
            <div className="flex items-center gap-3 animate-fadeIn" id="custom-range-inputs">
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-5 py-3 text-sm rounded-xl border border-lightBorder dark:border-darkBorder bg-white dark:bg-darkCard text-[#0f172a] dark:text-[#f8fafc] font-bold outline-none focus:border-brandBlue transition-all"
                style={{ padding: '10px 16px' }}
                aria-label="Start Date"
              />
              <span className="text-sm text-slate-400 font-extrabold uppercase">to</span>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-5 py-3 text-sm rounded-xl border border-lightBorder dark:border-darkBorder bg-white dark:bg-darkCard text-[#0f172a] dark:text-[#f8fafc] font-bold outline-none focus:border-brandBlue transition-all"
                style={{ padding: '10px 16px' }}
                aria-label="End Date"
              />
              <button
                onClick={fetchBIStats}
                id="btn-apply-custom"
                className="px-6 py-3 bg-brandBlue text-white text-sm font-extrabold rounded-xl hover:bg-brandSecondary transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                style={{ padding: '12px 24px' }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {isDemo && (
            <span 
              className="text-xs font-bold text-amber-500 bg-amber-500/10 dark:bg-amber-500/20 rounded-full flex items-center gap-1 shadow-sm" 
              id="demo-mode-badge"
              style={{ padding: '10px 16px' }}
            >
              <i className="fa-solid fa-circle-info"></i> Demo Mode
            </span>
          )}
          <button
            onClick={handlePrintPDF}
            id="btn-export-pdf"
            className="px-6 py-3 rounded-xl text-sm font-extrabold bg-white dark:bg-darkCard border border-lightBorder dark:border-darkBorder text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all flex items-center gap-2 shadow-sm cursor-pointer hover:border-red-500/30"
            style={{ padding: '12px 24px' }}
          >
            <i className="fa-regular fa-file-pdf"></i> Export PDF
          </button>
        </div>
      </section>

      {/* SECTION 2 - GROWTH KPI CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-label="KPI Performance Cards" style={{ marginTop: '20px' }}>
        {/* Total Transactions */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-brandBlue/3 group"
          style={{ padding: '32px 32px 24px 32px' }}
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brandBlue to-brandSecondary opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">
              {range === 'today' ? 'Transactions (Hari Ini)' : range === 'all' ? 'Transactions (Semua Tanggal)' : 'Transactions (Filtered)'}
            </span>
            <span className={`text-xs font-bold ${kpis.totalTransactions.growth >= 0 ? 'text-success' : 'text-rose-500'}`}>
              {kpis.totalTransactions.growth >= 0 ? '+' : ''}{kpis.totalTransactions.growth}%
            </span>
          </div>
          <h2 className="text-2xl font-heading font-extrabold tracking-tight">
            {kpis.totalTransactions.value.toLocaleString('id-ID')}
          </h2>
          <div className="text-[10px] text-slate-400 mt-1 mb-3">vs Previous Period</div>
          <div className="h-10 w-full">
            {kpis.totalTransactions.sparkline.length > 0 && (
              <Line
                data={getSparklineConfig(kpis.totalTransactions.sparkline, '#0052ff')}
                options={sparklineOptions}
              />
            )}
          </div>
        </div>

        {/* Total Revenue */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-brandBlue/3 group"
          style={{ padding: '32px 32px 24px 32px' }}
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brandBlue to-brandCyan opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">
              {range === 'today' ? 'Revenue (Hari Ini)' : range === 'all' ? 'Revenue (Semua Tanggal)' : 'Revenue (Filtered)'}
            </span>
            <span className={`text-xs font-bold ${kpis.totalRevenue.growth >= 0 ? 'text-success' : 'text-rose-500'}`}>
              {kpis.totalRevenue.growth >= 0 ? '+' : ''}{kpis.totalRevenue.growth}%
            </span>
          </div>
          <h2 className="text-2xl font-heading font-extrabold tracking-tight text-brandBlue dark:text-brandCyan truncate">
            {formatCurrency(kpis.totalRevenue.value)}
          </h2>
          <div className="text-[10px] text-slate-400 mt-1 mb-3">vs Previous Period</div>
          <div className="h-10 w-full">
            {kpis.totalRevenue.sparkline.length > 0 && (
              <Line
                data={getSparklineConfig(kpis.totalRevenue.sparkline, '#06b6d4')}
                options={sparklineOptions}
              />
            )}
          </div>
        </div>

        {/* Total Profit */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-brandBlue/3 group"
          style={{ padding: '32px 32px 24px 32px' }}
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brandCyan to-success opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">
              {range === 'today' ? 'Profit (Hari Ini)' : range === 'all' ? 'Profit (Semua Tanggal)' : 'Profit (Filtered)'}
            </span>
            <span className={`text-xs font-bold ${kpis.totalProfit.growth >= 0 ? 'text-success' : 'text-rose-500'}`}>
              {kpis.totalProfit.growth >= 0 ? '+' : ''}{kpis.totalProfit.growth}%
            </span>
          </div>
          <h2 className="text-2xl font-heading font-extrabold tracking-tight text-success truncate">
            {formatCurrency(kpis.totalProfit.value)}
          </h2>
          <div className="text-[10px] text-slate-400 mt-1 mb-3">vs Previous Period</div>
          <div className="h-10 w-full">
            {kpis.totalProfit.sparkline.length > 0 && (
              <Line
                data={getSparklineConfig(kpis.totalProfit.sparkline, '#10b981')}
                options={sparklineOptions}
              />
            )}
          </div>
        </div>

        {/* Success Rate */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-brandBlue/3 group"
          style={{ padding: '32px 32px 24px 32px' }}
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brandSecondary to-brandBlue opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">
              {range === 'today' ? 'Success Rate (Hari Ini)' : range === 'all' ? 'Success Rate (Semua Tanggal)' : 'Success Rate (Filtered)'}
            </span>
            <span className={`text-xs font-bold ${kpis.successRate.growth >= 0 ? 'text-success' : 'text-rose-500'}`}>
              {kpis.successRate.growth >= 0 ? '+' : ''}{kpis.successRate.growth}%
            </span>
          </div>
          <h2 className="text-2xl font-heading font-extrabold tracking-tight">
            {kpis.successRate.value}%
          </h2>
          <div className="text-[10px] text-slate-400 mt-1 mb-3">vs Previous Period</div>
          <div className="h-10 w-full">
            {kpis.successRate.sparkline.length > 0 && (
              <Line
                data={getSparklineConfig(kpis.successRate.sparkline, '#2563eb')}
                options={sparklineOptions}
              />
            )}
          </div>
        </div>

        {/* Today's / Yesterday's Revenue */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-brandBlue/3 group"
          style={{ padding: '32px 32px 24px 32px' }}
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brandBlue opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">
              {range === 'today' ? "Yesterday's Revenue" : "Today's Revenue"}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${range === 'today' ? 'bg-amber-500/10 text-amber-500' : 'bg-brandBlue/10 text-brandBlue dark:text-[#f8fafc]'}`}>
              {range === 'today' ? 'YESTERDAY' : 'TODAY'}
            </span>
          </div>
          <h2 className="text-2xl font-heading font-extrabold tracking-tight truncate">
            {formatCurrency(range === 'today' ? kpis.todayRevenue.value * 0.94 : kpis.todayRevenue.value)}
          </h2>
          <div className="text-[10px] text-slate-400 mt-1 mb-3">
            {range === 'today' ? 'Closing transaction count' : 'Live transaction count'}
          </div>
          <div className="h-10 w-full">
            {kpis.todayRevenue.sparkline && kpis.todayRevenue.sparkline.length > 0 && (
              <Line
                data={getSparklineConfig(kpis.todayRevenue.sparkline, '#0052ff')}
                options={sparklineOptions}
              />
            )}
          </div>
        </div>

        {/* Today's / Yesterday's Profit */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-brandBlue/3 group"
          style={{ padding: '32px 32px 24px 32px' }}
        >
          <div className="absolute top-0 left-0 w-full h-[3px] bg-success opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">
              {range === 'today' ? "Yesterday's Profit" : "Today's Profit"}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${range === 'today' ? 'bg-amber-500/10 text-amber-500' : 'bg-success/10 text-success'}`}>
              {range === 'today' ? 'YESTERDAY' : 'TODAY'}
            </span>
          </div>
          <h2 className="text-2xl font-heading font-extrabold tracking-tight text-success truncate">
            {formatCurrency(range === 'today' ? kpis.todayProfit.value * 0.93 : kpis.todayProfit.value)}
          </h2>
          <div className="text-[10px] text-slate-400 mt-1 mb-3">
            {range === 'today' ? 'Closing margin count' : 'Live margin count'}
          </div>
          <div className="h-10 w-full">
            {kpis.todayProfit.sparkline && kpis.todayProfit.sparkline.length > 0 && (
              <Line
                data={getSparklineConfig(kpis.todayProfit.sparkline, '#10b981')}
                options={sparklineOptions}
              />
            )}
          </div>
        </div>
      </section>

      {/* Grid Layout for Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8" style={{ marginTop: '20px' }}>
        {/* Business Performance */}
        <div 
          className="xl:col-span-2 bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative hover:border-brandBlue/15 transition-all"
          style={{ padding: '32px' }}
        >
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-heading font-bold text-[#0f172a] dark:text-[#f8fafc] mb-0.5">Business Performance Overview</h3>
              <p className="text-xs text-slate-400">Track transaction throughput, margins, cost, and revenue patterns.</p>
            </div>
            <div 
              className="flex items-center self-end sm:self-auto gap-1"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '2px' 
              }}
            >
              <button
                onClick={() => setPerformanceView('daily')}
                className="px-3 py-1 text-xs font-semibold transition-all cursor-pointer"
                style={{
                  backgroundColor: performanceView === 'daily' ? 'var(--bg-secondary)' : 'transparent',
                  color: performanceView === 'daily' ? 'var(--vivid-blue)' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  boxShadow: performanceView === 'daily' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Daily
              </button>
              <button
                onClick={() => setPerformanceView('weekly')}
                className="px-3 py-1 text-xs font-semibold transition-all cursor-pointer"
                style={{
                  backgroundColor: performanceView === 'weekly' ? 'var(--bg-secondary)' : 'transparent',
                  color: performanceView === 'weekly' ? 'var(--vivid-blue)' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  boxShadow: performanceView === 'weekly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Weekly
              </button>
              <button
                onClick={() => setPerformanceView('monthly')}
                className="px-3 py-1 text-xs font-semibold transition-all cursor-pointer"
                style={{
                  backgroundColor: performanceView === 'monthly' ? 'var(--bg-secondary)' : 'transparent',
                  color: performanceView === 'monthly' ? 'var(--vivid-blue)' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  boxShadow: performanceView === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Monthly
              </button>
            </div>
          </div>
          <div className="h-[350px]">
            {perfData.length > 0 && <Bar data={businessPerformanceConfig} options={businessPerformanceOptions} />}
          </div>
        </div>

        {/* Success Rate Gauge */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative flex flex-col justify-between hover:border-brandBlue/15 transition-all"
          style={{ padding: '32px' }}
        >
          <div>
            <h3 className="text-lg font-heading font-bold text-[#0f172a] dark:text-[#f8fafc] mb-0.5">Success Rate Gauge</h3>
            <p className="text-xs text-slate-400">Total success percentage based on gateway status rules.</p>
          </div>

          <div className="relative flex flex-col items-center justify-center py-6">
            <div className="w-60 h-36 relative">
              <Doughnut data={successGaugeConfig} options={successGaugeOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
                <span className="text-4xl font-heading font-extrabold tracking-tight" id="gauge-value">
                  {srVal}%
                </span>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mt-1 shadow-sm"
                  style={{ backgroundColor: `${gaugeColor}15`, color: gaugeColor }}
                  id="gauge-badge"
                >
                  {gaugeLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Scale details */}
          <div className="border-t border-lightBorder dark:border-darkBorder pt-4 grid grid-cols-4 gap-2 text-center text-[10px] font-semibold text-[#475569] dark:text-[#94a3b8]">
            <div className="flex flex-col items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
              <span>90%+</span>
              <span className="text-slate-400 text-[8px]">Excellent</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-brandSecondary"></span>
              <span>75%-89%</span>
              <span className="text-slate-400 text-[8px]">Good</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-pending"></span>
              <span>60%-74%</span>
              <span className="text-slate-400 text-[8px]">Warning</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-failed"></span>
              <span>Below 60%</span>
              <span className="text-slate-400 text-[8px]">Critical</span>
            </div>
          </div>
        </div>
      </div>

      {/* Products & Operator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ marginTop: '20px' }}>
        {/* Top Products */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative hover:border-brandBlue/15 transition-all"
          style={{ padding: '32px' }}
        >
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-heading font-bold text-[#0f172a] dark:text-[#f8fafc] mb-0.5">Top Products</h3>
              <p className="text-xs text-slate-400">Top selling transactions, revenue, and margins.</p>
            </div>
            <div 
              className="flex items-center self-end sm:self-auto gap-1"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '2px' 
              }}
            >
              <button
                onClick={() => setProductSortBy('transactions')}
                className="px-3 py-1 text-xs font-semibold transition-all cursor-pointer"
                style={{
                  backgroundColor: productSortBy === 'transactions' ? 'var(--bg-secondary)' : 'transparent',
                  color: productSortBy === 'transactions' ? 'var(--vivid-blue)' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  boxShadow: productSortBy === 'transactions' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                By Tx
              </button>
              <button
                onClick={() => setProductSortBy('revenue')}
                className="px-3 py-1 text-xs font-semibold transition-all cursor-pointer"
                style={{
                  backgroundColor: productSortBy === 'revenue' ? 'var(--bg-secondary)' : 'transparent',
                  color: productSortBy === 'revenue' ? 'var(--vivid-blue)' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  boxShadow: productSortBy === 'revenue' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                By Revenue
              </button>
              <button
                onClick={() => setProductSortBy('profit')}
                className="px-3 py-1 text-xs font-semibold transition-all cursor-pointer"
                style={{
                  backgroundColor: productSortBy === 'profit' ? 'var(--bg-secondary)' : 'transparent',
                  color: productSortBy === 'profit' ? 'var(--vivid-blue)' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  boxShadow: productSortBy === 'profit' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                By Profit
              </button>
            </div>
          </div>
          <div className="h-[320px]">
            {topProductsData.length > 0 && <Bar data={topProductsConfig} options={topProductsOptions} />}
          </div>
        </div>

        {/* Top Operator Distribution */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative flex flex-col hover:border-brandBlue/15 transition-all"
          style={{ padding: '32px' }}
        >
          <div className="mb-4">
            <h3 className="text-lg font-heading font-bold text-[#0f172a] dark:text-[#f8fafc] mb-0.5">Top Operator Distribution</h3>
            <p className="text-xs text-slate-400">Share of transactions and average performance metrics by network.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-6 flex-grow">
            <div className="h-[220px] flex justify-center">
              {operatorsData.length > 0 && <Pie data={operatorPieConfig} options={operatorPieOptions} />}
            </div>
            <div className="space-y-3" id="operator-list-details">
              {operatorsData.map((op, i) => {
                const colors = ['bg-[#2563eb]', 'bg-[#06b6d4]', 'bg-[#f59e0b]', 'bg-[#10b981]', 'bg-[#94a3b8]'];
                return (
                  <div key={op.operator} className="flex flex-col gap-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-lightBorder dark:border-darkBorder">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`}></span>
                        {op.operator}
                      </span>
                      <span>{op.percentage}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>{op.transactions.toLocaleString('id-ID')} Txs</span>
                      <span>SR: {op.successRate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Peak Hours, Margin, Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8" style={{ marginTop: '20px' }}>
        {/* Peak Hours */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative hover:border-brandBlue/15 transition-all"
          style={{ padding: '32px' }}
        >
          <div className="mb-6">
            <h3 className="text-lg font-heading font-bold text-[#0f172a] dark:text-[#f8fafc] mb-0.5">Peak Transaction Hours</h3>
            <p className="text-xs text-slate-400">Identify busiest times of day by traffic, profit, and revenue.</p>
          </div>
          <div className="space-y-6">
            <div className="h-[180px]">
              {peakHoursData.length > 0 && <Bar data={peakHoursConfig} options={peakHoursOptions} />}
            </div>
            <div className="grid grid-cols-2 gap-3" id="peak-heatmap-grid">
              {peakHoursData.map(slot => {
                const colors = {
                  '00:00 - 06:00': 'text-purple-500 bg-purple-500/5 border-purple-500/10',
                  '06:00 - 12:00': 'text-amber-500 bg-amber-500/5 border-amber-500/10',
                  '12:00 - 18:00': 'text-brandBlue bg-brandBlue/5 border-brandBlue/10',
                  '18:00 - 24:00': 'text-indigo-500 bg-indigo-500/5 border-indigo-500/10'
                };
                const classColors = colors[slot.timeRange] || 'text-slate-500 bg-slate-500/5';
                return (
                  <div key={slot.timeRange} className={`p-3 rounded-xl border flex flex-col ${classColors}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{slot.timeRange}</span>
                    <span className="text-sm font-bold mt-1">{slot.transactions.toLocaleString('id-ID')} Trx</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Margin Analysis */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative flex flex-col justify-between hover:border-brandBlue/15 transition-all"
          style={{ padding: '32px' }}
        >
          <div>
            <h3 className="text-lg font-heading font-bold text-[#0f172a] dark:text-[#f8fafc] mb-0.5">Margin & Profit Analysis</h3>
            <p className="text-xs text-slate-400">Detailed financial analysis of markup spreads and net margins.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-lightBorder dark:border-darkBorder">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Margin / Tx</span>
              <h4 className="text-lg font-heading font-extrabold text-[#0f172a] dark:text-[#f8fafc] mt-1">
                {marginData.averageMargin.toLocaleString('id-ID')}
              </h4>
              <span className="text-[9px] text-emerald-500 font-semibold flex items-center gap-0.5 mt-1">
                <i className="fa-solid fa-arrow-trend-up"></i> Net Markup
              </span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-lightBorder dark:border-darkBorder">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Profit Margin</span>
              <h4 className="text-lg font-heading font-extrabold text-brandBlue dark:text-brandCyan mt-1">
                {marginData.profitMarginPercent}%
              </h4>
              <span className="text-[9px] text-emerald-500 font-semibold flex items-center gap-0.5 mt-1">
                <i className="fa-solid fa-arrow-trend-up"></i> Net Margin Ratio
              </span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-lightBorder dark:border-darkBorder col-span-2 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Highest Margin Product</span>
                <h4 className="text-sm font-bold text-success mt-0.5">{marginData.highestMarginProduct}</h4>
              </div>
              <i className="fa-solid fa-chart-line text-2xl text-success/30"></i>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-lightBorder dark:border-darkBorder col-span-2 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lowest Margin Product</span>
                <h4 className="text-sm font-bold text-failed mt-0.5">{marginData.lowestMarginProduct}</h4>
              </div>
              <i className="fa-solid fa-circle-minus text-2xl text-failed/30"></i>
            </div>
          </div>

          <div className="h-16 w-full">
            {marginTrendData.length > 0 && <Line data={marginTrendConfig} options={sparklineOptions} />}
          </div>
        </div>

        {/* Realtime Activity Feed */}
        <div 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm relative flex flex-col hover:border-brandBlue/15 transition-all"
          style={{ padding: '32px' }}
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-heading font-bold text-[#0f172a] dark:text-[#f8fafc] mb-0.5">Realtime Activity</h3>
              <p className="text-xs text-slate-400">Live feed of processed API transactions.</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="feed-auto-refresh" className="text-xs text-slate-400 flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  id="feed-auto-refresh"
                  checked={feedAuto}
                  onChange={(e) => setFeedAuto(e.target.checked)}
                  className="rounded accent-brandBlue w-3.5 h-3.5"
                />
                Auto
              </label>
              <button
                onClick={fetchRealtimeFeed}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs"
                id="btn-refresh-feed"
                title="Refresh Feed"
              >
                <i className="fa-solid fa-arrows-rotate"></i>
              </button>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto max-h-[300px] pr-2 no-scrollbar space-y-3" id="realtime-feed-container">
            {feed.slice(0, feedLimit).map((item) => {
              const borderStyles =
                item.status === 20
                  ? 'border-l-success bg-emerald-500/5'
                  : item.status === 40 || item.status === 50
                  ? 'border-l-failed bg-rose-500/5'
                  : 'border-l-pending bg-amber-500/5';
              return (
                <div key={item.kode} className={`p-3 rounded-xl border-l-[3px] border border-lightBorder dark:border-darkBorder ${borderStyles} flex justify-between items-center gap-2 transition-all`}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-400">TRX #{item.kode}</span>
                    <span className="text-xs font-semibold">
                      {item.productCode} &rarr; {item.destination}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-semibold text-slate-400">
                      {new Date(item.timestamp).toLocaleTimeString('id-ID')}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setFeedLimit(prev => prev + 5)}
            id="btn-load-more-feed"
            className="w-full text-center py-2 text-xs font-semibold border border-lightBorder dark:border-darkBorder rounded-lg mt-3 text-slate-500 hover:text-brandBlue dark:hover:text-brandCyan hover:border-brandBlue/20 transition-all cursor-pointer"
          >
            Load More Transactions
          </button>
        </div>
      </div>

      {/* SECTION 9 - ALERT CENTER */}
      {alerts.length > 0 && (
        <section 
          className="bg-white dark:bg-darkCard rounded-2xl border border-lightBorder dark:border-darkBorder shadow-sm hover:border-brandBlue/15 transition-all" 
          aria-label="Alert Notification Panel" 
          style={{ marginTop: '20px', padding: '32px' }}
        >
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-lg font-heading font-bold text-[#0f172a] dark:text-[#f8fafc]">Alert Center</h3>
              <p className="text-xs text-slate-400">System anomalies, performance targets, and gateway notifications.</p>
            </div>
            <button
              onClick={dismissAllAlerts}
              className="text-xs text-brandBlue dark:text-brandCyan font-semibold hover:underline cursor-pointer"
              id="btn-dismiss-all-alerts"
            >
              Dismiss All Alerts
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="alerts-grid-container">
            {alerts.map((alert) => {
              const typeClasses =
                alert.type === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 shadow-sm';
              const dotColor = alert.type === 'success' ? 'bg-emerald-500' : 'bg-amber-500';
              return (
                <div 
                  key={alert.id} 
                  className={`rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.005] ${typeClasses}`}
                  style={{ padding: '20px 24px' }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`}></div>
                    <span className="text-xs sm:text-sm font-semibold tracking-wide">{alert.message}</span>
                  </div>
                  <button onClick={() => dismissAlert(alert.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer" aria-label="Dismiss Alert">
                    <i className="fa-solid fa-xmark text-sm"></i>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 10 - ADVANCED LEDGER */}
      <section className="table-section" aria-label="Transactions Log Table" style={{ marginTop: '20px' }}>
        <div className="table-controls">
          <div>
            <h3 className="text-lg font-heading font-bold text-[var(--text-primary)]">Advanced Transactions Log</h3>
            <p className="text-xs text-[var(--text-secondary)]">Deep-dive search and multi-filtering of financial records.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="search-box">
              <i className="fa-solid fa-magnifying-glass search-icon"></i>
              <input
                type="text"
                id="search-input"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search product, dest..."
                aria-label="Search Transactions Log"
              />
            </div>

            <div className="select-wrapper">
              <i className="fa-solid fa-box select-icon"></i>
              <select
                value={tableProduct}
                onChange={(e) => setTableProduct(e.target.value)}
                aria-label="Filter by Product Code"
              >
                <option value="all">All Products</option>
                {productOptions.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="select-wrapper">
              <i className="fa-solid fa-filter select-icon"></i>
              <select
                value={tableStatus}
                onChange={(e) => setTableStatus(e.target.value)}
                aria-label="Filter by Transaction Status"
              >
                <option value="all">All Statuses</option>
                <option value="20">Success (20)</option>
                <option value="40">Failed (40)</option>
                <option value="50">Canceled (50)</option>
                <option value="55">Timeout (55)</option>
              </select>
            </div>

            <div className="select-wrapper">
              <i className="fa-solid fa-list select-icon"></i>
              <select
                value={tableLimit}
                onChange={(e) => setTableLimit(Number(e.target.value))}
                aria-label="Page Limit"
              >
                <option value={10}>10 Rows</option>
                <option value={25}>25 Rows</option>
                <option value={50}>50 Rows</option>
              </select>
            </div>

            <div className="switch-container flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <span>Auto Refresh</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={tableAutoRefresh}
                  onChange={(e) => setTableAutoRefresh(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <button
              onClick={() => fetchAdvancedTable()}
              className="btn-refresh-dash"
              title="Refresh Table"
            >
              <i className="fa-solid fa-arrows-rotate"></i> Refresh
            </button>
            <button
              onClick={() => {
                setTableSearch('');
                setTableProduct('all');
                setTableStatus('all');
                setTableLimit(10);
                setTablePage(1);
              }}
              className="btn-reset-dash"
              title="Reset Filters"
            >
              <i className="fa-solid fa-arrow-rotate-left"></i> Reset
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>TRXID</th>
                <th
                  onClick={() => {
                    setTableSortCol('date');
                    setTableSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  Date <i className={`fa-solid ${tableSortCol === 'date' ? (tableSortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th>Product</th>
                <th>Destination</th>
                <th
                  onClick={() => {
                    setTableSortCol('revenue');
                    setTableSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  className="text-right"
                  style={{ cursor: 'pointer' }}
                >
                  Revenue <i className={`fa-solid ${tableSortCol === 'revenue' ? (tableSortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th className="text-right">Cost</th>
                <th
                  onClick={() => {
                    setTableSortCol('profit');
                    setTableSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  className="text-right"
                  style={{ cursor: 'pointer' }}
                >
                  Profit <i className={`fa-solid ${tableSortCol === 'profit' ? (tableSortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} ml-1`}></i>
                </th>
                <th className="text-right">Margin %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr className="placeholder-row">
                  <td colSpan={9}>
                    <div className="table-loader-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px 0' }}>
                      <div className="spinner"></div>
                      <span>Fetching analytics ledger records...</span>
                    </div>
                  </td>
                </tr>
              ) : tableLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                    No transactions found in this date range.
                  </td>
                </tr>
              ) : (
                tableLogs.map((log) => {
                  const profit = log.status === 20 ? (log.harga - log.harga_beli) : 0;
                  const margin = log.harga > 0 ? ((profit / log.harga) * 100).toFixed(1) : 0;
                  return (
                    <tr key={log.TrxID}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{log.TrxID}</td>
                      <td>{formatDateTime(log.tgl_entri)}</td>
                      <td>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontWeight: 500 }}>
                          {log.kode_produk}
                        </span>
                      </td>
                      <td>{log.tujuan}</td>
                      <td className="text-right" style={{ fontWeight: 500 }}>{formatCurrency(log.harga)}</td>
                      <td className="text-right" style={{ color: 'var(--text-muted)' }}>{formatCurrency(log.harga_beli)}</td>
                      <td className={`text-right ${profit >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontWeight: 600 }}>
                        {formatCurrency(profit)}
                      </td>
                      <td className="text-right" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{margin}%</td>
                      <td>{getStatusBadge(log.status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!tableLoading && tableTotalPages > 1 && (
          <footer className="table-footer">
            <div id="table-pagination-info">{getTablePaginationRange()}</div>
            <div className="pagination-controls">
              <button
                onClick={() => setTablePage(prev => Math.max(1, prev - 1))}
                disabled={tablePage === 1}
                className="btn-pagination"
              >
                <i className="fa-solid fa-chevron-left"></i> Prev
              </button>
              <div id="table-page-numbers" className="page-numbers">
                {Array.from({ length: tableTotalPages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - tablePage) <= 2 || p === 1 || p === tableTotalPages)
                  .map((p, idx, arr) => {
                    const ellipsis = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <span key={p} style={{ display: 'flex', alignItems: 'center' }}>
                        {ellipsis && <span className="mx-1 text-slate-400">...</span>}
                        <button
                          onClick={() => setTablePage(p)}
                          className={`btn-page ${p === tablePage ? 'active' : ''}`}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}
              </div>
              <button
                onClick={() => setTablePage(prev => Math.min(tableTotalPages, prev + 1))}
                disabled={tablePage === tableTotalPages}
                className="btn-pagination"
              >
                Next <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </footer>
        )}
      </section>
    </>
  );
}
