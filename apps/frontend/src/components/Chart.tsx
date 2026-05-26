import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { time: '10:00', price: 44000 },
  { time: '10:05', price: 44200 },
  { time: '10:10', price: 44100 },
  { time: '10:15', price: 44800 },
  { time: '10:20', price: 44600 },
  { time: '10:25', price: 45010 },
  { time: '10:30', price: 44950 },
];

export const Chart: React.FC = () => {
  return (
    <div style={{ height: '400px', backgroundColor: 'var(--bg-tertiary)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
      <h3 style={{ marginTop: 0, color: 'var(--text-secondary)' }}>BTC/USD Price Chart</h3>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-up)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--color-up)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="time" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
          <YAxis domain={['auto', 'auto']} stroke="var(--text-secondary)" tick={{fontSize: 12}} />
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            itemStyle={{ color: 'var(--color-up)' }}
          />
          <Area type="monotone" dataKey="price" stroke="var(--color-up)" fillOpacity={1} fill="url(#colorPrice)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

