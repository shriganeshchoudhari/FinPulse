import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { User, ShieldCheck, Bell, Lock, CheckCircle, AlertTriangle, Clock, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface SectionProps { title: string; icon: React.ReactNode; children: React.ReactNode; }
const Section: React.FC<SectionProps> = ({ title, icon, children }) => (
  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
      {icon} {title}
    </h3>
    {children}
  </div>
);

interface ToggleRowProps { label: string; description?: string; defaultChecked?: boolean; }
const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, defaultChecked = false }) => {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        {description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{description}</div>}
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  );
};

const KycBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'APPROVED') return (
    <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <CheckCircle size={12} /> Verified
    </span>
  );
  if (status === 'REJECTED') return (
    <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <AlertTriangle size={12} /> Rejected
    </span>
  );
  return (
    <span className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <Clock size={12} /> Pending
    </span>
  );
};

const SettingsPage: React.FC = () => {
  const { token, userId, kycStatus, setKycStatus } = useStore();
  const [kycForm, setKycForm] = useState({ firstName: '', lastName: '', docType: 'PASSPORT' });
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycMessage, setKycMessage] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  // Decode JWT for display
  let username = 'User';
  let email = '';
  let issuedAt = '';
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      username = payload.sub || payload.username || 'User';
      email = payload.email || `${username}@finpulse.io`;
      if (payload.iat) issuedAt = new Date(payload.iat * 1000).toLocaleDateString();
    }
  } catch { /* noop */ }

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycForm.firstName || !kycForm.lastName) {
      setKycMessage('Please fill in all required fields.');
      return;
    }
    setKycSubmitting(true);
    setKycMessage('');
    // Mock API call
    await new Promise((r) => setTimeout(r, 1500));
    setKycStatus('APPROVED');
    setKycMessage('KYC verification submitted and approved!');
    setKycSubmitting(false);
  };

  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg('Passwords do not match.');
      return;
    }
    if (pwForm.next.length < 8) {
      setPwMsg('Password must be at least 8 characters.');
      return;
    }
    setPwMsg('');
    await new Promise((r) => setTimeout(r, 1000));
    setPwMsg('Password changed successfully!');
    setPwForm({ current: '', next: '', confirm: '' });
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      {/* Profile */}
      <Section title="Profile" icon={<User size={18} color="var(--accent-blue)" />}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{username}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>{email}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'User ID', value: userId?.slice(0, 8) + '...' || 'N/A' },
            { label: 'Member Since', value: issuedAt || 'N/A' },
            { label: 'Account Type', value: 'Retail Trader' },
            { label: 'Timezone', value: Intl.DateTimeFormat().resolvedOptions().timeZone },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '14px', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'Roboto Mono', monospace" }}>{value}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* KYC */}
      <Section title="Identity Verification (KYC)" icon={<ShieldCheck size={18} color={kycStatus === 'APPROVED' ? 'var(--accent-green)' : '#f59e0b'} />}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>KYC Status</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Identity verification for regulatory compliance</div>
          </div>
          <KycBadge status={kycStatus} />
        </div>

        {kycStatus === 'APPROVED' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', background: 'rgba(16,185,129,0.08)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CheckCircle size={32} color="var(--accent-green)" />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-green)' }}>Verified & Approved</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Your identity has been verified. You have full trading access.</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleKycSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {kycMessage && (
              <div style={{ padding: '12px', borderRadius: '8px', fontSize: '14px', background: kycMessage.includes('approved') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: kycMessage.includes('approved') ? 'var(--accent-green)' : 'var(--accent-red)', border: `1px solid ${kycMessage.includes('approved') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                {kycMessage}
              </div>
            )}
            <div className="page-grid-2" style={{ gap: '12px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">First Name</label>
                <input className="input-field" value={kycForm.firstName} onChange={(e) => setKycForm(p => ({ ...p, firstName: e.target.value }))} placeholder="John" required />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Last Name</label>
                <input className="input-field" value={kycForm.lastName} onChange={(e) => setKycForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Doe" required />
              </div>
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Document Type</label>
              <select className="input-field" value={kycForm.docType} onChange={(e) => setKycForm(p => ({ ...p, docType: e.target.value }))}>
                <option value="PASSPORT">Passport</option>
                <option value="NATIONAL_ID">National ID</option>
                <option value="DRIVERS_LICENSE">Driver's License</option>
              </select>
            </div>
            <div style={{ border: '2px dashed var(--glass-border)', borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')} onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--glass-border)')}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                <ChevronRight size={20} style={{ display: 'block', margin: '0 auto 8px', transform: 'rotate(90deg)' }} />
                Click to upload document (mock)
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={kycSubmitting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <ShieldCheck size={16} />
              {kycSubmitting ? 'Submitting...' : 'Submit KYC'}
            </button>
          </form>
        )}
      </Section>

      {/* Security */}
      <Section title="Security" icon={<Lock size={18} color="var(--accent-purple)" />}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Active Sessions</div>
          <span className="badge badge-blue">1 device</span>
        </div>

        <form onSubmit={handlePwSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>Change Password</div>
          {pwMsg && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '14px', background: pwMsg.includes('successfully') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: pwMsg.includes('successfully') ? 'var(--accent-green)' : 'var(--accent-red)', border: `1px solid ${pwMsg.includes('successfully') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              {pwMsg}
            </div>
          )}
          {[
            { key: 'current', label: 'Current Password' },
            { key: 'next', label: 'New Password' },
            { key: 'confirm', label: 'Confirm New Password' },
          ].map(({ key, label }) => (
            <div key={key} className="input-group" style={{ marginBottom: 0, position: 'relative' }}>
              <label className="input-label">{label}</label>
              <input
                type={showPw ? 'text' : 'password'}
                className="input-field"
                style={{ paddingRight: '44px' }}
                value={(pwForm as any)[key]}
                onChange={(e) => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder="••••••••"
              />
              {key === 'current' && (
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, bottom: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>
          ))}
          <button type="submit" className="btn-primary" style={{ width: 'fit-content' }}>Update Password</button>
        </form>

        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
          <ToggleRow label="Two-Factor Authentication (2FA)" description="Add an extra layer of security with TOTP" defaultChecked={false} />
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={<Bell size={18} color="var(--accent-blue)" />}>
        <ToggleRow label="Trade Executions" description="Get notified when your orders are filled" defaultChecked={true} />
        <ToggleRow label="Price Alerts" description="Alerts when assets hit your target price" defaultChecked={true} />
        <ToggleRow label="Account Activity" description="Login attempts and security events" defaultChecked={true} />
        <ToggleRow label="Market News" description="Breaking news and analysis" defaultChecked={false} />
        <ToggleRow label="Weekly Summary" description="Portfolio performance digest every Monday" defaultChecked={false} />
      </Section>
    </div>
  );
};

export default SettingsPage;
