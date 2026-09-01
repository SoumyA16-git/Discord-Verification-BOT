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
  const userId = params.userId as string;

  // Carry the active guildId so the API fetches the right guild's verification data
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
        setError(res.error.message);
      } else {
        setData(res);
      }
    } catch {
      setError('Failed to fetch member details.');
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
    const res = await adminRevokeUser(token, userId, 'Admin Revocation', guildId);
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
    const res = await adminVerifyUser(token, userId, guildId);
    if (res.success) {
      setActionSuccess('Member successfully verified via admin override.');
      fetchDetail();
    } else {
      alert(res.error?.message || 'Failed to verify member.');
    }
  };

  const handleForceReverify = async () => {
    const token = localStorage.getItem('dverif_admin_token') || '';
    const res = await adminReverifyUser(token, userId, guildId);
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
          <div className="spinner"></div>
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
        <div>
          <Link
            href={`/admin/members${guildId ? `?guildId=${guildId}` : ''}`}
            className="text-sm highlight"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={14} /> Back to Members
          </Link>
          <h1>{user.username || 'Member Details'}</h1>
          <p style={{ marginBottom: 0, fontFamily: 'monospace' }}>Discord Snowflake ID: {user.discord_id}</p>
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

      {actionSuccess && <div className="alert alert-success">{actionSuccess}</div>}

      {reverifyLink && (
        <div
          className="alert alert-info"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>
            <strong>Direct Link:</strong> {reverifyLink}
          </div>
          <button onClick={copyLink} className="btn btn-secondary btn-sm">
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy Link'}
          </button>
        </div>
      )}

      {/* Current Standing Card */}
      <div className="card card-wide" style={{ marginBottom: '2rem' }}>
        <h2>Current Standing</h2>
        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <div>
            <div className="stat-title">Status</div>
            <span
              className={`badge ${
                verification && verification.status === 'VERIFIED'
                  ? 'badge-verified'
                  : verification &&
                    (verification.status === 'REVOKED' || verification.status === 'FAILED')
                  ? 'badge-failed'
                  : 'badge-pending'
              }`}
            >
              {verification ? verification.status : 'UNVERIFIED'}
            </span>
          </div>

          <div>
            <div className="stat-title">Role Confirmed</div>
            <div>{verification && verification.role_assigned ? 'Active in Discord' : 'Not Assigned'}</div>
          </div>

          <div>
            <div className="stat-title">Verified At</div>
            <div>
              {verification && verification.verified_at
                ? new Date(verification.verified_at).toLocaleString()
                : 'Never'}
            </div>
          </div>

          <div>
            <div className="stat-title">First Seen</div>
            <div>{new Date(user.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Attempts History */}
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
                      <span
                        className={`badge ${att.result === 'SUCCESS' ? 'badge-verified' : 'badge-failed'}`}
                      >
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

      {/* User Audit Trail */}
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
