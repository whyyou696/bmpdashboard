'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Clock from './Clock';
import SystemLogWidget from './SystemLogWidget';

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Theme initialization
    const savedTheme = localStorage.getItem('theme') || 'light';
    const dark = savedTheme === 'dark';
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }

    // Auth check
    const logged = sessionStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(logged);
    if (!logged && pathname !== '/login') {
      router.push('/login');
    }
  }, [pathname, router]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    // Dispatch a custom event to notify components (like Chart.js graphs) to re-render with appropriate text colors
    window.dispatchEvent(new Event('bmp-theme-change'));
  };

  if (!mounted) {
    return null; // Prevent screen flash / hydration issues
  }

  // If on the login page, just show the login wrapper (with background bubbles)
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If not logged in and redirecting, render a simple load spacer
  if (!isLoggedIn) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500 font-semibold" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        <div className="flex flex-col items-center gap-3">
          <i className="fa-solid fa-spinner fa-spin text-2xl" style={{ color: 'var(--vivid-blue)' }}></i>
          <span>Redirecting to Login...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <header className="main-header">
          <div className="header-title">
            <h1 id="main-heading">
              {pathname === '/' ? 'Transaction Dashboard' : 
               pathname === '/analytics' ? 'Business Intelligence & Analytics' :
               pathname === '/inbox' ? 'Inbox & Request Monitoring' :
               pathname === '/modul' ? 'Modul & Supplier Performance' :
               pathname === '/product' ? 'Product Productivity Analysis' :
               pathname === '/member' ? 'Reseller / Member Balance' : 'BMP Dashboard'}
            </h1>
            <p className="subtitle">
              {pathname === '/' ? 'Monitor and analyze your OtomaX transaction data' :
               pathname === '/analytics' ? 'Interactive charts and financial KPIs' :
               pathname === '/inbox' ? 'Real-time client request feed and debugging' :
               pathname === '/modul' ? 'Supplier modules efficiency and transaction ratios' :
               pathname === '/product' ? 'Monitor product codes, margin distributions, and counts' :
               pathname === '/member' ? 'Reseller member lists, limits, and sync statuses' : 'Best Multi Payment'}
            </p>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              id="theme-toggle"
              className="time-widget"
              onClick={toggleTheme}
              style={{
                cursor: 'pointer',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                outline: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0'
              }}
              title="Toggle Dark Mode"
            >
              <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} id="theme-toggle-icon"></i>
            </button>
            <Clock />
          </div>
        </header>

        {children}
      </main>

      <SystemLogWidget />
    </div>
  );
}
