'use client';

import React, { useEffect, useState } from 'react';
import { Search, PlusCircle, Activity, ShieldCheck, Sparkles } from 'lucide-react';
import { getBotInviteUrl } from '@/lib/discord';

interface AdminTopbarProps {
  onOpenCommandPalette: () => void;
  serverName?: string;
}

export function AdminTopbar({ onOpenCommandPalette, serverName }: AdminTopbarProps) {
  const [inviteUrl, setInviteUrl] = useState('');

  useEffect(() => {
    setInviteUrl(getBotInviteUrl());
  }, []);

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        backgroundColor: 'rgba(8, 9, 13, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
      }}
    >
      {/* Left Breadcrumb / Live Gateway Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--discord-green)',
              boxShadow: '0 0 10px var(--discord-green)',
            }}
          />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Gateway Connected
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Server: <strong style={{ color: 'var(--text-primary)' }}>{serverName || 'Enterprise Gate'}</strong>
        </div>
      </div>

      {/* Right Actions: Command Palette Button & Invite Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.45rem 0.9rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.82rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Search size={14} />
          <span>Quick actions or search...</span>
          <kbd
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Add Bot to Server Button */}
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <PlusCircle size={14} color="var(--discord-blurple)" />
          <span>Invite Bot</span>
        </a>
      </div>
    </header>
  );
}
