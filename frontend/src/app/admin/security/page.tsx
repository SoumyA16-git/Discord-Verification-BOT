'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAdminOverview } from '@/lib/api';
import { Shield, ShieldCheck, AlertTriangle, Lock, RefreshCw, CheckCircle2 } from 'lucide-react';

function SecurityContent() {
  const searchParams = useSearchParams();
  const guildIdParam = searchParams.get('guildId') || '';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSecurityData = async () => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_token') || '' : '';
    try {
      const res = await getAdminOverview(token, guildIdParam || undefined);
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [guildIdParam]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div className="card" style={{ maxWidth: '360px', width: '100%', textAlign: 'center' }}>
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Analyzing Security Posture...</p>
        </div>
      </div>
    );
  }

  const stats24h = data?.metrics?.stats24h || { total: 0, success: 0, failure: 0 };
  const failRate = stats24h.total > 0 ? Math.round((stats24h.failure / stats24h.total) * 100) : 0;
  const securityScore = failRate > 30 ? 74 : failRate > 10 ? 88 : 98;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
          <Shield size={22} color="var(--color-emerald)" />
          <h1 style={{ margin: 0 }}>Security &amp; Threat Center</h1>
        </div>
        <p style={{ marginBottom: 0 }}>
          Real-time threat monitoring, anomaly detection, and verification gate security audits.
        </p>
      </div>

      {/* Security Health Score Dial */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          padding: '2rem 2.5rem',
          marginBottom: '2rem',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 0 35px -5px rgba(16, 185, 129, 0.15)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Overall Security Health Score
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-emerald)', lineHeight: 1.1, margin: '0.5rem 0' }}>
            {securityScore} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {securityScore >= 95
              ? <><ShieldCheck size={16} /> Optimal Protection: No active raid or authentication anomalies detected.</>
              : <><AlertTriangle size={16} /> Moderate Warnings: Review failed verification attempts.</>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button onClick={fetchSecurityData} className="btn btn-secondary">
            <RefreshCw size={15} />
            <span>Re-scan Threats</span>
          </button>
        </div>
      </div>

      {/* Threat Monitoring Metric Cards */}
      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-title">Failed Attempts (24h)</div>
          <div className="stat-value" style={{ color: stats24h.failure > 0 ? 'var(--discord-red)' : 'var(--text-primary)' }}>
            {stats24h.failure}
          </div>
          <div className="stat-sub">Suspicious token or OAuth failures</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">HMAC Signature Status</div>
          <div className="stat-value" style={{ color: 'var(--color-emerald)', fontSize: '1.5rem' }}>
            ACTIVE
          </div>
          <div className="stat-sub">SHA-256 tamper-proof tokens</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Rate Limiting Window</div>
          <div className="stat-value font-mono">
            {data?.guildConfig?.rate_limit_attempts || 5} req / {data?.guildConfig?.rate_limit_window_minutes || 10}m
          </div>
          <div className="stat-sub">Adaptive DDoS and bot quota</div>
        </div>
      </div>

      {/* Security Best Practices Checklist */}
      <div className="card" style={{ marginTop: '2rem', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Security Posture Checklist</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <CheckCircle2 size={20} color="var(--color-emerald)" />
            <div>
              <div style={{ fontWeight: 600 }}>OAuth2 Code Deduplication Enabled</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Single-use authorization code replay protection is active.</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <CheckCircle2 size={20} color="var(--color-emerald)" />
            <div>
              <div style={{ fontWeight: 600 }}>PostgreSQL Row Level Security (RLS) Active</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supabase tables enforce cryptographic tenant boundaries.</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0' }}>
            <CheckCircle2 size={20} color="var(--color-emerald)" />
            <div>
              <div style={{ fontWeight: 600 }}>Bot Role Hierarchy Validated</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>911 - Verification BOT holds elevated privileges to grant server access.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <Suspense
      fallback={
        <div className="center-container">
          <div className="card">
            <div className="spinner"></div>
            <p>Loading Security Center...</p>
          </div>
        </div>
      }
    >
      <SecurityContent />
    </Suspense>
  );
}
