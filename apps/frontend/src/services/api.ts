import axios from 'axios';
import { useStore, type MarketTick } from '../store/useStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/market-data';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = useStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        const res = await api.post('/auth/refresh');
        const newToken = res.data.token;
        useStore.getState().setToken(newToken);
        
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useStore.getState().setToken(null);
        useStore.getState().setUserId(null);
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
  logout: async () => {
    await api.post('/auth/logout');
  }
};



export const tradeService = {
  placeOrder: async (symbol: string, side: 'BUY' | 'SELL', quantity: number, price: number) => {
    const userId = useStore.getState().userId;
    const response = await api.post('/trades', {
      userId,
      symbol,
      side,
      quantity,
      price
    });
    return response.data;
  },
  
  getUserTrades: async () => {
    const userId = useStore.getState().userId;
    const response = await api.get(`/trades/user/${userId}`);
    return response.data;
  }
};

export const walletService = {
  getWallet: async (currency: string) => {
    const userId = useStore.getState().userId;
    const response = await api.get(`/wallets/user/${userId}/${currency}`);
    return response.data;
  }
};

export const auditService = {
  getAuditLogs: async () => {
    const userId = useStore.getState().userId;
    const response = await api.get(`/compliance/audit/${userId}`);
    return response.data;
  }
};

export const analyticsService = {
  getPortfolio: async () => {
    const userId = useStore.getState().userId;
    const response = await api.get(`/analytics/portfolio/${userId}`);
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
