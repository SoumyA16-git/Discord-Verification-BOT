'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { VerificationFailure } from '@/components/verification';

function FailureContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'Unable to complete verification. Please try again.';
  const isRole = searchParams.get('role_failed') === 'true';
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
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px -15px rgba(239, 68, 68, 0.15)',
        }}
      >
        <VerificationFailure
          reason={reason}
          isRoleFailure={isRole}
          guildId={guildId}
          onRetry={() => {
            window.location.href = '/verify';
          }}
        />
      </div>
    </div>
  );
}

export default function FailurePage() {
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
      <FailureContent />
    </Suspense>
  );
}
