import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { authService } from '../services/api';
import { ShieldCheck, LogIn, UserPlus } from 'lucide-react';

const LoginPanel: React.FC = () => {
  const { setToken, setUserId } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      if (isLogin) {
        const data = await authService.login(username, password);
        setToken(data.token);
        // We'll decode JWT to get userId in a real app, mock it for now on login success
        setUserId(data.token ? '00000000-0000-0000-0000-000000000001' : null);
      } else {
        const data = await authService.register(username, email, password);
        setToken(data.token);
        setUserId(data.token ? '00000000-0000-0000-0000-000000000001' : null);
      }
    } catch (err: any) {
      setError(err.response?.status === 401 ? 'Invalid credentials' : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '400px', margin: '100px auto', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
        <ShieldCheck size={28} color="var(--accent-blue)" />
        {isLogin ? 'Secure Login' : 'Create Account'}
      </h2>
      
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', border: '1px solid var(--accent-red)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="input-group">
          <label className="input-label">Username</label>
          <input 
            type="text" 
            className="input-field" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        {!isLogin && (
          <div className="input-group">
            <label className="input-label">Email</label>
            <input 
              type="email" 
              className="input-field" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        )}
        
        <div className="input-group">
          <label className="input-label">Password</label>
          <input 
            type="password" 
            className="input-field" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="btn btn-buy" 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}
          disabled={isSubmitting}
        >
          {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
          {isSubmitting ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
        </button>
      </form>
      
      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button 
          onClick={() => setIsLogin(!isLogin)}
          style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {isLogin ? 'Register' : 'Log in'}
        </button>
      </div>
    </div>
  );
};

export default LoginPanel;
