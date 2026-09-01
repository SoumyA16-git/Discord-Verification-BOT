'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAdminOverview } from '@/lib/api';
import { getBotInviteUrl } from '@/lib/discord';
import { RefreshCw, ArrowRight, PlusCircle, Bot } from 'lucide-react';

function OverviewContent() {
  const searchParams = useSearchParams();
  const guildIdParam = searchParams.get('guildId') || '';

  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState('');

  useEffect(() => {
    setInviteUrl(getBotInviteUrl());
  }, []);

  const fetchOverview = async (guildId = guildIdParam) => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_token') || '' : '';
    try {
      const res = await getAdminOverview(token, guildId || undefined);
      if (res.error) {
        setError(res.error.message);
      } else {
        setData(res);
      }
    } catch {
      setError('Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(guildIdParam);
  }, [guildIdParam]);

  if (loading) {
    return (
      <div className="center-container">
        <div className="card">
          <div className="spinner"></div>
          <p>Loading server analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card card-wide">
        <div className="alert alert-danger">{error || 'Unable to load overview.'}</div>
        <button onClick={() => fetchOverview()} className="btn btn-secondary">
          <RefreshCw size={16} />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  const { guild, guildConfig, discordGuild, metrics, health, recentLogs, admin } = data;

  if (!guild || !discordGuild?.hasBot) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 160px)' }}>
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
    );
  }

  return (
    <div className="admin-overview">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ margin: 0 }}>Server Overview</h1>
          </div>
          <p style={{ marginBottom: 0 }}>
            Managing: <strong style={{ color: 'var(--text-primary)' }}>{guild?.name || 'Discord Server'}</strong> | Role: <span className="badge badge-verified">{admin?.role || 'admin'}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/admin/servers" className="btn btn-secondary btn-sm">
            <span>Switch Server</span>
          </Link>
          <button onClick={() => fetchOverview()} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <Link href={`/admin/config?guildId=${guild.id}`} className="btn btn-secondary btn-sm">
            Configure Roles
          </Link>
          <Link href={`/admin/members?guildId=${guild.id}`} className="btn btn-primary btn-sm">
            Manage Members
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: health?.botReady ? 'var(--discord-green)' : 'var(--discord-red)',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Discord Gateway: {health?.botReady ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: health?.dbOk ? 'var(--discord-green)' : 'var(--discord-red)',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Supabase DB: {health?.dbOk ? `Healthy (${health.dbLatencyMs}ms)` : 'Unreachable'}
          </span>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: guildConfig?.verification_enabled ? 'var(--discord-green)' : 'var(--discord-yellow)',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Gate Status: {guildConfig?.verification_enabled ? 'Active' : 'Disabled'}
          </span>
        </div>
      </div>

      <div className="grid-stats">
        <div className="stat-card">
          <div className="stat-title">Total Known Users</div>
          <div className="stat-value">{metrics?.totalUsers || 0}</div>
          <div className="stat-sub">
            {metrics?.verifiedUsers || 0} Verified | {metrics?.unverifiedUsers || 0} Unverified
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Attempts (Last 24h)</div>
          <div className="stat-value">{metrics?.stats24h?.total || 0}</div>
          <div className="stat-sub" style={{ color: 'var(--discord-green)' }}>
            {metrics?.stats24h?.success || 0} Successful ({metrics?.stats24h?.failure || 0} failed)
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Attempts (Last 30 Days)</div>
          <div className="stat-value">{metrics?.stats30d?.total || 0}</div>
          <div className="stat-sub">
            {metrics?.stats30d?.success || 0} Successful ({metrics?.stats30d?.failure || 0} failed)
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-title">30-Day Success Rate</div>
          <div className="stat-value" style={{ color: 'var(--discord-green)' }}>
            {metrics?.successRate || 100}%
          </div>
          <div className="stat-sub">Based on completed flows</div>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Recent Audit Activity</h2>
          <Link href={`/admin/logs?guildId=${guild.id}`} className="text-sm highlight" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>View Full Logs</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event Type</th>
                <th>Subject / Details</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs && recentLogs.length > 0 ? (
                recentLogs.map((log: any) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-pending">
                        {log.event_type}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No audit logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="center-container">
          <div className="card">
            <div className="spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      }
    >
      <OverviewContent />
    </Suspense>
  );
}
