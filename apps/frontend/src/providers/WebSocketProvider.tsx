import React, { createContext, useContext, useEffect, useState } from 'react';
import { useOrderBookStore } from '../store/useOrderBookStore';

interface WebSocketContextType {
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ isConnected: false });

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { updateOrderBook } = useOrderBookStore();

  useEffect(() => {
    // In production, this would connect to the backend WebSocket/SSE server.
    // e.g., const ws = new WebSocket('ws://localhost:8080/ws/market-data');
    console.log('Connecting to WebSocket server...');
    setIsConnected(true);

    // Simulated WebSocket message handler
    const interval = setInterval(() => {
      updateOrderBook({
        bids: [
          { price: 45000 + Math.random() * 10, amount: Math.random() * 2, total: 0 },
          { price: 44990 + Math.random() * 10, amount: Math.random() * 2, total: 0 }
        ],
        asks: [
          { price: 45020 + Math.random() * 10, amount: Math.random() * 2, total: 0 },
          { price: 45030 + Math.random() * 10, amount: Math.random() * 2, total: 0 }
        ]
      });
    }, 1000);

    return () => {
      console.log('Disconnecting from WebSocket server...');
      clearInterval(interval);
      setIsConnected(false);
      // ws.close();
    };
  }, [updateOrderBook]);

  return (
    <WebSocketContext.Provider value={{ isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};
