'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface VerificationAlreadyProps {
  guildName?: string;
  guildId?: string;
}

export function VerificationAlready({ guildName, guildId }: VerificationAlreadyProps) {
  const shouldReduceMotion = useReducedMotion();

  const discordAppUrl = guildId
    ? `https://discord.com/channels/${guildId}`
    : 'https://discord.com/app';

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: shouldReduceMotion ? 0.1 : 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        textAlign: 'center',
        padding: '0.5rem 0',
      }}
    >
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '2px solid rgba(59, 130, 246, 0.35)',
            boxShadow: '0 0 25px rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
          }}
        >
          <CheckCircle2 size={30} color="#3b82f6" />
        </div>
      </div>

      <h2
        style={{
          fontSize: '1.35rem',
          fontWeight: 700,
          color: '#f8fafc',
          marginBottom: '0.4rem',
        }}
      >
        Already Verified
      </h2>

      <p
        style={{
          fontSize: '0.86rem',
          color: '#94a3b8',
          marginBottom: '1.75rem',
          lineHeight: 1.5,
        }}
      >
        Your Discord account has already completed verification
        {guildName ? ` for ${guildName}` : ''}. You have full access to all server channels.
      </p>

      <a
        href={discordAppUrl}
        className="btn btn-primary btn-block"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.8rem',
          fontWeight: 600,
        }}
      >
        <span>Continue to Discord</span>
        <ArrowRight size={15} />
      </a>
    </motion.div>
  );
}
