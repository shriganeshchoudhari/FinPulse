import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';

const NetWorthChart: React.FC = () => {
  const { portfolio } = useStore();
  const [history, setHistory] = useState<{ time: string; value: number }[]>([]);

  useEffect(() => {
    if (portfolio?.totalEstimatedValue !== undefined) {
      setHistory(prev => {
        const newValue = {
          time: new Date().toLocaleTimeString(),
          value: portfolio.totalEstimatedValue
        };
        const next = [...prev, newValue];
        // keep last 50 points
        if (next.length > 50) return next.slice(next.length - 50);
        return next;
      });
    }
  }, [portfolio?.totalEstimatedValue]);

  return (
    <div className="glass-panel" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} color="var(--accent-blue)" />
          Historical Net Worth
        </h2>
      </div>
      <div style={{ flex: 1, width: '100%' }}>
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
              <XAxis dataKey="time" hide />
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
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="var(--accent-blue)" 
                fillOpacity={1} 
                fill="url(#colorValue)" 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            Accumulating history...
          </div>
        )}
      </div>
    </div>
  );
};

export default NetWorthChart;
