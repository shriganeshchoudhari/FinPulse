import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MarketChart from './MarketChart';
import { useStore } from '../store/useStore';

vi.mock('../store/useStore');

// Mock ResizeObserver for Recharts
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

describe('MarketChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no data', () => {
    (useStore as unknown as any).mockReturnValue({
      marketData: {},
      latestPrices: {},
    });
    
    render(<MarketChart />);
    expect(screen.getByText('BTC/USD Market Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Waiting for market data stream...')).toBeInTheDocument();
    expect(screen.getByText('No ticks yet')).toBeInTheDocument();
  });

  it('renders market data when available', () => {
    (useStore as unknown as any).mockReturnValue({
      marketData: {
        'BTC/USD': [
          { symbol: 'BTC/USD', price: 50000, volume: 1.5, timestamp: Date.now() - 1000 },
          { symbol: 'BTC/USD', price: 50500, volume: 2.0, timestamp: Date.now() },
        ]
      },
      latestPrices: {
        'BTC/USD': 50500,
      },
    });
    
    render(<MarketChart />);
    expect(screen.getByText('BTC/USD Market Dashboard')).toBeInTheDocument();
    expect(screen.getByText('$50,500.00')).toBeInTheDocument();
    
    // The chart should be rendered, meaning "Waiting for market data stream..." is not there
    expect(screen.queryByText('Waiting for market data stream...')).not.toBeInTheDocument();
    expect(screen.queryByText('No ticks yet')).not.toBeInTheDocument();
  });
});
