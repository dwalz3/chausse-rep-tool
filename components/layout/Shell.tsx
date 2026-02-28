'use client';

import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: '#F7F9F7',
            padding: 24,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
