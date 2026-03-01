'use client';

import { useState, useCallback } from 'react';
import { useStore } from '@/store';

interface AccountNotesProps {
  accountName: string;
}

// Auto-saving notes textarea — persists to Zustand on blur.
export default function AccountNotes({ accountName }: AccountNotesProps) {
  const accountNotes = useStore((s) => s.accountNotes);
  const setAccountNote = useStore((s) => s.setAccountNote);
  const [draft, setDraft] = useState<string | null>(null);

  const saved = accountNotes[accountName] ?? '';
  const current = draft ?? saved;

  const handleBlur = useCallback(() => {
    if (draft !== null) {
      setAccountNote(accountName, draft);
      setDraft(null);
    }
  }, [accountName, draft, setAccountNote]);

  return (
    <div>
      <p
        style={{
          margin: '0 0 8px',
          fontSize: 10,
          fontWeight: 600,
          color: '#a8a29e',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}
      >
        Your Notes
      </p>
      <textarea
        value={current}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add notes about this account…"
        rows={7}
        style={{
          width: '100%',
          padding: '8px 10px',
          border: '1px solid #E5E1DC',
          borderRadius: 8,
          fontSize: 12,
          color: '#1C1917',
          backgroundColor: '#F9F9F9',
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          lineHeight: 1.5,
        }}
      />
    </div>
  );
}
