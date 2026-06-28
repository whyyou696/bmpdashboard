// Global State
let currentPage = 1;
let totalPages = 0;
let charts = { modules: null, products: null, resellers: null };

// API Configurations
const API_BASE_URL = (window.location.protocol === 'file:') ? 'http://localhost:3000' : '';

// DOM Elements
const searchInput = document.getElementById('search-input');
const limitFilter = document.getElementById('limit-filter');
const startDateFilter = document.getElementById('start-date-filter');
const endDateFilter = document.getElementById('end-date-filter');
const dateModeFilter = document.getElementById('date-mode-filter');
const customDateStart = document.getElementById('custom-date-start');
const customDateEnd = document.getElementById('custom-date-end');
const modulFilter = document.getElementById('modul-filter');
const resellerFilter = document.getElementById('reseller-filter');
const statusFilter = document.getElementById('status-filter');
const snEmptyCheckbox = document.getElementById('sn-empty-checkbox');

const tableBody = document.getElementById('table-body');
const currentTimeEl = document.getElementById('current-time');
const paginationInfo = document.getElementById('pagination-info');
const pageNumbersContainer = document.getElementById('page-numbers');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

// Stats Counters Elements
const statTotalOmsetVal = document.getElementById('stat-total-omset-val');
const statTotalLabaVal = document.getElementById('stat-total-laba-val');
const statTotalSaldoVal = document.getElementById('stat-total-saldo-val');

// Top Lists Container Elements
const topModulesList = document.getElementById('top-modules-list');
const topProductsList = document.getElementById('top-products-list');
const topResellersList = document.getElementById('top-resellers-list');

// Initialize Modul Monitoring Page
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
            updateChartsForTheme(isDark);
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

    // Initialize Default Dates (Today)
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const formatISODate = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    startDateFilter.value = formatISODate(today);
    endDateFilter.value = formatISODate(today);

    // Date Mode Toggle
    if (dateModeFilter) {
        dateModeFilter.addEventListener('change', () => {
            const mode = dateModeFilter.value;
            if (mode === 'today') {
                if (customDateStart) customDateStart.style.display = 'none';
                if (customDateEnd) customDateEnd.style.display = 'none';
                startDateFilter.value = formatISODate(today);
                endDateFilter.value = formatISODate(today);
            } else if (mode === 'all') {
                if (customDateStart) customDateStart.style.display = 'none';
                if (customDateEnd) customDateEnd.style.display = 'none';
                startDateFilter.value = '';
                endDateFilter.value = '';
            } else {
                if (customDateStart) customDateStart.style.display = 'flex';
                if (customDateEnd) customDateEnd.style.display = 'flex';
                startDateFilter.value = formatISODate(yesterday);
                endDateFilter.value = formatISODate(today);
            }
            currentPage = 1;
            fetchData();
        });
    }

    updateTime();
    setInterval(updateTime, 1000);

    // Initial Fetch options & transactions
    initFiltersAndFetch();

    // Event Listeners for Filters
    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            fetchData();
        }, 300);
    });

    limitFilter.addEventListener('change', () => {
        currentPage = 1;
        fetchData();
    });

    startDateFilter.addEventListener('change', () => {
        currentPage = 1;
        fetchData();
    });

    endDateFilter.addEventListener('change', () => {
        currentPage = 1;
        fetchData();
    });

    modulFilter.addEventListener('change', () => {
        currentPage = 1;
        fetchData();
    });

    resellerFilter.addEventListener('change', () => {
        currentPage = 1;
        fetchData();
    });

    statusFilter.addEventListener('change', () => {
        currentPage = 1;
        fetchData();
    });

    snEmptyCheckbox.addEventListener('change', () => {
        currentPage = 1;
        fetchData();
    });

    // Pagination Listeners
    btnPrev.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchData();
        }
    });

    btnNext.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchData();
        }
    });

    // Refresh & Reset buttons
    const btnRefreshDash = document.getElementById('btn-refresh-dash');
    if (btnRefreshDash) {
        btnRefreshDash.addEventListener('click', () => {
            fetchData();
        });
    }

    const btnResetDash = document.getElementById('btn-reset-dash');
    if (btnResetDash) {
        btnResetDash.addEventListener('click', () => {
            searchInput.value = '';
            limitFilter.value = '20';
            if (dateModeFilter) {
                dateModeFilter.value = 'today';
                if (customDateStart) customDateStart.style.display = 'none';
                if (customDateEnd) customDateEnd.style.display = 'none';
            }
            startDateFilter.value = formatISODate(today);
            endDateFilter.value = formatISODate(today);
            modulFilter.value = '';
            resellerFilter.value = '';
            statusFilter.value = '';
            snEmptyCheckbox.checked = true;
            currentPage = 1;
            fetchData();
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
});

// Update Clock Widget
function updateTime() {
    const now = new Date();
    currentTimeEl.textContent = now.toLocaleTimeString('id-ID') + ' | ' + now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Fetch lists to populate dropdowns, then run first search
async function initFiltersAndFetch() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/modul/init`);
        if (response.ok) {
            const data = await response.json();
            
            // Populate Modules dropdown
            if (data.modules && data.modules.length > 0) {
                data.modules.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.kode;
                    opt.textContent = m.label;
                    modulFilter.appendChild(opt);
                });
            }

            // Populate Resellers dropdown
            if (data.resellers && data.resellers.length > 0) {
                data.resellers.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r.kode;
                    opt.textContent = r.nama;
                    resellerFilter.appendChild(opt);
                });
            }
        }
    } catch (error) {
        console.error('Failed to load filter metadata:', error);
    }

    // Run first data fetch
    fetchData();
}

// Fetch stats and transactions from database API
async function fetchData() {
    showTableLoading();
    
    // Construct Query Parameters
    const searchVal = encodeURIComponent(searchInput.value.trim());
    const limitVal = limitFilter.value;
    const startVal = startDateFilter.value;
    const endVal = endDateFilter.value;
    const modulVal = modulFilter.value;
    const resellerVal = resellerFilter.value;
    const statusVal = statusFilter.value;
    const snEmptyVal = snEmptyCheckbox.checked ? 'true' : 'false';
    const dateModeVal = dateModeFilter ? dateModeFilter.value : '';

    const url = `${API_BASE_URL}/api/modul/transactions?page=${currentPage}&limit=${limitVal}&search=${searchVal}&startDate=${startVal}&endDate=${endVal}&dateMode=${dateModeVal}&modul=${modulVal}&reseller=${resellerVal}&status=${statusVal}&sn_empty=${snEmptyVal}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        const data = await response.json();

        // 1. Update stats cards in UI
        const prod = data.productivity || { totalTrx: 0, successTrx: 0, failedTrx: 0, successRate: 0.0, totalOmset: 0, totalLaba: 0, totalSaldo: 0 };
        animateValue(statTotalOmsetVal, prod.totalOmset, 'currency');
        animateValue(statTotalLabaVal, prod.totalLaba, 'currency');
        animateValue(statTotalSaldoVal, prod.totalSaldo, 'currency');

        // 1.5. Render Top Lists & Charts
        const top = data.topLists || { modules: [], products: [], resellers: [] };
        const totalTrx = prod.totalTrx || 0;
        const totalSuccessTrx = prod.successTrx || 0;
        
        renderTopChartAndList(topModulesList, 'chart-top-modules', 'modules', top.modules, totalTrx, totalSuccessTrx);
        renderTopChartAndList(topProductsList, 'chart-top-products', 'products', top.products, totalTrx, totalSuccessTrx);
        renderTopChartAndList(topResellersList, 'chart-top-resellers', 'resellers', top.resellers, totalTrx, totalSuccessTrx);

        // 2. Render transaction list table
        const transactions = data.data || [];
        renderTable(transactions);

        // 3. Update pagination metadata
        const pag = data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };
        totalPages = pag.totalPages;
        updatePaginationInfo(pag.page, pag.limit, pag.total);

    } catch (error) {
        console.error('Failed to fetch module transaction data:', error);
        showTableError(error.message);
    }
}

// Format status helper
function getStatusBadge(statusCode) {
    if (statusCode === 20) {
        return '<span class="badge status-success"><i class="fa-solid fa-circle-check"></i> Sukses</span>';
    } else if ([40, 50, 52, 54, 55].includes(statusCode)) {
        return '<span class="badge status-failed"><i class="fa-solid fa-circle-xmark"></i> Gagal</span>';
    } else if ([0, 1, 2].includes(statusCode)) {
        return '<span class="badge status-pending" style="background: rgba(245, 158, 11, 0.1); color: var(--warning); border-color: rgba(245, 158, 11, 0.2);"><i class="fa-solid fa-spinner fa-spin"></i> Proses</span>';
    } else {
        return `<span class="badge status-pending"><i class="fa-solid fa-clock"></i> Pending (${statusCode})</span>`;
    }
}

// Render dynamic rows in table
function renderTable(transactionsList) {
    tableBody.innerHTML = '';

    if (transactionsList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="12">
                    <div class="empty-state">
                        <i class="fa-regular fa-folder-open empty-icon"></i>
                        <p>No transactions found matching the search criteria</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    transactionsList.forEach(t => {
        const row = document.createElement('tr');
        
        // Format dates cleanly
        const formatDateTime = (dtStr) => {
            if (!dtStr) return '<span class="text-muted">-</span>';
            const dt = new Date(dtStr);
            return dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
                   dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        };

        const tglEntri = formatDateTime(t.tgl_entri);

        // Format Currency values
        const hrgBeli = t.harga_beli !== null && t.harga_beli !== undefined ? formatCurrency(t.harga_beli) : '<span class="text-muted">-</span>';
        const hrgJual = t.harga !== null && t.harga !== undefined ? formatCurrency(t.harga) : '<span class="text-muted">-</span>';
        
        // Show laba only for successful transactions (status = 20)
        let labaFormatted = '<span class="text-muted">-</span>';
        if (t.status === 20) {
            const valLaba = (t.harga || 0) - (t.harga_beli || 0);
            if (valLaba >= 0) {
                labaFormatted = `<span class="text-success" style="font-weight:600;">${formatCurrency(valLaba)}</span>`;
            } else {
                labaFormatted = `<span class="text-danger" style="font-weight:600;">${formatCurrency(valLaba)}</span>`;
            }
        }

        // Integrate Jawaban Provider into Status column
        let statusColContent = getStatusBadge(t.status);
        if (t.jawaban_provider && t.jawaban_provider !== '-' && t.jawaban_provider !== 'NULL') {
            statusColContent = `
                <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                    ${statusColContent}
                    <span class="status-reply-text" style="font-size: 0.7rem; color: var(--text-secondary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; cursor: help;" title="${t.jawaban_provider.replace(/"/g, '&quot;')}">
                        ${t.jawaban_provider}
                    </span>
                </div>
            `;
        }

        const saldoSupplier = t.saldo_supplier !== null && t.saldo_supplier !== undefined ? formatCurrency(t.saldo_supplier) : '<span class="text-muted">-</span>';

        row.innerHTML = `
            <td style="font-weight: 600; font-family: monospace;">${t.TrxID || '-'}</td>
            <td style="font-size: 0.8rem; color: var(--text-secondary);">${tglEntri}</td>
            <td style="font-weight: 500;">${t.nama_modul || '-'}</td>
            <td style="font-weight: 500;">${t.nama_reseller || '-'}</td>
            <td style="font-weight: 500;">${t.kode_produk || '-'}</td>
            <td style="font-family: monospace;">${t.tujuan || '-'}</td>
            <td style="font-family: monospace; font-size: 0.8rem;">${t.sn || '<span class="text-muted">-</span>'}</td>
            <td class="text-right" style="font-family: monospace;">${hrgBeli}</td>
            <td class="text-right" style="font-family: monospace;">${hrgJual}</td>
            <td class="text-right" style="font-family: monospace;">${labaFormatted}</td>
            <td class="text-right" style="font-family: monospace;">${saldoSupplier}</td>
            <td>${statusColContent}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Update pagination info text and rendering buttons
function updatePaginationInfo(page, limit, total) {
    const startNum = total === 0 ? 0 : (page - 1) * limit + 1;
    const endNum = Math.min(page * limit, total);

    paginationInfo.textContent = `Showing ${startNum} to ${endNum} of ${total} transactions`;

    btnPrev.disabled = page === 1;
    btnNext.disabled = page === totalPages || totalPages === 0;

    pageNumbersContainer.innerHTML = '';

    if (totalPages <= 1) return;

    const maxVisibleButtons = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

    if (endPage - startPage < maxVisibleButtons - 1) {
        startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `btn-page ${i === page ? 'active' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => {
            currentPage = i;
            fetchData();
        });
        pageNumbersContainer.appendChild(btn);
    }
}

// Stats Card Counter Animation
function animateValue(element, target, formatType = 'number') {
    if (!element) return;

    let rawText = element.textContent.replace(/[^\d.-]/g, '');
    let current = parseFloat(rawText) || 0;
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
            if (formatType === 'currency') {
                return 'Rp ' + Math.round(val).toLocaleString('id-ID');
            } else if (formatType === 'percent') {
                return val.toFixed(1) + '%';
            } else {
                return Math.round(val).toLocaleString('id-ID');
            }
        };

        if (step >= steps) {
            clearInterval(timer);
            element.textContent = formatVal(target);
        } else {
            element.textContent = formatVal(current);
        }
    }, stepTime);
}

// Currency Formatter Utility
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'Rp 0';
    return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

// Table loading state indicator
function showTableLoading() {
    tableBody.innerHTML = `
        <tr class="placeholder-row">
            <td colspan="12">
                <div class="table-loader-wrapper">
                    <div class="spinner"></div>
                    <span>Fetching transactions...</span>
                </div>
            </td>
        </tr>
    `;
}

// Table error state indicator
function showTableError(message) {
    tableBody.innerHTML = `
        <tr>
            <td colspan="12">
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

// Render Top 5 Performers Pie Chart and Legend List dynamically
function renderTopChartAndList(container, canvasId, chartKey, list, totalTrx, totalSuccessTrx) {
    if (!container) return;
    container.innerHTML = '';
    
    // Destroy existing chart instance if it exists
    if (charts[chartKey]) {
        charts[chartKey].destroy();
        charts[chartKey] = null;
    }
    
    if (!list || list.length === 0 || totalTrx === 0) {
        container.innerHTML = `<span class="text-muted" style="font-size: 0.8rem; text-align: center; margin: auto;">No data available</span>`;
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            canvas.style.display = 'none';
        }
        return;
    }
    
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        canvas.style.display = 'block';
    }
    
    // Copy the list to avoid mutating the original response array
    const listCopy = [...list];
    
    // Calculate sum of top 5
    const sumTopTrx = listCopy.reduce((sum, item) => sum + (item.total_trx || 0), 0);
    const sumTopSuccessTrx = listCopy.reduce((sum, item) => sum + (item.success_trx || 0), 0);
    
    // Add "Others" slice if totalTrx is greater than top 5 sum
    if (totalTrx > sumTopTrx) {
        const othersTrx = totalTrx - sumTopTrx;
        const othersSuccess = Math.max(0, totalSuccessTrx - sumTopSuccessTrx);
        listCopy.push({
            name: 'Others',
            total_trx: othersTrx,
            success_trx: othersSuccess
        });
    }
    
    // Define modern color palette
    const colorPalette = [
        '#f59e0b', // Yellow/Gold
        '#3b82f6', // Blue
        '#ef4444', // Red
        '#a855f7', // Purple
        '#10b981'  // Green
    ];
    const othersColor = '#64748b'; // Slate Grey
    
    const chartLabels = [];
    const chartData = [];
    const chartColors = [];
    
    let paletteIndex = 0;
    
    listCopy.forEach(item => {
        // Calculate percentage of share
        const pctFloat = totalTrx > 0 ? (item.total_trx / totalTrx) * 100 : 0;
        let pctText = Math.round(pctFloat) + '%';
        if (pctFloat > 0 && pctFloat < 0.5) {
            pctText = pctFloat.toFixed(1) + '%';
        }
        
        // Success Rate percentage
        const itemTotal = item.total_trx || 0;
        const itemSuccess = item.success_trx || 0;
        const srFloat = itemTotal > 0 ? (itemSuccess / itemTotal) * 100 : 0.0;
        const srText = srFloat.toFixed(1) + '%';
        
        // Success Rate Color
        let srColor = 'var(--failed)';
        if (srFloat >= 90) {
            srColor = 'var(--success)';
        } else if (srFloat >= 60) {
            srColor = 'var(--pending)';
        }
        
        // Determine item color
        let color;
        if (item.name === 'Others') {
            color = othersColor;
        } else {
            color = colorPalette[paletteIndex % colorPalette.length];
            paletteIndex++;
        }
        
        chartLabels.push(item.name);
        chartData.push(item.total_trx);
        chartColors.push(color);
        
        // Render legend item
        const legendItem = document.createElement('div');
        legendItem.className = 'top-legend-item';
        legendItem.style.cssText = 'display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 0.82rem; padding: 6px 0;';
        
        legendItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; display: inline-block; flex-shrink: 0;"></span>
                <span style="font-weight: 600; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${item.name}">${item.name}</span>
                <span style="color: var(--text-secondary); font-size: 0.72rem; flex-shrink: 0;">(${pctText})</span>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; line-height: 1.3; flex-shrink: 0;">
                <span style="font-weight: 700; color: var(--text-primary); font-size: 0.8rem;">${item.total_trx.toLocaleString('id-ID')} Txs</span>
                <span style="font-size: 0.7rem; font-weight: 600; color: var(--text-secondary);"><span style="font-weight: 500;">SR:</span> <span style="color: ${srColor}; font-weight: 700;">${srText}</span></span>
            </div>
        `;
        
        container.appendChild(legendItem);
    });
    
    // Create Chart.js instance
    const ctx = canvas.getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    const chartBorderColor = isDark ? '#1e293b' : '#ffffff';
    
    charts[chartKey] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderWidth: 2,
                borderColor: chartBorderColor
            }]
        },
        options: {
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            const pct = totalTrx > 0 ? ((val / totalTrx) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ${val.toLocaleString('id-ID')} trx (${pct}%)`;
                        }
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Update Charts borders on Theme Toggle
function updateChartsForTheme(isDark) {
    const newBorderColor = isDark ? '#1e293b' : '#ffffff';
    for (const key in charts) {
        if (charts[key]) {
            charts[key].data.datasets[0].borderColor = newBorderColor;
            charts[key].update();
        }
    }
}
