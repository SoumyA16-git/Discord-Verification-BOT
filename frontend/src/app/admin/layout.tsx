'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getAdminGuilds } from '@/lib/api';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminTopbar } from '@/components/AdminTopbar';
import { CommandPalette } from '@/components/CommandPalette';

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const guildIdParam = searchParams.get('guildId') || '';

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [activeGuild, setActiveGuild] = useState<any>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setAuthorized(true);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_user') : null;
    const storedGuilds = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_guilds') : null;

    if (!token) {
      setAuthorized(false);
      window.location.replace('/admin/login');
      return;
    }

    setAuthorized(true);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }

    if (storedGuilds) {
      try {
        const parsed = JSON.parse(storedGuilds);
        if (parsed && parsed.length > 0) {
          setGuilds(parsed);
          const match = guildIdParam ? parsed.find((g: any) => g.id === guildIdParam) : parsed[0];
          setActiveGuild(match || parsed[0]);
        }
      } catch {
        // ignore
      }
    }

    // Fetch live list to prevent desync
    getAdminGuilds(token).then((res) => {
      if (res.guilds && res.guilds.length > 0) {
        setGuilds(res.guilds);
        localStorage.setItem('dverif_admin_guilds', JSON.stringify(res.guilds));
        
        const liveMatch = guildIdParam 
          ? res.guilds.find((g: any) => g.id === guildIdParam) 
          : res.guilds[0];
        
        const validGuild = liveMatch || res.guilds[0];
        setActiveGuild(validGuild);

        // Force the URL to have the valid guildId so children (config, members, etc.) can read it
        if (validGuild && pathname !== '/admin/servers' && guildIdParam !== validGuild.id) {
          router.replace(`${pathname}?guildId=${validGuild.id}`);
        }
      } else {
        // If no guilds, ensure we clear out stale state
        setGuilds([]);
        setActiveGuild(null);
        localStorage.removeItem('dverif_admin_guilds');
      }
    }).catch(() => { /* ignore */ });
  }, [pathname, router, guildIdParam]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (authorized !== true) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: '#08090d',
          color: '#f8fafc',
        }}
      >
        <div
          style={{
            background: '#0d0f17',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            maxWidth: '380px',
            width: '100%',
          }}
        >
          <div className="spinner" />
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '1rem' }}>
            Authenticating admin session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#08090d',
      }}
    >
      {/* Persistent Left Sidebar */}
      <AdminSidebar user={user} activeGuild={activeGuild} guilds={guilds} />

      {/* Main App Workspace with Locked Scroll & Sticky Topbar */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <AdminTopbar
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          serverName={activeGuild?.name}
        />

        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2rem 2.5rem',
            width: '100%',
          }}
        >
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>

      {/* Global Command Palette Modal (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        activeGuildId={activeGuild?.id}
      />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100vw',
            backgroundColor: '#08090d',
          }}
        >
          <div
            style={{
              background: '#0d0f17',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              maxWidth: '380px',
              width: '100%',
            }}
          >
            <div className="spinner" />
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '1rem' }}>
              Loading workspace...
            </p>
          </div>
        </div>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
