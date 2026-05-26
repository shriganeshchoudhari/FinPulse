import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { walletService } from '../services/api';
import { Wallet as WalletIcon } from 'lucide-react';

const WalletPanel: React.FC = () => {
  const { wallet, setWallet } = useStore();

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const data = await walletService.getWallet('USD');
        setWallet(data);
      } catch (err) {
        console.error('Failed to fetch wallet', err);
      }
    };
    
    fetchWallet();
    const interval = setInterval(fetchWallet, 5000); // Poll every 5s for demo
    return () => clearInterval(interval);
  }, [setWallet]);

  return (
    <div className="glass-panel">
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <WalletIcon size={20} color="var(--accent-green)" />
        Available Funds
      </h2>
      
      <div>
        <div className="input-label">Total Balance</div>
        <div className="stat-value">
          ${wallet?.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </div>
      </div>
      
      <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)' }}>
        <div className="input-label">Locked in Orders</div>
        <div className="stat-value" style={{ fontSize: '24px', color: 'var(--text-secondary)' }}>
          ${wallet?.lockedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </div>
      </div>
    </div>
  );
};

export default WalletPanel;
