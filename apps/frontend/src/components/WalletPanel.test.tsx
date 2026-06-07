import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WalletPanel from './WalletPanel';
import { useStore } from '../store/useStore';
import { walletService } from '../services/api';

vi.mock('../services/api', () => ({
  walletService: {
    getWallet: vi.fn(),
  },
}));

describe('WalletPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ wallet: null });
  });

  it('renders loading/default state initially', () => {
    // Return a never-resolving promise so no state update happens during this sync test
    vi.mocked(walletService.getWallet).mockReturnValueOnce(new Promise(() => {}));

    render(<WalletPanel />);
    expect(screen.getByText('Available Funds')).toBeInTheDocument();
    
    // Default values
    const zeros = screen.getAllByText('$0.00');
    expect(zeros).toHaveLength(2);
  });

  it('fetches and displays wallet data', async () => {
    const mockWallet = {
      id: 'w1',
      currency: 'USD',
      balance: 1500.50,
      lockedBalance: 200.25,
      updatedAt: new Date().toISOString()
    };
    
    vi.mocked(walletService.getWallet).mockResolvedValueOnce(mockWallet);

    render(<WalletPanel />);

    await waitFor(() => {
      expect(screen.getByText('$1,500.50')).toBeInTheDocument();
    });
    
    expect(screen.getByText('$200.25')).toBeInTheDocument();
    expect(useStore.getState().wallet).toEqual(mockWallet);
  });
});
