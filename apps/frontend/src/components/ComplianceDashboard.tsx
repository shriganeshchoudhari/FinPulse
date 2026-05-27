import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react';

const ComplianceDashboard: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    // In a real app, this would fetch from a compliance API endpoint
    // We'll mock some data for now
    setEvents([
      { id: '1', severity: 'CRITICAL', rule: 'AML_CHECK_01', message: 'Large withdrawal detected', timestamp: new Date().toISOString() },
      { id: '2', severity: 'WARNING', rule: 'KYC_EXPIRED', message: 'User KYC documents expired', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: '3', severity: 'INFO', rule: 'NEW_ACCOUNT', message: 'New user registered', timestamp: new Date(Date.now() - 7200000).toISOString() },
    ]);
  }, []);

  return (
    <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)' }}>
        <ShieldAlert size={20} />
        Compliance Officer Dashboard
      </h2>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {events.map(ev => (
          <div key={ev.id} style={{
            padding: '12px',
            borderRadius: '8px',
            background: 'var(--bg-tertiary)',
            borderLeft: `4px solid ${ev.severity === 'CRITICAL' ? 'var(--accent-red)' : ev.severity === 'WARNING' ? 'var(--accent-orange)' : 'var(--accent-blue)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {ev.severity === 'CRITICAL' && <AlertTriangle size={20} color="var(--accent-red)" />}
            {ev.severity === 'WARNING' && <AlertTriangle size={20} color="var(--accent-orange)" />}
            {ev.severity === 'INFO' && <CheckCircle size={20} color="var(--accent-blue)" />}
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{ev.rule}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(ev.timestamp).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{ev.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComplianceDashboard;
