'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, RotateCcw, ArrowRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface VerificationFailureProps {
  reason?: string;
  isRoleFailure?: boolean;
  onRetry?: () => void;
  guildId?: string;
}

export function VerificationFailure({
  reason,
  isRoleFailure,
  onRetry,
  guildId,
}: VerificationFailureProps) {
  const shouldReduceMotion = useReducedMotion();

  const discordAppUrl = guildId
    ? `https://discord.com/channels/${guildId}`
    : 'https://discord.com/app';

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: shouldReduceMotion ? 0.1 : 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        textAlign: 'center',
        padding: '0.5rem 0',
      }}
    >
      {/* Failure Icon */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: isRoleFailure
              ? 'rgba(245, 158, 11, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            border: `2px solid ${
              isRoleFailure ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
          }}
        >
          {isRoleFailure ? (
            <ShieldAlert size={28} color="#f59e0b" />
          ) : (
            <AlertCircle size={28} color="#ef4444" />
          )}
        </div>
      </div>

      <h2
        style={{
          fontSize: '1.3rem',
          fontWeight: 700,
          color: '#f8fafc',
          marginBottom: '0.4rem',
        }}
      >
        {isRoleFailure ? 'Role Assignment Delayed' : 'Verification Issue'}
      </h2>

      <p
        style={{
          fontSize: '0.86rem',
          color: '#94a3b8',
          marginBottom: '1.5rem',
          lineHeight: 1.5,
        }}
      >
        {isRoleFailure
          ? 'Your identity was verified successfully, but the server bot could not automatically assign your role due to server role hierarchy settings. A server administrator has been alerted.'
          : reason || 'We could not complete your verification. Please check the requirements and try again.'}
      </p>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn btn-primary btn-block"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              fontWeight: 600,
            }}
          >
            <RotateCcw size={15} />
            <span>Try Again</span>
          </button>
        )}

        <a
          href={discordAppUrl}
          className="btn btn-secondary btn-block"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
          }}
        >
          <span>Return to Discord</span>
          <ArrowRight size={14} />
        </a>
      </div>
    </motion.div>
  );
}
