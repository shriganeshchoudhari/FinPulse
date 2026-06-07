import { create } from 'zustand';

export interface MarketTick {
  symbol: string;
  price: number;
  volume?: number;
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

export interface Portfolio {
  userId: string;
  positions: Record<string, number>;
  totalEstimatedValue: number;
}

interface FinPulseState {
  token: string | null;
  userId: string | null;
  currentPage: string;
  role: string | null;
  kycStatus: string;
  marketData: Record<string, MarketTick[]>;
  latestPrices: Record<string, number>;
  wallet: Wallet | null;
  portfolio: Portfolio | null;
  trades: Trade[];
  auditLogs: AuditLog[];

  setToken: (token: string | null) => void;
  setUserId: (id: string | null) => void;
  navigateTo: (page: string) => void;
  setRole: (role: string | null) => void;
  setKycStatus: (status: string) => void;
  addMarketTick: (tick: MarketTick) => void;
  setWallet: (wallet: Wallet) => void;
  setPortfolio: (portfolio: Portfolio) => void;
  setTrades: (trades: Trade[]) => void;
  setAuditLogs: (logs: AuditLog[]) => void;
}

export const useStore = create<FinPulseState>((set) => ({
  token: localStorage.getItem('token'),
  userId: localStorage.getItem('userId'),
  currentPage: 'dashboard',
  role: null,
  kycStatus: 'PENDING',
  marketData: {},
  latestPrices: {},
  wallet: null,
  portfolio: null,
  trades: [],
  auditLogs: [],

  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token });
  },

  setUserId: (userId) => {
    if (userId) localStorage.setItem('userId', userId);
    else localStorage.removeItem('userId');
    set({ userId });
  },

  navigateTo: (page) => set({ currentPage: page }),

  setRole: (role) => set({ role }),

  setKycStatus: (kycStatus) => set({ kycStatus }),

  addMarketTick: (tick) =>
    set((state) => {
      const symbolData = state.marketData[tick.symbol] || [];
      const newSymbolData = [...symbolData, tick].slice(-100);
      return {
        marketData: {
          ...state.marketData,
          [tick.symbol]: newSymbolData,
        },
        latestPrices: {
          ...state.latestPrices,
          [tick.symbol]: tick.price,
        },
      };
    }),

  setWallet: (wallet) => set({ wallet }),
  setPortfolio: (portfolio) => set({ portfolio }),
  setTrades: (trades) => set({ trades }),
  setAuditLogs: (auditLogs) => set({ auditLogs }),
}));
