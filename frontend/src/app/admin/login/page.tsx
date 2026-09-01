'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminLogin } from '@/lib/api';
import { getAdminOAuthUrl } from '@/lib/discord';
import { ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthCode = searchParams.get('code');
  const processedCodeRef = useRef<string | null>(null);

  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthUrl, setOauthUrl] = useState('');

  useEffect(() => {
    setOauthUrl(getAdminOAuthUrl());
  }, []);

  // Auto-authenticate with React StrictMode deduplication guard
  useEffect(() => {
    if (oauthCode && processedCodeRef.current !== oauthCode) {
      processedCodeRef.current = oauthCode;
      setLoading(true);

      adminLogin({ code: oauthCode })
        .then((res) => {
          if (res.success && res.token) {
            localStorage.setItem('dverif_admin_token', res.token);
            localStorage.setItem('dverif_admin_user', JSON.stringify(res.admin));
            if (res.guilds) {
              localStorage.setItem('dverif_admin_guilds', JSON.stringify(res.guilds));
            }
            window.location.href = '/admin';
          } else {
            setError(res.error?.message || 'Unauthorized admin account.');
            setLoading(false);
          }
        })
        .catch(() => {
          setError('Failed to authenticate with Discord.');
          setLoading(false);
        });
    }
  }, [oauthCode]);

  const handleSecretLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await adminLogin({ secret });
      if (res.success && res.token) {
        localStorage.setItem('dverif_admin_token', res.token);
        localStorage.setItem('dverif_admin_user', JSON.stringify(res.admin));
        window.location.href = '/admin';
      } else {
        setError(res.error?.message || 'Invalid admin secret passkey.');
      }
    } catch {
      setError('Failed to reach backend service.');
    } finally {
      setLoading(false);
    }
  };

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
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#0d0f17',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Brand Icon Header */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: 'var(--discord-blurple-subtle)',
            border: '1px solid rgba(88, 101, 242, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
          }}
        >
          <ShieldCheck size={24} color="var(--discord-blurple)" />
        </div>

        <h1 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '0.4rem', color: '#f8fafc' }}>
          Admin Workspace
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.75rem' }}>
          Authenticate with your Discord account to manage verification gates.
        </p>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading && oauthCode ? (
          <div style={{ margin: '2rem 0' }}>
            <div className="spinner" />
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.75rem' }}>
              Authenticating session...
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <a
                href={oauthUrl}
                className="btn btn-primary btn-block btn-lg"
                style={{ padding: '0.75rem' }}
              >
                <ShieldCheck size={16} />
                <span>Login with Discord OAuth2</span>
              </a>
            </div>

            <div
              style={{
                position: 'relative',
                margin: '1.75rem 0',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '-9px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#0d0f17',
                  padding: '0 0.75rem',
                  fontSize: '0.7rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}
              >
                Or Emergency Passkey
              </span>
            </div>

            <form onSubmit={handleSecretLogin}>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label" htmlFor="secret">
                  Admin Passkey
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    id="secret"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="form-input"
                    placeholder="Enter passkey"
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <KeyRound
                    size={15}
                    color="#64748b"
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-secondary btn-block"
                disabled={loading}
                style={{ padding: '0.7rem' }}
              >
                {loading ? 'Authenticating...' : 'Sign In with Passkey'}
              </button>
            </form>
          </>
        )}

        <div style={{ marginTop: '1.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              color: '#64748b',
            }}
          >
            <ArrowLeft size={13} />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
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
      <AdminLoginContent />
    </Suspense>
  );
}
