import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config';

export default function Login({ account, role, setRole, connectWallet }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const rolesList = [
    { name: 'Manufacturer', icon: '🏭', desc: 'Onboard products & generate QR codes', route: '/manufacturer' },
    { name: 'Supplier', icon: '🚚', desc: 'Scan & update in-transit location status', route: '/supplier' },
    { name: 'Retailer', icon: '🏪', desc: 'Receive stock & mark items as sold', route: '/retailer' },
    { name: 'Consumer', icon: '🔍', desc: 'Verify product authenticity & full history', route: '/consumer' },
    { name: 'Administrator', icon: '⚙️', desc: 'Manage users and role authorizations', route: '/' }
  ];

  const handleRoleSelect = (r) => {
    setRole(r.name);
    localStorage.setItem('trusecure_role', r.name);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(`Logged in as ${data.user.username} (${data.user.role})`);
        setRole(data.user.role);
        localStorage.setItem('trusecure_role', data.user.role);
        localStorage.setItem('trusecure_token', data.token);

        const targetRoleObj = rolesList.find(r => r.name === data.user.role);
        if (targetRoleObj && targetRoleObj.route !== '/') {
          setTimeout(() => navigate(targetRoleObj.route), 1000);
        }
      } else {
        setMessage(`Error: ${data.error || 'Login failed'}`);
      }
    } catch (err) {
      setMessage(`Server Connection Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card-panel">
        <h2>Participant Role Selection</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Select your participant role in the TruSecure supply chain network.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {rolesList.map(r => (
            <div
              key={r.name}
              onClick={() => handleRoleSelect(r)}
              style={{
                padding: '1.25rem',
                borderRadius: '12px',
                background: role === r.name ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                border: role === r.name ? '2px solid var(--accent-blue)' : '1px solid var(--border-glass)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{r.icon}</div>
              <h4 style={{ color: role === r.name ? '#38bdf8' : '#fff' }}>{r.name}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{r.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn-primary" onClick={connectWallet} style={{ width: 'auto' }}>
            🦊 {account ? `Wallet: ${account.substring(0,6)}...${account.substring(account.length-4)}` : 'Connect MetaMask Wallet'}
          </button>
          {account && <span style={{ color: '#10b981', fontSize: '0.9rem' }}>✓ MetaMask Connected</span>}
        </div>
      </div>

      <div className="card-panel" style={{ maxWidth: '480px' }}>
        <h3>Account Sign In</h3>
        <form onSubmit={handleLogin} style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. rolex_mfg, logistic_sup, retail_store"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Authenticating...' : `Sign In as ${role}`}
          </button>
        </form>

        {message && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
