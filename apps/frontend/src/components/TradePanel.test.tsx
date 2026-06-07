import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TradePanel from './TradePanel';
import { useStore } from '../store/useStore';
import { tradeService } from '../services/api';

vi.mock('../store/useStore');
vi.mock('../services/api', () => ({
  tradeService: {
    placeOrder: vi.fn(),
    getUserTrades: vi.fn(),
  }
}));

describe('TradePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as any).mockReturnValue({
      latestPrices: {
        'BTC/USD': 50000,
      },
      setTrades: vi.fn(),
    });
  });

  it('renders correctly', () => {
    render(<TradePanel />);
    expect(screen.getByText('Rapid Execution')).toBeInTheDocument();
    expect(screen.getByDisplayValue('BTC/USD')).toBeInTheDocument();
    expect(screen.getByDisplayValue('$50,000')).toBeInTheDocument();
  });

  it('can switch sides', () => {
    render(<TradePanel />);
    const buyButton = screen.getByRole('button', { name: 'BUY' });
    const sellButton = screen.getByRole('button', { name: 'SELL' });
    
    fireEvent.click(sellButton);
    expect(screen.getByRole('button', { name: 'SELL BTC/USD' })).toBeInTheDocument();
    
    fireEvent.click(buyButton);
    expect(screen.getByRole('button', { name: 'BUY BTC/USD' })).toBeInTheDocument();
  });

  it('submits a trade correctly', async () => {
    render(<TradePanel />);
    
    const quantityInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(quantityInput, { target: { value: '0.5' } });
    
    const submitButton = screen.getByRole('button', { name: 'BUY BTC/USD' });
    fireEvent.click(submitButton);
    
    expect(tradeService.placeOrder).toHaveBeenCalledWith('BTC/USD', 'BUY', 0.5, 50000);
    expect(screen.getByRole('button', { name: 'EXECUTING...' })).toBeInTheDocument();
    
    await waitFor(() => {
      expect(quantityInput).toHaveValue(null);
    });
  });
});
