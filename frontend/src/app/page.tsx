'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBotInviteUrl } from '@/lib/discord';
import {
  ShieldCheck,
  Zap,
  Lock,
  Server,
  Layers,
  Activity,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  ExternalLink,
  Shield,
  Key,
} from 'lucide-react';

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [inviteUrl, setInviteUrl] = useState('');

  useEffect(() => {
    setInviteUrl(getBotInviteUrl());
  }, []);

  const faqs = [
    {
      q: 'How does automated verification protect against raids and alt accounts?',
      a: 'When new members join your server, they are isolated in a restricted verification channel until they complete Discord OAuth2 authentication. Automated raid scripts and malicious alt accounts cannot solve web OAuth challenges, keeping your member channels completely safe.',
    },
    {
      q: 'Do members need to register an external password or account?',
      a: 'No passwords or external account signups are required. Members simply authenticate once via Discord OAuth2 directly, and the bot automatically updates their server permissions in under 0.4 seconds.',
    },
    {
      q: 'How does the bot assign and revoke roles atomically?',
      a: 'Our backend verification engine executes atomic role modification calls to the Discord Gateway, simultaneously granting the Verified Role and removing the Unverified Role within a single transaction.',
    },
    {
      q: 'Can I manage multiple Discord servers under one dashboard?',
      a: 'Yes. The Server Hub automatically detects all Discord servers where you have Administrator or Manage Server permissions, allowing you to configure independent verification policies per server.',
    },
  ];

  return (
    <div style={{ backgroundColor: 'var(--bg-pitch)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      {/* Sticky Glassmorphic Navbar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'rgba(8, 9, 13, 0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--discord-blurple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>
              911 - Verification BOT
            </span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <a href="#features" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Features
            </a>
            <a href="#pipeline" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Pipeline
            </a>
            <a href="#faq" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              FAQ
            </a>
            <Link href="/admin/login" className="btn btn-secondary btn-sm">
              Admin Portal
            </Link>
            <a
              href={inviteUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
            >
              <span>Add to Discord</span>
              <ExternalLink size={12} />
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          paddingTop: '5rem',
          paddingBottom: '4rem',
          maxWidth: '1200px',
          margin: '0 auto',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          textAlign: 'center',
        }}
      >
        {/* Subtle Announcement Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'var(--discord-blurple-subtle)',
            border: '1px solid rgba(88, 101, 242, 0.25)',
            borderRadius: 'var(--radius-full)',
            padding: '0.25rem 0.85rem',
            fontSize: '0.78rem',
            fontWeight: 500,
            color: '#c7d2fe',
            marginBottom: '1.5rem',
          }}
        >
          <span>Automated Member Gate</span>
          <span style={{ opacity: 0.5 }}>&bull;</span>
          <span style={{ color: '#a5b4fc' }}>OAuth2 Architecture</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.2rem, 4.5vw, 3.75rem)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1.15,
            marginBottom: '1.25rem',
            maxWidth: '850px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Secure Discord Verification,{' '}
          <span style={{ color: 'var(--discord-blurple)' }}>Automated.</span>
        </h1>

        <p
          style={{
            fontSize: '1.05rem',
            color: 'var(--text-secondary)',
            maxWidth: '620px',
            margin: '0 auto 2.5rem auto',
            lineHeight: 1.6,
          }}
        >
          Authenticate members via Discord OAuth2, assign roles in 0.4s, and eliminate raids,
          alts, and bots with cryptographic session security.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '4rem',
          }}
        >
          <a
            href={inviteUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-lg"
          >
            <span>Invite Bot to Server</span>
            <ExternalLink size={14} />
          </a>
          <Link href="/admin/login" className="btn btn-secondary btn-lg">
            <span>Admin Dashboard</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Interactive Pipeline Section */}
        <div id="pipeline" style={{ scrollMarginTop: '80px' }}>
          <div
            className="card"
            style={{
              maxWidth: '900px',
              margin: '0 auto',
              textAlign: 'left',
              padding: '2rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={16} color="var(--status-green)" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Verification Pipeline</span>
              </div>
              <span className="badge badge-verified">Average Execution: 380ms</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.25rem',
              }}
            >
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  01 / INGRESS
                </div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>Member Joins</h3>
                <p style={{ fontSize: '0.82rem', marginBottom: 0 }}>
                  Guest is held in verification channel until web authentication is verified.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--discord-blurple-subtle)',
                  border: '1px solid rgba(88, 101, 242, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--discord-blurple)', marginBottom: '0.35rem' }}>
                  02 / VALIDATION
                </div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>OAuth2 Handshake</h3>
                <p style={{ fontSize: '0.82rem', marginBottom: 0 }}>
                  Single-use HMAC signed tokens exchange Discord identity safely.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--status-green-subtle)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--status-green)', marginBottom: '0.35rem' }}>
                  03 / DISPATCH
                </div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>Atomic Role Grant</h3>
                <p style={{ fontSize: '0.82rem', marginBottom: 0 }}>
                  Verified role is assigned and access unlocked in sub-second latency.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section
        id="features"
        style={{
          padding: '4rem 1.5rem',
          maxWidth: '1200px',
          margin: '0 auto',
          scrollMarginTop: '60px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Core Security Architecture</h2>
          <p style={{ fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto' }}>
            Built for enterprise stability and high-traffic communities.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <div className="card">
            <Zap size={20} color="var(--discord-blurple)" style={{ marginBottom: '0.85rem' }} />
            <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>Atomic Role Transactions</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
              Assigns verified roles and removes unverified guest roles simultaneously to prevent role desynchronization.
            </p>
          </div>

          <div className="card">
            <Key size={20} color="var(--status-green)" style={{ marginBottom: '0.85rem' }} />
            <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>HMAC Cryptographic Tokens</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
              Verification sessions utilize SHA-256 HMAC signed state tokens to eliminate replay and hijacking attacks.
            </p>
          </div>

          <div className="card">
            <SlidersHorizontal size={20} color="#a855f7" style={{ marginBottom: '0.85rem' }} />
            <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>Visual Embed Customizer</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
              Configure Discord verification embeds with custom descriptions and colors with a 1:1 live preview.
            </p>
          </div>

          <div className="card">
            <Server size={20} color="#06b6d4" style={{ marginBottom: '0.85rem' }} />
            <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>Multi-Server Control Hub</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
              Manage multiple Discord servers from a unified dashboard with live role hierarchy diagnostics.
            </p>
          </div>

          <div className="card">
            <Shield size={20} color="var(--status-yellow)" style={{ marginBottom: '0.85rem' }} />
            <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>Adaptive Rate Limiting</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
              Customizable attempt quotas and sliding time windows protect against coordinated raid surges.
            </p>
          </div>

          <div className="card">
            <Layers size={20} color="#f43f5e" style={{ marginBottom: '0.85rem' }} />
            <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>Supabase PostgreSQL Storage</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
              Full audit logs, session telemetry, and verification histories stored with Row Level Security.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section
        id="faq"
        style={{
          padding: '4rem 1.5rem',
          maxWidth: '750px',
          margin: '0 auto',
          scrollMarginTop: '60px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Frequently Asked Questions</h2>
          <p style={{ fontSize: '0.95rem' }}>Technical details on verification mechanics and setup.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div
                key={index}
                className="card"
                style={{ padding: '1rem 1.25rem', cursor: 'pointer' }}
                onClick={() => setActiveFaq(isOpen ? null : index)}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                  }}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease',
                      color: 'var(--text-muted)',
                    }}
                  />
                </div>
                {isOpen && (
                  <p style={{ marginTop: '0.65rem', marginBottom: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Compact Clean Footer (No Excess Scroll) */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '2.5rem 1.5rem',
          backgroundColor: '#06070a',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} color="var(--discord-blurple)" />
            <span>&copy; {new Date().getFullYear()} 911 - Verification BOT. Built for Discord servers.</span>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/admin/login" style={{ color: 'var(--text-secondary)' }}>
              Admin Login
            </Link>
            <a
              href={inviteUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-secondary)' }}
            >
              Add to Discord
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
