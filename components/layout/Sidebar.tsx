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
  { href: '/',           label: 'Dashboard',  Icon: LayoutDashboard },
  { href: '/accounts',   label: 'Accounts',   Icon: Users },
  { href: '/dormant',    label: 'Dormant',    Icon: Clock, badgeKey: 'dormant' as const },
  { href: '/portfolio',  label: 'Portfolio',  Icon: Wine },
  { href: '/focus',      label: 'Focus',      Icon: Target },
  { href: '/producers',  label: 'Producers',  Icon: Grape },
  { href: '/upload',     label: 'Upload',     Icon: Upload },
  { href: '/settings',   label: 'Settings',   Icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isSidebarCollapsed = useStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const rc5Data = useStore((s) => s.rc5Data);
  const rep = useStore((s) => s.rep);

  const dormantCount = rc5Data && rep
    ? rc5Data.rows.filter((r) => r.primaryRep === rep && r.isDormant).length
    : 0;

  const width = isSidebarCollapsed ? 64 : 220;

  return (
    <aside
      style={{
        width,
        minWidth: width,
        backgroundColor: '#2D5A3D',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: isSidebarCollapsed ? '20px 0' : '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
        }}
      >
        {isSidebarCollapsed ? (
          <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>CS</span>
        ) : (
          <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 14, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            CHAUSSE
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {NAV.map(({ href, label, Icon, badgeKey }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          const count = badgeKey === 'dormant' ? dormantCount : 0;

          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: isSidebarCollapsed ? '10px 0' : '10px 16px',
                justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                textDecoration: 'none',
                backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                borderRight: isActive ? '3px solid #E8732A' : '3px solid transparent',
                color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                transition: 'background-color 0.15s',
                position: 'relative',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ position: 'relative', flexShrink: 0 }}>
                <Icon size={18} />
                {badgeKey && count > 0 && isSidebarCollapsed && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      backgroundColor: '#E8732A',
                      color: '#FFF',
                      borderRadius: '50%',
                      fontSize: 10,
                      fontWeight: 700,
                      width: 16,
                      height: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {count}
                  </span>
                )}
              </span>
              {!isSidebarCollapsed && (
                <>
                  <span style={{ flex: 1 }}>{label}</span>
                  {badgeKey && count > 0 && (
                    <span
                      style={{
                        backgroundColor: '#E8732A',
                        color: '#FFF',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '1px 7px',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          backgroundColor: 'transparent',
          border: 'none',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer',
          width: '100%',
        }}
        title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
