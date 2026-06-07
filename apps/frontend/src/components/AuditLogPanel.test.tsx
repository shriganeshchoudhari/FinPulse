import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AuditLogPanel from './AuditLogPanel';
import { useStore } from '../store/useStore';
import { auditService } from '../services/api';

vi.mock('../store/useStore');
vi.mock('../services/api', () => ({
  auditService: {
    getAuditLogs: vi.fn(),
  }
}));

describe('AuditLogPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as any).mockReturnValue({
      auditLogs: [],
      setAuditLogs: vi.fn(),
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders empty state when no logs', () => {
    render(<AuditLogPanel />);
    expect(screen.getByText('Immutable Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('No audit logs available')).toBeInTheDocument();
  });

  it('fetches and displays audit logs', async () => {
    const mockLogs = [
      {
        id: '1',
        timestamp: new Date('2023-01-01T12:00:00').toISOString(),
        action: 'TRADE_EXECUTED',
        details: JSON.stringify({ side: 'BUY', quantity: 1, symbol: 'BTC/USD', price: 50000 })
      }
    ];
    
    (auditService.getAuditLogs as any).mockResolvedValue(mockLogs);
    
    const setAuditLogs = vi.fn();
    (useStore as unknown as any).mockReturnValue({
      auditLogs: mockLogs,
      setAuditLogs,
    });

    render(<AuditLogPanel />);
    
    expect(screen.getByText('TRADE_EXECUTED')).toBeInTheDocument();
    expect(screen.getByText('BUY 1 BTC/USD @ $50000')).toBeInTheDocument();
    
    expect(auditService.getAuditLogs).toHaveBeenCalled();
  });
});
