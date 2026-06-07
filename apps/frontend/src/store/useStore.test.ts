import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';
import type { MarketTick } from './useStore';

describe('useStore', () => {
  beforeEach(() => {
    // Reset local storage before each test
    localStorage.clear();
    
    // Reset store state
    useStore.setState({
      token: null,
      userId: null,
      marketData: {},
      latestPrices: {},
      wallet: null,
      portfolio: null,
      trades: [],
      auditLogs: []
    });
  });

  it('sets and removes token', () => {
    const { setToken } = useStore.getState();
    
    setToken('test-token');
    expect(useStore.getState().token).toBe('test-token');
    expect(localStorage.getItem('token')).toBe('test-token');
    
    setToken(null);
    expect(useStore.getState().token).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('sets and removes userId', () => {
    const { setUserId } = useStore.getState();
    
    setUserId('user-123');
    expect(useStore.getState().userId).toBe('user-123');
    expect(localStorage.getItem('userId')).toBe('user-123');
    
    setUserId(null);
    expect(useStore.getState().userId).toBeNull();
    expect(localStorage.getItem('userId')).toBeNull();
  });

  it('adds market ticks and maintains history limit', () => {
    const { addMarketTick } = useStore.getState();
    
    const tick1: MarketTick = { symbol: 'BTC', price: 50000, timestamp: '2023-01-01' };
    addMarketTick(tick1);
    
    expect(useStore.getState().latestPrices['BTC']).toBe(50000);
    expect(useStore.getState().marketData['BTC']).toHaveLength(1);
    expect(useStore.getState().marketData['BTC'][0]).toEqual(tick1);
    
    // Add 100 more ticks
    for (let i = 0; i < 100; i++) {
      addMarketTick({ symbol: 'BTC', price: 50000 + i, timestamp: `2023-01-02-${i}` });
    }
    
    // Check limit
    expect(useStore.getState().marketData['BTC']).toHaveLength(100);
    expect(useStore.getState().latestPrices['BTC']).toBe(50099);
  });
});
