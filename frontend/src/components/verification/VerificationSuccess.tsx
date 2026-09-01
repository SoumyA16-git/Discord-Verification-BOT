'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

interface VerificationSuccessProps {
  username?: string;
  guildName?: string;
  guildId?: string;
  verifiedRoleName?: string;
}

export function VerificationSuccess({
  username,
  guildName,
  guildId,
  verifiedRoleName = 'Verified Member',
}: VerificationSuccessProps) {
  const shouldReduceMotion = useReducedMotion();

  const discordAppUrl = guildId
    ? `discord://-/channels/${guildId}`
    : 'discord://-/app';

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: shouldReduceMotion ? 0.1 : 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        textAlign: 'center',
        padding: '0.5rem 0',
      }}
    >
      {/* Central Checkmark Reveal with Ambient Glow */}
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
        <motion.div
          initial={shouldReduceMotion ? {} : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.45, ease: [0.175, 0.885, 0.32, 1.2] }}
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '2px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M20 6L9 17L4 12"
              initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.4, ease: 'easeOut', delay: 0.15 }}
            />
          </svg>
        </motion.div>
      </div>

      <motion.h2
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        style={{
          fontSize: '1.4rem',
          fontWeight: 700,
          color: '#f8fafc',
          letterSpacing: '-0.02em',
          marginBottom: '0.4rem',
        }}
      >
        Verification Complete
      </motion.h2>

      <motion.p
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.3 }}
        style={{
          fontSize: '0.88rem',
          color: '#94a3b8',
          marginBottom: '1.75rem',
          lineHeight: 1.5,
        }}
      >
        Your Discord account has been authenticated and granted access.
      </motion.p>

      {/* Summary Badge Card */}
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1.75rem',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {username && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: '#64748b' }}>Account:</span>
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>@{username}</span>
          </div>
        )}
        {guildName && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: '#64748b' }}>Server:</span>
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{guildName}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
          <span style={{ color: '#64748b' }}>Role Assigned:</span>
          <span
            style={{
              fontWeight: 600,
              color: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              padding: '1px 8px',
              borderRadius: '4px',
            }}
          >
            @{verifiedRoleName}
          </span>
        </div>
      </motion.div>

      {/* Primary Action Button */}
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.3 }}
      >
        <a
          href={discordAppUrl}
          className="btn btn-primary btn-block"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.8rem 1.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <span>Continue to Discord</span>
          <ArrowRight size={15} />
        </a>
      </motion.div>
    </motion.div>
  );
}
