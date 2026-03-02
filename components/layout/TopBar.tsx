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
    <header className="bg-surface border-b border-border px-6 h-14 flex items-center justify-between shrink-0">
      <p className="m-0 text-[15px] text-text">
        {greeting()}{repName ? `, ${repName}` : ''}
      </p>

      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 bg-transparent border border-border rounded-lg py-1.5 px-3 text-muted text-[13px] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <LogOut size={14} />
        Sign out
      </button>
    </header>
  );
}
