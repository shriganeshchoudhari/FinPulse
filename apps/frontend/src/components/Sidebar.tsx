import React from 'react';
import { useStore } from '../store/useStore';
import {
  Activity,
  LayoutDashboard,
  TrendingUp,
  Zap,
  Wallet,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { authService } from '../services/api';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  requiresRole?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'markets', label: 'Markets', icon: <TrendingUp size={18} /> },
  { id: 'trade', label: 'Trade', icon: <Zap size={18} /> },
  { id: 'wallet', label: 'Wallet', icon: <Wallet size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: <Shield size={18} />,
    requiresRole: ['ROLE_COMPLIANCE', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN'],
  },
];

const getRoleBadgeColor = (role: string | null) => {
  if (!role) return 'var(--text-secondary)';
  if (role.includes('ADMIN')) return 'var(--accent-red)';
  if (role.includes('COMPLIANCE')) return 'var(--accent-purple)';
  return 'var(--accent-blue)';
};

const getRoleLabel = (role: string | null) => {
  if (!role) return 'Trader';
  if (role.includes('ADMIN')) return 'Admin';
  if (role.includes('COMPLIANCE')) return 'Compliance';
  return 'Trader';
};

export const Sidebar: React.FC = () => {
  const { currentPage, navigateTo, role, token, setToken, setUserId } = useStore();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      /* noop */
    }
    setToken(null);
    setUserId(null);
  };

  // Decode username from JWT
  let username = 'User';
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      username = payload.sub || payload.username || 'User';
    }
  } catch { /* noop */ }

  const roleColor = getRoleBadgeColor(role);

  return (
    <div className="sidebar">
      {/* Logo */}
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--glass-border)', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(59,130,246,0.4)',
          }}>
            <Activity size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, background: 'linear-gradient(to right, #ffffff, #8b949e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              FinPulse
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Enterprise HF Trading
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {NAV_ITEMS.map((item) => {
          // Check role requirements
          if (item.requiresRole && (!role || !item.requiresRole.includes(role))) {
            return null;
          }

          const isActive = currentPage === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => navigateTo(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigateTo(item.id)}
            >
              <span style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)', transition: 'color 0.2s ease', flexShrink: 0 }}>
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {isActive && (
                <ChevronRight size={14} style={{ opacity: 0.5 }} />
              )}
            </div>
          );
        })}
      </nav>

      {/* System Status */}
      <div style={{ padding: '12px 20px', margin: '8px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600 }}>
          <span className="live-indicator" />
          SYSTEM ONLINE
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>All services operational</div>
      </div>

      {/* User Profile */}
      <div style={{ borderTop: '1px solid var(--glass-border)', padding: '16px 20px', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${roleColor}, rgba(0,0,0,0.3))`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 800,
            color: 'white',
            flexShrink: 0,
            border: `1px solid ${roleColor}40`,
          }}>
            {username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {username}
            </div>
            <div style={{ fontSize: '11px', color: roleColor, fontWeight: 600, marginTop: '2px' }}>
              {getRoleLabel(role)}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px',
            color: 'var(--accent-red)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
          }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
