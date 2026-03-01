'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { RepIdentity } from '@/types';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setRepInStore = useStore((s) => s.setRep);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });

      if (res.ok) {
        const data = await res.json() as { rep: RepIdentity };
        setRepInStore(data.rep);
        router.push('/');
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? 'Login failed');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0D1117',
      }}
    >
      <div
        style={{
          backgroundColor: '#161B22',
          borderRadius: 12,
          padding: '40px 48px',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: '1px solid #30363D',
        }}
      >
        {/* Logo / brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#3FB950',
              borderRadius: 8,
              padding: '10px 18px',
              marginBottom: 16,
            }}
          >
            <span style={{ color: '#161B22', fontWeight: 700, fontSize: 16, letterSpacing: '0.05em' }}>
              CHAUSSE
            </span>
          </div>
          <h1 style={{ color: '#E6EDF3', fontSize: 20, fontWeight: 600, margin: 0 }}>
            Rep Field Tool
          </h1>
          <p style={{ color: '#7D8590', fontSize: 14, margin: '6px 0 0' }}>
            Sign in to access your accounts
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#E6EDF3', marginBottom: 6 }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@chausseselections.com"
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #30363D',
                backgroundColor: '#0D1117',
                color: '#E6EDF3',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#E6EDF3', marginBottom: 6 }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: error ? '1px solid #F85149' : '1px solid #30363D',
                backgroundColor: '#0D1117',
                color: '#E6EDF3',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <p style={{ color: '#F85149', fontSize: 13, margin: 0 }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              backgroundColor: loading || !email || !password ? '#7D8590' : '#3FB950',
              color: '#161B22',
              border: 'none',
              borderRadius: 8,
              padding: '12px',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
