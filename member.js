// Global State
let originalModules = [];
let filteredModules = [];
let currentPage = 1;
let rowsPerPage = 10;
let totalPages = 0;

// API Configurations
const API_BASE_URL = (window.location.protocol === 'file:') ? 'http://localhost:3000' : '';

// DOM Elements
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const limitFilter = document.getElementById('limit-filter');
const tableBody = document.getElementById('table-body');
const currentTimeEl = document.getElementById('current-time');
const paginationInfo = document.getElementById('pagination-info');
const pageNumbersContainer = document.getElementById('page-numbers');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

// Stats Counters Elements
const statTotalSaldoVal = document.getElementById('stat-total-saldo-val');
const statPotentialActiveVal = document.getElementById('stat-potential-active-val');
const statNonPotentialVal = document.getElementById('stat-non-potential-val');
const statTrx30dVal = document.getElementById('stat-trx-30d-val');

// Initialize Member/Modul Page
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

    // Event Listeners
    searchInput.addEventListener('input', () => {
        currentPage = 1;
        handleSearch();
    });

    statusFilter.addEventListener('change', () => {
        currentPage = 1;
        handleSearch();
    });

    limitFilter.addEventListener('change', () => {
        rowsPerPage = parseInt(limitFilter.value);
        currentPage = 1;
        paginateAndRender();
    });

    btnPrev.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            paginateAndRender();
        }
    });

    btnNext.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            paginateAndRender();
        }
    });

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
            statusFilter.value = 'all';
            limitFilter.value = '10';
            rowsPerPage = 10;
            currentPage = 1;
            filteredModules = [...originalModules];
            handleSearch(); // will recalculate stats and render
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

// Update Clock widget
function updateTime() {
    const now = new Date();
    currentTimeEl.textContent = now.toLocaleTimeString('id-ID') + ' | ' + now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Fetch stats and modules from API
async function fetchData() {
    showTableLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/api/member/stats`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        const data = await response.json();

        originalModules = data.modules || [];
        handleSearch(); // calculate initial stats and render
    } catch (error) {
        console.error('Failed to fetch module data:', error);
        showTableError(error.message);
    }
}

// Handle client-side search and status filtering
function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    const statusVal = statusFilter.value;

    filteredModules = originalModules.filter(m => {
        // 1. Search Query Filter
        let matchesSearch = true;
        if (query) {
            const label = (m.label || '').toLowerCase();
            const kode = String(m.kode || '');
            const tujuan = (m.tujuan || '').toLowerCase();
            matchesSearch = label.includes(query) || kode.includes(query) || tujuan.includes(query);
        }

        // 2. Status Filter
        let matchesStatus = true;
        if (statusVal === 'active') {
            matchesStatus = m.aktif === 1;
        } else if (statusVal === 'inactive') {
            matchesStatus = m.aktif === 0;
        }

        return matchesSearch && matchesStatus;
    });

    // Recalculate stats based on current filteredModules list
    const totalSaldo = filteredModules
        .filter(m => m.aktif === 1)
        .reduce((sum, m) => sum + (m.saldo || 0), 0);
    const potentialActiveCount = filteredModules.filter(m => m.aktif === 1 && ((m.saldo && m.saldo > 0) || m.total_trx > 0)).length;
    const nonPotentialCount = filteredModules.filter(m => m.aktif === 0 || (m.aktif === 1 && (!m.saldo || m.saldo <= 0) && m.total_trx === 0)).length;
    const totalTrx30Days = filteredModules.reduce((sum, m) => sum + (m.total_trx || 0), 0);

    // Update stats cards in UI
    animateValue(statTotalSaldoVal, totalSaldo, true);
    animateValue(statPotentialActiveVal, potentialActiveCount);
    animateValue(statNonPotentialVal, nonPotentialCount);
    animateValue(statTrx30dVal, totalTrx30Days);

    paginateAndRender();
}

// Client-side pagination and rendering controller
function paginateAndRender() {
    totalPages = Math.ceil(filteredModules.length / rowsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    }

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedList = filteredModules.slice(start, end);

    renderTable(paginatedList);
    updatePaginationInfo();
}

// Render dynamic rows in table
function renderTable(modulesList) {
    tableBody.innerHTML = '';

    if (modulesList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fa-regular fa-folder-open empty-icon"></i>
                        <p>No modules or members found matching the search criteria</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    modulesList.forEach(m => {
        const row = document.createElement('tr');
        
        // Status Badge
        let statusBadge = '';
        if (m.aktif === 1) {
            statusBadge = '<span class="badge status-success"><i class="fa-solid fa-circle-check"></i> Active</span>';
        } else {
            statusBadge = '<span class="badge status-failed"><i class="fa-solid fa-circle-xmark"></i> Inactive</span>';
        }

        // Formatted balance
        const saldoVal = m.saldo !== null && m.saldo !== undefined ? formatCurrency(m.saldo) : '<span class="text-muted">-</span>';
        
        // Formatted rate
        const rateVal = `${m.success_rate}%`;

        row.innerHTML = `
            <td style="font-weight: 600; font-family: monospace;">${m.kode || '-'}</td>
            <td style="font-weight: 500;">${m.label || '-'}</td>
            <td style="color: var(--text-secondary); font-family: monospace; font-size: 0.8rem;">${m.tujuan || '-'}</td>
            <td class="text-right" style="font-weight: 600;">${saldoVal}</td>
            <td class="text-right" style="color: var(--text-secondary);">${m.total_trx !== null ? m.total_trx.toLocaleString('id-ID') : 0}</td>
            <td class="text-right" style="font-weight: 600; color: ${m.success_rate >= 80 ? 'var(--success)' : 'var(--failed)'};">${rateVal}</td>
            <td>${statusBadge}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Update pagination controls status and info text
function updatePaginationInfo() {
    const totalItems = filteredModules.length;
    const startNum = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const endNum = Math.min(currentPage * rowsPerPage, totalItems);

    paginationInfo.textContent = `Showing ${startNum} to ${endNum} of ${totalItems} modules`;

    btnPrev.disabled = currentPage === 1;
    btnNext.disabled = currentPage === totalPages || totalPages === 0;

    pageNumbersContainer.innerHTML = '';

    if (totalPages <= 1) return;

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
            paginateAndRender();
        });
        pageNumbersContainer.appendChild(btn);
    }
}

// Stats Card Counter Animation
function animateValue(element, target, isCurrency = false) {
    if (!element) return;

    let rawText = element.textContent.replace(/[^\d-]/g, '');
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

// Currency Formatter Utility
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'Rp 0';
    return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

// Table loading state indicator
function showTableLoading() {
    tableBody.innerHTML = `
        <tr class="placeholder-row">
            <td colspan="7">
                <div class="table-loader-wrapper">
                    <div class="spinner"></div>
                    <span>Fetching modules...</span>
                </div>
            </td>
        </tr>
    `;
}

// Table error state indicator
function showTableError(message) {
    tableBody.innerHTML = `
        <tr>
            <td colspan="7">
                <div class="empty-state" style="color: var(--failed);">
                    <i class="fa-solid fa-circle-exclamation empty-icon" style="color: var(--failed);"></i>
                    <p style="font-weight: 600;">Failed to Load Modules</p>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">${message}</p>
                    <button class="btn-pagination" onclick="fetchData()" style="margin: 16px auto 0 auto; display: flex;">
                        <i class="fa-solid fa-rotate"></i> Retry Connection
                    </button>
                </div>
            </td>
        </tr>
    `;
}
