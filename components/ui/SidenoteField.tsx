import { ReactNode } from 'react';

interface SidenoteFieldProps {
  label: string;
  children: ReactNode;
}

// Compact metadata label + value for sidenote sidebars.
export default function SidenoteField({ label, children }: SidenoteFieldProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p
        style={{
          margin: '0 0 3px',
          fontSize: 10,
          fontWeight: 600,
          color: '#a8a29e',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}
      >
        {label}
      </p>
      <div style={{ fontSize: 13, color: '#1C1917', fontWeight: 500 }}>{children}</div>
    </div>
  );
}
