'use client';

import { useState, useEffect, useRef } from 'react';

export default function SystemLogWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [unreadErrorsCount, setUnreadErrorsCount] = useState(0);
  const [pulseError, setPulseError] = useState(false);

  // Filter States
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [logType, setLogType] = useState('all'); // 'all', '1', '2', '3'
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState('');

  const logsRef = useRef([]);

  // Sync references so that polling interval always has fresh data
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  // Fetch function
  const fetchLogs = async () => {
    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        startDate: startDate,
        endDate: endDate
      });
      const response = await fetch(`/api/system-logs?${queryParams.toString()}`);
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load system logs:', err);
    }
  };

  // Fetch when filters change
  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate, limit]);

  // Open/Close handlers
  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchLogs();
      setUnreadErrorsCount(0);
      setPulseError(false);
    }
  };

  // Polling for new errors/warnings
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/system-logs?limit=5');
        if (response.ok) {
          const latest = await response.json();
          const currentLogs = logsRef.current;
          if (latest.length > 0 && currentLogs.length > 0) {
            const newestFetchedTime = new Date(latest[0].waktu).getTime();
            const currentNewestTime = new Date(currentLogs[0].waktu).getTime();

            if (newestFetchedTime > currentNewestTime) {
              const newSeverityLogs = latest.filter(log => {
                const logTime = new Date(log.waktu).getTime();
                return logTime > currentNewestTime && (log.tipe === 3 || log.tipe === 2);
              });

              if (newSeverityLogs.length > 0) {
                if (!isOpen) {
                  setUnreadErrorsCount(prev => prev + newSeverityLogs.length);
                  setPulseError(true);
                } else {
                  fetchLogs();
                }
              }
            }
          }
        }
      } catch (err) {
        // Ignore background polling errors
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Format log timestamps: DD/MM/YY HH:mm:ss
  const formatTimestamp = (dateStr) => {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    const pad = (n) => String(n).padStart(2, '0');
    const yy = String(dateObj.getFullYear()).slice(-2);
    const mm = pad(dateObj.getMonth() + 1);
    const dd = pad(dateObj.getDate());
    const hh = pad(dateObj.getHours());
    const min = pad(dateObj.getMinutes());
    const ss = pad(dateObj.getSeconds());
    return `${dd}/${mm}/${yy} ${hh}:${min}:${ss}`;
  };

  // Local filtering & rendering
  let filteredLogs = logs.filter(log => {
    if (logType !== 'all' && String(log.tipe) !== logType) {
      return false;
    }
    if (search.trim() && !log.pesan.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  // RULE: "buat hanya 5 row ketika statusnya error / warning"
  if (logType === '3' || logType === '2') {
    filteredLogs = filteredLogs.slice(0, 5);
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={handleToggle}
        className={`log-widget-btn ${pulseError ? 'pulse-error' : ''}`}
        id="log-widget-toggle-btn"
        title="Buka Log Sistem - OtomaX"
      >
        <i className="fa-solid fa-terminal"></i>
        {unreadErrorsCount > 0 && (
          <span className="badge-count" id="log-widget-badge">
            {unreadErrorsCount}
          </span>
        )}
      </button>

      {/* Floating Log Panel */}
      <div className={`log-panel-window ${isOpen ? 'open' : ''}`} id="log-panel-window">
        <div className="log-panel-header">
          <div className="log-panel-title">
            <i className="fa-solid fa-terminal" style={{ color: '#0052ff' }}></i>
            <span>Log Sistem - OtomaX</span>
          </div>
          <div className="log-panel-actions">
            <button onClick={() => setIsOpen(false)} className="log-panel-close-btn" id="log-panel-close-btn">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="log-panel-filters">
          <div className="log-filter-group">
            <label>Waktu:</label>
            <input
              type="date"
              className="log-filter-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span>s/d</span>
            <input
              type="date"
              className="log-filter-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="log-filter-group">
            <label>Tipe:</label>
            <select
              className="log-filter-input"
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
            >
              <option value="all">-- All --</option>
              <option value="3">Error</option>
              <option value="2">Warning</option>
              <option value="1">Info</option>
            </select>
          </div>
          <div className="log-filter-group">
            <label>Limit:</label>
            <select
              className="log-filter-input"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="log-filter-group log-search-pesan">
            <input
              type="text"
              className="log-filter-input w-full"
              placeholder="Cari pesan log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className="log-table-container">
          <table className="log-table">
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Waktu</th>
                <th style={{ width: '80px' }}>Tipe</th>
                <th>Pesan</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center p-5 text-gray-400">
                    Tidak ada log sistem yang cocok.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  let rowClass = '';
                  let typeLabel = 'INFO';
                  if (log.tipe === 3) {
                    rowClass = 'log-row-error';
                    typeLabel = 'Error';
                  } else if (log.tipe === 2) {
                    rowClass = 'log-row-warning';
                    typeLabel = 'Warning';
                  }

                  return (
                    <tr key={log.kode} className={rowClass}>
                      <td style={{ fontWeight: 500, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {formatTimestamp(log.waktu)}
                      </td>
                      <td style={{ fontWeight: 700 }}>{typeLabel}</td>
                      <td>{log.pesan}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
