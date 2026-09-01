'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminGuilds } from '@/lib/api';
import { getBotInviteUrl } from '@/lib/discord';
import { ShieldCheck, PlusCircle, ArrowRight, Bot } from 'lucide-react';

export default function ServersHubPage() {
  const [guilds, setGuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [inviteUrl, setInviteUrl] = useState('');

  const getInviteUrlForGuild = (discordGuildId?: string) => getBotInviteUrl(discordGuildId);

  useEffect(() => {
    setInviteUrl(getBotInviteUrl());
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('dverif_admin_user');
      if (storedUser) setUser(JSON.parse(storedUser));
    }

    const fetchServerList = async () => {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_token') || '' : '';
      try {
        const res = await getAdminGuilds(token);
        if (res.guilds) {
          setGuilds(res.guilds);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchServerList();
  }, []);

  return (
    <div>
      <div
        style={{
          marginBottom: '2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1>Active Bot Servers</h1>
          <p style={{ marginBottom: 0 }}>
            Logged in as <span className="highlight">@{user?.username || 'Admin'}</span> &bull; Showing only Discord servers where the bot is installed.
          </p>
        </div>

        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          <PlusCircle size={16} />
          <span>Add Bot to a Server</span>
        </a>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <div className="card" style={{ maxWidth: '360px', width: '100%', textAlign: 'center' }}>
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading your connected Discord servers...</p>
          </div>
        </div>
      ) : guilds.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem 2rem', textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--discord-blurple-subtle)',
                border: '1px solid rgba(88, 101, 242, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
              }}
            >
              <Bot size={24} color="var(--discord-blurple)" />
            </div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Connected Servers Yet</h2>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.75rem', color: 'var(--text-secondary)' }}>
              The bot is not present in any of your Discord servers yet. Invite the bot to your server to activate verification gates.
            </p>
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-block"
              style={{ padding: '0.75rem' }}
            >
              <PlusCircle size={16} />
              <span>Invite Bot to Server</span>
            </a>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {guilds.map((g) => {
            const initials = g.name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .substring(0, 3)
              .toUpperCase();

            return (
              <div
                key={g.id || g.discordGuildId}
                className="card"
                style={{
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.75rem',
                  maxWidth: '100%',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                    {g.iconUrl ? (
                      <img
                        src={g.iconUrl}
                        alt={g.name}
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: 'var(--radius-md)',
                          objectFit: 'cover',
                          border: '1px solid var(--border-color)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--discord-blurple)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.2rem',
                          color: '#fff',
                        }}
                      >
                        {initials}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2
                        style={{
                          fontSize: '1.15rem',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {g.name}
                      </h2>
                      <div className="text-sm" style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {g.memberCount} members
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-verified">
                      <ShieldCheck size={12} /> Connected
                    </span>

                    {g.verificationEnabled ? (
                      <span className="badge badge-verified">Gate Active</span>
                    ) : (
                      <span className="badge badge-pending">Gate Disabled</span>
                    )}
                  </div>
                </div>

                <div>
                  <Link
                    href={`/admin?guildId=${g.id}`}
                    className="btn btn-primary btn-block"
                    style={{ padding: '0.75rem' }}
                  >
                    <span>Manage Dashboard</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
