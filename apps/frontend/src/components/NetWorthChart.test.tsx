import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NetWorthChart from './NetWorthChart';
import { useStore } from '../store/useStore';

vi.mock('../store/useStore');

// Mock ResizeObserver for Recharts
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

describe('NetWorthChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Accumulating history... when there is no portfolio data', () => {
    (useStore as unknown as any).mockReturnValue({
      portfolio: null,
    });
    
    render(<NetWorthChart />);
    expect(screen.getByText('Historical Net Worth')).toBeInTheDocument();
    expect(screen.getByText('Accumulating history...')).toBeInTheDocument();
  });

  it('renders the chart when portfolio data is available', () => {
    (useStore as unknown as any).mockReturnValue({
      portfolio: {
        totalEstimatedValue: 100000,
      },
    });
    
    render(<NetWorthChart />);
    expect(screen.getByText('Historical Net Worth')).toBeInTheDocument();
    // It should render the recharts AreaChart, meaning "Accumulating history..." shouldn't be there
    expect(screen.queryByText('Accumulating history...')).not.toBeInTheDocument();
  });
});
