import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { analyticsService, walletService, tradeService } from '../services/api';
import NetWorthChart from '../components/NetWorthChart';
import PortfolioPanel from '../components/PortfolioPanel';
import { TrendingUp, DollarSign, Activity, BarChart2, ArrowUpRight } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { wallet, portfolio, trades, latestPrices, setWallet, setPortfolio, setTrades } = useStore();

  useEffect(() => {
    walletService.getWallet('USD').then(setWallet).catch(console.error);
    analyticsService.getPortfolio().then(setPortfolio).catch(console.error);
    tradeService.getUserTrades().then(setTrades).catch(console.error);
  }, []);

  const totalValue = portfolio?.totalEstimatedValue || 0;
  const walletBalance = wallet?.balance || 0;
  const totalTrades = trades.length;
  const completedTrades = trades.filter(t => t.status === 'COMPLETED').length;
  const symbols = Object.keys(latestPrices);
  const recentTrades = trades.slice(0, 5);

  return (
    <div className="page-content">
      <div className="page-title">Dashboard</div>
      <div className="page-subtitle">Real-time overview of your portfolio performance</div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ position: 'absolute', top: 20, right: 20, color: 'var(--accent-blue)', opacity: 0.6 }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-label">Wallet Balance</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)', fontSize: '24px' }}>
            ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-change text-green">
            <ArrowUpRight size={14} />
            USD Wallet
          </div>
        </div>

        <div className="stat-card">
          <div style={{ position: 'absolute', top: 20, right: 20, color: 'var(--accent-purple)', opacity: 0.6 }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-label">Portfolio Value</div>
          <div className="stat-value" style={{ fontSize: '24px' }}>
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-change text-secondary">
            <Activity size={14} />
            Estimated
          </div>
        </div>

        <div className="stat-card">
          <div style={{ position: 'absolute', top: 20, right: 20, color: 'var(--accent-cyan)', opacity: 0.6 }}>
            <BarChart2 size={24} />
          </div>
          <div className="stat-label">Total Trades</div>
          <div className="stat-value" style={{ fontSize: '24px' }}>{totalTrades}</div>
          <div className="stat-change text-secondary">
            <ArrowUpRight size={14} />
            {completedTrades} completed
          </div>
        </div>

        <div className="stat-card">
          <div style={{ position: 'absolute', top: 20, right: 20, color: 'var(--accent-orange)', opacity: 0.6 }}>
            <Activity size={24} />
          </div>
          <div className="stat-label">Live Markets</div>
          <div className="stat-value" style={{ fontSize: '24px' }}>{symbols.length}</div>
          <div className="stat-change text-green">
            <span className="live-indicator" style={{ marginRight: 4 }} />
            Streaming
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 0' }}>
            <div className="panel-header">
              <div className="panel-title">
                <TrendingUp size={18} color="var(--accent-blue)" />
                Net Worth Over Time
              </div>
            </div>
          </div>
          <NetWorthChart />
        </div>
        <div className="glass-panel">
          <PortfolioPanel />
        </div>
      </div>

      {/* Recent Trades */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Activity size={18} color="var(--accent-purple)" />
            Recent Trades
          </div>
          <span className="badge badge-purple">{totalTrades} total</span>
        </div>
        {recentTrades.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No trades yet. Place your first trade!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
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
                {recentTrades.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.symbol}</td>
                    <td>
                      <span className={t.side === 'BUY' ? 'badge badge-green' : 'badge badge-red'}>
                        {t.side}
                      </span>
                    </td>
                    <td>{t.quantity}</td>
                    <td>${Number(t.price).toFixed(2)}</td>
                    <td>
                      <span className={t.status === 'COMPLETED' ? 'badge badge-green' : 'badge badge-orange'}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
