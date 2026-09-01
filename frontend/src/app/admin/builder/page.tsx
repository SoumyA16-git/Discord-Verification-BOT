'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAdminConfig, updateAdminConfig, getGuildDiscordData, sendVerificationEmbed } from '@/lib/api';
import { Paintbrush, Send, CheckCircle2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';

function EmbedBuilderContent() {
  const searchParams = useSearchParams();
  const guildIdParam = searchParams.get('guildId') || '';

  const [title, setTitle] = useState('Member Verification Required');
  const [description, setDescription] = useState(
    'Welcome to the server! To prevent spam and access all channels, please complete verification with your Discord account.\n\nClick the button below to verify.'
  );
  const [color, setColor] = useState('#5865F2');
  const [buttonLabel, setButtonLabel] = useState('Verify with Discord');
  const [footer, setFooter] = useState('Powered by Discord Verification Platform • Safe & Tamper-Proof');
  const [selectedChannelId, setSelectedChannelId] = useState('');

  const [discordData, setDiscordData] = useState<any>({ hasBot: false, channels: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const presetColors = [
    { name: 'Blurple', hex: '#5865F2' },
    { name: 'Emerald', hex: '#10B981' },
    { name: 'Violet', hex: '#8B5CF6' },
    { name: 'Cyan', hex: '#06B6D4' },
    { name: 'Ruby', hex: '#F43F5E' },
    { name: 'Amber', hex: '#F59E0B' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_token') || '' : '';
      try {
        const configRes = await getAdminConfig(token, guildIdParam || undefined);
        if (configRes.config) {
          if (configRes.config.verification_message) {
            setDescription(configRes.config.verification_message);
          }
          if (configRes.config.verification_channel_id) {
            setSelectedChannelId(configRes.config.verification_channel_id);
          }
        }

        const activeGuildId = guildIdParam || configRes.guild?.id;
        if (activeGuildId) {
          const dData = await getGuildDiscordData(token, activeGuildId);
          if (dData.channels) {
            setDiscordData(dData);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guildIdParam]);

  const handleSaveAndDispatch = async () => {
    if (!selectedChannelId) {
      setFeedbackMsg({ type: 'error', text: 'Please select a Discord text channel first.' });
      return;
    }

    setDispatching(true);
    setFeedbackMsg(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_token') || '' : '';

    try {
      // 1. Save config with new message & channel
      await updateAdminConfig(
        token,
        {
          verification_message: description,
          verification_channel_id: selectedChannelId,
        },
        guildIdParam || undefined
      );

      // 2. Dispatch embed directly to channel
      const res = await sendVerificationEmbed(token, guildIdParam || 'active');
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message || 'Verification embed dispatched to Discord channel!' });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error?.message || 'Failed to dispatch embed.' });
      }
    } catch {
      setFeedbackMsg({ type: 'error', text: 'An unexpected error occurred while communicating with Discord.' });
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return (
      <div className="center-container">
        <div className="card">
          <div className="spinner"></div>
          <p>Loading Message Builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <Paintbrush size={22} color="var(--discord-blurple)" />
            <h1 style={{ margin: 0 }}>Visual Embed Builder</h1>
          </div>
          <p style={{ marginBottom: 0 }}>
            Customize the verification card and button that members see inside your Discord server.
          </p>
        </div>

        <button
          onClick={handleSaveAndDispatch}
          disabled={dispatching || !discordData.hasBot}
          className="btn btn-primary btn-lg"
          style={{ padding: '0.75rem 1.75rem' }}
        >
          <Send size={16} />
          <span>{dispatching ? 'Dispatching to Discord...' : 'Dispatch Embed to Channel'}</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className={`alert ${feedbackMsg.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {feedbackMsg.text}
        </div>
      )}

      {/* Two-Column Workspace: Controls (Left) vs Discord 1:1 Live Preview (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '2rem' }}>
        {/* Left: Customizer Controls */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Embed Parameters</h2>

          <div className="form-group">
            <label className="form-label">Target Discord Channel</label>
            {discordData.channels.length > 0 ? (
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="form-select"
              >
                <option value="">-- Choose Channel --</option>
                {discordData.channels.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Channel Snowflake ID"
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="form-input"
              />
            )}
            <div className="form-help">Where the bot will post this verification card.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Card Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              placeholder="Card header title"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Verification Instructions</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              placeholder="Instructions displayed to new users"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Accent Border Color</label>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {presetColors.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: color === c.hex ? `2px solid ${c.hex}` : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.4rem 0.75rem',
                    cursor: 'pointer',
                    color: '#fff',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.hex }} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="form-input font-mono"
              placeholder="#5865F2"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Button Text</label>
            <input
              type="text"
              value={buttonLabel}
              onChange={(e) => setButtonLabel(e.target.value)}
              className="form-input"
              placeholder="Verify with Discord"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Footer Note</label>
            <input
              type="text"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              className="form-input"
              placeholder="Footer text"
            />
          </div>
        </div>

        {/* Right: Live Discord 1:1 Preview */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              LIVE DISCORD PREVIEW
            </span>
          </div>

          {/* Discord Dark Theme Chat Mockup */}
          <div
            style={{
              background: '#313338',
              borderRadius: 'var(--radius-md)',
              padding: '1.75rem',
              color: '#dbdee1',
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.8)',
            }}
          >
            {/* Discord Bot Message Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
              {discordData?.bot?.avatar ? (
                <img
                  src={discordData.bot.avatar}
                  alt={discordData.bot.displayName || 'Bot'}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--discord-blurple)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, color: '#f2f3f5', fontSize: '0.95rem' }}>
                    {discordData?.bot?.displayName || discordData?.bot?.username || '911 - Verification BOT'}
                  </span>
                  <span
                    style={{
                      background: '#5865f2',
                      color: '#fff',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.35rem',
                      borderRadius: '3px',
                      textTransform: 'uppercase',
                    }}
                  >
                    BOT
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#949ba4' }}>Today at 8:30 PM</span>
                </div>

                {/* Discord Embed Container */}
                <div
                  style={{
                    background: '#2b2d31',
                    borderLeft: `4px solid ${color}`,
                    borderRadius: '4px',
                    padding: '1rem 1.25rem',
                    maxWidth: '520px',
                    marginTop: '0.5rem',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f2f3f5', marginBottom: '0.5rem' }}>
                    {title}
                  </div>

                  <div
                    style={{
                      fontSize: '0.88rem',
                      color: '#dbdee1',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      marginBottom: '1rem',
                    }}
                  >
                    {description}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#949ba4', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ShieldCheck size={12} />
                    <span>{footer}</span>
                  </div>
                </div>

                {/* Discord Action Button Mockup */}
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    style={{
                      background: '#4e5058',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.5rem 1rem',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'default',
                    }}
                  >
                    <Sparkles size={14} color="#85c0f9" />
                    <span>{buttonLabel}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmbedBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="center-container">
          <div className="card">
            <div className="spinner"></div>
            <p>Loading Embed Builder...</p>
          </div>
        </div>
      }
    >
      <EmbedBuilderContent />
    </Suspense>
  );
}
