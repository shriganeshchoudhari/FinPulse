import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { authService } from '../services/api';
import { LogIn, UserPlus, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const LoginPanel: React.FC = () => {
  const { setToken, setUserId, setRole } = useStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const decodeAndApplyToken = (token: string) => {
    setToken(token);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const extractedUserId =
        payload.userId || payload.user_id || payload.sub || '00000000-0000-0000-0000-000000000001';
      setUserId(extractedUserId);
      const extractedRole = payload.role || payload.roles?.[0] || 'ROLE_USER';
      setRole(extractedRole);
    } catch {
      setUserId('00000000-0000-0000-0000-000000000001');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('Please fill in all required fields.'); return; }
    setError('');
    setIsSubmitting(true);
    try {
      if (tab === 'login') {
        const data = await authService.login(username, password);
        decodeAndApplyToken(data.token || data.accessToken);
      } else {
        if (!email) { setError('Please enter your email address.'); setIsSubmitting(false); return; }
        const data = await authService.register(username, email, password);
        decodeAndApplyToken(data.token || data.accessToken);
      }
    } catch (err: any) {
      if (err.response?.status === 401) setError('Invalid credentials');
      else if (err.response?.status === 409) setError('Username already taken. Please choose another.');
      else setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '400px' }} className="glass-panel">
      {/* Title */}
      <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: 'var(--text-primary)' }}>
        <ShieldCheck size={24} color="var(--accent-blue)" />
        {tab === 'login' ? 'Secure Login' : 'Create Account'}
      </h2>

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--glass-border)',
        marginBottom: '28px',
      }}>
        <div
          role="tab"
          id="tab-login"
          onClick={() => { setTab('login'); setError(''); }}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: tab === 'login' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            marginBottom: '-1px',
            color: tab === 'login' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <LogIn size={15} />Sign In
        </div>
        <div
          role="tab"
          id="tab-register"
          onClick={() => { setTab('register'); setError(''); }}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: tab === 'register' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            marginBottom: '-1px',
            color: tab === 'register' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <UserPlus size={15} />Register
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#fca5a5',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '13px',
          border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>⚠ </span><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor="fp-username" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Username
          </label>
          <input
            id="fp-username"
            type="text"
            className="input-field"
            placeholder="Enter your username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </div>

        {tab === 'register' && (
          <div>
            <label htmlFor="fp-email" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Email
            </label>
            <input
              id="fp-email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        )}

        <div>
          <label htmlFor="fp-password" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="fp-password"
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ paddingRight: '44px' }}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                padding: '0', display: 'flex', alignItems: 'center',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          id="fp-submit"
          type="submit"
          disabled={isSubmitting}
          style={{
            marginTop: '8px',
            padding: '14px',
            background: isSubmitting
              ? 'rgba(59,130,246,0.4)'
              : 'linear-gradient(135deg, var(--accent-blue), #2563eb)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: '15px',
            fontWeight: 700,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: isSubmitting ? 'none' : '0 4px 20px rgba(59,130,246,0.4)',
            transition: 'all 0.25s ease',
          }}
        >
          {isSubmitting ? (
            'Processing...'
          ) : tab === 'login' ? (
            <><LogIn size={18} />Sign In</>
          ) : (
            <><UserPlus size={18} />Sign Up</>
          )}
        </button>
      </form>

      {/* Security Footer */}
      <div style={{
        marginTop: '24px',
        padding: '14px 16px',
        background: 'rgba(59,130,246,0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(59,130,246,0.12)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
      }}>
        <ShieldCheck size={16} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Secured with JWT + Redis token revocation. Refresh tokens stored in HttpOnly cookies.
        </span>
      </div>
    </div>
  );
};

export default LoginPanel;
