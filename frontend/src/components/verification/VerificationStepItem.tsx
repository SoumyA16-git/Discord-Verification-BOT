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
    if (isSuccess) return <Check size={18} />;
    switch (step.id) {
      case 'discord_identity':
        return <UserCheck size={18} />;
      case 'server_membership':
        return <Server size={18} />;
      case 'account_check':
        return <Clock size={18} />;
      case 'anti_bot':
        return <ShieldCheck size={18} />;
      case 'verification':
        return <CheckCircle2 size={18} />;
      case 'role_assignment':
        return <UserPlus size={18} />;
      default:
        return <CheckCircle2 size={18} />;
    }
  };

  // Dynamic card styling based on state
  const getBorderColor = () => {
    if (isChecking) return 'rgba(88, 101, 242, 0.45)';
    if (isSuccess) return 'rgba(16, 185, 129, 0.3)';
    if (isFailed) return 'rgba(239, 68, 68, 0.4)';
    return 'rgba(255, 255, 255, 0.06)';
  };

  const getBackground = () => {
    if (isChecking) return 'rgba(88, 101, 242, 0.05)';
    if (isSuccess) return '#0a1f16';
    if (isFailed) return 'rgba(239, 68, 68, 0.04)';
    return 'rgba(255, 255, 255, 0.02)';
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
        padding: '0.85rem 1rem',
        borderRadius: '10px',
        backgroundColor: getBackground(),
        border: `1px solid ${getBorderColor()}`,
        boxShadow: isChecking
          ? '0 0 20px -5px rgba(88, 101, 242, 0.25)'
          : isSuccess
          ? '0 0 16px -8px rgba(16, 185, 129, 0.2)'
          : 'none',
        transition: 'border-color 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease',
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
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isSuccess
              ? 'rgba(16, 185, 129, 0.15)'
              : isChecking
              ? 'rgba(88, 101, 242, 0.18)'
              : isFailed
              ? 'rgba(239, 68, 68, 0.15)'
              : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${
              isSuccess
                ? 'rgba(16, 185, 129, 0.35)'
                : isChecking
                ? 'rgba(88, 101, 242, 0.4)'
                : isFailed
                ? 'rgba(239, 68, 68, 0.35)'
                : 'rgba(255, 255, 255, 0.08)'
            }`,
            color: isSuccess
              ? '#10b981'
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
              stroke="#10b981"
              strokeWidth="2.5"
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
