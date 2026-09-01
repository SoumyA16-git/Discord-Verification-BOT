'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  UserCheck,
  Server,
  Clock,
  ShieldCheck,
  CheckCircle2,
  UserPlus,
  AlertTriangle,
  XCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { VerificationStepConfig, StepStatus } from './types';

interface VerificationStepItemProps {
  step: VerificationStepConfig;
  status: StepStatus;
  index: number;
  detail?: string;
  errorReason?: string;
}

export function VerificationStepItem({
  step,
  status,
  index,
  detail,
  errorReason,
}: VerificationStepItemProps) {
  const shouldReduceMotion = useReducedMotion();

  const isWaiting = status === 'waiting';
  const isChecking = status === 'checking';
  const isSuccess = status === 'success';
  const isFailed = status === 'failed';

  // Pick default icon based on step type
  const getStepIcon = () => {
    if (isSuccess) return <Check size={16} strokeWidth={3} style={{ color: '#fff' }} />;
    if (isFailed) return <XCircle size={18} style={{ color: 'var(--status-red)' }} />;
    return (
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isChecking ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {index + 1}
      </span>
    );
  };



  const getStatusText = () => {
    if (isSuccess) return detail || step.successText;
    if (isChecking) return step.checkingText;
    if (isFailed) return errorReason || step.failedText;
    return 'Waiting...';
  };

  return (
    <motion.div
      layout={!shouldReduceMotion}
      initial={
        shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 12, scale: 0.97, filter: 'blur(4px)' }
      }
      animate={
        isFailed && !shouldReduceMotion
          ? {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: 'blur(0px)',
              x: [-3, 3, -2, 2, 0], // Restrained micro-shake on failed step only
              transition: { duration: 0.35, ease: 'easeInOut' },
            }
          : {
              opacity: isWaiting ? 0.45 : 1,
              y: 0,
              scale: 1,
              filter: 'blur(0px)',
              x: 0,
              transition: { duration: shouldReduceMotion ? 0.1 : 0.35, ease: [0.16, 1, 0.3, 1] },
            }
      }
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem 0', // Removed horizontal padding since there's no card border
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none',
      }}
      role="listitem"
      aria-label={`${step.title}: ${getStatusText()}`}
    >
      {/* Step Icon Container */}
      <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
        <motion.div
          initial={shouldReduceMotion ? {} : { rotate: -22, opacity: 0 }}
          animate={{
            rotate: 0,
            opacity: 1,
            scale: isChecking && !shouldReduceMotion ? [1, 1.05, 1] : 1,
          }}
          transition={
            isChecking && !shouldReduceMotion
              ? { scale: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } }
              : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
          }
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isSuccess
              ? '#10b981'
              : 'transparent',
            border: `1px solid ${
              isSuccess
                ? '#10b981'
                : isChecking
                ? '#5865f2'
                : isFailed
                ? '#ef4444'
                : 'rgba(255, 255, 255, 0.15)'
            }`,
            color: isSuccess
              ? '#fff'
              : isChecking
              ? '#5865f2'
              : isFailed
              ? '#ef4444'
              : '#64748b',
          }}
        >
          {isSuccess ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M20 6L9 17L4 12"
                initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: shouldReduceMotion ? 0.01 : 0.32, ease: 'easeOut' }}
              />
            </svg>
          ) : isFailed ? (
            <XCircle size={18} color="#ef4444" />
          ) : (
            getStepIcon()
          )}
        </motion.div>
      </div>

      {/* Step Text Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: isWaiting ? '#64748b' : '#f8fafc',
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{step.title}</span>
          {isChecking && (
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 7px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(88, 101, 242, 0.15)',
                color: '#5865f2',
                fontWeight: 500,
              }}
            >
              Active Check
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: '0.78rem',
            color: isSuccess
              ? '#10b981'
              : isFailed
              ? '#ef4444'
              : isChecking
              ? '#94a3b8'
              : '#64748b',
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {isChecking && !shouldReduceMotion && (
            <Loader2
              size={12}
              className="animate-spin"
              style={{ animation: 'spin 1.5s linear infinite' }}
            />
          )}
          <span>{getStatusText()}</span>
        </div>
      </div>
    </motion.div>
  );
}
