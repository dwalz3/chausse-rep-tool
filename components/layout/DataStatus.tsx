'use client';

import Link from 'next/link';
import { useStore } from '@/store';

const DOTS: { key: 'rc5' | 'ra23' | 'ra21' | 'ra27' | 'rb6'; label: string }[] = [
  { key: 'rc5',  label: 'RC5' },
  { key: 'ra23', label: 'RA23' },
  { key: 'ra21', label: 'RA21' },
  { key: 'ra27', label: 'RA27' },
  { key: 'rb6',  label: 'RB6' },
];

export default function DataStatus({ collapsed }: { collapsed: boolean }) {
  const uploadMeta = useStore((s) => s.uploadMeta);

  const loaded = DOTS.filter((d) => !!uploadMeta[d.key]).length;
  const total = DOTS.length;
  const allLoaded = loaded === total;

  return (
    <div style={{
      borderTop: '1px solid #21262D',
      padding: collapsed ? '10px 0' : '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: collapsed ? 6 : 6,
      alignItems: collapsed ? 'center' : 'flex-start',
    }}>
      {/* Dots */}
      <div style={{ display: 'flex', gap: 4, flexWrap: collapsed ? 'wrap' : 'nowrap', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        {DOTS.map((d) => {
          const has = !!uploadMeta[d.key];
          return (
            <div
              key={d.key}
              title={`${d.label}: ${has ? 'loaded' : 'missing'}`}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: has ? '#3FB950' : '#30363D',
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>

      {!collapsed && (
        <>
          <span style={{ fontSize: 11, color: allLoaded ? '#3FB950' : '#7D8590' }}>
            {loaded}/{total} core reports
          </span>
          {!allLoaded && (
            <Link
              href="/integrations"
              style={{ fontSize: 11, color: '#E3B341', textDecoration: 'none', fontWeight: 600 }}
            >
              Sync missing data →
            </Link>
          )}
        </>
      )}
    </div>
  );
}
