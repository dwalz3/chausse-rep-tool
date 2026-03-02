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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-surface rounded-2xl p-8 sm:p-10 w-full max-w-[400px] shadow-2xl border border-border">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-block bg-primary rounded-lg px-4 py-2.5 mb-4 shadow-sm">
            <span className="text-surface font-bold text-base tracking-widest">
              CHAUSSE
            </span>
          </div>
          <h1 className="text-text text-xl font-bold m-0">
            Rep Field Tool
          </h1>
          <p className="text-muted text-sm m-0 mt-1.5">
            Sign in to access your accounts
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-[13px] font-medium text-text mb-1.5"
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
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-text text-[15px] outline-none box-border focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-[13px] font-medium text-text mb-1.5"
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
              className={`w-full px-3 py-2.5 rounded-lg border shadow-sm ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-border focus:border-primary focus:ring-primary'} bg-background text-text text-[15px] outline-none box-border focus:ring-1 transition-all`}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 text-[13px] m-0 font-medium">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className={`mt-1 py-3 px-4 rounded-lg text-[15px] font-bold border-none transition-colors shadow-sm ${loading || !email || !password ? 'bg-black/10 dark:bg-white/5 text-muted cursor-not-allowed' : 'bg-primary text-surface cursor-pointer hover:bg-primary/90'}`}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
