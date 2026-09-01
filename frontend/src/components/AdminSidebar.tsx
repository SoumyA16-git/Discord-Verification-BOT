'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Server,
  Users,
  Sliders,
  Paintbrush,
  FileText,
  Shield,
  Activity,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  LogOut,
  ExternalLink,
} from 'lucide-react';

interface AdminSidebarProps {
  user: any;
  activeGuild?: any;
  guilds?: any[];
}

export function AdminSidebar({ user, activeGuild, guilds = [] }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const guildQuery = activeGuild?.id ? `?guildId=${activeGuild.id}` : '';

  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Dashboard', href: `/admin${guildQuery}`, icon: LayoutDashboard, exact: true },
        { label: 'My Servers', href: '/admin/servers', icon: Server },
      ],
    },
    {
      title: 'VERIFICATION',
      items: [
        { label: 'Members', href: `/admin/members${guildQuery}`, icon: Users },
        { label: 'Audit Logs', href: `/admin/logs${guildQuery}`, icon: FileText },
      ],
    },
    {
      title: 'DISCORD GATES',
      items: [
        { label: 'Roles & Channels', href: `/admin/config${guildQuery}`, icon: Sliders },
        { label: 'Message Builder', href: `/admin/builder${guildQuery}`, icon: Paintbrush },
      ],
    },
    {
      title: 'MONITORING',
      items: [
        { label: 'Security Center', href: `/admin/security${guildQuery}`, icon: Shield },
        { label: 'System Health', href: `/admin/health${guildQuery}`, icon: Activity },
        { label: 'Analytics', href: `/admin/analytics${guildQuery}`, icon: BarChart3 },
      ],
    },
  ];

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
    <aside
      style={{
        width: 'var(--sidebar-width)',
        minWidth: 'var(--sidebar-width)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        backgroundColor: '#08090d',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        zIndex: 40,
      }}
    >
      {/* Top Brand Header */}
      <div>
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #5865f2 0%, #3b42a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(88, 101, 242, 0.4)',
            }}
          >
            <ShieldCheck size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', letterSpacing: '-0.02em' }}>
              911 - Verification BOT
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Admin Dashboard</div>
          </div>
        </div>

        {/* Active Server Pill Selector */}
        <div style={{ padding: '1rem 1.25rem', position: 'relative' }}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0.6rem 0.85rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
              {activeGuild?.iconUrl ? (
                <img src={activeGuild.iconUrl} alt="Server Icon" style={{ width: '16px', height: '16px', borderRadius: '50%' }} />
              ) : (
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'var(--discord-green)',
                    boxShadow: '0 0 8px var(--discord-green)',
                  }}
                />
              )}
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--text-primary)',
                }}
              >
                {activeGuild?.name || 'Active Server'}
              </span>
            </div>
            <ChevronRight 
              size={14} 
              color="var(--text-muted)" 
              style={{ transform: isDropdownOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} 
            />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% - 0.5rem)',
                left: '1.25rem',
                right: '1.25rem',
                background: '#0f111a',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 50,
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '0.5rem',
              }}
            >
              {guilds.map((g) => {
                const targetPath = pathname === '/admin/servers' ? '/admin' : pathname;
                const targetHref = `${targetPath}?guildId=${g.id}`;
                return (
                  <Link
                    key={g.id}
                    href={targetHref}
                    onClick={() => setIsDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      color: g.id === activeGuild?.id ? '#fff' : 'var(--text-secondary)',
                      background: g.id === activeGuild?.id ? 'rgba(88, 101, 242, 0.15)' : 'transparent',
                      textDecoration: 'none',
                      marginBottom: '2px',
                    }}
                  >
                    {g.iconUrl ? (
                      <img src={g.iconUrl} alt="Server Icon" style={{ width: '16px', height: '16px', borderRadius: '50%' }} />
                    ) : (
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#3b3f45' }} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.name}
                    </span>
                  </Link>
                );
              })}
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0' }} />
              <Link
                href="/admin/servers"
                onClick={() => setIsDropdownOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  color: 'var(--discord-blurple)',
                  textDecoration: 'none',
                  fontWeight: 600
                }}
              >
                <Server size={14} />
                Manage All Servers
              </Link>
            </div>
          )}
        </div>

        {/* Grouped Navigation Links */}
        <div style={{ padding: '0 0.75rem', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          {navGroups.map((group) => (
            <div key={group.title} style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--text-dim)',
                  letterSpacing: '0.08em',
                  padding: '0 0.75rem',
                  marginBottom: '0.4rem',
                }}
              >
                {group.title}
              </div>

              {group.items.map((item) => {
                const Icon = item.icon;
                const pathWithoutQuery = pathname.split('?')[0];
                const itemPathWithoutQuery = item.href.split('?')[0];
                const isActive = item.exact
                  ? pathWithoutQuery === itemPathWithoutQuery
                  : pathWithoutQuery.startsWith(itemPathWithoutQuery);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.86rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      background: isActive ? 'rgba(88, 101, 242, 0.16)' : 'transparent',
                      border: isActive ? '1px solid rgba(88, 101, 242, 0.35)' : '1px solid transparent',
                      marginBottom: '0.15rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon
                      size={16}
                      color={isActive ? 'var(--discord-blurple)' : 'var(--text-muted)'}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Profile Footer */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.username || 'Admin'}
              style={{ width: '32px', height: '32px', borderRadius: '50%' }}
            />
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--discord-blurple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: '#fff',
              }}
            >
              {user?.username || 'Admin'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {user?.role || 'owner'}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Log out"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
