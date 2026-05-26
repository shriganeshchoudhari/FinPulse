import React, { useEffect } from 'react';
import MarketChart from './components/MarketChart';
import TradePanel from './components/TradePanel';
import WalletPanel from './components/WalletPanel';
import AuditLogPanel from './components/AuditLogPanel';
import { marketDataSocket } from './services/api';
import { Activity } from 'lucide-react';
import './index.css';

const App: React.FC = () => {
  useEffect(() => {
    // Connect to WebSocket on mount
    marketDataSocket.connect();
    
    // Disconnect on unmount
    return () => {
      marketDataSocket.disconnect();
    };
  }, []);

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
        </div>
      </header>
      
      <div className="main-column">
        <MarketChart />
        <AuditLogPanel />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <WalletPanel />
        <TradePanel />
      </div>
    </div>
  );
};

export default App;
