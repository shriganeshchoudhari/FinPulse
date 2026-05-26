import axios from 'axios';
import { useStore, type MarketTick } from '../store/useStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/market-data';

// Using a mock userId for the dashboard as authentication is mocked
export const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const tradeService = {
  placeOrder: async (symbol: string, side: 'BUY' | 'SELL', quantity: number, price: number) => {
    const response = await api.post('/trades', {
      userId: MOCK_USER_ID,
      symbol,
      side,
      quantity,
      price
    });
    return response.data;
  },
  
  getUserTrades: async () => {
    const response = await api.get(`/trades/user/${MOCK_USER_ID}`);
    return response.data;
  }
};

export const walletService = {
  getWallet: async (currency: string) => {
    const response = await api.get(`/wallets/user/${MOCK_USER_ID}/${currency}`);
    return response.data;
  }
};

export const auditService = {
  getAuditLogs: async () => {
    // Requires compliance role, mocked here assuming the backend allows it for local testing
    // or you'd pass a JWT token.
    const response = await api.get(`/compliance/audit/${MOCK_USER_ID}`);
    return response.data;
  }
};

export class MarketDataSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;

  connect() {
    this.ws = new WebSocket(WS_URL);

    this.ws.onmessage = (event) => {
      try {
        const data: MarketTick = JSON.parse(event.data);
        useStore.getState().addMarketTick(data);
      } catch (err) {
        console.error('Failed to parse market tick', err);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed. Reconnecting...');
      if (this.reconnectAttempts < 5) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, 2000);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket Error', error);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const marketDataSocket = new MarketDataSocket();
