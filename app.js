// Global State
let currentPage = 1;
let rowsPerPage = 5;
let totalItems = 0;
let totalPages = 0;
let trendChart = null;

// API Configurations
const API_BASE_URL = (window.location.protocol === 'file:') ? 'http://localhost:3000' : '';

// DOM Elements
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const limitFilter = document.getElementById('limit-filter');
const dateFilter = document.getElementById('date-filter');
const btnClearDate = document.getElementById('btn-clear-date');
const tableBody = document.getElementById('table-body');
const paginationInfo = document.getElementById('pagination-info');
const pageNumbersContainer = document.getElementById('page-numbers');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const currentTimeEl = document.getElementById('current-time');
const navRefresh = document.getElementById('nav-refresh');

// Stats Counters Elements
const statTotalVal = document.getElementById('stat-total-val');
const statSuccessVal = document.getElementById('stat-success-val');
const statSuccessPct = document.getElementById('stat-success-pct');
const statFailedVal = document.getElementById('stat-failed-val');
const statFailedPct = document.getElementById('stat-failed-pct');
const statCanceledVal = document.getElementById('stat-canceled-val');
const statCanceledPct = document.getElementById('stat-canceled-pct');
const statSuspectVal = document.getElementById('stat-suspect-val');
const statSuspectPct = document.getElementById('stat-suspect-pct');
const statWrongNumberVal = document.getElementById('stat-wrong-number-val');
const statWrongNumberPct = document.getElementById('stat-wrong-number-pct');
const statPendingVal = document.getElementById('stat-pending-val');

// Financial Stats Elements
const statRetailVal = document.getElementById('stat-retail-val');
const statCostVal = document.getElementById('stat-cost-val');
const statProfitVal = document.getElementById('stat-profit-val');
const chartSubtitle = document.getElementById('chart-subtitle');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Theme initialization
    const savedTheme = localStorage.getItem('theme') || 'light';
    const htmlEl = document.documentElement;
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const themeToggleBtn = document.getElementById('theme-toggle');

    if (savedTheme === 'dark') {
        htmlEl.classList.add('dark');
        if (themeToggleIcon) {
            themeToggleIcon.classList.remove('fa-moon');
            themeToggleIcon.classList.add('fa-sun');
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = htmlEl.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            if (themeToggleIcon) {
                if (isDark) {
                    themeToggleIcon.classList.remove('fa-moon');
                    themeToggleIcon.classList.add('fa-sun');
                } else {
                    themeToggleIcon.classList.remove('fa-sun');
                    themeToggleIcon.classList.add('fa-moon');
                }
            }
        });
    }

    // Check session login state
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        window.location.href = 'login';
        return;
    }

    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.style.display = 'flex';
    }

    updateTime();
    setInterval(updateTime, 1000);

    fetchData();

    // Auto Refresh Toggler
    let autoRefreshInterval = null;
    const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
    if (autoRefreshToggle) {
        autoRefreshToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                autoRefreshInterval = setInterval(() => {
                    fetchData(false); // fetch table data only, no heavy stats animations
                }, 10000);
            } else {
                if (autoRefreshInterval) {
                    clearInterval(autoRefreshInterval);
                    autoRefreshInterval = null;
                }
            }
        });
    }

    // Logout Action
    const btnLogout = document.getElementById('nav-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('isLoggedIn');
            window.location.href = 'login';
        });
    }

    // Dashboard Event Listeners
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            fetchData();
        }, 450);
    });

    statusFilter.addEventListener('change', () => {
        currentPage = 1;
        fetchData();
    });

    limitFilter.addEventListener('change', () => {
        rowsPerPage = parseInt(limitFilter.value);
        currentPage = 1;
        fetchData();
    });

    dateFilter.addEventListener('change', () => {
        if (dateFilter.value) {
            btnClearDate.style.display = 'flex';
        } else {
            btnClearDate.style.display = 'none';
        }
        currentPage = 1;
        fetchData();
    });

    btnClearDate.addEventListener('click', () => {
        dateFilter.value = '';
        btnClearDate.style.display = 'none';
        currentPage = 1;
        fetchData();
    });

    btnPrev.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchData(false); // don't refetch stats on simple page navigation
        }
    });

    btnNext.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchData(false); // don't refetch stats on simple page navigation
        }
    });

    navRefresh.addEventListener('click', (e) => {
        e.preventDefault();
        fetchData(true);
    });

    const btnRefreshDash = document.getElementById('btn-refresh-dash');
    if (btnRefreshDash) {
        btnRefreshDash.addEventListener('click', () => {
            currentPage = 1;
            fetchData(true);
        });
    }

    const btnResetDash = document.getElementById('btn-reset-dash');
    if (btnResetDash) {
        btnResetDash.addEventListener('click', () => {
            searchInput.value = '';
            statusFilter.value = 'all';
            dateFilter.value = '';
            limitFilter.value = '5';
            rowsPerPage = 5;
            btnClearDate.style.display = 'none';
            currentPage = 1;
            fetchData(true);
        });
    }
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

// Fetch Data from Server (with Pagination & Filters)
async function fetchData(updateStats = true) {
    showTableLoading();

    const searchVal = searchInput.value.trim();
    const statusVal = statusFilter.value;
    const dateVal = dateFilter.value;

    try {
        // Fetch stats if requested
        if (updateStats) {
            fetchStats(dateVal);
            fetchChartData(dateVal);
        }

        // Fetch transactions
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: rowsPerPage,
            status: statusVal,
            search: searchVal,
            date: dateVal
        });

        const response = await fetch(`${API_BASE_URL}/transactions?${queryParams.toString()}`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const payload = await response.json();
        const transactions = payload.data || [];
        const pagination = payload.pagination || {};

        totalItems = pagination.total || 0;
        totalPages = pagination.totalPages || 0;

        renderTable(transactions);
        updatePaginationInfo();
    } catch (error) {
        console.error('Failed to fetch transactions:', error);
        showTableError(error.message);
    }
}

// Fetch Summary Stats from Server
async function fetchStats(dateVal = '') {
    try {
        const queryParams = new URLSearchParams();
        if (dateVal) {
            queryParams.append('date', dateVal);
        }

        const response = await fetch(`${API_BASE_URL}/transactions/stats?${queryParams.toString()}`);
        if (!response.ok) {
            throw new Error(`Stats Error: ${response.status}`);
        }
        const stats = await response.json();

        // Populate stats on UI
        animateValue(statTotalVal, stats.total);
        animateValue(statSuccessVal, stats.successCount);
        animateValue(statFailedVal, stats.failedCount);
        animateValue(statCanceledVal, stats.canceledCount);
        animateValue(statSuspectVal, stats.suspectCount);
        if (statWrongNumberVal) animateValue(statWrongNumberVal, stats.wrongNumberCount);
        animateValue(statPendingVal, stats.pendingCount);

        // Populate financial stats
        animateValue(statRetailVal, stats.totalRetail, true);
        animateValue(statCostVal, stats.totalCost, true);
        animateValue(statProfitVal, stats.totalProfit, true);

        if (statSuccessPct) statSuccessPct.textContent = `${stats.successRate}% Success rate`;

        if (statFailedPct) {
            const failedPct = stats.total > 0 ? ((stats.failedCount / stats.total) * 100).toFixed(1) : 0;
            statFailedPct.textContent = `${failedPct}% Failed`;
        }

        if (statCanceledPct) {
            const canceledPct = stats.total > 0 ? ((stats.canceledCount / stats.total) * 100).toFixed(1) : 0;
            statCanceledPct.textContent = `${canceledPct}% Canceled`;
        }

        if (statSuspectPct) {
            const suspectPct = stats.total > 0 ? ((stats.suspectCount / stats.total) * 100).toFixed(1) : 0;
            statSuspectPct.textContent = `${suspectPct}% Suspect`;
        }

        if (statWrongNumberPct) {
            const wrongNumberPct = stats.total > 0 ? ((stats.wrongNumberCount / stats.total) * 100).toFixed(1) : 0;
            statWrongNumberPct.textContent = `${wrongNumberPct}% Wrong Number`;
        }
    } catch (error) {
        console.error('Failed to fetch stats:', error);
    }
}

// Counter animation with currency support
function animateValue(element, target, isCurrency = false) {
    if (!element) return;

    let rawText = element.textContent.replace(/[^\d-]/g, ''); // keep only digits and minus sign
    let current = parseInt(rawText) || 0;
    if (isNaN(current)) current = 0;

    const duration = 600; // ms
    const stepTime = 15;
    const steps = duration / stepTime;
    const increment = (target - current) / steps;

    let step = 0;
    const timer = setInterval(() => {
        current += increment;
        step++;

        const formatVal = (val) => {
            const formatted = Math.round(val).toLocaleString('id-ID');
            return isCurrency ? `Rp ${formatted}` : formatted;
        };

        if (step >= steps) {
            clearInterval(timer);
            element.textContent = formatVal(target);
        } else {
            element.textContent = formatVal(current);
        }
    }, stepTime);
}

// Format Simple Date for Subtitle (YYYY-MM-DD -> DD MMM YYYY)
function formatSimpleDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Fetch Chart Data from Server
async function fetchChartData(dateVal = '') {
    try {
        const queryParams = new URLSearchParams();
        if (dateVal) {
            queryParams.append('date', dateVal);
            chartSubtitle.textContent = `Showing hourly trends for ${formatSimpleDate(dateVal)}`;
        } else {
            chartSubtitle.textContent = 'Showing trends for the last 7 days';
        }

        const response = await fetch(`${API_BASE_URL}/transactions/chart?${queryParams.toString()}`);
        if (!response.ok) {
            throw new Error(`Chart Error: ${response.status}`);
        }
        const data = await response.json();
        renderChart(data, !!dateVal);
    } catch (error) {
        console.error('Failed to fetch chart data:', error);
    }
}

// Render Trend Chart using Chart.js
function renderChart(data, isHourly = false) {
    const canvas = document.getElementById('transaction-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Destroy previous chart if it exists
    if (trendChart) {
        trendChart.destroy();
    }

    let labels = [];
    let successData = [];
    let failedData = [];
    let profitData = [];

    if (isHourly) {
        const hourlyMap = {};
        data.forEach(item => {
            hourlyMap[item.label] = item;
        });

        for (let h = 0; h < 24; h++) {
            labels.push(`${String(h).padStart(2, '0')}:00`);
            const item = hourlyMap[h];
            successData.push(item ? item.success : 0);
            failedData.push(item ? item.failed : 0);
            profitData.push(item ? item.profit : 0);
        }
    } else {
        data.forEach(item => {
            let dateLabel = item.label;
            try {
                const date = new Date(item.label);
                if (!isNaN(date.getTime())) {
                    dateLabel = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                }
            } catch (e) { }
            labels.push(dateLabel);
            successData.push(item.success);
            failedData.push(item.failed);
            profitData.push(item.profit);
        });
    }

    const profitGradient = ctx.createLinearGradient(0, 0, 0, 300);
    profitGradient.addColorStop(0, 'rgba(0, 82, 255, 0.18)');
    profitGradient.addColorStop(1, 'rgba(0, 82, 255, 0.0)');

    trendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Successful',
                    data: successData,
                    backgroundColor: 'rgba(16, 185, 129, 0.65)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: 'Failed',
                    data: failedData,
                    backgroundColor: 'rgba(239, 68, 68, 0.65)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    yAxisID: 'y',
                    order: 3
                },
                {
                    label: 'Profit (Rp)',
                    data: profitData,
                    type: 'line',
                    borderColor: '#0052ff',
                    borderWidth: 3,
                    pointBackgroundColor: '#0052ff',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 7,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: profitGradient,
                    yAxisID: 'yProfit',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#475569',
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
                            if (label) {
                                label += ': ';
                            }
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
                    grid: {
                        color: 'rgba(0, 0, 0, 0.04)'
                    },
                    ticks: {
                        color: '#475569',
                        font: {
                            family: 'Inter',
                            size: 10
                        }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(0, 0, 0, 0.04)'
                    },
                    ticks: {
                        color: '#475569',
                        font: {
                            family: 'Inter',
                            size: 10
                        },
                        callback: function (value) {
                            return value.toLocaleString('id-ID');
                        }
                    },
                    title: {
                        display: true,
                        text: 'Txs Count',
                        color: '#475569',
                        font: {
                            family: 'Inter',
                            size: 10
                        }
                    }
                },
                yProfit: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: '#2563eb',
                        font: {
                            family: 'Inter',
                            size: 10
                        },
                        callback: function (value) {
                            if (value >= 1000000) {
                                return 'Rp ' + (value / 1000000).toFixed(1) + 'M';
                            } else if (value >= 1000) {
                                return 'Rp ' + (value / 1000).toFixed(0) + 'K';
                            }
                            return 'Rp ' + value;
                        }
                    },
                    title: {
                        display: true,
                        text: 'Profit (IDR)',
                        color: '#2563eb',
                        font: {
                            family: 'Inter',
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

// Format currency in IDR (Rupiah)
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'Rp 0';
    return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

// Format database date/time string
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function getStatusBadge(status, sn) {
    const suspectSns = ['N/A', 'UPDATE', 'NULL', 'SUSPECT', '0000', 'PEND'];
    const isSuspectSn = sn && suspectSns.includes(sn.toUpperCase().trim());

    if (status === 52 || status === 54) {
        return '<span class="badge status-failed"><i class="fa-solid fa-circle-xmark"></i> Tujuan Salah</span>';
    } else if (isSuspectSn && status !== 40 && status !== 50) {
        return '<span class="badge status-suspect"><i class="fa-solid fa-triangle-exclamation"></i> Suspect</span>';
    } else if (status === 20) {
        return '<span class="badge status-success"><i class="fa-solid fa-circle-check"></i> Success</span>';
    } else if (status === 40) {
        return '<span class="badge status-failed"><i class="fa-solid fa-circle-xmark"></i> Failed</span>';
    } else if (status === 50) {
        return '<span class="badge status-failed"><i class="fa-solid fa-ban"></i> Canceled</span>';
    } else if (status === 55) {
        return '<span class="badge status-pending"><i class="fa-solid fa-clock"></i> Timeout</span>';
    } else {
        return `<span class="badge status-pending"><i class="fa-solid fa-clock"></i> Code ${status}</span>`;
    }
}

// Render Main Transactions Table rows
function renderTable(transactions) {
    tableBody.innerHTML = '';

    if (transactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <i class="fa-regular fa-folder-open empty-icon"></i>
                        <p>No transactions found matching the criteria</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    transactions.forEach(item => {
        const profit = (item.status === 20 && item.harga && item.harga_beli) ? (item.harga - item.harga_beli) : 0;
        const profitClass = profit >= 0 ? 'text-success' : 'text-danger';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight: 600; font-family: monospace;">${item.kode || '-'}</td>
            <td style="color: var(--text-secondary);">${formatDateTime(item.tgl_entri)}</td>
            <td><span style="background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; font-weight: 500;">${item.kode_produk || '-'}</span></td>
            <td>${item.tujuan || '-'}</td>
            <td class="text-right" style="font-weight: 500;">${formatCurrency(item.harga)}</td>
            <td class="text-right" style="color: var(--text-secondary);">${formatCurrency(item.harga_beli)}</td>
            <td class="text-right ${profitClass}" style="font-weight: 600;">${formatCurrency(profit)}</td>
            <td style="font-family: monospace; font-size: 0.85rem; color: var(--text-secondary);">${item.sn || '<span class="text-muted">-</span>'}</td>
            <td>${getStatusBadge(item.status, item.sn)}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Update pagination info text and page numbers
function updatePaginationInfo() {
    // Info text
    const startNum = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const endNum = Math.min(currentPage * rowsPerPage, totalItems);
    paginationInfo.textContent = `Showing ${startNum} to ${endNum} of ${totalItems} transactions`;

    // Pagination buttons state
    btnPrev.disabled = currentPage === 1;
    btnNext.disabled = currentPage === totalPages || totalPages === 0;

    // Generate page numbers buttons
    pageNumbersContainer.innerHTML = '';

    if (totalPages <= 1) return;

    // Show dynamic numbers range (surrounding current page)
    const maxVisibleButtons = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

    if (endPage - startPage < maxVisibleButtons - 1) {
        startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `btn-page ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => {
            currentPage = i;
            fetchData(false); // don't refresh stats on simple page navigation
        });
        pageNumbersContainer.appendChild(btn);
    }
}

// Show table state views
function showTableLoading() {
    tableBody.innerHTML = `
        <tr class="placeholder-row">
            <td colspan="9">
                <div class="table-loader-wrapper">
                    <div class="spinner"></div>
                    <span>Fetching database records...</span>
                </div>
            </td>
        </tr>
    `;
}

function showTableError(message) {
    tableBody.innerHTML = `
        <tr>
            <td colspan="9">
                <div class="empty-state" style="color: var(--failed);">
                    <i class="fa-solid fa-circle-exclamation empty-icon" style="color: var(--failed);"></i>
                    <p style="font-weight: 600;">Failed to Load Transactions</p>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">${message}</p>
                    <button class="btn-pagination" onclick="fetchData()" style="margin: 16px auto 0 auto; display: flex;">
                        <i class="fa-solid fa-rotate"></i> Retry Connection
                    </button>
                </div>
            </td>
        </tr>
    `;
}
