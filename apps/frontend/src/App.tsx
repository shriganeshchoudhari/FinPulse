import { Sidebar } from './components/Sidebar';
import { Chart } from './components/Chart';
import { OrderBook } from './components/OrderBook';
import { WebSocketProvider } from './providers/WebSocketProvider';

function App() {
  return (
    <WebSocketProvider>
      <div className="dashboard-container">
        <header className="header">
          <h1>BTC/USD <span style={{fontSize: '1rem', color: 'var(--color-up)', marginLeft: '10px'}}>+2.45%</span></h1>
        </header>
        
        <Sidebar />
        
        <main className="main-content">
          <Chart />
          
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', padding: '20px', borderRadius: '8px' }}>
              <h3>Place Order</h3>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button className="btn" style={{flex: 1, backgroundColor: 'var(--color-up)'}}>Buy</button>
                <button className="btn" style={{flex: 1, backgroundColor: 'var(--color-down)'}}>Sell</button>
              </div>
            </div>
            <div style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', padding: '20px', borderRadius: '8px' }}>
              <h3>Recent Trades</h3>
              <p style={{ color: 'var(--text-secondary)' }}>No recent trades.</p>
            </div>
          </div>
        </main>

        <OrderBook />
      </div>
    </WebSocketProvider>
  )
}

export default App
