'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Server } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Header() {
  const pathname = usePathname();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [user, setUser] = useState<{ username?: string; avatar?: string; id?: string; discordId?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('dverif_admin_token');
    const storedUser = localStorage.getItem('dverif_admin_user');
    setIsAdminLoggedIn(!!token);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('dverif_admin_token');
    localStorage.removeItem('dverif_admin_user');
    localStorage.removeItem('dverif_admin_guilds');
    window.location.href = '/admin/login';
  };

  const avatarUrl = user?.discordId && user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=64`
    : null;

  return (
    <header className="header">
      <div className="header-container">
        <Link href="/" className="brand">
          <div className="brand-icon">
            <ShieldCheck size={20} color="#ffffff" />
          </div>
          <span>Discord Verification</span>
        </Link>

        <nav className="nav-links">
          {pathname.startsWith('/admin') && isAdminLoggedIn ? (
            <>
              <Link
                href="/admin/servers"
                className={`nav-link ${pathname === '/admin/servers' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Server size={15} />
                <span>My Servers</span>
              </Link>
              <Link href="/admin" className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}>
                Overview
              </Link>
              <Link href="/admin/members" className={`nav-link ${pathname.startsWith('/admin/members') ? 'active' : ''}`}>
                Members
              </Link>
              <Link href="/admin/config" className={`nav-link ${pathname === '/admin/config' ? 'active' : ''}`}>
                Config
              </Link>
              <Link href="/admin/logs" className={`nav-link ${pathname === '/admin/logs' ? 'active' : ''}`}>
                Logs
              </Link>

              {user?.username && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'var(--bg-tertiary)',
                    padding: '0.25rem 0.65rem 0.25rem 0.35rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    marginLeft: '0.5rem',
                  }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user.username}
                      style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--discord-blurple)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {user.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontWeight: 600 }}>{user.username}</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                style={{ marginLeft: '0.25rem' }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/admin/login" className="nav-link">
              Admin Portal
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
