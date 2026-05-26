import { create } from 'zustand';

export interface MarketTick {
  symbol: string;
  price: number;
  timestamp: string;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  status: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  currency: string;
  balance: number;
  lockedBalance: number;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  timestamp: string;
  details: any;
}

interface FinPulseState {
  marketData: Record<string, MarketTick[]>;
  latestPrices: Record<string, number>;
  wallet: Wallet | null;
  trades: Trade[];
  auditLogs: AuditLog[];
  
  addMarketTick: (tick: MarketTick) => void;
  setWallet: (wallet: Wallet) => void;
  setTrades: (trades: Trade[]) => void;
  setAuditLogs: (logs: AuditLog[]) => void;
}

export const useStore = create<FinPulseState>((set) => ({
  marketData: {},
  latestPrices: {},
  wallet: null,
  trades: [],
  auditLogs: [],

  addMarketTick: (tick) => set((state) => {
    const symbolData = state.marketData[tick.symbol] || [];
    // Keep last 100 ticks for chart performance
    const newSymbolData = [...symbolData, tick].slice(-100);
    
    return {
      marketData: {
        ...state.marketData,
        [tick.symbol]: newSymbolData
      },
      latestPrices: {
        ...state.latestPrices,
        [tick.symbol]: tick.price
      }
    };
  }),
  
  setWallet: (wallet) => set({ wallet }),
  setTrades: (trades) => set({ trades }),
  setAuditLogs: (auditLogs) => set({ auditLogs })
}));
