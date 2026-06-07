import React from 'react';
import { useStore } from '../store/useStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, List as ListIcon } from 'lucide-react';

// Custom lightweight Virtualized List
const VirtualizedList = ({ 
  itemCount, 
  itemSize, 
  height, 
  renderItem 
}: { 
  itemCount: number, 
  itemSize: number, 
  height: number, 
  renderItem: (props: { index: number, style: React.CSSProperties }) => React.ReactNode 
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemSize));
  const endIndex = Math.min(itemCount - 1, Math.floor((scrollTop + height) / itemSize));
  
  const items = [];
  for (let i = startIndex; i <= endIndex; i++) {
    items.push(
      renderItem({
        index: i,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${itemSize}px`,
          transform: `translateY(${i * itemSize}px)`
        }
      })
    );
  }

  return (
    <div 
      style={{ height: `${height}px`, overflowY: 'auto', position: 'relative' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: `${itemCount * itemSize}px`, width: '100%', position: 'relative' }}>
        {items}
      </div>
    </div>
  );
};

interface MarketChartProps {
  symbol?: string;
}

const MarketChart: React.FC<MarketChartProps> = ({ symbol: propSymbol }) => {
  const { marketData, latestPrices } = useStore();
  
  // Use prop symbol if provided, otherwise default to BTC/USD
  const symbol = propSymbol || "BTC/USD";
  const data = marketData[symbol] || marketData[Object.keys(marketData)[0]] || [];
  const currentPrice = latestPrices[symbol] || 0.0;

  // Render a single row in the virtualized list
  const TickerRow = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    // Reverse the data to show latest first
    const tick = data[data.length - 1 - index];
    if (!tick) return null;
    
    return (
      <div key={index} style={{ 
        ...style, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '0 12px',
        borderBottom: '1px solid var(--glass-border)',
        fontSize: '13px',
        color: 'var(--text-secondary)'
      }}>
        <span style={{ color: 'var(--text-primary)' }}>
          {new Date(tick.timestamp).toLocaleTimeString()}
        </span>
        <span style={{ color: 'var(--accent-blue)', fontWeight: 500 }}>
          ${tick.price.toFixed(2)}
        </span>
        <span>
          Vol: {tick.volume?.toFixed(4) || '0.0000'}
        </span>
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--accent-blue)" />
            {symbol} Market Dashboard
          </h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="live-indicator"></span> Live Data Feed
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
        {/* Left side: Chart */}
        <div style={{ flex: 2, height: '100%', position: 'relative' }}>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                <XAxis dataKey="timestamp" hide />
                <YAxis 
                  domain={['auto', 'auto']} 
                  stroke="var(--text-secondary)" 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={(value) => `$${value}`}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-tertiary)', 
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="var(--accent-blue)" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 6, fill: "var(--accent-blue)", stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              Waiting for market data stream...
            </div>
          )}
        </div>

        {/* Right side: Virtualized Ticker */}
        <div style={{ flex: 1, height: '100%', borderLeft: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0 12px 12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 500, fontSize: '14px', borderBottom: '1px solid var(--glass-border)' }}>
            <ListIcon size={16} /> Recent Ticks
          </div>
          <div style={{ flex: 1, width: '100%' }}>
            {data.length > 0 ? (
              <VirtualizedList
                height={280}
                itemCount={data.length}
                itemSize={36}
                renderItem={TickerRow}
              />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No ticks yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketChart;
