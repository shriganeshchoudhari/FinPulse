import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import MarketChart from '../components/MarketChart';
import { Search, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM', 'BTC', 'ETH'];

const MarketsPage: React.FC = () => {
  const { latestPrices, marketData } = useStore();
  const [search, setSearch] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [range, setRange] = useState('1D');

  const filteredSymbols = SYMBOLS.filter(s => s.toLowerCase().includes(search.toLowerCase()));

  const getPriceChange = (symbol: string) => {
    const ticks = marketData[symbol] || [];
    if (ticks.length < 2) return { change: 0, pct: 0 };
    const first = ticks[0].price;
    const last = ticks[ticks.length - 1].price;
    return { change: last - first, pct: ((last - first) / first) * 100 };
  };

  return (
    <div className="page-content">
      <div className="page-title">Markets</div>
      <div className="page-subtitle">Live market data across all tradeable assets</div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Symbol List */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div className="glass-panel" style={{ padding: 16 }}>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                className="input-field"
                placeholder="Search symbol..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 38 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredSymbols.map(symbol => {
                const price = latestPrices[symbol];
                const { change, pct } = getPriceChange(symbol);
                const isUp = pct >= 0;
                return (
                  <div
                    key={symbol}
                    onClick={() => setSelectedSymbol(symbol)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: selectedSymbol === symbol ? 'rgba(59,130,246,0.12)' : 'transparent',
                      border: selectedSymbol === symbol
                        ? '1px solid rgba(59,130,246,0.25)'
                        : '1px solid transparent',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Roboto Mono, monospace' }}>
                        {symbol}
                      </div>
                      {price !== undefined && (
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Roboto Mono' }}>
                          ${price.toFixed(2)}
                        </div>
                      )}
                    </div>
                    {price !== undefined && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: 12,
                          color: isUp ? 'var(--accent-green)' : 'var(--accent-red)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          justifyContent: 'flex-end',
                        }}>
                          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {pct.toFixed(2)}%
                        </div>
                        <div style={{ fontSize: 11, color: isUp ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {isUp ? '+' : ''}{change.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedSymbol ? (
            <div className="glass-panel">
              <div className="panel-header">
                <div className="panel-title" style={{ flexWrap: 'wrap', gap: 12 }}>
                  <Activity size={18} color="var(--accent-blue)" />
                  {selectedSymbol}
                  {latestPrices[selectedSymbol] !== undefined && (
                    <span style={{
                      fontSize: 22,
                      fontFamily: 'Roboto Mono, monospace',
                      fontWeight: 700,
                      color: 'var(--accent-blue)',
                    }}>
                      ${latestPrices[selectedSymbol].toFixed(2)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['1H', '1D', '1W', '1M'].map(r => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`btn btn-sm ${range === r ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <MarketChart symbol={selectedSymbol} />
            </div>
          ) : (
            <div className="glass-panel" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 400,
            }}>
              <Activity size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
                Select a symbol to view its chart
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
                Click any symbol from the list on the left
              </div>
            </div>
          )}

          {/* Live price grid */}
          <div className="grid-3" style={{ marginTop: 24 }}>
            {SYMBOLS.slice(0, 6).map(symbol => {
              const price = latestPrices[symbol];
              const { pct } = getPriceChange(symbol);
              if (price === undefined) return null;
              return (
                <div
                  key={symbol}
                  className="glass-card"
                  onClick={() => setSelectedSymbol(symbol)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontFamily: 'Roboto Mono, monospace' }}>{symbol}</div>
                    <span className={pct >= 0 ? 'badge badge-green' : 'badge badge-red'}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: 'Roboto Mono, monospace',
                    marginTop: 8,
                    color: pct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}>
                    ${price.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketsPage;
