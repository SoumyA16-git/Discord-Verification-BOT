'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAdminMembers } from '@/lib/api';
import { RefreshCw, Search } from 'lucide-react';

function MembersContent() {
  const searchParams = useSearchParams();
  const guildIdParam = searchParams.get('guildId') || '';

  const [members, setMembers] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestQuery = useRef('');

  const fetchMembers = useCallback(
    async (searchQuery: string, cursor: string | undefined, append = false) => {
      if (append) setLoadingMore(true);
      else { setLoading(true); setError(null); }

      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('dverif_admin_token') || ''
          : '';
      try {
        const res = await getAdminMembers(token, searchQuery || undefined, guildIdParam || undefined, cursor);
        if (res.error) {
          setError(res.error.message || 'Failed to load members.');
          if (!append) setMembers([]);
          return;
        }
        const newMembers: any[] = res.members || [];
        setMembers((prev) => (append ? [...prev, ...newMembers] : newMembers));
        setNextCursor(res.nextCursor ?? null);
        setHasMore(res.hasMore ?? false);
      } catch {
        setError('Failed to connect to backend.');
        if (!append) setMembers([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [guildIdParam]
  );

  // Initial load + re-fetch when guild changes
  useEffect(() => {
    latestQuery.current = '';
    setQuery('');
    setNextCursor(null);
    fetchMembers('', undefined, false);
  }, [guildIdParam, fetchMembers]);

  // Re-fetch on window focus
  useEffect(() => {
    const onFocus = () => fetchMembers(latestQuery.current, undefined, false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchMembers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    latestQuery.current = query;
    setNextCursor(null);
    fetchMembers(query, undefined, false);
  };

  const handleRefresh = () => {
    latestQuery.current = query;
    setNextCursor(null);
    fetchMembers(query, undefined, false);
  };

  const handleLoadMore = () => {
    if (nextCursor) fetchMembers(latestQuery.current, nextCursor, true);
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Member Management</h1>
        <p style={{ marginBottom: 0 }}>Live Discord server members — search by Snowflake ID or Username.</p>
      </div>

      <form
        onSubmit={handleSearch}
        style={{ marginBottom: '2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Discord Snowflake ID or Username..."
          className="form-input"
          style={{ maxWidth: '420px' }}
        />
        <button type="submit" className="btn btn-primary">
          <Search size={16} /> Search
        </button>
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              latestQuery.current = '';
              setNextCursor(null);
              fetchMembers('', undefined, false);
            }}
            className="btn btn-secondary"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={handleRefresh}
          className="btn btn-secondary"
          disabled={loading}
          title="Refresh member list"
        >
          <RefreshCw
            size={16}
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
          />
          Refresh
        </button>
      </form>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <p style={{ marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Showing <strong>{members.length}</strong> member{members.length !== 1 ? 's' : ''}
          {hasMore ? ' (scroll down to load more)' : ''}
        </p>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 48 }}>Avatar</th>
              <th>Discord ID</th>
              <th>Username</th>
              <th>Status</th>
              <th>Role Confirmed</th>
              <th>Verified Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 0.5rem' }} />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Fetching Discord members...
                  </span>
                </td>
              </tr>
            ) : members.length > 0 ? (
              <>
                {members.map((m) => (
                  <tr key={m.discordId}>
                    <td>
                      {m.avatar ? (
                        <img
                          src={m.avatar}
                          alt={m.username}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            verticalAlign: 'middle',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'var(--surface-2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {(m.username || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{m.discordId}</td>
                    <td>
                      <div>
                        <strong>{m.displayName || m.username || 'Unknown'}</strong>
                        {m.displayName && m.displayName !== m.username && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            @{m.username}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          m.status === 'VERIFIED'
                            ? 'badge-verified'
                            : m.status === 'REVOKED' || m.status === 'FAILED'
                            ? 'badge-failed'
                            : 'badge-pending'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td>{m.roleAssigned ? 'Yes' : 'No'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {m.verifiedAt ? new Date(m.verifiedAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <Link
                        href={`/admin/members/${m.discordId}${guildIdParam ? `?guildId=${guildIdParam}` : ''}`}
                        className="btn btn-secondary btn-sm"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
                {loadingMore && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem' }}>
                      <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto' }} />
                    </td>
                  </tr>
                )}
              </>
            ) : (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}
                >
                  {query
                    ? 'No members found matching your search.'
                    : 'No members found in this server.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && hasMore && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="btn btn-secondary"
          >
            {loadingMore ? 'Loading...' : 'Load More Members'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense
      fallback={
        <div className="center-container">
          <div className="card">
            <div className="spinner" />
            <p>Loading members...</p>
          </div>
        </div>
      }
    >
      <MembersContent />
    </Suspense>
  );
}
