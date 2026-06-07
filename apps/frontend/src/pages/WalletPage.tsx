import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { walletService } from '../services/api';
import { Wallet, ArrowDownLeft, ArrowUpRight, X, RefreshCw, DollarSign } from 'lucide-react';

type ModalType = 'deposit' | 'withdraw' | null;

const WalletPage: React.FC = () => {
  const { wallet, setWallet } = useStore();
  const [modal, setModal] = useState<ModalType>(null);
  const [amount, setAmount] = useState('');
  const [currency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadWallet = () => {
    walletService.getWallet('USD').then(setWallet).catch(console.error);
  };

  useEffect(() => { loadWallet(); }, []);

  const handleTransaction = async () => {
    if (!amount || !currency) return;
    setLoading(true);
    setMessage(null);
    try {
      if (modal === 'deposit') {
        const updated = await walletService.deposit(currency, Number(amount));
        setWallet(updated);
        setMessage({ type: 'success', text: `Successfully deposited $${amount} ${currency}` });
      } else if (modal === 'withdraw') {
        const updated = await walletService.withdraw(currency, Number(amount));
        setWallet(updated);
        setMessage({ type: 'success', text: `Successfully withdrawn $${amount} ${currency}` });
      }
      setAmount('');
      setModal(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Transaction failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-title">Wallet</div>
      <div className="page-subtitle">Manage your virtual funds and transaction history</div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      {/* Balance Cards */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card" style={{ gridColumn: 'span 2' }}>
          <DollarSign
            size={24}
            style={{ position: 'absolute', top: 20, right: 20, color: 'var(--accent-green)', opacity: 0.5 }}
          />
          <div className="stat-label">Available Balance</div>
          <div className="stat-value" style={{ fontSize: '36px', color: 'var(--accent-green)' }}>
            ${(wallet?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-change text-secondary">USD Wallet</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Locked Balance</div>
          <div className="stat-value" style={{ fontSize: '24px', color: 'var(--accent-orange)' }}>
            ${(wallet?.lockedBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-change text-secondary">In open orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last Updated</div>
          <div style={{ fontSize: 14, marginTop: 8, color: 'var(--text-secondary)', fontFamily: 'Roboto Mono' }}>
            {wallet?.updatedAt ? new Date(wallet.updatedAt).toLocaleString() : '—'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Wallet size={18} color="var(--accent-blue)" />
            Quick Actions
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadWallet}>
            <RefreshCw size={14} />Refresh
          </button>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <button
            className="btn btn-buy"
            style={{ minWidth: 160 }}
            onClick={() => { setModal('deposit'); setMessage(null); }}
          >
            <ArrowDownLeft size={18} />Deposit Funds
          </button>
          <button
            className="btn btn-sell"
            style={{ minWidth: 160 }}
            onClick={() => { setModal('withdraw'); setMessage(null); }}
          >
            <ArrowUpRight size={18} />Withdraw Funds
          </button>
        </div>

        <div className="divider" />
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Note:</strong> This is a simulated wallet for paper trading. 
          No real money is involved.
        </div>
      </div>

      {/* Wallet Info */}
      <div className="glass-panel" style={{ marginTop: 24 }}>
        <div className="panel-header">
          <div className="panel-title">
            <DollarSign size={18} color="var(--accent-green)" />
            Wallet Details
          </div>
        </div>
        {wallet ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { label: 'Wallet ID', value: wallet.id, mono: true },
              { label: 'Currency', value: wallet.currency, mono: false },
              { label: 'Available', value: `$${wallet.balance.toFixed(2)}`, mono: true },
              { label: 'Locked', value: `$${wallet.lockedBalance.toFixed(2)}`, mono: true },
            ].map(item => (
              <div key={item.label} style={{
                padding: '16px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6 }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: item.mono ? 'Roboto Mono, monospace' : 'inherit',
                  color: 'var(--text-primary)',
                  wordBreak: 'break-all',
                }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Wallet data unavailable. Please log in.
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {modal === 'deposit'
                  ? <><ArrowDownLeft size={20} color="var(--accent-green)" />Deposit Funds</>
                  : <><ArrowUpRight size={20} color="var(--accent-red)" />Withdraw Funds</>
                }
              </div>
              <button className="modal-close" onClick={() => setModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label className="input-label">Amount (USD)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                className="input-field"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
              />
            </div>

            {/* Quick amounts */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {[100, 500, 1000, 5000].map(v => (
                <button
                  key={v}
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAmount(String(v))}
                  style={{ flex: 1 }}
                >
                  ${v.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Summary */}
            <div style={{
              background: modal === 'deposit' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
              border: `1px solid ${modal === 'deposit' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: 'var(--radius-md)',
              padding: 16,
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  {modal === 'deposit' ? 'New Balance After Deposit' : 'Remaining Balance'}
                </span>
                <span style={{
                  fontFamily: 'Roboto Mono',
                  fontWeight: 700,
                  color: modal === 'deposit' ? 'var(--accent-green)' : 'var(--accent-red)',
                }}>
                  ${(modal === 'deposit'
                    ? (wallet?.balance || 0) + Number(amount || 0)
                    : (wallet?.balance || 0) - Number(amount || 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              className={`btn ${modal === 'deposit' ? 'btn-buy' : 'btn-sell'} btn-full`}
              onClick={handleTransaction}
              disabled={loading || !amount || Number(amount) <= 0}
            >
              {loading
                ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : modal === 'deposit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />
              }
              {loading ? 'Processing...' : (modal === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;
