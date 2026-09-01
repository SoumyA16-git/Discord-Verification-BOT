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
    if (isSuccess) return <CheckCircle2 size={18} style={{ color: '#fff' }} />;
    if (isFailed) return <XCircle size={18} style={{ color: '#fff' }} />;
    if (isChecking) return <Loader2 size={18} className="animate-spin" style={{ color: '#fff' }} />;
    return (
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
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
              : isChecking
              ? '#3b82f6'
              : isFailed
              ? '#ef4444'
              : '#18181b',
            border: `1px solid ${
              isSuccess
                ? '#10b981'
                : isChecking
                ? '#3b82f6'
                : isFailed
                ? '#ef4444'
                : '#27272a'
            }`,
            color: '#fff',
          }}
        >
          {getStepIcon()}
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
          <span>{getStatusText()}</span>
        </div>
      </div>
    </motion.div>
  );
}
