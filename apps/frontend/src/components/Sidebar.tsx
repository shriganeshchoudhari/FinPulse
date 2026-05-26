import React from 'react';

export const Sidebar: React.FC = () => {
  return (
    <div className="sidebar">
      <h2>FinPulse</h2>
      <nav>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>Dashboard</li>
          <li style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>Markets</li>
          <li style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>Trade</li>
          <li style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>Wallet</li>
          <li style={{ padding: '10px 0' }}>Settings</li>
        </ul>
      </nav>
    </div>
  );
};
