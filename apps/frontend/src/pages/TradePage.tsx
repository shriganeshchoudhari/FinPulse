import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { tradeService } from '../services/api';
import { BarChart2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM', 'BTC', 'ETH'];

const TradePage: React.FC = () => {
  const { latestPrices, trades, setTrades } = useStore();
  const [symbol, setSymbol] = useState('AAPL');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const price = latestPrices[symbol] || 0;
  const estimatedCost = price * Number(quantity);

  useEffect(() => {
    tradeService.getUserTrades().then(setTrades).catch(console.error);
  }, []);

  const handleTrade = async () => {
    if (!price || !quantity) return;
    setLoading(true);
    setMessage(null);
    try {
      await tradeService.placeOrder(symbol, side, Number(quantity), price);
      const updated = await tradeService.getUserTrades();
      setTrades(updated);
      setMessage({
        type: 'success',
        text: `${side} order placed for ${quantity} ${symbol} @ $${price.toFixed(2)}`,
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Trade failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-title">Trade</div>
      <div className="page-subtitle">Place buy and sell orders in the simulated market</div>

      <div className="content-grid">
        {/* Order History */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <BarChart2 size={18} color="var(--accent-purple)" />
              Order History
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => tradeService.getUserTrades().then(setTrades).catch(console.error)}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
          {trades.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              No trades placed yet
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700 }}>{t.symbol}</td>
                      <td>
                        <span className={t.side === 'BUY' ? 'badge badge-green' : 'badge badge-red'}>
                          {t.side}
                        </span>
                      </td>
                      <td>{t.quantity}</td>
                      <td>${Number(t.price).toFixed(2)}</td>
                      <td>${(Number(t.quantity) * Number(t.price)).toFixed(2)}</td>
                      <td>
                        <span className={t.status === 'COMPLETED' ? 'badge badge-green' : 'badge badge-orange'}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order Form */}
        <div>
          <div className="glass-panel">
            <div className="panel-header">
              <div className="panel-title">
                <TrendingUp size={18} color="var(--accent-blue)" />
                Place Order
              </div>
            </div>

            {message && (
              <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                {message.type === 'success' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {message.text}
              </div>
            )}

            {/* Symbol */}
            <div className="form-group">
              <label className="input-label">Asset Symbol</label>
              <select className="input-field" value={symbol} onChange={e => setSymbol(e.target.value)}>
                {SYMBOLS.map(s => (
                  <option key={s} value={s}>
                    {s} — ${(latestPrices[s] || 0).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Side Toggle */}
            <div className="form-group">
              <label className="input-label">Order Side</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  className={`btn ${side === 'BUY' ? 'btn-buy' : 'btn-ghost'}`}
                  onClick={() => setSide('BUY')}
                >
                  <TrendingUp size={16} />BUY
                </button>
                <button
                  className={`btn ${side === 'SELL' ? 'btn-sell' : 'btn-ghost'}`}
                  onClick={() => setSide('SELL')}
                >
                  <TrendingDown size={16} />SELL
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div className="form-group">
              <label className="input-label">Quantity</label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                className="input-field"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>

            {/* Price Summary */}
            <div style={{
              background: 'rgba(59,130,246,0.05)',
              border: '1px solid rgba(59,130,246,0.15)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Market Price</span>
                <span style={{ fontFamily: 'Roboto Mono', fontWeight: 600, color: 'var(--accent-blue)' }}>
                  ${price.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Estimated Total</span>
                <span style={{ fontFamily: 'Roboto Mono', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
                  ${estimatedCost.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              className={`btn ${side === 'BUY' ? 'btn-buy' : 'btn-sell'} btn-lg btn-full`}
              onClick={handleTrade}
              disabled={loading || !price}
            >
              {loading
                ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : side === 'BUY' ? <TrendingUp size={18} /> : <TrendingDown size={18} />
              }
              {loading ? 'Executing...' : `${side} ${symbol}`}
            </button>
          </div>

          {/* Live Price Card */}
          {price > 0 && (
            <div className="glass-card" style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                LIVE: {symbol}
              </div>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                fontFamily: 'Roboto Mono, monospace',
                color: 'var(--accent-blue)',
              }}>
                ${price.toFixed(2)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span className="live-indicator" />
                <span style={{ fontSize: 12, color: 'var(--accent-green)' }}>LIVE</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradePage;
