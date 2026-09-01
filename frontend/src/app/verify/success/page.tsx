'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { VerificationSuccess } from '@/components/verification';

function SuccessContent() {
  const searchParams = useSearchParams();
  const guildName = searchParams.get('guild') || 'Discord Server';
  const username = searchParams.get('user') || 'Member';
  const guildId = searchParams.get('guild_id') || undefined;

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
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          backgroundColor: '#0d0f17',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          borderRadius: '16px',
          padding: '2rem 1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px -15px rgba(16, 185, 129, 0.15)',
        }}
      >
        <VerificationSuccess
          username={username}
          guildName={guildName}
          guildId={guildId}
          verifiedRoleName="Verified Member"
        />
      </div>
    </div>
  );
}

export default function SuccessPage() {
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
      <SuccessContent />
    </Suspense>
  );
}
