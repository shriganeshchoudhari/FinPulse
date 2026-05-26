import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { tradeService } from '../services/api';
import { Zap } from 'lucide-react';

const TradePanel: React.FC = () => {
  const { latestPrices } = useStore();
  const symbol = "BTC/USD";
  const currentPrice = latestPrices[symbol] || 0;
  
  const [quantity, setQuantity] = useState<string>('0.1');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0 || !currentPrice) return;
    
    setIsSubmitting(true);
    try {
      await tradeService.placeOrder(symbol, side, Number(quantity), currentPrice);
      // Wait a moment and then refresh trades (ideally done via websockets or react-query)
      setTimeout(async () => {
        const trades = await tradeService.getUserTrades();
        useStore.getState().setTrades(trades);
      }, 1000);
      setQuantity('');
    } catch (err) {
      console.error("Trade failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel">
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Zap size={20} color="var(--accent-purple)" />
        Rapid Execution
      </h2>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button 
          type="button"
          onClick={() => setSide('BUY')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: `1px solid ${side === 'BUY' ? 'var(--accent-green)' : 'var(--glass-border)'}`,
            background: side === 'BUY' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
            color: side === 'BUY' ? 'var(--accent-green)' : 'var(--text-secondary)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          BUY
        </button>
        <button 
          type="button"
          onClick={() => setSide('SELL')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: `1px solid ${side === 'SELL' ? 'var(--accent-red)' : 'var(--glass-border)'}`,
            background: side === 'SELL' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
            color: side === 'SELL' ? 'var(--accent-red)' : 'var(--text-secondary)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          SELL
        </button>
      </div>
      
      <form onSubmit={handleTrade}>
        <div className="input-group">
          <label className="input-label">Symbol</label>
          <input type="text" className="input-field" value={symbol} readOnly />
        </div>
        
        <div className="input-group">
          <label className="input-label">Quantity</label>
          <input 
            type="number" 
            step="0.01"
            min="0.01"
            className="input-field" 
            value={quantity} 
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        
        <div className="input-group">
          <label className="input-label">Estimated Price</label>
          <input 
            type="text" 
            className="input-field" 
            value={`$${currentPrice.toLocaleString()}`} 
            readOnly 
          />
        </div>
        
        <div style={{ marginTop: '32px' }}>
          <button 
            type="submit" 
            className={`btn ${side === 'BUY' ? 'btn-buy' : 'btn-sell'}`}
            disabled={isSubmitting || currentPrice === 0}
          >
            {isSubmitting ? 'EXECUTING...' : `${side} ${symbol}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TradePanel;
