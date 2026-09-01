'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { VerificationProgress } from '@/components/verification';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const guildId = searchParams.get('guild_id');
  const permissions = searchParams.get('permissions');
  const oauthError = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');

  const [error, setError] = useState<string | null>(null);
  const [botAddedGuildId, setBotAddedGuildId] = useState<string | null>(null);

  useEffect(() => {
    if (oauthError) {
      setError(errorDesc || 'Discord authorization was cancelled or denied.');
      return;
    }

    // 1. Bot Invite & Server Authorization Return Flow (?guild_id=...&permissions=8)
    if (guildId && (permissions || code)) {
      setBotAddedGuildId(guildId);
      const timer = setTimeout(() => {
        router.replace('/admin/servers');
      }, 2000);
      return () => clearTimeout(timer);
    }

    // 2. Member Verification OAuth Flow Validation (?code=...&state=...)
    if (!code || !state) {
      setError('Missing authorization code or state token. Please run /verify again in Discord.');
    }
  }, [code, state, guildId, permissions, oauthError, errorDesc, router]);

  // Bot Added Success Screen
  if (botAddedGuildId) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#08090d',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            width: '100%',
            background: '#0d0f17',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '12px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}
          >
            <ShieldCheck size={24} color="#22c55e" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.4rem' }}>
            Bot Added Successfully!
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.75rem' }}>
            911 - Verification BOT is now connected to your server with Administrator permissions. Redirecting to your servers...
          </p>
          <Link href="/admin/servers" className="btn btn-primary btn-block">
            <span>Go to Server Hub</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#08090d',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            width: '100%',
            background: '#0d0f17',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}
          >
            <AlertCircle size={24} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.4rem' }}>
            Verification Error
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.75rem' }}>{error}</p>
          <Link href="/" className="btn btn-secondary btn-block">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Live Sequential Verification Animation
  if (code && state) {
    return <VerificationProgress code={code} state={state} />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#08090d',
      }}
    >
      <div className="spinner" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#08090d',
          }}
        >
          <div className="spinner" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
