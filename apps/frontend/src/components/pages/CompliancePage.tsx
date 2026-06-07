import React, { useEffect, useState } from 'react';
import { useStore, type AuditLog } from '../../store/useStore';
import { auditService } from '../../services/api';
import { Shield, Download, Search, ChevronDown, ChevronRight, Lock, Filter } from 'lucide-react';

const ALLOWED_ROLES = ['ROLE_COMPLIANCE', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN'];
const ACTION_TYPES = ['ALL', 'LOGIN', 'TRADE', 'WITHDRAW', 'DEPOSIT', 'ADMIN'];

const PAGE_SIZE = 10;

const CompliancePage: React.FC = () => {
  const { role, auditLogs, setAuditLogs } = useStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);

  const isAllowed = role && ALLOWED_ROLES.includes(role);

  useEffect(() => {
    if (!isAllowed) { setLoading(false); return; }
    setLoading(true);
    auditService.getAuditLogs()
      .then((data) => setAuditLogs(Array.isArray(data) ? data : []))
      .catch(() => setAuditLogs([]))
      .finally(() => setLoading(false));
  }, [isAllowed, setAuditLogs]);

  // Filtered logs
  const filtered = auditLogs.filter((log) => {
    const matchesSearch = search === '' ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.id?.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'ALL' || log.action?.toUpperCase().includes(actionFilter);
    const matchesFrom = !fromDate || new Date(log.timestamp) >= new Date(fromDate);
    const matchesTo = !toDate || new Date(log.timestamp) <= new Date(toDate + 'T23:59:59');
    return matchesSearch && matchesAction && matchesFrom && matchesTo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const blob = await auditService.exportCsv(fromDate || '2024-01-01', toDate || new Date().toISOString().split('T')[0]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_export_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback: create mock CSV from existing logs
      const header = 'ID,Action,Timestamp,Details\n';
      const rows = filtered.map((l) => `"${l.id}","${l.action}","${l.timestamp}","${JSON.stringify(l.details).replace(/"/g, "'")}"`).join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_export_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={36} color="var(--accent-red)" />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Access Denied</h2>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '400px' }}>
          This page is restricted to Compliance Officers and Administrators. Your current role ({role || 'none'}) does not have access.
        </p>
        <span className="badge badge-red">Insufficient Permissions</span>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={22} color="var(--accent-blue)" />
            Compliance Dashboard
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Audit trails and regulatory reporting</p>
        </div>
        <button
          className="btn-primary"
          onClick={handleExport}
          disabled={exportLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={16} />
          {exportLoading ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={16} color="var(--text-secondary)" />

          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '180px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search action, ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: '32px', height: '38px', fontSize: '13px' }}
            />
          </div>

          {/* Action Type */}
          <div style={{ position: 'relative' }}>
            <select
              className="input-field"
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              style={{ height: '38px', paddingRight: '30px', fontSize: '13px', cursor: 'pointer', appearance: 'none', minWidth: '140px' }}
            >
              {ACTION_TYPES.map((t) => <option key={t} value={t}>{t === 'ALL' ? 'All Actions' : t}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
          </div>

          {/* Date Range */}
          <input
            type="date"
            className="input-field"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            style={{ height: '38px', fontSize: '13px', width: '150px', colorScheme: 'dark' }}
            title="From date"
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>to</span>
          <input
            type="date"
            className="input-field"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            style={{ height: '38px', fontSize: '13px', width: '150px', colorScheme: 'dark' }}
            title="To date"
          />

          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: 'auto' }}>
            {filtered.length} records
          </span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px', borderRadius: '6px' }} />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Shield size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p>No audit logs found matching your filters.</p>
          </div>
        ) : (
          <table className="data-table" style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ width: '32px' }}></th>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Log ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((log: AuditLog) => {
                const isExp = expanded.has(log.id);
                const detailStr = typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2);
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => toggleExpand(log.id)}
                      style={{ cursor: 'pointer', transition: 'background 0.15s', background: isExp ? 'rgba(59,130,246,0.05)' : 'transparent' }}
                      onMouseEnter={(e) => { if (!isExp) (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={(e) => { if (!isExp) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                    >
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: "'Roboto Mono', monospace" }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: '11px' }}>{log.action}</span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: "'Roboto Mono', monospace" }}>
                        {log.id?.slice(0, 12)}...
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {detailStr?.slice(0, 60)}{detailStr?.length > 60 ? '...' : ''}
                      </td>
                    </tr>
                    {isExp && (
                      <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <td colSpan={5} style={{ padding: '0 16px 16px' }}>
                          <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '16px', border: '1px solid var(--glass-border)', marginTop: '8px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Raw Detail</div>
                            <pre style={{ fontSize: '12px', color: 'var(--accent-green)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: "'Roboto Mono', monospace" }}>
                              {detailStr}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: page === 1 ? 'var(--text-secondary)' : 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 500 }}
          >
            ← Prev
          </button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{ width: '36px', height: '36px', borderRadius: '8px', border: page === p ? '1px solid var(--accent-blue)' : '1px solid var(--glass-border)', background: page === p ? 'rgba(59,130,246,0.15)' : 'var(--bg-tertiary)', color: page === p ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: page === p ? 700 : 400, fontSize: '14px' }}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: page === totalPages ? 'var(--text-secondary)' : 'var(--text-primary)', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 500 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default CompliancePage;
