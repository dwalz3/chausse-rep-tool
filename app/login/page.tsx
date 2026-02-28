'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { RepIdentity } from '@/types';

const USERS: { email: string; rep: RepIdentity; label: string }[] = [
  { email: 'austin@chausseselections.com',    rep: 'austin',    label: 'Austin' },
  { email: 'jason@chausseselections.com',     rep: 'jason',     label: 'Jason' },
  { email: 'alejandra@chausseselections.com', rep: 'alejandra', label: 'Alejandra' },
  { email: 'dave@chausseselections.com',      rep: 'dave',      label: 'Dave' },
];

export default function LoginPage() {
  const [email, setEmail] = useState(USERS[0].email);
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
        body: JSON.stringify({ email, password }),
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
        backgroundColor: '#F7F9F7',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: '40px 48px',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: '1px solid #E5E1DC',
        }}
      >
        {/* Logo / brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#2D5A3D',
              borderRadius: 8,
              padding: '10px 18px',
              marginBottom: 16,
            }}
          >
            <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 16, letterSpacing: '0.05em' }}>
              CHAUSSE
            </span>
          </div>
          <h1 style={{ color: '#1C1917', fontSize: 20, fontWeight: 600, margin: 0 }}>
            Rep Field Tool
          </h1>
          <p style={{ color: '#a8a29e', fontSize: 14, margin: '6px 0 0' }}>
            Sign in to access your accounts
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email selector */}
          <div>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1C1917', marginBottom: 6 }}
            >
              Email
            </label>
            <select
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #E5E1DC',
                backgroundColor: '#F7F9F7',
                color: '#1C1917',
                fontSize: 15,
                outline: 'none',
              }}
            >
              {USERS.map((u) => (
                <option key={u.email} value={u.email}>
                  {u.label} — {u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1C1917', marginBottom: 6 }}
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
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: error ? '1px solid #dc2626' : '1px solid #E5E1DC',
                backgroundColor: '#F7F9F7',
                color: '#1C1917',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              backgroundColor: loading || !password ? '#a8a29e' : '#2D5A3D',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '12px',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
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
