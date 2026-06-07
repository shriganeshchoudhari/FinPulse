import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import LoginPanel from './components/LoginPanel';
import Sidebar from './components/Sidebar';
import DashboardPage from './components/pages/DashboardPage';
import MarketsPage from './components/pages/MarketsPage';
import TradePage from './components/pages/TradePage';
import WalletPage from './components/pages/WalletPage';
import SettingsPage from './components/pages/SettingsPage';
import CompliancePage from './components/pages/CompliancePage';
import { marketDataSocket } from './services/api';
import { Activity, Bell, RefreshCw } from 'lucide-react';
import './index.css';

// Decode JWT payload safely
function decodeJwt(token: string): Record<string, any> | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  markets: 'Market Explorer',
  trade: 'Trade',
  wallet: 'Wallet',
  settings: 'Settings',
  compliance: 'Compliance',
};

const App: React.FC = () => {
  const {
    token,
    setUserId,
    setRole,
    currentPage,
    role,
  } = useStore();

  // On token change: decode JWT to extract role + userId, connect WS
  useEffect(() => {
    if (token) {
      const payload = decodeJwt(token);
      if (payload) {
        const extractedRole = payload.role || payload.roles?.[0] || null;
        setRole(extractedRole);

        const extractedUserId =
          payload.userId ||
          payload.user_id ||
          payload.sub ||
          '00000000-0000-0000-0000-000000000001';
        setUserId(extractedUserId);
      }
      marketDataSocket.connect();
    } else {
      setRole(null);
      marketDataSocket.disconnect();
    }

    return () => {
      marketDataSocket.disconnect();
    };
  }, [token, setRole, setUserId]);

  // --- NOT AUTHENTICATED: Full-screen login ---
  if (!token) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gradient-bg)',
        padding: '24px',
      }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            boxShadow: '0 0 32px rgba(59,130,246,0.4)',
            marginBottom: '16px',
          }}>
            <Activity size={28} color="white" />
          </div>
          <h1 className="header-title" style={{ justifyContent: 'center', fontSize: '36px' }}>
            FinPulse
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '8px' }}>
            Enterprise High-Frequency Trading Platform
          </p>
        </div>
        <LoginPanel />
      </div>
    );
  }

  // --- AUTHENTICATED: App Shell ---
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'markets':
        return <MarketsPage />;
      case 'trade':
        return <TradePage />;
      case 'wallet':
        return <WalletPage />;
      case 'settings':
        return <SettingsPage />;
      case 'compliance':
        return <CompliancePage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="content-area">
        {/* Top Bar */}
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {PAGE_TITLES[currentPage] ?? 'Dashboard'}
            </h2>
            {currentPage === 'dashboard' && (
              <span className="badge badge-green" style={{ fontSize: '11px' }}>
                <span className="live-indicator" style={{ marginRight: '4px' }} />
                Live
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* System Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600 }}>
              <RefreshCw size={12} style={{ animation: 'spin 3s linear infinite' }} />
              ONLINE
            </div>

            {/* Notifications Bell */}
            <button style={{
              position: 'relative',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--glass-border)',
              borderRadius: '10px',
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-blue)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-blue)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            >
              <Bell size={16} />
              {/* Notification dot */}
              <span style={{ position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-blue)', border: '1px solid var(--bg-primary)' }} />
            </button>

            {/* Role badge */}
            {role && (
              <span className={`badge ${role.includes('ADMIN') ? 'badge-red' : role.includes('COMPLIANCE') ? 'badge-yellow' : 'badge-blue'}`} style={{ fontSize: '11px' }}>
                {role.replace('ROLE_', '')}
              </span>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content" key={currentPage}>
          {renderPage()}
        </div>
      </div>

      {/* Spin animation for the refresh icon */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
