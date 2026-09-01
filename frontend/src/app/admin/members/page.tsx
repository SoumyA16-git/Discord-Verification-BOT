'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAdminMembers } from '@/lib/api';
import { Search } from 'lucide-react';

function MembersContent() {
  const searchParams = useSearchParams();
  const guildIdParam = searchParams.get('guildId') || '';

  const [members, setMembers] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMembers = async (searchQuery = '') => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_token') || '' : '';
    try {
      const res = await getAdminMembers(token, searchQuery, guildIdParam || undefined);
      setMembers(res.members || []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(query);
  }, [guildIdParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMembers(query);
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Member Management</h1>
        <p style={{ marginBottom: 0 }}>Search server members by Discord Snowflake ID or Username.</p>
      </div>

      <form onSubmit={handleSearch} style={{ marginBottom: '2rem', display: 'flex', gap: '0.75rem' }}>
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
              fetchMembers('');
            }}
            className="btn btn-secondary"
          >
            Clear
          </button>
        )}
      </form>

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
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Searching members...</span>
                </td>
              </tr>
            ) : members.length > 0 ? (
              members.map((m) => {
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
              })
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
