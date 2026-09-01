'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getAdminMemberDetail,
  adminVerifyUser,
  adminRevokeUser,
  adminReverifyUser,
} from '@/lib/api';
import { ArrowLeft, Check, Copy } from 'lucide-react';

function MemberDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  // userId is now a Discord Snowflake ID (passed from the members list)
  const userId = params.userId as string;
  const guildId = searchParams.get('guildId') || undefined;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [reverifyLink, setReverifyLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('dverif_admin_token') || '';
    try {
      const res = await getAdminMemberDetail(token, userId, guildId);
      if (res.error) {
        setError(res.error.message || 'Failed to fetch member details.');
      } else {
        setData(res);
      }
    } catch {
      setError('Failed to connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, guildId]);

  const handleRevoke = async () => {
    if (!confirm("Are you sure you want to revoke this member's verification?")) return;
    const token = localStorage.getItem('dverif_admin_token') || '';
    // Use internal DB id if available, otherwise snowflake
    const targetId = data?.user?.id || userId;
    const res = await adminRevokeUser(token, targetId, 'Admin Revocation', guildId);
    if (res.success) {
      setActionSuccess('Verification successfully revoked.');
      fetchDetail();
    } else {
      alert(res.error?.message || 'Failed to revoke verification.');
    }
  };

  const handleManualVerify = async () => {
    if (!confirm('Manual override will immediately assign the verified role on Discord. Proceed?')) return;
    const token = localStorage.getItem('dverif_admin_token') || '';
    const targetId = data?.user?.id || userId;
    const res = await adminVerifyUser(token, targetId, guildId);
    if (res.success) {
      setActionSuccess('Member successfully verified via admin override.');
      fetchDetail();
    } else {
      alert(res.error?.message || 'Failed to verify member.');
    }
  };

  const handleForceReverify = async () => {
    const token = localStorage.getItem('dverif_admin_token') || '';
    const targetId = data?.user?.id || userId;
    const res = await adminReverifyUser(token, targetId, guildId);
    if (res.success && res.verifyUrl) {
      setReverifyLink(res.verifyUrl);
      setActionSuccess('New verification link generated.');
    } else {
      alert(res.error?.message || 'Failed to force reverification.');
    }
  };

  const copyLink = () => {
    if (reverifyLink) {
      navigator.clipboard.writeText(reverifyLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="center-container">
        <div className="card">
          <div className="spinner" />
          <p>Loading member profile...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card card-wide">
        <div className="alert alert-danger">{error || 'User not found.'}</div>
        <Link
          href={`/admin/members${guildId ? `?guildId=${guildId}` : ''}`}
          className="btn btn-secondary"
        >
          Back to Members
        </Link>
      </div>
    );
  }

  const { user, verification, attempts, auditLogs } = data;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user.avatar && (
            <img
              src={user.avatar}
              alt={user.username}
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <div>
            <Link
              href={`/admin/members${guildId ? `?guildId=${guildId}` : ''}`}
              className="text-sm highlight"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.35rem' }}
            >
              <ArrowLeft size={14} /> Back to Members
            </Link>
            <h1 style={{ margin: 0 }}>{user.displayName || user.username || 'Member Details'}</h1>
            {user.displayName && user.displayName !== user.username && (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                @{user.username}
              </p>
            )}
            <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Discord Snowflake ID: {user.discord_id}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {verification && verification.status === 'VERIFIED' && (
            <button onClick={handleRevoke} className="btn btn-danger btn-sm">
              Revoke Verification
            </button>
          )}
          <button onClick={handleForceReverify} className="btn btn-secondary btn-sm">
            Force Re-verification
          </button>
          {(!verification || verification.status !== 'VERIFIED') && (
            <button onClick={handleManualVerify} className="btn btn-primary btn-sm">
              Manual Override Verify
            </button>
          )}
        </div>
      </div>

      {actionSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{actionSuccess}</div>}

      {reverifyLink && (
        <div
          className="alert alert-info"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}
        >
          <div style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>
            <strong>Direct Link:</strong> {reverifyLink}
          </div>
          <button onClick={copyLink} className="btn btn-secondary btn-sm">
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy Link'}
          </button>
        </div>
      )}

      {/* Current Standing */}
      <div className="card card-wide" style={{ marginBottom: '2rem' }}>
        <h2>Current Standing</h2>
        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <div>
            <div className="stat-title">Status</div>
            <span
              className={`badge ${
                verification && verification.status === 'VERIFIED'
                  ? 'badge-verified'
                  : verification && (verification.status === 'REVOKED' || verification.status === 'FAILED')
                  ? 'badge-failed'
                  : 'badge-pending'
              }`}
            >
              {verification ? verification.status : 'UNVERIFIED'}
            </span>
          </div>

          <div>
            <div className="stat-title">Role Confirmed</div>
            <div>{verification?.role_assigned ? 'Active in Discord' : 'Not Assigned'}</div>
          </div>

          <div>
            <div className="stat-title">Verified At</div>
            <div>
              {verification?.verified_at
                ? new Date(verification.verified_at).toLocaleString()
                : 'Never'}
            </div>
          </div>

          <div>
            <div className="stat-title">Server Joined</div>
            <div>{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : '—'}</div>
          </div>

          <div>
            <div className="stat-title">First Seen</div>
            <div>{new Date(user.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Discord Roles */}
        {user.roles && user.roles.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <div className="stat-title" style={{ marginBottom: '0.5rem' }}>Discord Roles</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {user.roles.map((r: any) => (
                <span
                  key={r.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    background: 'var(--surface-2)',
                    border: `1px solid ${r.color !== '#000000' ? r.color : 'var(--border)'}`,
                    color: 'var(--text)',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: r.color !== '#000000' ? r.color : 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  />
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attempt History */}
      <div style={{ marginBottom: '2rem' }}>
        <h2>Attempt History</h2>
        <div className="table-wrapper" style={{ marginTop: '1rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Result</th>
                <th>Failure Reason</th>
                <th>IP Hash</th>
              </tr>
            </thead>
            <tbody>
              {attempts && attempts.length > 0 ? (
                attempts.map((att: any) => (
                  <tr key={att.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(att.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${att.result === 'SUCCESS' ? 'badge-verified' : 'badge-failed'}`}>
                        {att.result}
                      </span>
                    </td>
                    <td>{att.failure_reason || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {att.ip_hash ? `${att.ip_hash.substring(0, 16)}...` : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                    No attempts logged for this user.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Trail */}
      <div>
        <h2>Audit Log Trail</h2>
        <div className="table-wrapper" style={{ marginTop: '1rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.map((log: any) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-pending">{log.event_type.replace(/_/g, ' ')}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                    No audit logs recorded for this user.
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

export default function MemberDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="center-container">
          <div className="card">
            <div className="spinner" />
            <p>Loading member profile...</p>
          </div>
        </div>
      }
    >
      <MemberDetailContent />
    </Suspense>
  );
}
