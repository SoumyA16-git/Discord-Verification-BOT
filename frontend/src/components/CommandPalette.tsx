'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Users,
  Sliders,
  FileText,
  Shield,
  Activity,
  BarChart3,
  Paintbrush,
  Server,
  LogOut,
  X,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  activeGuildId?: string;
}

export function CommandPalette({ isOpen, onClose, activeGuildId }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const guildQuery = activeGuildId ? `?guildId=${activeGuildId}` : '';

  const commands = [
    { id: 'overview', title: 'Go to Server Overview', category: 'Navigation', icon: LayoutDashboard, href: `/admin${guildQuery}` },
    { id: 'servers', title: 'Switch Active Discord Server', category: 'Navigation', icon: Server, href: '/admin/servers' },
    { id: 'members', title: 'Manage Server Members', category: 'Verification', icon: Users, href: `/admin/members${guildQuery}` },
    { id: 'builder', title: 'Visual Embed & Message Builder', category: 'Discord', icon: Paintbrush, href: `/admin/builder${guildQuery}` },
    { id: 'config', title: 'Configure Roles & Channels', category: 'Discord', icon: Sliders, href: `/admin/config${guildQuery}` },
    { id: 'logs', title: 'View Audit Logs', category: 'Verification', icon: FileText, href: `/admin/logs${guildQuery}` },
    { id: 'security', title: 'Security & Threat Center', category: 'Monitoring', icon: Shield, href: `/admin/security${guildQuery}` },
    { id: 'health', title: 'System Health & Latency', category: 'Monitoring', icon: Activity, href: `/admin/health${guildQuery}` },
    { id: 'analytics', title: 'Verification Analytics', category: 'Monitoring', icon: BarChart3, href: `/admin/analytics${guildQuery}` },
    {
      id: 'logout',
      title: 'Log out of Admin Session',
      category: 'Account',
      icon: LogOut,
      action: () => {
        localStorage.removeItem('dverif_admin_token');
        localStorage.removeItem('dverif_admin_user');
        localStorage.removeItem('dverif_admin_guilds');
        window.location.href = '/admin/login';
      },
    },
  ];

  const filteredCommands = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        isOpen ? onClose() : undefined;
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          if (selected.action) {
            selected.action();
          } else if (selected.href) {
            router.push(selected.href);
          }
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, router, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 4, 7, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        paddingLeft: '1rem',
        paddingRight: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          background: '#0d0f17',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.8), 0 0 40px -10px rgba(88, 101, 242, 0.3)',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '1rem',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '0.5rem' }}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No commands matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    if (cmd.action) cmd.action();
                    else if (cmd.href) router.push(cmd.href);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'rgba(88, 101, 242, 0.15)' : 'transparent',
                    border: isSelected ? '1px solid rgba(88, 101, 242, 0.3)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-xs)',
                        background: isSelected ? 'var(--discord-blurple)' : 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: isSelected ? '#fff' : 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {cmd.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cmd.category}</div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-dim)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    ↵ Select
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            padding: '0.75rem 1.25rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>Use ↑ ↓ to navigate</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
