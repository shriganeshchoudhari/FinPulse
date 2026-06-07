import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { walletService } from '../../services/api';
import { Wallet, ArrowDownCircle, ArrowUpCircle, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';

type ModalType = 'deposit' | 'withdraw' | null;

const CURRENCIES = ['USD', 'EUR', 'BTC'];

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  currency: string;
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  timestamp: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'DEPOSIT', currency: 'USD', amount: 10000, status: 'COMPLETED', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', type: 'WITHDRAWAL', currency: 'USD', amount: 500, status: 'COMPLETED', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', type: 'DEPOSIT', currency: 'BTC', amount: 0.05, status: 'COMPLETED', timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: '4', type: 'WITHDRAWAL', currency: 'EUR', amount: 1200, status: 'PENDING', timestamp: new Date(Date.now() - 1800000).toISOString() },
];

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'COMPLETED') return <CheckCircle size={14} color="var(--accent-green)" />;
  if (status === 'PENDING') return <Clock size={14} color="#f59e0b" />;
  return <AlertCircle size={14} color="var(--accent-red)" />;
};

interface MoneyModalProps {
  type: ModalType;
  onClose: () => void;
  onSuccess: () => void;
}

const MoneyModal: React.FC<MoneyModalProps> = ({ type, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) { setError('Please enter a valid amount.'); return; }
    setError('');
    setLoading(true);
    try {
      if (type === 'deposit') {
        await walletService.deposit(currency, num);
      } else {
        await walletService.withdraw(currency, num);
      }
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ textAlign: 'center' }}>
          <CheckCircle size={56} color="var(--accent-green)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {type === 'deposit' ? 'Deposit' : 'Withdrawal'} Successful!
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {currency} {parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} has been {type === 'deposit' ? 'added to' : 'removed from'} your account.
          </p>
        </div>
      </div>
    );
  }

  const isDeposit = type === 'deposit';
  const accentColor = isDeposit ? 'var(--accent-green)' : 'var(--accent-red)';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isDeposit ? <ArrowDownCircle size={22} color={accentColor} /> : <ArrowUpCircle size={22} color={accentColor} />}
            {isDeposit ? 'Deposit Funds' : 'Withdraw Funds'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Currency</label>
            <select
              className="input-field"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Amount</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '16px' }}>
                {currency === 'BTC' ? '₿' : currency === 'EUR' ? '€' : '$'}
              </span>
              <input
                type="number"
                className="input-field"
                style={{ paddingLeft: '32px' }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            className={isDeposit ? 'btn-success' : 'btn-danger'}
            style={{ width: '100%', marginTop: '8px', opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Processing...' : `Confirm ${isDeposit ? 'Deposit' : 'Withdrawal'}`}
          </button>
        </form>
      </div>
    </div>
  );
};

const WalletPage: React.FC = () => {
  const { wallet, setWallet } = useStore();
  const [modal, setModal] = useState<ModalType>(null);
  const [transactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);

  useEffect(() => {
    walletService.getWallet('USD').then(setWallet).catch(() => {});
  }, [setWallet]);

  const balance = wallet?.balance ?? 0;
  const locked = wallet?.lockedBalance ?? 0;

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Balance Card */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)', borderColor: 'rgba(59,130,246,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Wallet size={22} color="var(--accent-blue)" />
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>USD Wallet</span>
          <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Active</span>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Balance</div>
          <div style={{ fontSize: '44px', fontWeight: 800, fontFamily: "'Roboto Mono', monospace", color: 'var(--text-primary)', lineHeight: 1 }}>
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Locked in Orders</div>
            <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: "'Roboto Mono', monospace", color: 'var(--text-secondary)' }}>
              ${locked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setModal('deposit')}>
              <ArrowDownCircle size={16} /> Deposit
            </button>
            <button className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setModal('withdraw')}>
              <ArrowUpCircle size={16} /> Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass-panel">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Transaction History
          <span className="badge badge-blue" style={{ marginLeft: '8px' }}>{transactions.length}</span>
        </h3>

        <table className="data-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Currency</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {tx.type === 'DEPOSIT'
                      ? <ArrowDownCircle size={14} color="var(--accent-green)" />
                      : <ArrowUpCircle size={14} color="var(--accent-red)" />}
                    <span style={{ color: tx.type === 'DEPOSIT' ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '13px', fontWeight: 600 }}>
                      {tx.type}
                    </span>
                  </div>
                </td>
                <td style={{ fontWeight: 600 }}>{tx.currency}</td>
                <td style={{ color: tx.type === 'DEPOSIT' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <StatusIcon status={tx.status} />
                    <span className={`badge ${tx.status === 'COMPLETED' ? 'badge-green' : tx.status === 'PENDING' ? 'badge-yellow' : 'badge-red'}`}>
                      {tx.status}
                    </span>
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {new Date(tx.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <MoneyModal
          type={modal}
          onClose={() => setModal(null)}
          onSuccess={() => walletService.getWallet('USD').then(setWallet).catch(() => {})}
        />
      )}
    </div>
  );
};

export default WalletPage;
