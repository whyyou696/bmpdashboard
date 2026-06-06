// Global State
let currentRange = '30days';
let customStartDate = '';
let customEndDate = '';
let performanceView = 'daily'; // daily, weekly, monthly
let productSortBy = 'transactions'; // transactions, revenue, profit
let feedPage = 1;
let feedAutoRefreshInterval = null;
let activeAlerts = [];

// Table State
let tablePage = 1;
let tableLimit = 10;
let tableSearchQuery = '';
let tableStatusFilter = 'all';
let tableProductFilter = 'all';
let tableSortCol = 'date';
let tableSortDir = 'desc';
let fetchedTableData = [];

// Chart Instances
let chartInstances = {};

// API Base URL (same as dashboard)
const API_BASE_URL = (window.location.protocol === 'file:') ? 'http://localhost:3000' : '';

// DOM Elements
const appContainer = document.getElementById('app-container');
const currentTimeEl = document.getElementById('current-time');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const demoModeBadge = document.getElementById('demo-mode-badge');

// Filter DOM Elements
const filterDateRange = document.getElementById('filter-date-range');
const customRangeInputs = document.getElementById('custom-range-inputs');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const btnApplyCustom = document.getElementById('btn-apply-custom');

// Export Buttons
const btnExportExcel = document.getElementById('btn-export-excel');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnExportPdf = document.getElementById('btn-export-pdf');

// Auth Check & Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Check session login state
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        // Redirect to dashboard login
        window.location.href = 'dashboard';
        return;
    }
    
    // Show App Container
    appContainer.style.display = 'flex';

    // Theme initialization
    initTheme();
    
    // Clock widget
    updateTime();
    setInterval(updateTime, 1000);

    // Event Listeners
    initEventListeners();

    // Initial Data Fetch
    refreshAllData();

    // Start Live Feed polling
    startFeedPolling();
});

// Update Real-time Clock widget
function updateTime() {
    const now = new Date();
    currentTimeEl.textContent = now.toLocaleTimeString('id-ID') + ' | ' + now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Theme Handling
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const htmlEl = document.documentElement;
    
    if (savedTheme === 'dark') {
        htmlEl.classList.add('dark');
        htmlEl.classList.remove('light');
        if (themeToggleIcon) {
            themeToggleIcon.classList.remove('fa-moon');
            themeToggleIcon.classList.add('fa-sun');
        }
    } else {
        htmlEl.classList.remove('dark');
        htmlEl.classList.add('light');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = htmlEl.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            if (isDark) {
                htmlEl.classList.remove('light');
                themeToggleIcon.classList.remove('fa-moon');
                themeToggleIcon.classList.add('fa-sun');
            } else {
                htmlEl.classList.add('light');
                themeToggleIcon.classList.remove('fa-sun');
                themeToggleIcon.classList.add('fa-moon');
            }
            // Redraw charts on theme change to update font colors
            redrawCharts();
        });
    }
}

// Event Listeners Wire-up
function initEventListeners() {
    // Quick Range Filters
    if (filterDateRange) {
        filterDateRange.addEventListener('change', (e) => {
            const range = e.target.value;
            currentRange = range;
            
            if (range === 'custom') {
                customRangeInputs.classList.remove('hidden');
                customRangeInputs.classList.add('flex');
            } else {
                customRangeInputs.classList.add('hidden');
                customRangeInputs.classList.remove('flex');
                refreshAllData();
            }
        });
    }

    // Apply Custom Date Range
    if (btnApplyCustom) {
        btnApplyCustom.addEventListener('click', () => {
            customStartDate = startDateInput.value;
            customEndDate = endDateInput.value;
            if (customStartDate && customEndDate) {
                refreshAllData();
            } else {
                alert('Please select both start and end dates.');
            }
        });
    }

    // Performance Chart View Toggle
    document.getElementById('btn-chart-daily').addEventListener('click', () => togglePerformanceView('daily'));
    document.getElementById('btn-chart-weekly').addEventListener('click', () => togglePerformanceView('weekly'));
    document.getElementById('btn-chart-monthly').addEventListener('click', () => togglePerformanceView('monthly'));

    // Top Products Sorting
    document.getElementById('btn-prod-tx').addEventListener('click', () => toggleProductSort('transactions'));
    document.getElementById('btn-prod-revenue').addEventListener('click', () => toggleProductSort('revenue'));
    document.getElementById('btn-prod-profit').addEventListener('click', () => toggleProductSort('profit'));

    // Realtime Activity manual refresh
    document.getElementById('btn-refresh-feed').addEventListener('click', () => {
        fetchFeedData();
    });

    // Auto refresh checkbox
    document.getElementById('feed-auto-refresh').addEventListener('change', (e) => {
        if (e.target.checked) {
            startFeedPolling();
        } else {
            stopFeedPolling();
        }
    });

    // Infinite Feed Scroll / Load more
    document.getElementById('btn-load-more-feed').addEventListener('click', () => {
        feedPage++;
        fetchFeedData(true);
    });

    // Dismiss All Alerts
    document.getElementById('btn-dismiss-all-alerts').addEventListener('click', () => {
        activeAlerts = [];
        renderAlerts();
    });

    // Table Controls
    document.getElementById('table-search').addEventListener('input', debounce(() => {
        tablePage = 1;
        fetchTableData();
    }, 400));

    document.getElementById('table-status-filter').addEventListener('change', () => {
        tablePage = 1;
        fetchTableData();
    });

    document.getElementById('table-product-filter').addEventListener('change', () => {
        tablePage = 1;
        fetchTableData();
    });

    document.getElementById('table-limit-filter').addEventListener('change', () => {
        tableLimit = parseInt(document.getElementById('table-limit-filter').value);
        tablePage = 1;
        fetchTableData();
    });

    // Sorting Click Handlers
    document.getElementById('th-date').addEventListener('click', () => toggleTableSort('date', 'th-date'));
    document.getElementById('th-revenue').addEventListener('click', () => toggleTableSort('revenue', 'th-revenue'));
    document.getElementById('th-profit').addEventListener('click', () => toggleTableSort('profit', 'th-profit'));

    // Pagination Click Handlers
    document.getElementById('btn-table-prev').addEventListener('click', () => {
        if (tablePage > 1) {
            tablePage--;
            fetchTableData();
        }
    });
    document.getElementById('btn-table-next').addEventListener('click', () => {
        tablePage++;
        fetchTableData();
    });

    // Global Force Sync Refresh Link
    document.getElementById('nav-refresh-analytics').addEventListener('click', (e) => {
        e.preventDefault();
        refreshAllData();
        fetchFeedData();
        fetchAlertsData();
    });

    // Export Buttons Click Events
    btnExportExcel?.addEventListener('click', () => triggerExport('excel'));
    btnExportCsv?.addEventListener('click', () => triggerExport('csv'));
    btnExportPdf?.addEventListener('click', () => window.print());
    document.getElementById('btn-table-export')?.addEventListener('click', () => triggerExport('excel'));

    // Logout
    document.getElementById('nav-logout').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('isLoggedIn');
        window.location.reload();
    });
}

// Refresh Page Data
function refreshAllData() {
    fetchKPIData();
    fetchPerformanceOverviewData();
    fetchTopProductsData();
    fetchOperatorData();
    fetchPeakHoursData();
    fetchMarginAnalysisData();
    fetchTableData();
    fetchFeedData();
    fetchAlertsData();
}

// Chart Helpers to maintain theme responsiveness
function getChartTextColor() {
    return document.documentElement.classList.contains('dark') ? '#94a3b8' : '#475569';
}

function getChartGridColor() {
    return document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
}

function destroyChart(name) {
    if (chartInstances[name]) {
        chartInstances[name].destroy();
        chartInstances[name] = null;
    }
}

// Redraw all active charts on theme toggle
function redrawCharts() {
    // We fetch again or redraw with current cache. Fetching is safer.
    fetchPerformanceOverviewData();
    fetchTopProductsData();
    fetchOperatorData();
    fetchPeakHoursData();
    fetchMarginAnalysisData();
}

// ==========================================
// DATA FETCHING & RENDERING
// ==========================================

// Helper for general query parameters
function getQueryString() {
    const params = new URLSearchParams({
        range: currentRange,
        startDate: customStartDate,
        endDate: customEndDate
    });
    return params.toString();
}

// Format numbers in IDR Currency
function formatCurrency(val) {
    if (val === null || val === undefined) return 'Rp 0';
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}

// Animate text counter
function animateCounter(element, target, isCurrency = false) {
    if (!element) return;
    let current = parseInt(element.textContent.replace(/[^\d-]/g, '')) || 0;
    const duration = 500;
    const stepTime = 15;
    const steps = duration / stepTime;
    const increment = (target - current) / steps;
    let step = 0;
    
    const timer = setInterval(() => {
        current += increment;
        step++;
        const fmt = (v) => {
            const formatted = Math.round(v).toLocaleString('id-ID');
            return isCurrency ? `Rp ${formatted}` : formatted;
        };
        if (step >= steps) {
            clearInterval(timer);
            element.textContent = fmt(target);
        } else {
            element.textContent = fmt(current);
        }
    }, stepTime);
}

// 1. Fetch KPI Cards Data
async function fetchKPIData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/kpi?${getQueryString()}`);
        const data = await response.json();
        
        if (data.isDemo) {
            demoModeBadge.classList.remove('hidden');
        } else {
            demoModeBadge.classList.add('hidden');
        }

        const kpis = data.kpis;
        
        // Populate KPI Counters
        animateCounter(document.getElementById('kpi-tx-val'), kpis.totalTransactions.value);
        animateCounter(document.getElementById('kpi-revenue-val'), kpis.totalRevenue.value, true);
        animateCounter(document.getElementById('kpi-profit-val'), kpis.totalProfit.value, true);
        
        const srEl = document.getElementById('kpi-sr-val');
        if (srEl) srEl.textContent = `${kpis.successRate.value}%`;
        
        animateCounter(document.getElementById('kpi-today-rev-val'), kpis.todayRevenue.value, true);
        animateCounter(document.getElementById('kpi-today-profit-val'), kpis.todayProfit.value, true);

        // Populate Growth Badges
        updateGrowthBadge('kpi-tx-growth', kpis.totalTransactions.growth);
        updateGrowthBadge('kpi-revenue-growth', kpis.totalRevenue.growth);
        updateGrowthBadge('kpi-profit-growth', kpis.totalProfit.growth);
        updateGrowthBadge('kpi-sr-growth', kpis.successRate.growth, '%');

        // Draw Sparklines
        drawSparkline('sparkline-tx', kpis.totalTransactions.sparkline, '#0052ff');
        drawSparkline('sparkline-revenue', kpis.totalRevenue.sparkline, '#06b6d4');
        drawSparkline('sparkline-profit', kpis.totalProfit.sparkline, '#10b981');
        drawSparkline('sparkline-sr', kpis.successRate.sparkline, '#818cf8');
        drawSparkline('sparkline-today-rev', generateSparklineData(10, kpis.todayRevenue.value / 10, kpis.todayRevenue.value / 40), '#3b82f6');
        drawSparkline('sparkline-today-profit', generateSparklineData(10, kpis.todayProfit.value / 10, kpis.todayProfit.value / 40), '#10b981');

        // Update success rate gauge value text
        const gaugeValueEl = document.getElementById('gauge-value');
        if (gaugeValueEl) gaugeValueEl.textContent = `${kpis.successRate.value}%`;
        drawSuccessGauge(kpis.successRate.value);

    } catch (error) {
        console.error("Failed to fetch KPIs:", error);
    }
}

// Help set green/red color code on KPI card growth tags
function updateGrowthBadge(id, growth, suffix = '%') {
    const el = document.getElementById(id);
    if (!el) return;
    
    const isPositive = growth >= 0;
    el.textContent = `${isPositive ? '+' : ''}${growth}${suffix}`;
    if (isPositive) {
        el.className = "text-xs font-bold text-success";
    } else {
        el.className = "text-xs font-bold text-failed";
    }
}

// Helper to draw mini sparklines inside grid cards
function drawSparkline(canvasId, points, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    destroyChart(canvasId);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, color + '22');
    gradient.addColorStop(1, color + '00');

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: points.map((_, i) => i),
            datasets: [{
                data: points,
                borderColor: color,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                backgroundColor: gradient,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

function generateSparklineData(length, base, variance) {
    const arr = [];
    for (let i = 0; i < length; i++) {
        arr.push(base + (Math.random() - 0.5) * variance);
    }
    return arr;
}

// 2. Fetch Business Performance Overview Data
async function fetchPerformanceOverviewData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/performance?${getQueryString()}&view=${performanceView}`);
        const data = await response.json();
        
        drawPerformanceChart(data);
    } catch (error) {
        console.error("Failed to fetch performance overview:", error);
    }
}

function togglePerformanceView(view) {
    performanceView = view;
    
    // Toggle active tab style
    ['daily', 'weekly', 'monthly'].forEach(v => {
        const el = document.getElementById(`btn-chart-${v}`);
        if (el) {
            if (v === view) {
                el.className = "px-3 py-1 text-xs font-semibold rounded bg-white dark:bg-darkCard shadow-sm text-brandBlue dark:text-brandCyan";
            } else {
                el.className = "px-3 py-1 text-xs font-semibold rounded text-slate-500 dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-[#f8fafc]";
            }
        }
    });
    
    fetchPerformanceOverviewData();
}

// Draw the large Multi-Series Performance line chart
function drawPerformanceChart(data) {
    const canvas = document.getElementById('business-performance-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    destroyChart('performance');

    const labels = data.map(item => {
        if (performanceView === 'daily') {
            try {
                const date = new Date(item.label);
                return isNaN(date.getTime()) ? item.label : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            } catch (e) { return item.label; }
        }
        return item.label;
    });

    const revenue = data.map(item => item.revenue);
    const cost = data.map(item => item.cost);
    const profit = data.map(item => item.profit);
    const transactions = data.map(item => item.transactions);

    const profitGradient = ctx.createLinearGradient(0, 0, 0, 300);
    profitGradient.addColorStop(0, '#10b98133');
    profitGradient.addColorStop(1, '#10b98100');

    chartInstances['performance'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Revenue (Rp)',
                    data: revenue,
                    borderColor: '#0052ff',
                    borderWidth: 2,
                    pointBackgroundColor: '#0052ff',
                    pointHoverRadius: 6,
                    tension: 0.35,
                    yAxisID: 'yFinance'
                },
                {
                    label: 'Cost (Rp)',
                    data: cost,
                    borderColor: '#818cf8',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointBackgroundColor: '#818cf8',
                    pointHoverRadius: 4,
                    tension: 0.35,
                    yAxisID: 'yFinance'
                },
                {
                    label: 'Profit (Rp)',
                    data: profit,
                    borderColor: '#10b981',
                    borderWidth: 3,
                    pointBackgroundColor: '#10b981',
                    pointHoverRadius: 7,
                    tension: 0.35,
                    fill: true,
                    backgroundColor: profitGradient,
                    yAxisID: 'yFinance'
                },
                {
                    label: 'Transactions',
                    data: transactions,
                    type: 'bar',
                    backgroundColor: 'rgba(6, 182, 212, 0.25)',
                    hoverBackgroundColor: 'rgba(6, 182, 212, 0.45)',
                    borderRadius: 4,
                    yAxisID: 'yCount',
                    order: 10
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: getChartTextColor(), font: { family: 'Inter', size: 11 } }
                },
                tooltip: {
                    padding: 12,
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleFont: { family: 'Outfit', size: 12 },
                    bodyFont: { family: 'Inter', size: 11 },
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.datasetIndex < 3) {
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
                    grid: { color: getChartGridColor() },
                    ticks: { color: getChartTextColor(), font: { size: 10 } }
                },
                yFinance: {
                    type: 'linear',
                    position: 'left',
                    grid: { color: getChartGridColor() },
                    ticks: {
                        color: getChartTextColor(),
                        font: { size: 10 },
                        callback: function(value) {
                            if (value >= 1000000000) return 'Rp ' + (value / 1000000000).toFixed(1) + 'B';
                            if (value >= 1000000) return 'Rp ' + (value / 1000000).toFixed(0) + 'M';
                            if (value >= 1000) return 'Rp ' + (value / 1000).toFixed(0) + 'K';
                            return 'Rp ' + value;
                        }
                    }
                },
                yCount: {
                    type: 'linear',
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: {
                        color: getChartTextColor(),
                        font: { size: 10 },
                        callback: function(value) { return value.toLocaleString('id-ID'); }
                    }
                }
            }
        }
    });
}

// 3. Draw Success Rate Gauge (using a doughnut config)
function drawSuccessGauge(value) {
    const canvas = document.getElementById('success-gauge');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    destroyChart('gauge');

    // Get color code matching rules
    let color = '#ef4444'; // Crit
    let statusText = 'Critical';
    let badgeClass = 'bg-failed/10 text-failed border border-failed/20';

    if (value >= 90) {
        color = '#10b981'; // Exc
        statusText = 'Excellent';
        badgeClass = 'bg-success/10 text-success border border-success/20';
    } else if (value >= 75) {
        color = '#2563eb'; // Good
        statusText = 'Good';
        badgeClass = 'bg-brandSecondary/10 text-brandSecondary border border-brandSecondary/20';
    } else if (value >= 60) {
        color = '#f59e0b'; // Warn
        statusText = 'Warning';
        badgeClass = 'bg-pending/10 text-pending border border-pending/20';
    }

    // Update gauge badge in UI
    const badge = document.getElementById('gauge-badge');
    if (badge) {
        badge.className = `text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mt-1 shadow-sm ${badgeClass}`;
        badge.textContent = statusText;
    }

    chartInstances['gauge'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [value, 100 - value],
                backgroundColor: [color, getChartGridColor()],
                borderWidth: 0,
                cutout: '80%'
            }]
        },
        options: {
            rotation: 270,
            circumference: 180,
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });
}

// 4. Top Selling Products
async function fetchTopProductsData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/top-products?${getQueryString()}&sortBy=${productSortBy}`);
        const data = await response.json();
        
        drawTopProductsChart(data);
    } catch (error) {
        console.error("Failed to fetch top products:", error);
    }
}

function toggleProductSort(sortBy) {
    productSortBy = sortBy;
    
    // Toggle active tab styles
    ['tx', 'revenue', 'profit'].forEach(s => {
        const el = document.getElementById(`btn-prod-${s}`);
        if (el) {
            const isMatch = (s === 'tx' && sortBy === 'transactions') || (s === sortBy);
            if (isMatch) {
                el.className = "px-3 py-1 text-xs font-semibold rounded bg-white dark:bg-darkCard shadow-sm text-brandBlue dark:text-brandCyan";
            } else {
                el.className = "px-3 py-1 text-xs font-semibold rounded text-slate-500 dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-[#f8fafc]";
            }
        }
    });
    
    fetchTopProductsData();
}

function drawTopProductsChart(data) {
    const canvas = document.getElementById('top-products-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    destroyChart('products');

    const labels = data.map(item => item.productCode);
    const values = data.map(item => {
        if (productSortBy === 'revenue') return item.revenue;
        if (productSortBy === 'profit') return item.profit;
        return item.transactions;
    });

    chartInstances['products'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: productSortBy.toUpperCase(),
                data: values,
                backgroundColor: 'rgba(0, 82, 255, 0.75)',
                hoverBackgroundColor: '#0052ff',
                borderRadius: 5,
                borderWidth: 0,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.parsed.x;
                            if (productSortBy === 'transactions') {
                                return ` Transactions: ${val.toLocaleString('id-ID')}`;
                            } else {
                                return ` Value: ${formatCurrency(val)}`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: getChartGridColor() },
                    ticks: {
                        color: getChartTextColor(),
                        font: { size: 9 },
                        callback: function(value) {
                            if (productSortBy === 'transactions') return value.toLocaleString('id-ID');
                            if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
                            if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
                            return value.toLocaleString('id-ID');
                        }
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: getChartTextColor(), font: { size: 10, weight: 'bold' } }
                }
            }
        }
    });
}

// 5. Top Destination / Operator Pie Chart
async function fetchOperatorData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/operators?${getQueryString()}`);
        const data = await response.json();
        
        drawOperatorChart(data);
        renderOperatorTableList(data);
    } catch (error) {
        console.error("Failed to fetch operators:", error);
    }
}

function drawOperatorChart(data) {
    const canvas = document.getElementById('operator-pie-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    destroyChart('operators');

    const labels = data.map(item => item.operator);
    const shares = data.map(item => item.percentage);

    chartInstances['operators'] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: shares,
                backgroundColor: [
                    '#ef4444', // Tsel (Red)
                    '#3b82f6', // XL (Blue)
                    '#eab308', // Indosat (Yellow)
                    '#a855f7', // Tri (Purple)
                    '#64748b'  // Others
                ],
                borderWidth: 2,
                borderColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // we list details on the right side list instead
                tooltip: {
                    callbacks: {
                        label: function(context) { return ` ${context.label}: ${context.parsed}%`; }
                    }
                }
            }
        }
    });
}

function renderOperatorTableList(data) {
    const container = document.getElementById('operator-list-details');
    if (!container) return;
    container.innerHTML = '';

    const colors = {
        'Telkomsel': 'bg-red-500',
        'XL Axiata': 'bg-blue-500',
        'XL': 'bg-blue-500',
        'Indosat': 'bg-yellow-500',
        'Tri': 'bg-purple-500',
        'Others': 'bg-slate-500'
    };

    data.forEach(item => {
        const colorClass = colors[item.operator] || 'bg-slate-400';
        
        const row = document.createElement('div');
        row.className = "flex justify-between items-center text-xs p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors";
        row.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full ${colorClass}"></span>
                <span class="font-semibold text-slate-800 dark:text-[#f8fafc]">${item.operator}</span>
                <span class="text-slate-400">(${item.percentage}%)</span>
            </div>
            <div class="text-right">
                <div class="font-bold">${item.transactions.toLocaleString('id-ID')} Txs</div>
                <div class="text-[10px] text-slate-400">SR: <span class="font-semibold ${item.successRate >= 80 ? 'text-success' : 'text-pending'}">${item.successRate}%</span></div>
            </div>
        `;
        container.appendChild(row);
    });
}

// 6. Peak Hours Analysis Heatmap & Chart
async function fetchPeakHoursData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/peak-hours?${getQueryString()}`);
        const data = await response.json();
        
        drawPeakHoursChart(data);
        renderPeakHeatmap(data);
    } catch (error) {
        console.error("Failed to fetch peak hours:", error);
    }
}

function drawPeakHoursChart(data) {
    const canvas = document.getElementById('peak-hours-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    destroyChart('peakhours');

    const labels = data.map(item => item.timeRange);
    const transactions = data.map(item => item.transactions);
    const profit = data.map(item => item.profit);

    chartInstances['peakhours'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Transactions',
                    data: transactions,
                    backgroundColor: 'rgba(37, 99, 235, 0.7)',
                    borderRadius: 4,
                    yAxisID: 'yTxs'
                },
                {
                    label: 'Profit (Rp)',
                    data: profit,
                    type: 'line',
                    borderColor: '#10b981',
                    borderWidth: 2,
                    pointBackgroundColor: '#10b981',
                    yAxisID: 'yProfit',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: getChartTextColor(), font: { size: 10 } } }
            },
            scales: {
                x: {
                    grid: { color: getChartGridColor() },
                    ticks: { color: getChartTextColor(), font: { size: 9 } }
                },
                yTxs: {
                    type: 'linear',
                    position: 'left',
                    grid: { color: getChartGridColor() },
                    ticks: {
                        color: getChartTextColor(),
                        font: { size: 9 },
                        callback: function(value) { return value.toLocaleString('id-ID'); }
                    }
                },
                yProfit: {
                    type: 'linear',
                    position: 'right',
                    grid: { display: false },
                    ticks: {
                        color: getChartTextColor(),
                        font: { size: 9 },
                        callback: function(value) {
                            if (value >= 1000000) return 'Rp ' + (value / 1000000).toFixed(0) + 'M';
                            if (value >= 1000) return 'Rp ' + (value / 1000).toFixed(0) + 'K';
                            return 'Rp ' + value;
                        }
                    }
                }
            }
        }
    });
}

function renderPeakHeatmap(data) {
    const container = document.getElementById('peak-heatmap-grid');
    if (!container) return;
    container.innerHTML = '';

    // Find busiest hour based on transaction counts
    const maxTx = Math.max(...data.map(d => d.transactions));

    data.forEach(item => {
        const isBusiest = item.transactions === maxTx;
        const bgStyle = isBusiest 
            ? 'bg-brandBlue/10 dark:bg-brandBlue/20 border-brandBlue/35 text-brandBlue dark:text-brandCyan font-semibold' 
            : 'bg-slate-50 dark:bg-slate-800/40 border-lightBorder dark:border-darkBorder';
            
        const card = document.createElement('div');
        card.className = `p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-300 ${bgStyle}`;
        card.innerHTML = `
            <div>
                <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">${item.timeRange}</span>
                <h4 class="text-sm font-extrabold mt-1">${item.transactions.toLocaleString('id-ID')} Txs</h4>
            </div>
            <div class="flex justify-between items-center text-[10px] text-slate-400 mt-2">
                <span>Profit: ${formatCurrency(item.profit)}</span>
                ${isBusiest ? '<span class="text-[8px] bg-brandBlue text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">BUSIEST</span>' : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

// 7. Margin & Profit Analysis
async function fetchMarginAnalysisData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/margin?${getQueryString()}`);
        const data = await response.json();
        
        // Counter Animation
        animateCounter(document.getElementById('margin-avg-val'), data.averageMargin);
        
        const pctEl = document.getElementById('margin-pct-val');
        if (pctEl) pctEl.textContent = `${data.profitMarginPercent}%`;

        const highEl = document.getElementById('margin-high-prod');
        if (highEl) highEl.textContent = data.highestMarginProduct;

        const lowEl = document.getElementById('margin-low-prod');
        if (lowEl) lowEl.textContent = data.lowestMarginProduct;

        // Draw Margin Trend Line chart
        drawSparkline('margin-trend-chart', data.trendData, '#2563eb');

    } catch (error) {
        console.error("Failed to fetch margin analysis:", error);
    }
}

// 8. Realtime Transactions Feed (Polling & Infinite scroll)
async function fetchFeedData(append = false) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/feed`);
        const data = await response.json();
        
        renderFeedList(data, append);
    } catch (error) {
        console.error("Failed to fetch transactions feed:", error);
    }
}

function renderFeedList(transactions, append = false) {
    const container = document.getElementById('realtime-feed-container');
    if (!container) return;

    if (!append) {
        container.innerHTML = '';
    }

    if (transactions.length === 0 && !append) {
        container.innerHTML = `<div class="text-slate-400 text-center py-8">No live transactions found.</div>`;
        return;
    }

    transactions.forEach(item => {
        // Form status indicator
        let statusBadge = '<span class="w-2 h-2 rounded-full bg-pending shadow-sm shadow-pending animate-pulse"></span>';
        let statusBg = 'bg-white dark:bg-darkCard';
        
        if (item.status === 20) {
            statusBadge = '<span class="w-2 h-2 rounded-full bg-success shadow-sm shadow-success"></span>';
        } else if (item.status === 40 || item.status === 50) {
            statusBadge = '<span class="w-2 h-2 rounded-full bg-failed shadow-sm shadow-failed"></span>';
        }

        const date = new Date(item.timestamp);
        const timeText = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const feedRow = document.createElement('div');
        feedRow.className = `flex items-center justify-between p-3.5 rounded-xl border border-lightBorder dark:border-darkBorder shadow-sm hover:scale-[1.01] hover:border-brandBlue/20 transition-all ${statusBg}`;
        feedRow.innerHTML = `
            <div class="flex items-center gap-3">
                ${statusBadge}
                <div>
                    <div class="font-bold text-slate-800 dark:text-[#f8fafc] text-xs">${item.productCode} (${item.destination})</div>
                    <div class="text-[10px] text-slate-400">TRXID: ${item.kode || item.id}</div>
                </div>
            </div>
            <div class="text-right text-xs font-semibold text-slate-400">
                ${timeText}
            </div>
        `;
        container.appendChild(feedRow);
    });
}

function startFeedPolling() {
    stopFeedPolling();
    fetchFeedData();
    feedAutoRefreshInterval = setInterval(() => {
        fetchFeedData();
    }, 5000);
}

function stopFeedPolling() {
    if (feedAutoRefreshInterval) {
        clearInterval(feedAutoRefreshInterval);
        feedAutoRefreshInterval = null;
    }
}

// 9. Alert Center
async function fetchAlertsData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/alerts`);
        const data = await response.json();
        activeAlerts = data;
        renderAlerts();
    } catch (error) {
        console.error("Failed to fetch alerts:", error);
    }
}

function renderAlerts() {
    const container = document.getElementById('alerts-grid-container');
    if (!container) return;
    container.innerHTML = '';

    if (activeAlerts.length === 0) {
        container.innerHTML = `
            <div class="col-span-full p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-sm"></i> No alerts. All systems running optimally!
            </div>
        `;
        return;
    }

    activeAlerts.forEach(alert => {
        let alertBg = 'bg-amber-50 dark:bg-amber-950/20 border-amber-500/20 text-amber-600 dark:text-amber-400';
        let alertIcon = '<i class="fa-solid fa-circle-exclamation text-amber-500"></i>';
        
        if (alert.type === 'success') {
            alertBg = 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
            alertIcon = '<i class="fa-solid fa-circle-check text-emerald-500"></i>';
        }

        const alertCard = document.createElement('div');
        alertCard.className = `p-4 rounded-xl border flex justify-between items-start gap-4 transition-all duration-300 ${alertBg}`;
        alertCard.innerHTML = `
            <div class="flex items-start gap-3 text-xs">
                <div class="mt-0.5">${alertIcon}</div>
                <div>
                    <span class="font-bold block">${alert.type === 'warning' ? 'Warning' : 'Success'}</span>
                    <p class="text-[11px] mt-0.5">${alert.message}</p>
                </div>
            </div>
            <button class="text-[10px] font-bold opacity-60 hover:opacity-100 hover:underline uppercase tracking-wider" onclick="dismissAlert('${alert.id}')">Dismiss</button>
        `;
        container.appendChild(alertCard);
    });
}

// Global hook to dismiss single alerts
window.dismissAlert = function(alertId) {
    activeAlerts = activeAlerts.filter(a => a.id !== alertId);
    renderAlerts();
};

// 10. Advanced Data Table (Pagination, sorting & filtering)
async function fetchTableData() {
    const tableBody = document.getElementById('analytics-table-body');
    if (!tableBody) return;
    
    // Loader
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="p-8 text-center text-slate-400">
                <div class="flex items-center justify-center gap-2">
                    <div class="spinner"></div>
                    <span>Fetching analytics ledger records...</span>
                </div>
            </td>
        </tr>
    `;

    try {
        const queryParams = new URLSearchParams({
            page: tablePage,
            limit: tableLimit,
            status: tableStatusFilter,
            search: tableSearchQuery
        });
        
        // Use existing transactions API
        const response = await fetch(`${API_BASE_URL}/transactions?${queryParams.toString()}`);
        const payload = await response.json();
        
        fetchedTableData = payload.data || [];
        const pagination = payload.pagination || {};

        // Sort data based on header parameters
        sortTableData();

        // Populate Table filter dropdown for products if empty
        populateProductFilter(fetchedTableData);

        renderTableRows();
        renderTablePagination(pagination);

    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="p-8 text-center text-red-500 font-semibold">
                    Failed to Load Table Data: ${error.message}
                </td>
            </tr>
        `;
    }
}

function populateProductFilter(data) {
    const dropdown = document.getElementById('table-product-filter');
    if (!dropdown || dropdown.children.length > 1) return; // already loaded

    const products = new Set();
    data.forEach(item => {
        if (item.kode_produk) products.add(item.kode_produk);
    });

    products.forEach(prod => {
        const opt = document.createElement('option');
        opt.value = prod;
        opt.textContent = prod;
        dropdown.appendChild(opt);
    });
}

function sortTableData() {
    if (!fetchedTableData.length) return;

    fetchedTableData.sort((a, b) => {
        let valA, valB;
        
        if (tableSortCol === 'revenue') {
            valA = a.harga || 0;
            valB = b.harga || 0;
        } else if (tableSortCol === 'profit') {
            valA = (a.status === 20 && a.harga && a.harga_beli) ? (a.harga - a.harga_beli) : 0;
            valB = (b.status === 20 && b.harga && b.harga_beli) ? (b.harga - b.harga_beli) : 0;
        } else { // date
            valA = new Date(a.tgl_entri || 0).getTime();
            valB = new Date(b.tgl_entri || 0).getTime();
        }

        if (tableSortDir === 'asc') return valA - valB;
        return valB - valA;
    });
}

function toggleTableSort(col, thId) {
    if (tableSortCol === col) {
        tableSortDir = tableSortDir === 'desc' ? 'asc' : 'desc';
    } else {
        tableSortCol = col;
        tableSortDir = 'desc';
    }

    // Reset icons on headers
    ['th-date', 'th-revenue', 'th-profit'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const originalName = el.textContent.split(' ')[0];
            el.innerHTML = `${originalName} <i class="fa-solid fa-sort ml-1"></i>`;
        }
    });

    // Update active icon
    const th = document.getElementById(thId);
    if (th) {
        const originalName = th.textContent.split(' ')[0];
        const icon = tableSortDir === 'desc' ? 'fa-sort-down' : 'fa-sort-up';
        th.innerHTML = `${originalName} <i class="fa-solid ${icon} ml-1"></i>`;
    }

    sortTableData();
    renderTableRows();
}

function renderTableRows() {
    const tableBody = document.getElementById('analytics-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    // Apply product select filtering locally to fetched payload
    let displayedData = fetchedTableData;
    const prodVal = document.getElementById('table-product-filter').value;
    if (prodVal !== 'all') {
        displayedData = displayedData.filter(d => d.kode_produk === prodVal);
    }

    if (displayedData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="p-8 text-center text-slate-400">
                    No matching records found.
                </td>
            </tr>
        `;
        return;
    }

    displayedData.forEach(item => {
        const date = new Date(item.tgl_entri);
        const dateText = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        const profit = (item.status === 20 && item.harga && item.harga_beli) ? (item.harga - item.harga_beli) : 0;
        const profitClass = profit >= 0 ? 'text-success font-semibold' : 'text-failed font-semibold';
        
        const marginPct = (item.harga > 0) ? ((profit / item.harga) * 100).toFixed(1) + '%' : '0%';

        // Badges
        let statusBadge = `<span class="badge status-pending"><i class="fa-solid fa-clock"></i> ${item.status}</span>`;
        if (item.status === 20) {
            statusBadge = `<span class="badge status-success"><i class="fa-solid fa-circle-check"></i> Success</span>`;
        } else if (item.status === 40 || item.status === 50) {
            statusBadge = `<span class="badge status-failed"><i class="fa-solid fa-circle-xmark"></i> Failed</span>`;
        } else if (item.status === 55) {
            statusBadge = `<span class="badge status-pending"><i class="fa-solid fa-rotate-left"></i> Refunded</span>`;
        }

        const row = document.createElement('tr');
        row.className = "hover:bg-slate-50/55 dark:hover:bg-slate-800/30 transition-colors";
        row.innerHTML = `
            <td class="p-4 font-semibold text-slate-800 dark:text-[#f8fafc]" style="font-family: monospace;">${item.kode || '-'}</td>
            <td class="p-4 font-medium text-slate-500">${dateText}</td>
            <td class="p-4 font-bold text-[#0f172a] dark:text-[#f8fafc]"><span class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">${item.kode_produk}</span></td>
            <td class="p-4 font-semibold">${item.tujuan}</td>
            <td class="p-4 text-right font-medium">${formatCurrency(item.harga)}</td>
            <td class="p-4 text-right text-slate-400">${formatCurrency(item.harga_beli)}</td>
            <td class="p-4 text-right ${profitClass}">${formatCurrency(profit)}</td>
            <td class="p-4 text-right font-medium text-slate-500">${marginPct}</td>
            <td class="p-4">${statusBadge}</td>
        `;
        tableBody.appendChild(row);
    });
}

function renderTablePagination(pagination) {
    const info = document.getElementById('table-pagination-info');
    const prevBtn = document.getElementById('btn-table-prev');
    const nextBtn = document.getElementById('btn-table-next');
    const pageNumContainer = document.getElementById('table-page-numbers');

    const total = pagination.total || 0;
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const totalPages = pagination.totalPages || 0;

    const startNum = total === 0 ? 0 : (page - 1) * limit + 1;
    const endNum = Math.min(page * limit, total);
    
    if (info) info.textContent = `Showing ${startNum} to ${endNum} of ${total} transactions`;
    
    if (prevBtn) prevBtn.disabled = page === 1;
    if (nextBtn) nextBtn.disabled = page === totalPages || totalPages === 0;

    if (pageNumContainer) {
        pageNumContainer.innerHTML = '';
        if (totalPages <= 1) return;

        // Draw page selection buttons
        const maxBtn = 5;
        let startPage = Math.max(1, page - 2);
        let endPage = Math.min(totalPages, startPage + maxBtn - 1);
        if (endPage - startPage < maxBtn - 1) {
            startPage = Math.max(1, endPage - maxBtn + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.className = `w-8 h-8 rounded-lg text-xs font-semibold ${i === page ? 'bg-brandBlue text-white shadow-sm' : 'text-[#475569] dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-slate-800'}`;
            btn.textContent = i;
            btn.addEventListener('click', () => {
                tablePage = i;
                fetchTableData();
            });
            pageNumContainer.appendChild(btn);
        }
    }
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ==========================================
// EXPORTS AND PRINTING
// ==========================================

function triggerExport(format) {
    const queryParams = new URLSearchParams({
        range: currentRange,
        startDate: customStartDate,
        endDate: customEndDate,
        format: format
    });
    window.location.href = `${API_BASE_URL}/api/analytics/export?${queryParams.toString()}`;
}
