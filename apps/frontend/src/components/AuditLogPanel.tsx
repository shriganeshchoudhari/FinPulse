import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { auditService } from '../services/api';
import { ShieldCheck } from 'lucide-react';

const AuditLogPanel: React.FC = () => {
  const { auditLogs, setAuditLogs } = useStore();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await auditService.getAuditLogs();
        setAuditLogs(data);
      } catch (err) {
        console.error('Failed to fetch audit logs', err);
      }
    };
    
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [setAuditLogs]);

  return (
    <div className="glass-panel" style={{ height: '400px', overflowY: 'auto' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldCheck size={20} color="var(--accent-purple)" />
        Immutable Audit Trail
      </h2>
      
      <table className="data-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.length > 0 ? auditLogs.map(log => {
            const date = new Date(log.timestamp);
            let parsedDetails: any = {};
            try {
               parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
            } catch (e) {}

            return (
              <tr key={log.id}>
                <td>{date.toLocaleTimeString()}</td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', 
                    background: 'rgba(139, 92, 246, 0.1)', 
                    color: 'var(--accent-purple)', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {parsedDetails.side} {parsedDetails.quantity} {parsedDetails.symbol} @ ${parsedDetails.price}
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                No audit logs available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLogPanel;
