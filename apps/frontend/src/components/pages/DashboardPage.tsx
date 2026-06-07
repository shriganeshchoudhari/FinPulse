import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import NetWorthChart from '../NetWorthChart';
import MarketChart from '../MarketChart';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Percent, Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b'];

// Animated counter hook
function useCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(target * ease);
      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  color: string;
  icon: React.ReactNode;
  decimals?: number;
  positive?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, prefix = '', suffix = '', color, icon, decimals = 2, positive }) => {
  const animated = useCounter(value);
  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}40` }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: "'Roboto Mono', monospace", color: positive === undefined ? 'var(--text-primary)' : positive ? 'var(--accent-green)' : 'var(--accent-red)' }}>
        {prefix}{animated.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
      </div>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const { portfolio, latestPrices } = useStore();

  const totalValue = portfolio?.totalEstimatedValue ?? 0;
  const pnl = totalValue * 0.083; // mock 8.3% gain
  const winRate = 67.4;

  const chartData = portfolio
    ? Object.entries(portfolio.positions)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [
        { name: 'BTC', value: 45 },
        { name: 'ETH', value: 30 },
        { name: 'SOL', value: 15 },
        { name: 'USD', value: 10 },
      ];

  // Build ticker symbols (doubled for seamless loop)
  const symbols = Object.keys(latestPrices);
  const tickerSymbols = symbols.length > 0 ? [...symbols, ...symbols] : ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BTC/USD', 'ETH/USD', 'SOL/USD'];

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stat Cards Row */}
      <div className="page-grid-3">
        <StatCard
          label="Total P&L"
          value={pnl}
          prefix="$"
          color="var(--accent-green)"
          icon={<TrendingUp size={18} color="var(--accent-green)" />}
          positive={pnl >= 0}
        />
        <StatCard
          label="Portfolio Value"
          value={totalValue || 125430.5}
          prefix="$"
          color="var(--accent-blue)"
          icon={<DollarSign size={18} color="var(--accent-blue)" />}
        />
        <StatCard
          label="Win Rate"
          value={winRate}
          suffix="%"
          decimals={1}
          color="var(--accent-purple)"
          icon={<Percent size={18} color="var(--accent-purple)" />}
          positive={winRate >= 50}
        />
      </div>

      {/* Charts Row */}
      <div className="page-grid-3-1">
        {/* Net Worth Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <NetWorthChart />
        </div>

        {/* Asset Allocation Pie */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="var(--accent-blue)" />
            Asset Allocation
          </h3>
          <div style={{ flex: 1, minHeight: 200 }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(20,22,31,0.95)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {chartData.slice(0, 4).map((entry, i) => (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length], display: 'inline-block' }} />
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Market Chart */}
      <MarketChart />

      {/* Ticker Tape */}
      <div className="ticker-tape">
        <div className="ticker-inner">
          {tickerSymbols.map((sym, i) => {
            const price = latestPrices[sym];
            const change = ((Math.random() - 0.5) * 5).toFixed(2);
            const isPos = parseFloat(change) >= 0;
            return (
              <span key={`${sym}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontFamily: "'Roboto Mono', monospace" }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{sym}</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {price ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}
                </span>
                <span style={{ color: isPos ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '12px' }}>
                  {isPos ? '+' : ''}{change}%
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
