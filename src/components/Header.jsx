import React from 'react';
import { Download, RefreshCw, Sun, Moon, Sparkles, Store } from 'lucide-react';

export default function Header({ onExportExcel, onResetDay, theme, onToggleTheme, totalBills }) {
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <div className="brand-suite">
          <div className="brand-emblem">
            <Store size={22} />
          </div>
          <div className="brand-details">
            <h1>
              SVVAD PRO
              <span className="badge-status">STALL TERMINAL v2.5</span>
            </h1>
            <p>Automated Daily Billing, Promotional Sampling & Dispatch Suite</p>
          </div>
        </div>

        <div className="nav-actions">
          <div className="clock-capsule">
            <span className="live-beacon"></span>
            <span>{todayFormatted}</span>
          </div>

          <button
            className="btn-icon-toggle"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            className="btn-nav-action btn-nav-secondary"
            onClick={onResetDay}
            title="Reset sheet for a fresh day"
          >
            <RefreshCw size={14} />
            <span>New Day</span>
          </button>

          <button
            className="btn-nav-action btn-nav-primary"
            onClick={onExportExcel}
            title="Download official Billing Format.xlsx"
          >
            <Download size={16} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>
    </header>
  );
}
