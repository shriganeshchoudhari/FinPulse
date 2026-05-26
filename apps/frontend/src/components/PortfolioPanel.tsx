import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { analyticsService } from '../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Briefcase } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b'];

const PortfolioPanel: React.FC = () => {
  const { portfolio, setPortfolio, token } = useStore();

  useEffect(() => {
    if (!token) return;
    
    const fetchPortfolio = async () => {
      try {
        const data = await analyticsService.getPortfolio();
        setPortfolio(data);
      } catch (err) {
        console.error('Failed to fetch portfolio analytics', err);
      }
    };
    
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 5000);
    return () => clearInterval(interval);
  }, [token, setPortfolio]);

  const chartData = portfolio ? Object.entries(portfolio.positions)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({ name: key, value })) : [];

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Briefcase size={20} color="var(--accent-blue)" />
        Risk & Portfolio Analytics
      </h2>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div className="input-label">Unrealized Estimated Value</div>
          <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
            ${portfolio?.totalEstimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: '200px' }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-tertiary)', 
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            No open positions
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
        {chartData.map((entry, index) => (
          <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></span>
            {entry.name}: {entry.value}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioPanel;
