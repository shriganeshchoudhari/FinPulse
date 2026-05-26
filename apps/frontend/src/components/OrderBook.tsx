import React, { useEffect } from 'react';
import { useOrderBookStore } from '../store/useOrderBookStore';

export const OrderBook: React.FC = () => {
  const { bids, asks } = useOrderBookStore();

  return (
    <div className="order-book">
      <h3>Order Book</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '10px' }}>
        <span>Price(USD)</span>
        <span>Amount(BTC)</span>
      </div>
      <div className="asks" style={{ color: 'var(--color-down)', marginBottom: '15px' }}>
        {asks.map((ask, idx) => (
          <div key={`ask-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
            <span>{ask.price.toFixed(2)}</span>
            <span>{ask.amount.toFixed(4)}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '1.2rem', color: 'var(--color-up)', marginBottom: '15px', fontWeight: 'bold' }}>
        45,010.50
      </div>
      <div className="bids" style={{ color: 'var(--color-up)' }}>
        {bids.map((bid, idx) => (
          <div key={`bid-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
            <span>{bid.price.toFixed(2)}</span>
            <span>{bid.amount.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
