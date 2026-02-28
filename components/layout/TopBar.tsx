'use client';

import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { LogOut } from 'lucide-react';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TopBar() {
  const rep = useStore((s) => s.rep);
  const setRep = useStore((s) => s.setRep);
  const router = useRouter();

  const repName = rep ? rep.charAt(0).toUpperCase() + rep.slice(1) : '';

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setRep(null);
    router.push('/login');
  }

  return (
    <header
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E1DC',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <p style={{ margin: 0, fontSize: 15, color: '#1C1917' }}>
        {greeting()}{repName ? `, ${repName}` : ''}
      </p>

      <button
        onClick={handleLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: 'transparent',
          border: '1px solid #E5E1DC',
          borderRadius: 8,
          padding: '6px 12px',
          color: '#a8a29e',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        <LogOut size={14} />
        Sign out
      </button>
    </header>
  );
}
