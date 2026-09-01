'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Shield, Sparkles } from 'lucide-react';
import {
  VerificationStepConfig,
  VerificationStepId,
  StepStatus,
  VerificationSessionData,
} from './types';
import { VerificationStepItem } from './VerificationStepItem';
import { VerificationConnector } from './VerificationConnector';
import { VerificationSuccess } from './VerificationSuccess';
import { VerificationFailure } from './VerificationFailure';
import { VerificationAlready } from './VerificationAlready';
import { processVerification, VerificationResult } from '@/lib/api';

const STEP_CONFIGS: VerificationStepConfig[] = [
  {
    id: 'discord_identity',
    title: 'Discord Identity',
    checkingText: 'Exchanging OAuth2 credentials...',
    successText: 'Identity authenticated',
    failedText: 'Failed to verify Discord identity',
  },
  {
    id: 'server_membership',
    title: 'Server Membership',
    checkingText: 'Checking member presence in server...',
    successText: 'Server membership confirmed',
    failedText: 'User is not a member of this server',
  },
  {
    id: 'account_check',
    title: 'Account Check',
    checkingText: 'Evaluating account age and status...',
    successText: 'Account age passed checks',
    failedText: 'Account does not meet minimum age rules',
  },
  {
    id: 'anti_bot',
    title: 'Anti-Bot Protection',
    checkingText: 'Validating Turnstile session challenge...',
    successText: 'Anti-bot verification confirmed',
    failedText: 'Anti-bot challenge validation failed',
  },
  {
    id: 'verification',
    title: 'Security Verification',
    checkingText: 'Generating immutable session record...',
    successText: 'Security verification passed',
    failedText: 'Failed to commit verification session',
  },
  {
    id: 'role_assignment',
    title: 'Discord Role Assignment',
    checkingText: 'Assigning Verified Role via Discord Gateway...',
    successText: 'Verified Role applied to your account',
    failedText: 'Role assignment delayed by hierarchy settings',
  },
];

interface VerificationProgressProps {
  code: string;
  state: string;
}

export function VerificationProgress({ code, state }: VerificationProgressProps) {
  const shouldReduceMotion = useReducedMotion();

  // Step statuses: index 0 through 5
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([
    'checking',
    'waiting',
    'waiting',
    'waiting',
    'waiting',
    'waiting',
  ]);

  const [stepDetails, setStepDetails] = useState<(string | undefined)[]>(Array(6).fill(undefined));
  const [stepErrors, setStepErrors] = useState<(string | undefined)[]>(Array(6).fill(undefined));

  // Overall lifecycle: 'in_progress' | 'completed_success' | 'completed_failed' | 'already_verified'
  const [viewState, setViewState] = useState<
    'in_progress' | 'completed_success' | 'completed_failed' | 'already_verified'
  >('in_progress');

  const [sessionData, setSessionData] = useState<VerificationSessionData>({});
  const processedRef = useRef<boolean>(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    async function executeVerification() {
      try {
        // 1. Kick off real backend verification in parallel with choreographed animation
        const backendPromise = processVerification(code, state);

        // Helper to update a step
        const setStep = (index: number, status: StepStatus, detail?: string, error?: string) => {
          setStepStatuses((prev) => {
            const next = [...prev];
            next[index] = status;
            return next;
          });
          if (detail !== undefined) {
            setStepDetails((prev) => {
              const next = [...prev];
              next[index] = detail;
              return next;
            });
          }
          if (error !== undefined) {
            setStepErrors((prev) => {
              const next = [...prev];
              next[index] = error;
              return next;
            });
          }
        };

        // Step 1: Discord Identity
        setStep(0, 'checking');
        await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 350));

        // Await backend response
        const result: VerificationResult = await backendPromise;

        if (result.status === 'ALREADY_VERIFIED') {
          setSessionData({
            guildName: result.guildName,
          });
          setViewState('already_verified');
          return;
        }

        if (result.status === 'VERIFIED') {
          // 1. Step 1 Success
          const username = result.user?.username ? `@${result.user.username}` : 'Identity verified';
          setStep(0, 'success', `Verified ${username}`);

          // 2. Step 2: Server Membership
          await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 250));
          setStep(1, 'checking');
          await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 350));
          setStep(1, 'success', `Member of ${result.guildName || 'Server'}`);

          // 3. Step 3: Account Check
          await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 250));
          setStep(2, 'checking');
          await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 300));
          setStep(2, 'success', 'Account age verified');

          // 4. Step 4: Anti-Bot Protection
          await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 250));
          setStep(3, 'checking');
          await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 300));
          setStep(3, 'success', 'Turnstile challenge passed');

          // 5. Step 5: Security Verification
          await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 250));
          setStep(4, 'checking');
          await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 300));
          setStep(4, 'success', 'Session verified & recorded');

          // 6. Step 6: Discord Role Assignment
          await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 250));
          setStep(5, 'checking');
          await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 400));
          setStep(5, 'success', `@${(result as any).verifiedRoleName || 'Verified'} assigned`);

          // Settle and transition to final success screen
          setSessionData({
            username: result.user?.username,
            guildName: result.guildName,
            guildId: (result as any).discordGuildId,
            verifiedRoleName: (result as any).verifiedRoleName || 'Verified Member',
          });

          await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 450));
          setViewState('completed_success');
        } else {
          // Failure mapping
          const reason = result.reason || 'Verification process failed.';
          const lowerReason = reason.toLowerCase();

          // Determine which step failed based on reason
          if (lowerReason.includes('account') && lowerReason.includes('new')) {
            // Failed at Account Check (Step 2)
            setStep(0, 'success', 'Identity confirmed');
            setStep(1, 'success', 'Server member');
            setStep(2, 'failed', undefined, reason);
            setSessionData({ errorReason: reason, failedStepId: 'account_check' });
          } else if (lowerReason.includes('role') || lowerReason.includes('hierarchy')) {
            // Failed at Role Assignment (Step 5)
            setStep(0, 'success', 'Identity confirmed');
            setStep(1, 'success', 'Server member');
            setStep(2, 'success', 'Account check passed');
            setStep(3, 'success', 'Anti-bot passed');
            setStep(4, 'success', 'Verification recorded');
            setStep(5, 'failed', undefined, reason);
            setSessionData({
              errorReason: reason,
              failedStepId: 'role_assignment',
              roleFailed: true,
              guildId: (result as any).discordGuildId,
            });
          } else if (lowerReason.includes('turnstile') || lowerReason.includes('bot')) {
            setStep(0, 'success', 'Identity confirmed');
            setStep(1, 'success', 'Server member');
            setStep(2, 'success', 'Account check passed');
            setStep(3, 'failed', undefined, reason);
            setSessionData({ errorReason: reason, failedStepId: 'anti_bot' });
          } else if (lowerReason.includes('member') || lowerReason.includes('guild')) {
            setStep(0, 'success', 'Identity confirmed');
            setStep(1, 'failed', undefined, reason);
            setSessionData({ errorReason: reason, failedStepId: 'server_membership' });
          } else {
            // General or Step 0 failure
            setStep(0, 'failed', undefined, reason);
            setSessionData({ errorReason: reason, failedStepId: 'discord_identity' });
          }

          await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 500));
          setViewState('completed_failed');
        }
      } catch (err: any) {
        const msg = err?.message || 'Verification connection failed. Please try again.';
        setStepStatuses(['failed', 'waiting', 'waiting', 'waiting', 'waiting', 'waiting']);
        setStepErrors([msg, undefined, undefined, undefined, undefined, undefined]);
        setSessionData({ errorReason: msg });
        setViewState('completed_failed');
      }
    }

    executeVerification();
  }, [code, state, shouldReduceMotion]);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      backgroundColor: 'var(--bg-pitch)',
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '2rem 1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px -15px rgba(88, 101, 242, 0.15)',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="wait">
          {viewState === 'completed_success' ? (
            <VerificationSuccess
              key="success-view"
              username={sessionData.username}
              guildName={sessionData.guildName}
              guildId={sessionData.guildId}
              verifiedRoleName={sessionData.verifiedRoleName}
            />
          ) : viewState === 'already_verified' ? (
            <VerificationAlready
              key="already-view"
              guildName={sessionData.guildName}
              guildId={sessionData.guildId}
            />
          ) : viewState === 'completed_failed' ? (
            <VerificationFailure
              key="failure-view"
              reason={sessionData.errorReason}
              isRoleFailure={sessionData.roleFailed}
              guildId={sessionData.guildId}
              onRetry={() => {
                window.location.reload();
              }}
            />
          ) : (
            <motion.div
              key="timeline-view"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <h1
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                    letterSpacing: '-0.02em',
                    marginBottom: '0.35rem',
                  }}
                >
                  Verifying Your Account
                </h1>
                <p style={{ fontSize: '0.84rem', color: '#94a3b8' }}>
                  Executing security checks and server role synchronization
                </p>
              </div>

              {/* Sequential Steps List */}
              <div
                role="list"
                aria-live="polite"
                aria-label="Verification progress checks"
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                {STEP_CONFIGS.map((step, idx) => {
                  const status = stepStatuses[idx];
                  const isCompleted = status === 'success';
                  const isActive = status === 'checking';
                  const isLast = idx === STEP_CONFIGS.length - 1;

                  return (
                    <React.Fragment key={step.id}>
                      <VerificationStepItem
                        step={step}
                        status={status}
                        index={idx}
                        detail={stepDetails[idx]}
                        errorReason={stepErrors[idx]}
                      />
                      {!isLast && (
                        <VerificationConnector
                          isCompleted={isCompleted}
                          isActive={isActive}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
