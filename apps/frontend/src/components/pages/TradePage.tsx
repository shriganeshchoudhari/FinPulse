import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { tradeService } from '../../services/api';
import { Zap, ChevronDown, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const SYMBOLS = ['BTC/USD', 'ETH/USD', 'SOL/USD'];

interface StatusBadgeProps { status: string; }
const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = status?.toUpperCase();
  if (s === 'FILLED' || s === 'COMPLETED') return (
    <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <CheckCircle size={10} /> {status}
    </span>
  );
  if (s === 'CANCELLED' || s === 'REJECTED') return (
    <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <XCircle size={10} /> {status}
    </span>
  );
  return (
    <span className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <Clock size={10} /> {status || 'PENDING'}
    </span>
  );
};

const TradePage: React.FC = () => {
  const { latestPrices, trades, setTrades } = useStore();
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const currentPrice = latestPrices[symbol] ?? 0;
  const estimatedCost = currentPrice * (parseFloat(quantity) || 0);

  useEffect(() => {
    tradeService.getUserTrades()
      .then((data) => setTrades(data))
      .catch(() => {});
  }, [setTrades]);

  const handleMaxQty = () => {
    if (currentPrice > 0 && side === 'BUY') {
      const store = useStore.getState();
      const balance = store.wallet?.balance ?? 10000;
      setQuantity((balance / currentPrice).toFixed(6));
    }
  };

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0 || !currentPrice) {
      setSubmitError('Please enter a valid quantity.');
      return;
    }
    setSubmitError('');
    setIsSubmitting(true);
    try {
      await tradeService.placeOrder(symbol, side, qty, currentPrice);
      setSubmitSuccess(true);
      setQuantity('');
      setTimeout(async () => {
        try {
          const data = await tradeService.getUserTrades();
          setTrades(data);
        } catch { /* noop */ }
        setSubmitSuccess(false);
      }, 2000);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || 'Order failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBuy = side === 'BUY';

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-grid-2" style={{ alignItems: 'start', gap: '24px' }}>
        {/* Order Panel */}
        <div className="glass-panel">
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} color="var(--accent-purple)" />
            Place Order
          </h2>

          {submitSuccess && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-green)' }}>
              <CheckCircle size={18} />
              <div>
                <div style={{ fontWeight: 600 }}>Order Placed Successfully!</div>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>{side} {quantity} {symbol} @ ${currentPrice.toLocaleString()}</div>
              </div>
            </div>
          )}

          {submitError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-red)', fontSize: '14px' }}>
              <AlertCircle size={16} /> {submitError}
            </div>
          )}

          {/* Symbol Selector */}
          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label className="input-label">Symbol</label>
            <div style={{ position: 'relative' }}>
              <select
                className="input-field"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                style={{ appearance: 'none', paddingRight: '36px', cursor: 'pointer' }}
              >
                {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* BUY / SELL Toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px' }}>
            {(['BUY', 'SELL'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: side === s
                    ? (s === 'BUY' ? 'linear-gradient(135deg, var(--accent-green), #059669)' : 'linear-gradient(135deg, var(--accent-red), #b91c1c)')
                    : 'transparent',
                  color: side === s ? 'white' : 'var(--text-secondary)',
                  boxShadow: side === s
                    ? (s === 'BUY' ? '0 4px 12px rgba(16,185,129,0.3)' : '0 4px 12px rgba(239,68,68,0.3)')
                    : 'none',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <form onSubmit={handleTrade} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Price Display */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Current Price</label>
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '20px', fontWeight: 700, fontFamily: "'Roboto Mono', monospace", color: 'var(--accent-blue)' }}>
                  {currentPrice ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Awaiting feed...'}
                </span>
                <span className="live-indicator" />
              </div>
            </div>

            {/* Quantity */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Quantity</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  className="input-field"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.000001"
                  style={{ paddingRight: '68px' }}
                />
                <button
                  type="button"
                  onClick={handleMaxQty}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--accent-blue)', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Estimated Cost */}
            {estimatedCost > 0 && (
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '12px 16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Estimated {isBuy ? 'Cost' : 'Revenue'}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: "'Roboto Mono', monospace", color: isBuy ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                  ${estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}

            <button
              type="submit"
              className={isBuy ? 'btn btn-buy' : 'btn btn-sell'}
              disabled={isSubmitting || currentPrice === 0}
              style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Zap size={16} />
              {isSubmitting ? 'EXECUTING...' : `${side} ${symbol}`}
            </button>
          </form>
        </div>

        {/* Order Statistics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel">
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Market Summary</h3>
            {[
              { label: 'Last Price', value: currentPrice ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '--', color: 'var(--accent-blue)' },
              { label: '24h Volume', value: '$2.4B', color: 'var(--text-primary)' },
              { label: 'Spread', value: '0.01%', color: 'var(--accent-green)' },
              { label: 'Liquidity', value: 'High', color: 'var(--accent-green)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: "'Roboto Mono', monospace", color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="glass-panel">
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
          Order History
          {trades.length > 0 && <span className="badge badge-blue" style={{ marginLeft: '10px' }}>{trades.length}</span>}
        </h3>

        {trades.length > 0 ? (
          <table className="data-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice().reverse().map((trade) => (
                <tr key={trade.id}>
                  <td style={{ fontWeight: 600 }}>{trade.symbol}</td>
                  <td>
                    <span className={`badge ${trade.side === 'BUY' ? 'badge-green' : 'badge-red'}`}>{trade.side}</span>
                  </td>
                  <td>{trade.quantity}</td>
                  <td>${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td><StatusBadge status={trade.status} /></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {new Date(trade.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <Zap size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p>No orders yet. Place your first trade above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradePage;
