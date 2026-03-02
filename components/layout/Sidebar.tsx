'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store';
import {
  LayoutDashboard,
  Users,
  Clock,
  Wine,
  Target,
  Grape,
  Upload,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const NAV = [
  { href: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts', Icon: Users },
  { href: '/dormant', label: 'Dormant', Icon: Clock, badgeKey: 'dormant' as const },
  { href: '/portfolio', label: 'Portfolio', Icon: Wine },
  { href: '/focus', label: 'Focus', Icon: Target },
  { href: '/producers', label: 'Producers', Icon: Grape },
  { href: '/upload', label: 'Upload', Icon: Upload },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const rc5Data = useStore((s) => s.rc5Data);
  const rep = useStore((s) => s.rep);

  const dormantCount = rc5Data && rep
    ? rc5Data.rows.filter((r) => r.primaryRep === rep && r.isDormant).length
    : 0;

  return (
    <aside className="group fixed bottom-0 left-0 right-0 z-50 flex h-16 bg-primary border-t border-white/10 md:relative md:h-screen md:w-[72px] hover:md:w-56 md:flex-col md:border-t-0 md:border-r md:transition-[width] md:duration-200 hide-scrollbar overflow-x-auto md:overflow-x-hidden md:overflow-y-auto shrink-0">

      {/* Logo (Desktop only) */}
      <div className="hidden md:flex h-16 items-center justify-center border-b border-white/10 shrink-0 mx-2">
        <span className="text-white font-bold text-sm tracking-widest hidden group-hover:block whitespace-nowrap">
          CHAUSSE
        </span>
        <span className="text-white font-bold text-sm block group-hover:hidden">
          CS
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 items-center px-2 md:items-stretch md:flex-col md:py-4 gap-1 md:gap-2">
        {NAV.map(({ href, label, Icon, badgeKey }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          const count = badgeKey === 'dormant' ? dormantCount : 0;

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center justify-center md:justify-start gap-4 rounded-xl p-3 md:px-4 text-sm transition-colors min-w-[64px] md:min-w-0 ${isActive
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              title={label}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <Icon size={20} className={isActive ? 'text-accent' : ''} />
                {badgeKey && count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white md:hidden group-hover:hidden">
                    {count}
                  </span>
                )}
              </div>
              <span className="hidden md:group-hover:block whitespace-nowrap text-[15px] flex-1">
                {label}
              </span>
              {badgeKey && count > 0 && (
                <span className="hidden md:group-hover:flex ml-auto items-center justify-center rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
