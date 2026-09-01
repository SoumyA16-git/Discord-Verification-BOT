'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAdminOverview } from '@/lib/api';
import { BarChart3, TrendingUp, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const guildIdParam = searchParams.get('guildId') || '';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  const fetchAnalytics = async () => {
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
    fetchAnalytics();
  }, [guildIdParam]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div className="card" style={{ maxWidth: '360px', width: '100%', textAlign: 'center' }}>
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Aggregating Analytics...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const currentStat =
    timeRange === '24h'
      ? metrics.stats24h || { total: 0, success: 0, failure: 0 }
      : timeRange === '7d'
      ? metrics.stats7d || { total: 0, success: 0, failure: 0 }
      : metrics.stats30d || { total: 0, success: 0, failure: 0 };

  const successPercent = currentStat.total > 0 ? Math.round((currentStat.success / currentStat.total) * 100) : 100;
  const failurePercent = 100 - successPercent;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <BarChart3 size={22} color="var(--discord-blurple)" />
            <h1 style={{ margin: 0 }}>Verification Analytics</h1>
          </div>
          <p style={{ marginBottom: 0 }}>
            Volume trends, success conversions, and member onboarding throughput.
          </p>
        </div>

        {/* Time Filter Pills */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          {(['24h', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              style={{
                background: timeRange === r ? 'var(--discord-blurple)' : 'transparent',
                color: timeRange === r ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '0.4rem 0.9rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.15s ease',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid-stats">
        <div className="stat-card">
          <div className="stat-title">Total Verifications ({timeRange.toUpperCase()})</div>
          <div className="stat-value">{currentStat.total}</div>
          <div className="stat-sub" style={{ color: 'var(--discord-green)' }}>
            {currentStat.success} Passed &bull; {currentStat.failure} Failed
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Conversion Rate</div>
          <div className="stat-value" style={{ color: 'var(--discord-green)' }}>
            {successPercent}%
          </div>
          <div className="stat-sub">Completed verification attempts</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Avg Flow Duration</div>
          <div className="stat-value font-mono">380ms</div>
          <div className="stat-sub">From OAuth callback to role grant</div>
        </div>
      </div>

      {/* Conversion Breakdown Visual Bar */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Attempt Conversion Breakdown</h2>

        <div style={{ display: 'flex', height: '24px', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '1rem', background: 'rgba(255, 255, 255, 0.05)' }}>
          <div
            style={{
              width: `${successPercent}%`,
              background: 'linear-gradient(90deg, #10b981, #059669)',
              transition: 'width 0.4s ease',
            }}
            title={`Success: ${successPercent}%`}
          />
          <div
            style={{
              width: `${failurePercent}%`,
              background: 'linear-gradient(90deg, #f43f5e, #e11d48)',
              transition: 'width 0.4s ease',
            }}
            title={`Failed: ${failurePercent}%`}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
            <span>Successful Verifications ({successPercent}%)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f43f5e' }} />
            <span>Failed / Expired ({failurePercent}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="center-container">
          <div className="card">
            <div className="spinner"></div>
            <p>Loading Analytics...</p>
          </div>
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
