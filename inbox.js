// Global Page State
let inboxPage = 1;
let inboxLimit = 20;
let inboxSortCol = "created_at";
let inboxSortDir = "desc";
let isInfiniteLoading = false; // to determine if we append or replace table body

// Live Polling State
let maxInboxId = 0;
let liveInterval = null;
let lastUpdateTimestamp = null;

// Chart instances
let charts = {
    requestsHour: null,
    statusDist: null,
    topResellers: null,
    mostProducts: null
};

// API Configurations
const API_BASE_URL = (window.location.protocol === 'file:') ? 'http://localhost:3000' : '';

// DOM Elements
const authCheck = () => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        window.location.href = 'dashboard';
    }
};

// Initialize Page
document.addEventListener('DOMContentLoaded', () => {
    authCheck();
    initializeTheme();
    updateTime();
    setInterval(updateTime, 1000);

    // Load static dropdown values for filters
    loadFilterDropdowns();

    // Load primary page data
    refreshAllData();

    // Start Live Polling (every 30 seconds)
    startLivePolling();

    // Attach Event Listeners
    attachEventListeners();
});

// Theme setup
function initializeTheme() {
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
            // Re-render charts to adjust text colors for theme if needed
            fetchCharts();
        });
    }
}

// Update clock
function updateTime() {
    const now = new Date();
    const clockEl = document.getElementById('current-time');
    if (clockEl) {
        clockEl.textContent = now.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }) + ' | ' + now.toLocaleTimeString('id-ID');
    }
}

// Fetch lists of Resellers, Products, etc. for filters
async function loadFilterDropdowns() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/inbox/filters`);
        if (!response.ok) throw new Error("Failed to load filters metadata");
        const data = await response.json();

        // Resellers
        const resellerSelect = document.getElementById("filter-reseller");
        if (resellerSelect) {
            data.resellers.forEach(res => {
                const opt = document.createElement("option");
                opt.value = res.kode;
                opt.textContent = `${res.nama} (${res.kode})`;
                resellerSelect.appendChild(opt);
            });
        }

        // Products
        const productSelect = document.getElementById("filter-product");
        if (productSelect) {
            data.products.forEach(prod => {
                const opt = document.createElement("option");
                opt.value = prod;
                opt.textContent = prod;
                productSelect.appendChild(opt);
            });
        }

        // Terminals
        const terminalSelect = document.getElementById("filter-terminal");
        if (terminalSelect) {
            data.terminals.forEach(term => {
                const opt = document.createElement("option");
                opt.value = term;
                opt.textContent = `Terminal ${term}`;
                terminalSelect.appendChild(opt);
            });
        }

        // Service Centers
        const scSelect = document.getElementById("filter-service-center");
        if (scSelect) {
            data.serviceCenters.forEach(sc => {
                const opt = document.createElement("option");
                opt.value = sc;
                opt.textContent = sc;
                scSelect.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Error loading filter dropdown options:", err);
    }
}

// Refresh KPI, Charts, and Table
function refreshAllData() {
    fetchStatistics();
    fetchCharts();
    fetchTable(false);
}

// Fetch Statistics KPI Cards
async function fetchStatistics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/inbox/statistics`);
        if (!response.ok) throw new Error("Failed to load statistics");
        const stats = await response.json();

        animateCounter(document.getElementById("kpi-requests-today"), stats.totalRequestsToday);
        animateCounter(document.getElementById("kpi-success-today"), stats.successfulTxs);
        animateCounter(document.getElementById("kpi-pending-today"), stats.pendingTxs);
        animateCounter(document.getElementById("kpi-duplicate-today"), stats.duplicateTxs);
        animateCounter(document.getElementById("kpi-failed-today"), stats.failedTxs);
        
        // Update Live Counter
        const counterEl = document.getElementById("live-request-counter");
        if (counterEl) {
            counterEl.textContent = stats.totalRequestsToday.toLocaleString('id-ID');
        }
    } catch (err) {
        console.error("Error fetching statistics:", err);
    }
}

// Counter animation
function animateCounter(element, target) {
    if (!element) return;
    let current = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
    const duration = 500;
    const stepTime = 15;
    const steps = duration / stepTime;
    const increment = (target - current) / steps;
    let step = 0;

    const timer = setInterval(() => {
        current += increment;
        step++;
        if (step >= steps) {
            clearInterval(timer);
            element.textContent = Math.round(target).toLocaleString('id-ID');
        } else {
            element.textContent = Math.round(current).toLocaleString('id-ID');
        }
    }, stepTime);
}

// Theme Aware Chart Color Utilities
function getChartTextColor() {
    return document.documentElement.classList.contains('dark') ? '#94a3b8' : '#475569';
}

function getChartGridColor() {
    return document.documentElement.classList.contains('dark') ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.6)';
}

// Fetch and draw Charts
async function fetchCharts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/inbox/charts`);
        if (!response.ok) throw new Error("Failed to load chart metrics");
        const data = await response.json();

        const gridColor = getChartGridColor();
        const textColor = getChartTextColor();

        // 1. Requests Per Hour (Line Chart)
        const hourlyLabels = [];
        const hourlyValues = [];
        const hourlyMap = {};
        data.hourlyRequests.forEach(item => {
            hourlyMap[item.hour] = item.count;
        });
        for (let h = 0; h < 24; h++) {
            hourlyLabels.push(`${String(h).padStart(2, '0')}:00`);
            hourlyValues.push(hourlyMap[h] || 0);
        }

        if (charts.requestsHour) charts.requestsHour.destroy();
        const ctxHour = document.getElementById("chart-requests-hour").getContext("2d");
        charts.requestsHour = new Chart(ctxHour, {
            type: 'line',
            data: {
                labels: hourlyLabels,
                datasets: [{
                    label: 'Requests',
                    data: hourlyValues,
                    borderColor: '#0052ff',
                    backgroundColor: 'rgba(0, 82, 255, 0.08)',
                    borderWidth: 2,
                    tension: 0.35,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 9 } } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 9 } } }
                }
            }
        });

        // 2. Transaction Status Distribution (Pie Chart)
        const dist = data.statusDistribution || { success: 0, failed: 0, duplicate: 0, processing: 0, pending: 0 };
        const distLabels = ['Success', 'Pending', 'Duplicate', 'Failed', 'Processing'];
        const distValues = [dist.success || 0, dist.pending || 0, dist.duplicate || 0, dist.failed || 0, dist.processing || 0];

        if (charts.statusDist) charts.statusDist.destroy();
        const ctxDist = document.getElementById("chart-status-dist").getContext("2d");
        charts.statusDist = new Chart(ctxDist, {
            type: 'pie',
            data: {
                labels: distLabels,
                datasets: [{
                    data: distValues,
                    backgroundColor: [
                        '#10b981', // Success (Green)
                        '#f59e0b', // Pending (Orange)
                        '#ef4444', // Duplicate (Red)
                        '#991b1b', // Failed (Dark Red)
                        '#3b82f6'  // Processing (Blue)
                    ],
                    borderWidth: 1,
                    borderColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: textColor, font: { size: 9 }, boxWidth: 10 }
                    }
                }
            }
        });

        // 3. Top Active Resellers (Bar Chart)
        const resellerNames = data.topResellers.map(r => r.reseller_name);
        const resellerCounts = data.topResellers.map(r => r.count);

        if (charts.topResellers) charts.topResellers.destroy();
        const ctxRes = document.getElementById("chart-top-resellers").getContext("2d");
        charts.topResellers = new Chart(ctxRes, {
            type: 'bar',
            data: {
                labels: resellerNames,
                datasets: [{
                    label: 'Requests',
                    data: resellerCounts,
                    backgroundColor: '#2563eb',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 9 } } },
                    y: { grid: { display: false }, ticks: { color: textColor, font: { size: 9, weight: 'bold' } } }
                }
            }
        });

        // 4. Most Used Products (Bar Chart)
        const productCodes = data.topProducts.map(p => p.product_code);
        const productCounts = data.topProducts.map(p => p.count);

        if (charts.mostProducts) charts.mostProducts.destroy();
        const ctxProd = document.getElementById("chart-most-products").getContext("2d");
        charts.mostProducts = new Chart(ctxProd, {
            type: 'bar',
            data: {
                labels: productCodes,
                datasets: [{
                    label: 'Volume',
                    data: productCounts,
                    backgroundColor: '#06b6d4',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: textColor, font: { size: 9, weight: 'bold' } } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 9 } } }
                }
            }
        });

    } catch (err) {
        console.error("Error drawing dashboard charts:", err);
    }
}

// Fetch Table Records (support paging, sorting, filtering)
async function fetchTable(appendMode = false) {
    isInfiniteLoading = appendMode;
    const tableBody = document.getElementById("inbox-table-body");
    if (!tableBody) return;

    if (!appendMode) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="p-12 text-center text-slate-400">
                    <div class="flex items-center justify-center gap-2">
                        <div class="spinner"></div>
                        <span>Loading transactions...</span>
                    </div>
                </td>
            </tr>
        `;
    }

    try {
        const queryParams = getFiltersQueryParams();
        queryParams.append("page", inboxPage);
        queryParams.append("limit", inboxLimit);
        queryParams.append("sortCol", inboxSortCol);
        queryParams.append("sortDir", inboxSortDir);

        const response = await fetch(`${API_BASE_URL}/api/inbox?${queryParams.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch ledger rows");
        const payload = await response.json();
        
        const records = payload.data || [];
        const pagination = payload.pagination || { total: 0, totalPages: 0 };

        // Save max ID to help live polling check for newer elements
        if (records.length > 0 && inboxPage === 1) {
            const ids = records.map(r => r.inbox_id).filter(id => !isNaN(id));
            if (ids.length > 0) {
                maxInboxId = Math.max(...ids);
            }
        }

        renderTableRows(records, appendMode);
        updatePaginationUI(pagination);
    } catch (err) {
        console.error("Error loading table data:", err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="p-12 text-center text-red-500 font-semibold">
                    <i class="fa-solid fa-circle-exclamation mr-1"></i> Failed to Load Table Data: ${err.message}
                </td>
            </tr>
        `;
    }
}

// Get filter parameters from DOM elements
function getFiltersQueryParams() {
    const searchVal = document.getElementById("inbox-search").value.trim();
    const resellerVal = document.getElementById("filter-reseller").value;
    const productVal = document.getElementById("filter-product").value;
    const statusVal = document.getElementById("filter-status").value;
    const dateRange = document.getElementById("filter-date-range").value;

    const params = new URLSearchParams();
    if (searchVal) params.append("search", searchVal);
    if (resellerVal) params.append("reseller", resellerVal);
    if (productVal) params.append("product", productVal);
    if (statusVal) params.append("status", statusVal);

    // Compute Date Range
    let startDate = "";
    let endDate = "";
    const today = new Date();
    
    if (dateRange === "today") {
        startDate = formatDateISO(today);
        endDate = formatDateISO(today);
    } else if (dateRange === "yesterday") {
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        startDate = formatDateISO(yest);
        endDate = formatDateISO(yest);
    } else if (dateRange === "7days") {
        const past = new Date(today);
        past.setDate(past.getDate() - 7);
        startDate = formatDateISO(past);
        endDate = formatDateISO(today);
    } else if (dateRange === "30days") {
        const past = new Date(today);
        past.setDate(past.getDate() - 30);
        startDate = formatDateISO(past);
        endDate = formatDateISO(today);
    }

    if (startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
    }

    return params;
}

function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Render dynamic rows in table
function renderTableRows(records, appendMode = false) {
    const tableBody = document.getElementById("inbox-table-body");
    if (!tableBody) return;

    if (!appendMode) {
        tableBody.innerHTML = "";
    }

    if (records.length === 0 && !appendMode) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="p-12 text-center text-slate-400">
                    <i class="fa-regular fa-folder-open text-2xl block mb-2 opacity-50"></i>
                    No incoming requests found matching the current filter criteria
                </td>
            </tr>
        `;
        return;
    }

    records.forEach(row => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/75 dark:hover:bg-slate-800/40 cursor-pointer border-b border-lightBorder dark:border-darkBorder transition-colors";
        tr.addEventListener('click', () => openDetailModal(row.inbox_id));

        // Format date local
        const dateObj = new Date(row.created_at);
        const formattedDate = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        // Status Badge Styling
        let badgeStyle = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
        if (row.status === "Success") {
            badgeStyle = "bg-success/15 text-success border border-success/20";
        } else if (row.status === "Pending") {
            badgeStyle = "bg-warning/15 text-warning border border-warning/20";
        } else if (row.status === "Duplicate Transaction") {
            badgeStyle = "bg-failed/15 text-failed border border-failed/20";
        } else if (row.status === "Failed") {
            badgeStyle = "bg-red-900/10 text-red-700 dark:text-red-400 border border-red-900/20";
        } else if (row.status === "Processing") {
            badgeStyle = "bg-processing/15 text-processing border border-processing/20";
        }

        tr.innerHTML = `
            <td class="p-3 font-bold text-slate-800 dark:text-[#f8fafc]" style="font-family: monospace;">${row.transaction_id || row.inbox_id}</td>
            <td class="p-3 text-slate-500 whitespace-nowrap">${formattedDate}</td>
            <td class="p-3 font-semibold text-slate-600 dark:text-slate-400">${row.sender_ip}</td>
            <td class="p-3 font-mono font-medium">${row.reseller_code}</td>
            <td class="p-3 font-semibold text-slate-700 dark:text-slate-300 max-w-[130px] truncate" title="${row.reseller_name}">${row.reseller_name}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-bold font-mono">${row.product_code}</span></td>
            <td class="p-3 font-semibold font-mono">${row.destination}</td>
            <td class="p-3 max-w-[200px] truncate text-slate-400 italic" title="${row.message}">${row.message}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${badgeStyle}">${row.status}</span></td>
            <td class="p-3 text-slate-500 max-w-[120px] truncate font-mono" title="${row.reference_id}">${row.reference_id}</td>
        `;

        tableBody.appendChild(tr);
    });
}

// Update Pagination controls
function updatePaginationUI(pagination) {
    const infoEl = document.getElementById("inbox-pagination-info");
    const prevBtn = document.getElementById("btn-inbox-prev");
    const nextBtn = document.getElementById("btn-inbox-next");
    const numbersContainer = document.getElementById("inbox-page-numbers");

    const total = pagination.total || 0;
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const totalPages = pagination.totalPages || 0;

    const startNum = total === 0 ? 0 : (page - 1) * limit + 1;
    const endNum = Math.min(page * limit, total);

    if (infoEl) {
        infoEl.textContent = `Showing ${startNum} to ${endNum} of ${total} requests`;
    }

    if (prevBtn) prevBtn.disabled = page === 1;
    if (nextBtn) nextBtn.disabled = page === totalPages || totalPages === 0;

    if (numbersContainer) {
        numbersContainer.innerHTML = '';
        if (totalPages <= 1) return;

        const maxVisible = 5;
        let startPage = Math.max(1, page - 2);
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement("button");
            btn.className = `w-8 h-8 rounded-lg text-xs font-semibold ${i === page ? 'bg-brandBlue text-white shadow-sm' : 'text-[#475569] dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-slate-800'}`;
            btn.textContent = i;
            btn.addEventListener('click', () => {
                inboxPage = i;
                fetchTable(false);
            });
            numbersContainer.appendChild(btn);
        }
    }
}

// Polling background tasks for new transactions
function startLivePolling() {
    // Perform checking every 30 seconds
    liveInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/inbox/live?lastId=${maxInboxId}`);
            if (!response.ok) throw new Error("Failed polling live data");
            const data = await response.json();

            // Auto refresh stats counters
            fetchStatistics();

            if (data.newRequests && data.newRequests.length > 0) {
                // We have new requests!
                const count = data.newRequests.length;
                
                // Show notification bubble
                showLiveNotification(count);

                // Fetch new table data to show top results if page is 1
                if (inboxPage === 1) {
                    fetchTable(false);
                }
            }
        } catch (err) {
            console.error("Live polling failed:", err);
        }
    }, 30000);
}

// Show live notification popup
function showLiveNotification(count) {
    const box = document.getElementById("live-notification-box");
    const msg = document.getElementById("notification-message");
    if (!box || !msg) return;

    msg.textContent = `${count} new incoming transaction request(s) received in the last 30 seconds.`;
    
    // Animate display
    box.classList.remove("hidden");
    setTimeout(() => {
        box.classList.remove("translate-y-2", "opacity-0");
        box.classList.add("translate-y-0", "opacity-100");
    }, 10);

    // Auto dismiss after 8 seconds
    setTimeout(() => {
        dismissNotification();
    }, 8000);
}

function dismissNotification() {
    const box = document.getElementById("live-notification-box");
    if (!box) return;
    box.classList.remove("translate-y-0", "opacity-100");
    box.classList.add("translate-y-2", "opacity-0");
    setTimeout(() => {
        box.classList.add("hidden");
    }, 300);
}

// Open Detail Modal
async function openDetailModal(inboxId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/inbox/${inboxId}`);
        if (!response.ok) throw new Error("Detail not found");
        const details = await response.json();

        // Populate fields
        document.getElementById("detail-inbox-id-title").textContent = `Inbox ID: ${details.inbox_id}`;
        document.getElementById("detail-created-at").textContent = formatFullDate(details.created_at);
        document.getElementById("detail-status-timestamp").textContent = details.status_timestamp ? formatFullDate(details.status_timestamp) : "-";
        document.getElementById("detail-reseller-code").textContent = details.reseller_code;
        document.getElementById("detail-reseller-name").textContent = details.reseller_name;
        document.getElementById("detail-product-code").textContent = details.product_code;
        document.getElementById("detail-destination").textContent = details.destination;
        document.getElementById("detail-sender-ip").textContent = details.sender_ip;
        document.getElementById("detail-reference-id").textContent = details.reference_id;
        document.getElementById("detail-terminal").textContent = details.terminal;
        document.getElementById("detail-service-center").textContent = details.service_center;
        
        // Code message fields
        document.getElementById("detail-request-message").textContent = details.message;
        document.getElementById("detail-response-message").textContent = details.response_message || "-";

        // Status Badge Style
        const badge = document.getElementById("detail-status");
        badge.textContent = details.status;
        badge.className = "px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px]";
        
        if (details.status === "Success") {
            badge.className += " bg-success/15 text-success border border-success/20";
        } else if (details.status === "Pending") {
            badge.className += " bg-warning/15 text-warning border border-warning/20";
        } else if (details.status === "Duplicate Transaction") {
            badge.className += " bg-failed/15 text-failed border border-failed/20";
        } else if (details.status === "Failed") {
            badge.className += " bg-red-900/10 text-red-700 dark:text-red-400 border border-red-900/20";
        } else if (details.status === "Processing") {
            badge.className += " bg-processing/15 text-processing border border-processing/20";
        }

        // Copy transaction ID handler
        const btnCopyTx = document.getElementById("btn-copy-transaction");
        btnCopyTx.onclick = () => {
            navigator.clipboard.writeText(details.transaction_id);
            showTemporaryToast(btnCopyTx, "Copied ID!");
        };

        // Copy message handler
        const btnCopyMsg = document.getElementById("btn-copy-request");
        btnCopyMsg.onclick = () => {
            navigator.clipboard.writeText(details.message);
            showTemporaryToast(btnCopyMsg, "Copied Message!");
        };

        // Open Modal
        const modal = document.getElementById("inbox-detail-modal");
        modal.classList.remove("hidden");

    } catch (err) {
        alert("Failed to load details: " + err.message);
    }
}

function showTemporaryToast(button, text) {
    const originalText = button.innerHTML;
    button.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${text}`;
    button.disabled = true;
    setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
    }, 1500);
}

function formatFullDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID');
}

// Close Modal
function closeModal() {
    const modal = document.getElementById("inbox-detail-modal");
    if (modal) modal.classList.add("hidden");
}

// Client Side Export CSV/Excel generators (queries the database dynamically)
async function triggerClientSideExport(format) {
    try {
        const queryParams = getFiltersQueryParams();
        queryParams.append("page", 1);
        queryParams.append("limit", 2000); // pull maximum 2000 rows for report
        queryParams.append("sortCol", "created_at");
        queryParams.append("sortDir", "desc");

        const response = await fetch(`${API_BASE_URL}/api/inbox?${queryParams.toString()}`);
        if (!response.ok) throw new Error("Could not pull records for export");
        const payload = await response.json();
        const records = payload.data || [];

        if (records.length === 0) {
            alert("No records found to export.");
            return;
        }

        let content = "";
        let filename = `BMP_Inbox_Export_${format.toUpperCase()}`;

        if (format === 'csv') {
            content = "Transaction ID,Date Time,IP Address,Reseller Code,Reseller Name,Product,Destination,Status,Terminal,Service Center,Reference ID\r\n";
            records.forEach(row => {
                const dateObj = new Date(row.created_at);
                const formattedDate = dateObj.toLocaleDateString('id-ID') + ' ' + dateObj.toLocaleTimeString('id-ID');
                
                content += `"${row.transaction_id}","${formattedDate}","${row.sender_ip}","${row.reseller_code}","${row.reseller_name}","${row.product_code}","${row.destination}","${row.status}","${row.terminal}","${row.service_center}","${row.reference_id}"\r\n`;
            });

            downloadBlobFile(content, "text/csv;charset=utf-8;", `${filename}.csv`);
        } else {
            // Excel XLS (as tab delimited file, compatible with Excel)
            content = "Transaction ID\tDate Time\tIP Address\tReseller Code\tReseller Name\tProduct\tDestination\tStatus\tTerminal\tService Center\tReference ID\r\n";
            records.forEach(row => {
                const dateObj = new Date(row.created_at);
                const formattedDate = dateObj.toLocaleDateString('id-ID') + ' ' + dateObj.toLocaleTimeString('id-ID');
                
                content += `${row.transaction_id}\t${formattedDate}\t${row.sender_ip}\t${row.reseller_code}\t${row.reseller_name}\t${row.product_code}\t${row.destination}\t${row.status}\t${row.terminal}\t${row.service_center}\t${row.reference_id}\r\n`;
            });

            downloadBlobFile(content, "application/vnd.ms-excel;charset=utf-8;", `${filename}.xls`);
        }

    } catch (err) {
        alert("Failed to export: " + err.message);
    }
}

function downloadBlobFile(content, type, filename) {
    const blob = new Blob([content], { type: type });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Attach Page Event Handlers
function attachEventListeners() {
    // Modal buttons
    document.getElementById("btn-close-modal").addEventListener('click', closeModal);
    document.getElementById("btn-close-modal-footer").addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        const modal = document.getElementById("inbox-detail-modal");
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close notification bubble
    document.getElementById("btn-close-notification").addEventListener('click', dismissNotification);

    // Refresh and Reset
    document.getElementById("btn-refresh").addEventListener('click', () => {
        inboxPage = 1;
        refreshAllData();
    });

    document.getElementById("btn-reset").addEventListener('click', () => {
        document.getElementById("inbox-search").value = "";
        document.getElementById("filter-reseller").value = "";
        document.getElementById("filter-product").value = "";
        document.getElementById("filter-status").value = "";
        document.getElementById("filter-date-range").value = "today";
        inboxPage = 1;
        refreshAllData();
    });

    // Paging limit dropdown
    // Note: since our limits and paging select is custom inside tables footer, let's keep it simple:
    // Paging select logic is managed.
    // Next/Prev buttons
    document.getElementById("btn-inbox-prev").addEventListener('click', () => {
        if (inboxPage > 1) {
            inboxPage--;
            fetchTable(false);
        }
    });
    document.getElementById("btn-inbox-next").addEventListener('click', () => {
        inboxPage++;
        fetchTable(false);
    });

    // Infinite Loading button
    document.getElementById("btn-load-more").addEventListener('click', () => {
        inboxPage++;
        fetchTable(true); // pass appendMode = true
    });

    // Sorting Headers click events
    const attachSortHeader = (headerId, colKey) => {
        const el = document.getElementById(headerId);
        if (!el) return;
        el.addEventListener('click', () => {
            if (inboxSortCol === colKey) {
                inboxSortDir = inboxSortDir === 'desc' ? 'asc' : 'desc';
            } else {
                inboxSortCol = colKey;
                inboxSortDir = 'desc';
            }

            // Reset headers sort icons
            ['sort-txid', 'sort-date', 'sort-reseller-code', 'sort-reseller-name', 'sort-product-code', 'sort-destination', 'sort-status'].forEach(id => {
                const header = document.getElementById(id);
                if (header) {
                    const cleanName = header.textContent.trim();
                    header.innerHTML = `${cleanName} <i class="fa-solid fa-sort ml-1"></i>`;
                }
            });

            // Update active header sort icon
            const activeHeader = document.getElementById(headerId);
            const cleanName = activeHeader.textContent.trim();
            const icon = inboxSortDir === 'desc' ? 'fa-sort-down' : 'fa-sort-up';
            activeHeader.innerHTML = `${cleanName} <i class="fa-solid ${icon} ml-1"></i>`;

            inboxPage = 1;
            fetchTable(false);
        });
    };

    attachSortHeader("sort-txid", "transaction_id");
    attachSortHeader("sort-date", "created_at");
    attachSortHeader("sort-reseller-code", "reseller_code");
    attachSortHeader("sort-reseller-name", "reseller_name");
    attachSortHeader("sort-product-code", "product_code");
    attachSortHeader("sort-destination", "destination");
    attachSortHeader("sort-status", "status");

    // Dynamic Filter triggers
    ['filter-reseller', 'filter-product', 'filter-status', 'filter-date-range'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', () => {
                inboxPage = 1;
                fetchTable(false);
            });
        }
    });

    // Debounced search
    let searchTimeout;
    document.getElementById("inbox-search").addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            inboxPage = 1;
            fetchTable(false);
        }, 500);
    });

    // Export Buttons (removed from UI)

    // Sidebar Force Sync
    const syncBtn = document.getElementById("nav-refresh-inbox");
    if (syncBtn) {
        syncBtn.addEventListener('click', (e) => {
            e.preventDefault();
            inboxPage = 1;
            refreshAllData();
        });
    }

    // Sidebar Logout
    const logoutBtn = document.getElementById("nav-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('isLoggedIn');
            window.location.reload();
        });
    }
}
