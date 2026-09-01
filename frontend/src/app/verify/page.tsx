'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { initiateVerification } from '@/lib/api';
import { AlertCircle, CheckCircle2, ShieldCheck, Loader2, Bot, Fingerprint, Activity, Clock, ShieldBan } from 'lucide-react';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';

const STEPS = [
  { id: 'session', label: 'Validating Session', description: 'Authenticating your secure verification token' },
  { id: 'membership', label: 'Server Membership', description: 'Verifying your Discord server access' },
  { id: 'account', label: 'Account Integrity', description: 'Checking account age and security standing' },
  { id: 'antibot', label: 'Anti-Bot Challenge', description: 'Complete the Cloudflare security check' },
  { id: 'oauth', label: 'Discord Identity', description: 'Link your Discord account securely' },
];

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);

  // Sequential progression logic
  useEffect(() => {
    if (!token) {
      setError('No verification token provided. Please run /verify in your Discord server.');
      return;
    }

    let isMounted = true;

    const runSequence = async () => {
      // Step 0: Validate Session (Fake 800ms for premium feel)
      await new Promise(r => setTimeout(r, 800));
      if (!isMounted) return;
      setCurrentStep(1);

      // Step 1: Membership (Fake 600ms)
      await new Promise(r => setTimeout(r, 600));
      if (!isMounted) return;
      setCurrentStep(2);

      // Step 2: Account Integrity (Fake 700ms)
      await new Promise(r => setTimeout(r, 700));
      if (!isMounted) return;
      
      // Step 3: Anti-Bot Challenge (Wait for Turnstile)
      setCurrentStep(3);
    };

    runSequence();
    return () => { isMounted = false; };
  }, [token]);

  // When Turnstile completes, proceed
  useEffect(() => {
    if (turnstileToken && currentStep === 3) {
      handleTurnstileComplete();
    }
  }, [turnstileToken, currentStep]);

  async function handleTurnstileComplete() {
    setCurrentStep(4); // Moving to OAuth request
    
    try {
      const data = await initiateVerification(token as string, turnstileToken!);
      
      if (data.status === 'OK' && data.authorizeUrl) {
        setOauthUrl(data.authorizeUrl);
        // Add a slight delay before redirect for smooth UX
        setTimeout(() => {
          window.location.href = data.authorizeUrl;
        }, 1200);
      } else if (data.status === 'ALREADY_VERIFIED') {
        router.replace('/verify/already');
      } else if (data.error?.code === 'EXPIRED') {
        router.replace('/verify/expired');
      } else {
        setError(data.error?.message || 'Verification link is invalid or has already been used.');
      }
    } catch (err) {
      setError('Failed to reach verification service. Please try again.');
    }
  }

  // Layout wrapper
  const Layout = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: '#09090b',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#18181b',
        padding: '2.5rem',
        borderRadius: '12px',
        border: '1px solid #27272a',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </div>
      <div style={{
        marginTop: '2rem',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        zIndex: 1
      }}>
        Secure verification by <strong>911 - Verification BOT</strong><br/>
        Protected by Cloudflare Turnstile
      </div>
    </div>
  );

  if (error) {
    return (
      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <AlertCircle size={28} color="#ef4444" />
          </div>
          <h1 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: '#f8fafc' }}>Verification Issue</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.6' }}>{error}</p>
          <Link href="/" className="btn btn-secondary btn-block" style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}>
            Return Home
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', fontWeight: 600, color: '#f4f4f5' }}>
          Verification Progress
        </h2>
        <div style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
          Please complete the steps below to gain server access
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', padding: '0 1rem' }}>
        {STEPS.map((step, idx) => {
          const isCompleted = currentStep > idx;
          const isCurrent = currentStep === idx;
          const isPending = currentStep < idx;
          const isLast = idx === STEPS.length - 1;

          return (
            <div key={step.id} style={{ display: 'flex', position: 'relative', minHeight: isLast ? 'auto' : '80px' }}>
              {/* Left Column: Node & Line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '1.5rem' }}>
                {/* Node */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isCompleted ? '#10b981' : isCurrent ? '#2563eb' : 'transparent',
                  border: isPending ? '2px solid #3f3f46' : 'none',
                  color: '#fff',
                  zIndex: 2,
                  transition: 'all 0.3s ease',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}>
                  {isCompleted ? <CheckCircle2 size={16} color="#fff" /> : isCurrent ? <Loader2 size={16} color="#fff" className="animate-spin" /> : (idx + 1)}
                </div>
                
                {/* Connecting Line */}
                {!isLast && (
                  <div style={{
                    width: '2px',
                    flexGrow: 1,
                    backgroundColor: isCompleted ? '#10b981' : '#27272a',
                    margin: '4px 0',
                    transition: 'background-color 0.3s ease',
                  }} />
                )}
              </div>

              {/* Right Column: Content */}
              <div style={{ paddingBottom: isLast ? '0' : '2rem', flexGrow: 1, paddingTop: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ 
                      fontSize: '0.95rem', 
                      fontWeight: (isCurrent || isCompleted) ? 600 : 500, 
                      color: isPending ? '#71717a' : '#f4f4f5',
                      marginBottom: '0.2rem',
                      transition: 'color 0.3s ease'
                    }}>
                      {step.label}
                    </div>
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: isPending ? '#52525b' : '#a1a1aa',
                      transition: 'color 0.3s ease'
                    }}>
                      {step.description}
                    </div>
                  </div>
                </div>

                {/* Turnstile inline injection for the Anti-Bot step */}
                {isCurrent && step.id === 'antibot' && (
                  <div style={{ 
                    marginTop: '1rem',
                    animation: 'fadeIn 0.4s ease-out'
                  }}>
                    <div style={{ display: 'inline-block', padding: '0.25rem', borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#09090b' }}>
                      <Turnstile 
                        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} 
                        onSuccess={(token) => setTurnstileToken(token)}
                        options={{ theme: 'dark', size: 'compact' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {oauthUrl && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#10b981', marginBottom: '0.5rem' }}>Sequence Complete</div>
          <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Redirecting to Discord...</div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}} />
    </Layout>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="animate-spin" size={32} color="var(--discord-blurple)" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
