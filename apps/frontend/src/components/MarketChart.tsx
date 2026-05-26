import React from 'react';
import { useStore } from '../store/useStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

const MarketChart: React.FC = () => {
  const { marketData, latestPrices } = useStore();
  
  // Default to BTC/USD if available, otherwise just pick the first key
  const symbol = "BTC/USD";
  const data = marketData[symbol] || [];
  const currentPrice = latestPrices[symbol] || 0.0;

  return (
    <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--accent-blue)" />
            {symbol} Market
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
      
      <div style={{ flex: 1, width: '100%' }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
              <XAxis 
                dataKey="timestamp" 
                hide 
              />
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
                isAnimationActive={false} // Disable animation for better performance with high frequency updates
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            Waiting for market data stream...
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketChart;
