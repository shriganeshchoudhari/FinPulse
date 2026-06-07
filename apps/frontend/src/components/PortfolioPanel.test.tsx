import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PortfolioPanel from './PortfolioPanel';
import { useStore } from '../store/useStore';
import { analyticsService } from '../services/api';

vi.mock('../store/useStore');
vi.mock('../services/api', () => ({
  analyticsService: {
    getPortfolio: vi.fn(),
  }
}));

// Mock ResizeObserver for Recharts
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

describe('PortfolioPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as any).mockReturnValue({
      portfolio: null,
      setPortfolio: vi.fn(),
      token: 'test-token',
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading or empty state', () => {
    render(<PortfolioPanel />);
    expect(screen.getByText('Risk & Portfolio Analytics')).toBeInTheDocument();
    expect(screen.getByText('No open positions')).toBeInTheDocument();
  });

  it('fetches and displays portfolio', async () => {
    const mockPortfolio = {
      positions: { 'BTC': 1.5, 'ETH': 10 },
      totalEstimatedValue: 75000,
    };
    
    (analyticsService.getPortfolio as any).mockResolvedValue(mockPortfolio);
    
    const setPortfolio = vi.fn();
    (useStore as unknown as any).mockReturnValue({
      portfolio: mockPortfolio,
      setPortfolio,
      token: 'test-token',
    });

    render(<PortfolioPanel />);
    
    expect(screen.getByText('$75,000.00')).toBeInTheDocument();
    expect(screen.getByText('BTC: 1.5')).toBeInTheDocument();
    expect(screen.getByText('ETH: 10')).toBeInTheDocument();
    
    expect(analyticsService.getPortfolio).toHaveBeenCalled();
  });
});
