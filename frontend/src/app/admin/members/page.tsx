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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Track current guildId + query so refetches don't stomp each other
  const latestGuildId = useRef(guildIdParam);
  const latestQuery = useRef(query);

  const fetchMembers = useCallback(
    async (searchQuery: string, targetPage: number, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('dverif_admin_token') || ''
          : '';
      try {
        const res = await getAdminMembers(
          token,
          searchQuery,
          guildIdParam || undefined,
          targetPage
        );
        const newMembers: any[] = res.members || [];
        setMembers((prev) => (append ? [...prev, ...newMembers] : newMembers));
        setTotal(res.total ?? newMembers.length);
        setTotalPages(res.totalPages ?? 1);
        setPage(targetPage);
      } catch {
        if (!append) setMembers([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [guildIdParam]
  );

  // Re-fetch from page 1 when guildId or query changes
  useEffect(() => {
    latestGuildId.current = guildIdParam;
    latestQuery.current = query;
    fetchMembers(query, 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildIdParam]);

  // Re-fetch on window focus (dynamic updates when switching tabs)
  useEffect(() => {
    const onFocus = () => {
      fetchMembers(latestQuery.current, 1, false);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchMembers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    latestQuery.current = query;
    fetchMembers(query, 1, false);
  };

  const handleRefresh = () => {
    fetchMembers(latestQuery.current, 1, false);
  };

  const handleLoadMore = () => {
    fetchMembers(latestQuery.current, page + 1, true);
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Member Management</h1>
        <p style={{ marginBottom: 0 }}>Search server members by Discord Snowflake ID or Username.</p>
      </div>

      <form onSubmit={handleSearch} style={{ marginBottom: '2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
              fetchMembers('', 1, false);
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
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </form>

      {!loading && (
        <p style={{ marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Showing <strong>{members.length}</strong> of <strong>{total}</strong> member{total !== 1 ? 's' : ''}
          {guildIdParam ? '' : ' (all servers)'}
        </p>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
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
                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 0.5rem' }}></div>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading members...</span>
                </td>
              </tr>
            ) : members.length > 0 ? (
              <>
                {members.map((m) => {
                  // verifications is already guild-filtered by the backend
                  const verif = m.verifications && m.verifications[0];
                  const status = verif ? verif.status : 'UNVERIFIED';

                  return (
                    <tr key={m.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{m.discord_id}</td>
                      <td>
                        <strong>{m.username || 'Unknown'}</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            status === 'VERIFIED'
                              ? 'badge-verified'
                              : status === 'REVOKED' || status === 'FAILED'
                              ? 'badge-failed'
                              : 'badge-pending'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td>{verif && verif.role_assigned ? 'Yes' : 'No'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {verif && verif.verified_at ? new Date(verif.verified_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <Link
                          href={`/admin/members/${m.id}${guildIdParam ? `?guildId=${guildIdParam}` : ''}`}
                          className="btn btn-secondary btn-sm"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {loadingMore && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem' }}>
                      <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto' }}></div>
                    </td>
                  </tr>
                )}
              </>
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                  {query ? 'No members found matching your search.' : 'No members registered yet in this server.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && page < totalPages && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="btn btn-secondary"
          >
            {loadingMore ? 'Loading...' : `Load More (${members.length} / ${total})`}
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
