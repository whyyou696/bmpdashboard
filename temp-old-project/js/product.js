// Global State
let currentPage = 1;
let totalPages = 0;
let productSalesChart = null;
let chartFilteredProduct = ''; // Track product selected from chart
let currentChartPage = 1;
let chartProducts = [];

// API Configurations
const API_BASE_URL = (window.location.protocol === 'file:') ? 'http://localhost:3000' : '';

// DOM Elements
const searchInput = document.getElementById('search-input');
const limitFilter = document.getElementById('limit-filter');
const dateModeFilter = document.getElementById('date-mode-filter');
const startDateFilter = document.getElementById('start-date-filter');
const endDateFilter = document.getElementById('end-date-filter');
const customDateStart = document.getElementById('custom-date-start');
const customDateEnd = document.getElementById('custom-date-end');
const productFilter = document.getElementById('product-filter');
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

// Product-Focused Stats Elements
const statUniqueProductsVal = document.getElementById('stat-unique-products-val');
const statTopProductVal = document.getElementById('stat-top-product-val');
const statTopProductTrx = document.getElementById('stat-top-product-trx');
const statAvgTrxVal = document.getElementById('stat-avg-trx-val');
const statTopProductProfitVal = document.getElementById('stat-top-product-profit-val');
const statTopProductProfitName = document.getElementById('stat-top-product-profit-name');

// Chart filter banner elements
const chartFilterBanner = document.getElementById('chart-filter-banner');
const chartFilterProductName = document.getElementById('chart-filter-product-name');
const btnClearChartFilter = document.getElementById('btn-clear-chart-filter');

// Chart Pagination Elements
const btnChartPrev = document.getElementById('btn-chart-prev');
const btnChartNext = document.getElementById('btn-chart-next');
const chartPaginationInfo = document.getElementById('chart-pagination-info');
const chartPaginationContainer = document.getElementById('chart-pagination');

// Date helper
const formatISODate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const today = new Date();
const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);

// Initialize Product Dashboard Page
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
            if (productSalesChart) {
                updateBarChartTheme(isDark);
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

    // Initialize Default Dates - "Hari Ini" mode by default
    startDateFilter.value = formatISODate(today);
    endDateFilter.value = formatISODate(today);

    updateTime();
    setInterval(updateTime, 1000);

    // Initial Fetch options & transactions
    initFiltersAndFetch();

    // Date Mode Toggle
    dateModeFilter.addEventListener('change', () => {
        const mode = dateModeFilter.value;
        if (mode === 'today') {
            customDateStart.style.display = 'none';
            customDateEnd.style.display = 'none';
            startDateFilter.value = formatISODate(today);
            endDateFilter.value = formatISODate(today);
        } else if (mode === 'all') {
            customDateStart.style.display = 'none';
            customDateEnd.style.display = 'none';
            startDateFilter.value = '';
            endDateFilter.value = '';
        } else {
            customDateStart.style.display = 'flex';
            customDateEnd.style.display = 'flex';
            // Set sensible defaults for custom mode
            startDateFilter.value = formatISODate(yesterday);
            endDateFilter.value = formatISODate(today);
        }
        currentPage = 1;
        fetchData();
    });

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

    productFilter.addEventListener('change', () => {
        // If user manually changes product filter, clear chart filter
        if (chartFilteredProduct && productFilter.value !== chartFilteredProduct) {
            clearChartFilter(false);
        }
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

    // Chart Pagination Listeners
    if (btnChartPrev) {
        btnChartPrev.addEventListener('click', () => {
            if (currentChartPage > 1) {
                currentChartPage--;
                renderProductBarChart();
            }
        });
    }

    if (btnChartNext) {
        btnChartNext.addEventListener('click', () => {
            const limit = chartProducts.length > 20 ? 10 : chartProducts.length;
            const totalChartPages = Math.ceil(chartProducts.length / limit);
            if (currentChartPage < totalChartPages) {
                currentChartPage++;
                renderProductBarChart();
            }
        });
    }

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
            limitFilter.value = '10';
            dateModeFilter.value = 'today';
            startDateFilter.value = formatISODate(today);
            endDateFilter.value = formatISODate(today);
            customDateStart.style.display = 'none';
            customDateEnd.style.display = 'none';
            productFilter.value = '';
            modulFilter.value = '';
            resellerFilter.value = '';
            statusFilter.value = '';
            snEmptyCheckbox.checked = true;
            currentPage = 1;
            currentChartPage = 1;
            clearChartFilter(false);
            fetchData();
        });
    }

    // Chart filter banner clear button
    if (btnClearChartFilter) {
        btnClearChartFilter.addEventListener('click', () => {
            clearChartFilter(true);
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

// Clear chart product filter
function clearChartFilter(refetch) {
    chartFilteredProduct = '';
    productFilter.value = '';
    if (chartFilterBanner) {
        chartFilterBanner.style.display = 'none';
    }
    currentPage = 1;
    if (refetch) {
        fetchData();
    }
}

// Set chart product filter (called on bar click)
function setChartFilter(productName) {
    // If clicking the same product, toggle off
    if (chartFilteredProduct === productName) {
        clearChartFilter(true);
        return;
    }

    chartFilteredProduct = productName;
    productFilter.value = productName;

    if (chartFilterBanner) {
        chartFilterBanner.style.display = 'flex';
    }
    if (chartFilterProductName) {
        chartFilterProductName.textContent = productName;
    }

    currentPage = 1;
    fetchData();

    // Scroll to the table section
    const tableSection = document.querySelector('.table-section');
    if (tableSection) {
        tableSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

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
        const response = await fetch(`${API_BASE_URL}/api/product/init`);
        if (response.ok) {
            const data = await response.json();
            
            // Populate Products dropdown
            if (data.products && data.products.length > 0) {
                data.products.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p;
                    opt.textContent = p;
                    productFilter.appendChild(opt);
                });
            }

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
    const productVal = productFilter.value;
    const modulVal = modulFilter.value;
    const resellerVal = resellerFilter.value;
    const statusVal = statusFilter.value;
    const snEmptyVal = snEmptyCheckbox.checked ? 'true' : 'false';

    const dateModeVal = dateModeFilter.value;

    const url = `${API_BASE_URL}/api/product/transactions?page=${currentPage}&limit=${limitVal}&search=${searchVal}&startDate=${startVal}&endDate=${endVal}&dateMode=${dateModeVal}&product=${productVal}&modul=${modulVal}&reseller=${resellerVal}&status=${statusVal}&sn_empty=${snEmptyVal}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        const data = await response.json();

        // 1. Update product-focused stats cards
        const prod = data.productivity || {};
        
        animateValue(statUniqueProductsVal, prod.uniqueProducts || 0, 'number');
        
        if (statTopProductVal) {
            statTopProductVal.textContent = prod.topProduct || '-';
        }
        if (statTopProductTrx) {
            statTopProductTrx.textContent = `${(prod.topProductTrx || 0).toLocaleString('id-ID')} Transaksi`;
        }
        
        animateValue(statAvgTrxVal, prod.avgTrxPerProduct || 0, 'number');
        // Card 4: Profit Produk Terlaris
        animateValue(statTopProductProfitVal, prod.topProductProfit || 0, 'currency');
        if (statTopProductProfitName) {
            statTopProductProfitName.textContent = `Profit dari ${prod.topProduct || '-'}`;
        }



        // 2. Render Product Sales Bar Chart (vertical)
        chartProducts = data.allProducts || [];
        currentChartPage = 1;
        renderProductBarChart();

        // 3. Render transaction list table
        const transactions = data.data || [];
        renderTable(transactions);

        // 4. Update pagination metadata
        const pag = data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };
        totalPages = pag.totalPages;
        updatePaginationInfo(pag.page, pag.limit, pag.total);

    } catch (error) {
        console.error('Failed to fetch product transaction data:', error);
        showTableError(error.message);
    }
}

// Render Vertical Bar Chart for Product Sales (with frontend pagination)
function renderProductBarChart() {
    const wrapper = document.getElementById('bar-chart-wrapper');
    if (!wrapper) return;

    // Destroy existing chart
    if (productSalesChart) {
        productSalesChart.destroy();
        productSalesChart = null;
    }

    if (!chartProducts || chartProducts.length === 0) {
        wrapper.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 300px; color: var(--text-secondary); font-size: 0.9rem;"><i class="fa-regular fa-folder-open" style="margin-right: 8px; font-size: 1.2rem;"></i> Tidak ada data produk</div>`;
        updateChartPaginationControls();
        return;
    }

    // Ensure canvas is present
    if (!wrapper.querySelector('canvas')) {
        wrapper.innerHTML = '<canvas id="chart-product-sales"></canvas>';
    }
    const canvas = document.getElementById('chart-product-sales');
    const ctx = canvas.getContext('2d');

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    // Paginate products: 10 per page if total > 20, otherwise show all
    const limit = chartProducts.length > 20 ? 10 : chartProducts.length;
    const startIndex = (currentChartPage - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = chartProducts.slice(startIndex, endIndex);

    const labels = paginatedProducts.map(p => p.name || 'Unknown');
    const successData = paginatedProducts.map(p => p.success_trx || 0);
    const failedData = paginatedProducts.map(p => p.failed_trx || 0);

    // Fixed height for vertical bar chart
    wrapper.style.minHeight = '380px';

    productSalesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Sukses',
                    data: successData,
                    backgroundColor: createGradientVertical(ctx, '#06b6d4', '#2563eb', isDark),
                    borderColor: 'transparent',
                    borderWidth: 0,
                    borderRadius: { topLeft: 6, topRight: 6 },
                    borderSkipped: false,
                    barPercentage: 0.7,
                    categoryPercentage: 0.75
                },
                {
                    label: 'Gagal',
                    data: failedData,
                    backgroundColor: createGradientVertical(ctx, '#ef4444', '#f97316', isDark),
                    borderColor: 'transparent',
                    borderWidth: 0,
                    borderRadius: { topLeft: 6, topRight: 6 },
                    borderSkipped: false,
                    barPercentage: 0.7,
                    categoryPercentage: 0.75
                }
            ]
        },
        options: {
            indexAxis: 'x', // Vertical bars
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 10,
                    bottom: 4
                }
            },
            scales: {
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11,
                            weight: 500
                        },
                        callback: function(value) {
                            if (value >= 1000) {
                                return (value / 1000).toFixed(value >= 10000 ? 0 : 1) + 'K';
                            }
                            return value;
                        }
                    },
                    title: {
                        display: true,
                        text: 'Jumlah Transaksi',
                        color: textColor,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12,
                            weight: 600
                        }
                    }
                },
                x: {
                    stacked: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11,
                            weight: 600
                        },
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    titleColor: isDark ? '#f1f5f9' : '#1e293b',
                    bodyColor: isDark ? '#cbd5e1' : '#475569',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    borderWidth: 1,
                    cornerRadius: 10,
                    padding: 12,
                    bodySpacing: 6,
                    titleFont: {
                        family: "'Inter', sans-serif",
                        weight: 700,
                        size: 13
                    },
                    bodyFont: {
                        family: "'Inter', sans-serif",
                        size: 12
                    },
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        },
                        label: function(context) {
                            const val = context.raw || 0;
                            const datasetLabel = context.dataset.label;
                            return ` ${datasetLabel}: ${val.toLocaleString('id-ID')} trx`;
                        },
                        afterBody: function(tooltipItems) {
                            const idx = tooltipItems[0].dataIndex;
                            const product = paginatedProducts[idx];
                            if (product) {
                                const total = product.total_trx || 0;
                                const success = product.success_trx || 0;
                                const sr = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';
                                return [`\n Total: ${total.toLocaleString('id-ID')} trx`, ` SR: ${sr}%`, `\n Klik untuk filter tabel`];
                            }
                            return [];
                        }
                    }
                }
            },
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const productName = paginatedProducts[idx].name;
                    setChartFilter(productName);
                }
            },
            onHover: function(event, elements) {
                event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
            },
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            }
        }
    });

    updateChartPaginationControls();
}

// Update chart pagination controls
function updateChartPaginationControls() {
    if (!chartPaginationContainer || !chartPaginationInfo || !btnChartPrev || !btnChartNext) return;

    const limit = chartProducts.length > 20 ? 10 : chartProducts.length;
    const totalItems = chartProducts ? chartProducts.length : 0;
    const totalChartPages = Math.ceil(totalItems / limit) || 1;

    // Normalize currentChartPage
    if (currentChartPage > totalChartPages) {
        currentChartPage = totalChartPages;
    }
    if (currentChartPage < 1) {
        currentChartPage = 1;
    }

    if (totalItems <= 20) {
        chartPaginationContainer.style.display = 'none';
    } else {
        chartPaginationContainer.style.display = 'flex';
        chartPaginationInfo.textContent = `Page ${currentChartPage} of ${totalChartPages}`;
        btnChartPrev.disabled = currentChartPage === 1;
        btnChartNext.disabled = currentChartPage === totalChartPages;
    }
}

// Create vertical gradient for bar backgrounds
function createGradientVertical(ctx, color1, color2, isDark) {
    const gradient = ctx.createLinearGradient(0, 400, 0, 0);
    if (isDark) {
        gradient.addColorStop(0, color1 + 'cc');
        gradient.addColorStop(1, color2 + 'cc');
    } else {
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
    }
    return gradient;
}

// Update bar chart colors on theme toggle
function updateBarChartTheme(isDark) {
    if (!productSalesChart) return;
    
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const ctx = productSalesChart.ctx;

    productSalesChart.data.datasets[0].backgroundColor = createGradientVertical(ctx, '#06b6d4', '#2563eb', isDark);
    productSalesChart.data.datasets[1].backgroundColor = createGradientVertical(ctx, '#ef4444', '#f97316', isDark);
    
    productSalesChart.options.scales.y.grid.color = gridColor;
    productSalesChart.options.scales.y.ticks.color = textColor;
    productSalesChart.options.scales.y.title.color = textColor;
    productSalesChart.options.scales.x.ticks.color = textColor;
    
    productSalesChart.options.plugins.tooltip.backgroundColor = isDark ? '#1e293b' : '#ffffff';
    productSalesChart.options.plugins.tooltip.titleColor = isDark ? '#f1f5f9' : '#1e293b';
    productSalesChart.options.plugins.tooltip.bodyColor = isDark ? '#cbd5e1' : '#475569';
    productSalesChart.options.plugins.tooltip.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    productSalesChart.update();
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
                <td colspan="11">
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

        // Highlight row if product matches chart filter
        const isHighlighted = chartFilteredProduct && t.kode_produk === chartFilteredProduct;

        row.innerHTML = `
            <td style="font-weight: 600; font-family: monospace;">${t.TrxID || '-'}</td>
            <td style="font-size: 0.8rem; color: var(--text-secondary);">${tglEntri}</td>
            <td><span style="background: ${isHighlighted ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.05)'}; padding: 4px 8px; border-radius: 4px; font-weight: 600; ${isHighlighted ? 'color: var(--vivid-blue);' : ''}">${t.kode_produk || '-'}</span></td>
            <td style="font-weight: 500;">${t.nama_modul || '-'}</td>
            <td style="font-weight: 500;">${t.nama_reseller || '-'}</td>
            <td style="font-family: monospace;">${t.tujuan || '-'}</td>
            <td style="font-family: monospace; font-size: 0.8rem;">${t.sn || '<span class="text-muted">-</span>'}</td>
            <td class="text-right" style="font-family: monospace;">${hrgBeli}</td>
            <td class="text-right" style="font-family: monospace;">${hrgJual}</td>
            <td class="text-right" style="font-family: monospace;">${labaFormatted}</td>
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

    const duration = 600;
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
            <td colspan="11">
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
            <td colspan="11">
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
