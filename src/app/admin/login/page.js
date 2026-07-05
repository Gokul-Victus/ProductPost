'use strict';
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/admin/status');
      } else {
        setError(data.error || 'Incorrect password. Try again.');
      }
    } catch (err) {
      setError('Connection failed. Please check network.');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0c',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#f3f4f6',
    padding: '20px'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#111115',
    border: '1px solid #222227',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#ffffff',
    textAlign: 'center'
  };

  const subtitleStyle = {
    fontSize: '14px',
    color: '#9ca3af',
    marginBottom: '24px',
    textAlign: 'center'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#9ca3af',
    marginBottom: '6px'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #333339',
    backgroundColor: '#18181c',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    marginBottom: '16px'
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.2s',
    marginTop: '8px',
    opacity: loading ? 0.7 : 1
  };

  const errorStyle = {
    backgroundColor: '#3f1a1a',
    border: '1px solid #7f1d1d',
    color: '#fca5a5',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
    textAlign: 'center'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>LootSyncs Admin</h1>
        <p style={subtitleStyle}>Access your automated deals status board</p>
        
        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleLogin}>
          <label style={labelStyle}>Admin Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
