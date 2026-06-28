'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isDbOnline, setIsDbOnline] = useState(true);

  // Poll a simple endpoint or check if we are running in fallback mode
  useEffect(() => {
    const checkDbStatus = async () => {
      try {
        // We will call the KPI endpoint which returns isDemo
        const res = await fetch('/api/analytics/kpi');
        if (res.ok) {
          const data = await res.json();
          setIsDbOnline(!data.isDemo);
        }
      } catch (err) {
        setIsDbOnline(false);
      }
    };
    checkDbStatus();
    // Check every 30 seconds
    const interval = setInterval(checkDbStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleForceSync = (e) => {
    e.preventDefault();
    // Dispatch a custom event so the currently active page knows it needs to refetch data
    window.dispatchEvent(new Event('bmp-force-sync'));
  };

  const handleLogout = (e) => {
    e.preventDefault();
    sessionStorage.removeItem('isLoggedIn');
    router.push('/login');
  };

  const navItems = [
    { href: '/', label: 'Dashboard', icon: 'fa-chart-line' },
    { href: '/analytics', label: 'Analytics', icon: 'fa-chart-pie' },
    { href: '/inbox', label: 'Inbox', icon: 'fa-inbox' },
    { href: '/modul', label: 'Modul', icon: 'fa-cubes' },
    { href: '/product', label: 'Product', icon: 'fa-box' },
    { href: '/member', label: 'Member', icon: 'fa-users' },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-area">
        <img src="/assets/logo_best.png" alt="Best Multi Payment Logo" className="brand-logo" />
        <div className="logo-text">BMP<span>Dashboard</span></div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <i className={`fa-solid ${item.icon}`}></i>
              <span>{item.label}</span>
            </Link>
          );
        })}
        <a href="#" className="nav-item" onClick={handleForceSync}>
          <i className="fa-solid fa-rotate"></i>
          <span>Force Sync</span>
        </a>
        <a
          href="#"
          className="nav-item"
          onClick={handleLogout}
          style={{ marginTop: 'auto', color: 'var(--failed)' }}
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          <span>Logout</span>
        </a>
      </nav>
      <div className="sidebar-footer">
        <div className={`status-indicator ${isDbOnline ? 'online' : 'offline'}`} 
             style={{ backgroundColor: isDbOnline ? 'var(--success)' : 'var(--failed)', boxShadow: isDbOnline ? '0 0 8px var(--success)' : '0 0 8px var(--failed)' }}
        ></div>
        <span>{isDbOnline ? 'Connected to DB' : 'Demo Mode (No DB)'}</span>
      </div>
    </aside>
  );
}
