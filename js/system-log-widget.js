(function () {
    // 1. Create and inject CSS Styles
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
        /* Floating Widget Button */
        .log-widget-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 54px;
            height: 54px;
            border-radius: 50%;
            background: linear-gradient(135deg, #0052ff, #2563eb);
            color: #ffffff;
            border: none;
            box-shadow: 0 4px 20px rgba(0, 82, 255, 0.35);
            cursor: pointer;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .log-widget-btn:hover {
            transform: scale(1.08) translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 82, 255, 0.45);
        }
        .log-widget-btn i {
            font-size: 1.35rem;
        }
        .log-widget-btn .badge-count {
            position: absolute;
            top: -2px;
            right: -2px;
            background: #ef4444;
            color: white;
            font-size: 0.68rem;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 10px;
            border: 2px solid var(--bg-card, #ffffff);
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        /* Sticky Log Panel Window */
        .log-panel-window {
            position: fixed;
            bottom: 90px;
            right: 24px;
            width: 720px;
            max-width: calc(100vw - 48px);
            height: 520px;
            background: var(--bg-card, #ffffff);
            border: 1px solid var(--border-color, #e2e8f0);
            border-radius: 16px;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
            z-index: 9998;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: scale(0.9) translateY(20px);
            opacity: 0;
            pointer-events: none;
        }
        .log-panel-window.open {
            transform: scale(1) translateY(0);
            opacity: 1;
            pointer-events: auto;
        }

        /* Panel Window Header */
        .log-panel-header {
            padding: 14px 20px;
            background: #f8fafc;
            border-bottom: 1px solid var(--border-color, #e2e8f0);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .dark .log-panel-header {
            background: #1e293b;
        }
        .log-panel-title {
            font-family: 'Outfit', sans-serif;
            font-weight: 700;
            font-size: 0.95rem;
            color: var(--text-primary, #0f172a);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .log-panel-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .log-panel-close-btn {
            background: transparent;
            border: none;
            color: var(--text-muted, #94a3b8);
            cursor: pointer;
            font-size: 1rem;
            transition: color 0.2s;
        }
        .log-panel-close-btn:hover {
            color: #ef4444;
        }

        /* Controls / Filter Bar */
        .log-panel-filters {
            padding: 12px 20px;
            background: var(--bg-primary, #f8fafc);
            border-bottom: 1px solid var(--border-color, #e2e8f0);
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
            font-size: 0.78rem;
        }
        .log-filter-group {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .log-filter-group label {
            font-weight: 600;
            color: var(--text-secondary, #475569);
            white-space: nowrap;
        }
        .log-filter-input {
            background: var(--bg-card, #ffffff);
            border: 1px solid var(--border-color, #e2e8f0);
            padding: 5px 10px;
            border-radius: 6px;
            font-family: inherit;
            font-size: 0.75rem;
            color: var(--text-primary, #0f172a);
            outline: none;
        }
        .log-filter-input:focus {
            border-color: #0052ff;
        }
        .log-search-pesan {
            flex-grow: 1;
            min-width: 150px;
        }

        /* Logs Table Container */
        .log-table-container {
            flex-grow: 1;
            overflow-y: auto;
            background: var(--bg-card, #ffffff);
        }
        .log-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.75rem;
            text-align: left;
        }
        .log-table th {
            position: sticky;
            top: 0;
            background: var(--bg-primary, #f8fafc);
            z-index: 10;
            padding: 8px 16px;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.68rem;
            color: var(--text-secondary, #475569);
            border-bottom: 1px solid var(--border-color, #e2e8f0);
        }
        .log-table td {
            padding: 8px 16px;
            border-bottom: 1px solid var(--border-color, #e2e8f0);
            color: var(--text-primary, #0f172a);
            vertical-align: top;
            line-height: 1.35;
        }

        /* Log Row Styling (replica of WinForms OtomaX Log screen) */
        .log-row-error {
            background-color: #fee2e2 !important; /* Soft Red background */
            color: #991b1b !important;
        }
        .dark .log-row-error {
            background-color: rgba(239, 68, 68, 0.15) !important;
            color: #fca5a5 !important;
        }
        .log-row-error td {
            color: inherit !important;
        }

        .log-row-warning {
            background-color: #fef9c3 !important; /* Soft Yellow background */
            color: #854d0e !important;
        }
        .dark .log-row-warning {
            background-color: rgba(245, 158, 11, 0.15) !important;
            color: #fde047 !important;
        }
        .log-row-warning td {
            color: inherit !important;
        }

        .log-type-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 0.65rem;
            text-transform: uppercase;
        }

        /* Scrollbar styling for sticky widget */
        .log-table-container::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        .log-table-container::-webkit-scrollbar-track {
            background: transparent;
        }
        .log-table-container::-webkit-scrollbar-thumb {
            background: var(--border-color, #cbd5e1);
            border-radius: 3px;
        }
        
        /* Pulse Animation for New Log Alerts */
        @keyframes pulseAlert {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .pulse-error {
            animation: pulseAlert 2s infinite;
        }
    `;
    document.head.appendChild(styleEl);

    // 2. Create Floating Widget Button
    const widgetBtn = document.createElement("button");
    widgetBtn.className = "log-widget-btn";
    widgetBtn.id = "log-widget-toggle-btn";
    widgetBtn.title = "Buka Log Sistem - OtomaX";
    widgetBtn.innerHTML = `
        <i class="fa-solid fa-terminal"></i>
        <span class="badge-count" id="log-widget-badge" style="display: none;">0</span>
    `;

    // 3. Create Log Panel HTML Window
    const todayStr = new Date().toISOString().split('T')[0];
    const logPanel = document.createElement("div");
    logPanel.className = "log-panel-window";
    logPanel.id = "log-panel-window";
    logPanel.innerHTML = `
        <div class="log-panel-header">
            <div class="log-panel-title">
                <i class="fa-solid fa-terminal" style="color: #0052ff;"></i>
                <span>Log Sistem - OtomaX</span>
            </div>
            <div class="log-panel-actions">
                <button class="log-panel-close-btn" id="log-panel-close-btn">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>
        <div class="log-panel-filters">
            <div class="log-filter-group">
                <label>Waktu:</label>
                <input type="date" class="log-filter-input" id="log-filter-start" value="${todayStr}">
                <span>s/d</span>
                <input type="date" class="log-filter-input" id="log-filter-end" value="${todayStr}">
            </div>
            <div class="log-filter-group">
                <label>Tipe:</label>
                <select class="log-filter-input" id="log-filter-type">
                    <option value="all">-- All --</option>
                    <option value="3">Error</option>
                    <option value="2">Warning</option>
                    <option value="1">Info</option>
                </select>
            </div>
            <div class="log-filter-group">
                <label>Limit:</label>
                <select class="log-filter-input" id="log-filter-limit">
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100" selected>100</option>
                </select>
            </div>
            <div class="log-filter-group log-search-pesan">
                <input type="text" class="log-filter-input" style="width: 100%;" id="log-filter-search" placeholder="Cari pesan log...">
            </div>
        </div>
        <div class="log-table-container">
            <table class="log-table">
                <thead>
                    <tr>
                        <th style="width: 140px;">Waktu</th>
                        <th style="width: 80px;">Tipe</th>
                        <th>Pesan</th>
                    </tr>
                </thead>
                <tbody id="log-table-body">
                    <tr>
                        <td colspan="3" style="text-align: center; padding: 24px; color: var(--text-muted);">
                            Memuat log sistem...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    document.body.appendChild(widgetBtn);
    document.body.appendChild(logPanel);

    // 4. API base url resolution
    const API_BASE_URL = (window.location.protocol === 'file:') ? 'http://localhost:3000' : '';

    let localLogs = [];
    let unreadErrorsCount = 0;

    // Toggle Log Panel visibility
    widgetBtn.addEventListener("click", () => {
        const isOpen = logPanel.classList.toggle("open");
        if (isOpen) {
            fetchSystemLogs();
            // Reset unread count when opening
            unreadErrorsCount = 0;
            updateBadge();
            widgetBtn.classList.remove("pulse-error");
        }
    });

    document.getElementById("log-panel-close-btn").addEventListener("click", () => {
        logPanel.classList.remove("open");
    });

    // Handle filter inputs
    const filterStart = document.getElementById("log-filter-start");
    const filterEnd = document.getElementById("log-filter-end");
    const filterType = document.getElementById("log-filter-type");
    const filterLimit = document.getElementById("log-filter-limit");
    const filterSearch = document.getElementById("log-filter-search");

    const onFilterChange = () => {
        // Redraw table
        renderLogs();
    };

    filterStart.addEventListener("change", () => fetchSystemLogs());
    filterEnd.addEventListener("change", () => fetchSystemLogs());
    filterLimit.addEventListener("change", () => fetchSystemLogs());
    filterType.addEventListener("change", onFilterChange);
    filterSearch.addEventListener("input", onFilterChange);

    // Fetch logs from Node backend API
    async function fetchSystemLogs() {
        try {
            const queryParams = new URLSearchParams({
                limit: filterLimit.value,
                startDate: filterStart.value,
                endDate: filterEnd.value
            });
            const response = await fetch(`${API_BASE_URL}/api/system-logs?${queryParams.toString()}`);
            if (!response.ok) throw new Error("API Failure");
            
            localLogs = await response.json();
            renderLogs();
        } catch (err) {
            console.error("Failed to load system logs:", err);
            document.getElementById("log-table-body").innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 20px; color: var(--failed, #ef4444);">
                        Gagal memuat log sistem dari server.
                    </td>
                </tr>
            `;
        }
    }

    // Render local logs array to table view with formatting and filtering
    function renderLogs() {
        const tableBody = document.getElementById("log-table-body");
        if (!tableBody) return;

        const typeFilter = filterType.value;
        const searchKeyword = filterSearch.value.trim().toLowerCase();

        // Filter type and search locally
        let filtered = localLogs.filter(log => {
            if (typeFilter !== "all" && String(log.tipe) !== typeFilter) {
                return false;
            }
            if (searchKeyword && !log.pesan.toLowerCase().includes(searchKeyword)) {
                return false;
            }
            return true;
        });

        // RULE: "buat hanya 5 row ketika statusnya error / warning"
        // If the selected log type filter is Error (3) or Warning (2), limit display to 5 rows
        if (typeFilter === "3" || typeFilter === "2") {
            filtered = filtered.slice(0, 5);
        }

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 20px; color: var(--text-muted, #94a3b8);">
                        Tidak ada log sistem yang cocok.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = "";
        filtered.forEach(log => {
            const tr = document.createElement("tr");
            
            // Format log rows background based on type
            if (log.tipe === 3) {
                tr.className = "log-row-error";
            } else if (log.tipe === 2) {
                tr.className = "log-row-warning";
            }

            // Time formatting (Waktu)
            const waktuObj = new Date(log.waktu);
            let timeStr = log.waktu;
            if (!isNaN(waktuObj.getTime())) {
                const pad = (n) => String(n).padStart(2, '0');
                const yy = String(waktuObj.getFullYear()).slice(-2);
                const mm = pad(waktuObj.getMonth() + 1);
                const dd = pad(waktuObj.getDate());
                const hh = pad(waktuObj.getHours());
                const min = pad(waktuObj.getMinutes());
                const ss = pad(waktuObj.getSeconds());
                timeStr = `${dd}/${mm}/${yy} ${hh}:${min}:${ss}`;
            }

            // Type formatting label
            let typeLabel = "INFO";
            if (log.tipe === 3) typeLabel = "Error";
            if (log.tipe === 2) typeLabel = "Warning";

            tr.innerHTML = `
                <td style="font-weight: 500; font-family: monospace; white-space: nowrap;">${timeStr}</td>
                <td style="font-weight: 700;">${typeLabel}</td>
                <td>${log.pesan}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Badge Updates for incoming Error/Warning logs
    function updateBadge() {
        const badge = document.getElementById("log-widget-badge");
        if (unreadErrorsCount > 0) {
            badge.textContent = unreadErrorsCount;
            badge.style.display = "block";
        } else {
            badge.style.display = "none";
        }
    }

    // Set up periodic check (polling) for new Error/Warning logs
    setInterval(async () => {
        // Only pull 5 latest logs to check for new errors
        try {
            const response = await fetch(`${API_BASE_URL}/api/system-logs?limit=5`);
            if (response.ok) {
                const latest = await response.json();
                if (latest.length > 0 && localLogs.length > 0) {
                    // Check if the latest log is newer than our local logs
                    const newestFetchedTime = new Date(latest[0].waktu).getTime();
                    const currentNewestTime = new Date(localLogs[0].waktu).getTime();
                    
                    if (newestFetchedTime > currentNewestTime) {
                        // We have new logs! Check if there are any Errors (3) or Warnings (2)
                        const newSeverityLogs = latest.filter(log => {
                            const logTime = new Date(log.waktu).getTime();
                            return logTime > currentNewestTime && (log.tipe === 3 || log.tipe === 2);
                        });
                        
                        if (newSeverityLogs.length > 0 && !logPanel.classList.contains("open")) {
                            unreadErrorsCount += newSeverityLogs.length;
                            updateBadge();
                            widgetBtn.classList.add("pulse-error");
                        }
                        
                        // Auto-refresh panel if open
                        if (logPanel.classList.contains("open")) {
                            fetchSystemLogs();
                        }
                    }
                }
            }
        } catch (err) {
            // Ignore background errors
        }
    }, 15000);

})();
