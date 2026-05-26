import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import MarketChart from './components/MarketChart';
import TradePanel from './components/TradePanel';
import WalletPanel from './components/WalletPanel';
import AuditLogPanel from './components/AuditLogPanel';
import LoginPanel from './components/LoginPanel';
import PortfolioPanel from './components/PortfolioPanel';
import { marketDataSocket } from './services/api';
import { Activity, LogOut } from 'lucide-react';
import './index.css';

const App: React.FC = () => {
  const { token, setToken, setUserId } = useStore();

  useEffect(() => {
    if (token) {
      marketDataSocket.connect();
    }
    
    return () => {
      marketDataSocket.disconnect();
    };
  }, [token]);

  const handleLogout = () => {
    setToken(null);
    setUserId(null);
  };

  if (!token) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center' }}>
         <h1 className="header-title" style={{ justifyContent: 'center', marginBottom: '24px' }}>
          <Activity size={32} color="var(--accent-blue)" />
          FinPulse
        </h1>
        <LoginPanel />
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <header className="header">
        <h1 className="header-title">
          <Activity size={32} color="var(--accent-blue)" />
          FinPulse
        </h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Enterprise HF Trading System</span>
          <div style={{ background: 'var(--bg-tertiary)', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid var(--glass-border)' }}>
            <span className="live-indicator" style={{ marginRight: '8px' }}></span>
            SYSTEM ONLINE
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <LogOut size={16} /> Logout
          </button>
        </div>
      </header>
      
      <div className="main-column">
        <MarketChart />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <PortfolioPanel />
          <AuditLogPanel />
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <WalletPanel />
        <TradePanel />
      </div>
    </div>
  );
};

export default App;
