import { create } from 'zustand';

interface Order {
  price: number;
  amount: number;
  total: number;
}

interface OrderBookState {
  bids: Order[];
  asks: Order[];
  setBids: (bids: Order[]) => void;
  setAsks: (asks: Order[]) => void;
  updateOrderBook: (data: any) => void;
}

export const useOrderBookStore = create<OrderBookState>((set) => ({
  bids: [],
  asks: [],
  setBids: (bids) => set({ bids }),
  setAsks: (asks) => set({ asks }),
  updateOrderBook: (data) => set((state) => {
    // Basic implementation for real-time updates
    return {
      bids: data.bids || state.bids,
      asks: data.asks || state.asks
    };
  })
}));
