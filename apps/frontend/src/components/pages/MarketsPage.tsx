import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import MarketChart from '../MarketChart';
import { Search, X, TrendingUp, TrendingDown, Zap, BarChart2 } from 'lucide-react';

const SYMBOLS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD', 'LINK/USD', 'DOT/USD', 'ADA/USD'];

// Generate stable mock changes per symbol
const mockChanges: Record<string, number> = {
  'BTC/USD': 2.34,
  'ETH/USD': -1.12,
  'SOL/USD': 5.67,
  'AVAX/USD': -3.21,
  'MATIC/USD': 1.88,
  'LINK/USD': 0.45,
  'DOT/USD': -2.76,
  'ADA/USD': 3.09,
};

interface SymbolCardProps {
  symbol: string;
  price: number | undefined;
  change: number;
  onClick: () => void;
  isLoading: boolean;
}

const SymbolCard: React.FC<SymbolCardProps> = ({ symbol, price, change, onClick, isLoading }) => {
  const isPos = change >= 0;

  if (isLoading) {
    return (
      <div className="glass-panel" style={{ cursor: 'pointer' }}>
        <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 28, width: '80%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 14, width: '40%' }} />
      </div>
    );
  }

  return (
    <div
      className="glass-panel"
      onClick={onClick}
      style={{ cursor: 'pointer', borderColor: 'var(--glass-border)', transition: 'all 0.25s ease' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59,130,246,0.3)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--glow-blue)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--glass-border)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>{symbol}</span>
        {isPos ? <TrendingUp size={16} color="var(--accent-green)" /> : <TrendingDown size={16} color="var(--accent-red)" />}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: "'Roboto Mono', monospace", color: 'var(--text-primary)', marginBottom: '8px' }}>
        {price ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span style={{ color: 'var(--text-secondary)' }}>--</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className={`badge ${isPos ? 'badge-green' : 'badge-red'}`}>
          {isPos ? '+' : ''}{change.toFixed(2)}%
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>24h</span>
      </div>
    </div>
  );
};

const MarketsPage: React.FC = () => {
  const { latestPrices, navigateTo } = useStore();
  const [search, setSearch] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [isLoading] = useState(false);

  const filtered = useMemo(() =>
    SYMBOLS.filter(s => s.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const handleQuickTrade = () => {
    navigateTo('trade');
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart2 size={22} color="var(--accent-blue)" />
            Market Explorer
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Live prices across all trading pairs</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', width: '240px', fontSize: '14px', height: '42px' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Symbol Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {filtered.map((sym) => (
          <SymbolCard
            key={sym}
            symbol={sym}
            price={latestPrices[sym]}
            change={mockChanges[sym] ?? 0}
            onClick={() => setSelectedSymbol(sym)}
            isLoading={isLoading}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
            <Search size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p>No symbols match "{search}"</p>
          </div>
        )}
      </div>

      {/* Drawer: Symbol Detail */}
      {selectedSymbol && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedSymbol(null)} />
          <div className="drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedSymbol}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span className="live-indicator" />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Live Feed</span>
                </div>
              </div>
              <button onClick={() => setSelectedSymbol(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Price Header */}
            <div className="stat-card" style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Current Price</div>
              <div style={{ fontSize: '32px', fontWeight: 700, fontFamily: "'Roboto Mono', monospace", color: 'var(--accent-blue)' }}>
                {latestPrices[selectedSymbol]
                  ? `$${latestPrices[selectedSymbol].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '--'}
              </div>
              <div style={{ marginTop: '8px' }}>
                <span className={`badge ${(mockChanges[selectedSymbol] ?? 0) >= 0 ? 'badge-green' : 'badge-red'}`}>
                  {(mockChanges[selectedSymbol] ?? 0) >= 0 ? '+' : ''}{(mockChanges[selectedSymbol] ?? 0).toFixed(2)}% 24h
                </span>
              </div>
            </div>

            {/* Statistics */}
            <div className="page-grid-2" style={{ marginBottom: '20px', gap: '12px' }}>
              {[
                { label: '24h High', value: `$${((latestPrices[selectedSymbol] ?? 50000) * 1.03).toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
                { label: '24h Low', value: `$${((latestPrices[selectedSymbol] ?? 50000) * 0.97).toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
                { label: 'Volume', value: `$2.4B` },
                { label: 'Market Cap', value: `$890B` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '14px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'Roboto Mono', monospace" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Market Chart for selected symbol */}
            <div style={{ marginBottom: '20px' }}>
              <MarketChart />
            </div>

            {/* Quick Trade */}
            <button className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={handleQuickTrade}>
              <Zap size={16} /> Quick Trade {selectedSymbol}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MarketsPage;
