'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getAdminConfig,
  updateAdminConfig,
  testAdminConfig,
  autoSetupAdminConfig,
  getGuildDiscordData,
  sendVerificationEmbed,
} from '@/lib/api';
import { ShieldAlert, CheckCircle2, XCircle, Send, RefreshCw, Sparkles } from 'lucide-react';

function ConfigContent() {
  const searchParams = useSearchParams();
  const guildIdParam = searchParams.get('guildId') || '';

  const [config, setConfig] = useState<any>({
    verification_enabled: false,
    verified_role_id: '',
    unverified_role_id: '',
    verification_channel_id: '',
    log_channel_id: '',
    verification_message: '',
    session_expiration_minutes: 15,
    rate_limit_attempts: 5,
    rate_limit_window_minutes: 10,
    minimum_account_age_enabled: false,
    minimum_account_age_days: 7,
  });

  const [discordData, setDiscordData] = useState<{
    hasBot: boolean;
    roles: Array<{ id: string; name: string; color: string; position: number; isBelowBot: boolean }>;
    channels: Array<{ id: string; name: string; position: number }>;
  }>({
    hasBot: false,
    roles: [],
    channels: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState<string | null>(null);

  const fetchConfigAndDiscordData = async () => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_token') || '' : '';
    try {
      const res = await getAdminConfig(token, guildIdParam || undefined);
      if (res.config) {
        setConfig(res.config);
      }

      const activeGuildId = guildIdParam || res.guild?.id;
      if (activeGuildId) {
        const dData = await getGuildDiscordData(token, activeGuildId);
        if (dData.roles) {
          setDiscordData(dData);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigAndDiscordData();
  }, [guildIdParam]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_token') || '' : '';
    try {
      const res = await updateAdminConfig(token, config, guildIdParam || undefined);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(res.error?.message || 'Failed to save configuration.');
      }
    } catch {
      alert('Error updating configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_token') || '' : '';
    try {
      const res = await testAdminConfig(token, guildIdParam || undefined);
      setTestResult(res);
    } catch {
      setTestResult({ valid: false, errors: ['Failed to contact backend service.'] });
    } finally {
      setTesting(false);
    }
  };

  const handleAutoSetup = async () => {
    setSaving(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_token') || '' : '';
    try {
      const res = await autoSetupAdminConfig(token, guildIdParam || config.guild_id);
      if (res.success && res.config) {
        setConfig(res.config);
        
        if (res.result?.warning) {
          alert(`Auto-provisioning completed with a warning:\n\n${res.result.warning}`);
        } else {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 4000);
        }

        await fetchConfigAndDiscordData();
      } else {
        alert(res.error?.message || 'Failed to auto-provision roles.');
      }
    } catch {
      alert('Error running automatic role setup.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmbed = async () => {
    if (!config.verification_channel_id) {
      alert('Please select and save a Verification Channel first!');
      return;
    }

    setDispatching(true);
    setDispatchMsg(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('dverif_admin_token') || '' : '';
    try {
      const res = await sendVerificationEmbed(token, guildIdParam || config.guild_id);
      if (res.success) {
        setDispatchMsg(res.message || 'Verification message successfully sent to channel!');
        setTimeout(() => setDispatchMsg(null), 5000);
      } else {
        alert(res.error?.message || 'Failed to send embed.');
      }
    } catch {
      alert('Error sending verification embed to Discord channel.');
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div className="card" style={{ maxWidth: '360px', width: '100%', textAlign: 'center' }}>
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Syncing Discord roles and channels...</p>
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
          <h1>Server Configuration</h1>
          <p style={{ marginBottom: 0 }}>
            Configure verified roles, channel bindings, and customize prompt messages.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleAutoSetup}
            disabled={saving || !discordData.hasBot}
            className="btn btn-secondary"
          >
            <Sparkles size={16} color="var(--discord-blurple)" />
            <span>{saving ? 'Auto-Provisioning...' : '1-Click Auto-Setup Roles & Channel'}</span>
          </button>
          <button onClick={handleSendEmbed} disabled={dispatching || !discordData.hasBot} className="btn btn-primary">
            <Send size={16} /> {dispatching ? 'Sending...' : 'Send Verification Embed'}
          </button>
          <button onClick={handleTest} disabled={testing} className="btn btn-secondary">
            <ShieldAlert size={16} /> {testing ? 'Testing...' : 'Run Diagnostics'}
          </button>
        </div>
      </div>

      {dispatchMsg && <div className="alert alert-success">{dispatchMsg}</div>}

      {!discordData.hasBot && (
        <div className="alert alert-info">
          <strong>Bot is not in this server yet:</strong> Role and channel dropdowns will be available as soon as you invite the bot.
        </div>
      )}

      {testResult && (
        <div
          className={`alert ${testResult.valid ? 'alert-success' : 'alert-danger'}`}
          style={{ flexDirection: 'column', alignItems: 'flex-start', marginBottom: '2rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            {testResult.valid ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {testResult.valid ? 'All Permission & Role Hierarchy Checks Passed!' : 'Configuration Diagnostics Warning:'}
          </div>
          {!testResult.valid && testResult.errors && (
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
              {testResult.errors.map((e: string, i: number) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {saveSuccess && <div className="alert alert-success">Configuration saved successfully!</div>}

      <div className="card card-wide">
        <form onSubmit={handleSave}>
          <div
            className="form-group"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'var(--bg-tertiary)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <input
              type="checkbox"
              id="verification_enabled"
              checked={!!config.verification_enabled}
              onChange={(e) => setConfig({ ...config, verification_enabled: e.target.checked })}
              style={{ width: '20px', height: '20px', accentColor: 'var(--discord-blurple)' }}
            />
            <div>
              <label htmlFor="verification_enabled" style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}>
                Enable Verification Gate
              </label>
              <div className="form-help">Master switch. When enabled, new members will be prompted to verify via OAuth2.</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {/* Verified Role Dropdown */}
            <div className="form-group">
              <label className="form-label" htmlFor="verified_role_id">
                Verified Role
              </label>
              {discordData.roles.length > 0 ? (
                <select
                  id="verified_role_id"
                  value={config.verified_role_id || ''}
                  onChange={(e) => setConfig({ ...config, verified_role_id: e.target.value })}
                  className="form-select"
                >
                  <option value="">-- Select Verified Role --</option>
                  {discordData.roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name} {!r.isBelowBot ? '⚠️ (Higher than Bot)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="verified_role_id"
                  value={config.verified_role_id || ''}
                  onChange={(e) => setConfig({ ...config, verified_role_id: e.target.value })}
                  className="form-input"
                  placeholder="Role Snowflake ID (e.g. 123456789012345678)"
                />
              )}
              <div className="form-help">Role granted to members upon passing verification.</div>
            </div>

            {/* Unverified Role Dropdown */}
            <div className="form-group">
              <label className="form-label" htmlFor="unverified_role_id">
                Unverified Role (Optional)
              </label>
              {discordData.roles.length > 0 ? (
                <select
                  id="unverified_role_id"
                  value={config.unverified_role_id || ''}
                  onChange={(e) => setConfig({ ...config, unverified_role_id: e.target.value })}
                  className="form-select"
                >
                  <option value="">-- None (No unverified role) --</option>
                  {discordData.roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="unverified_role_id"
                  value={config.unverified_role_id || ''}
                  onChange={(e) => setConfig({ ...config, unverified_role_id: e.target.value })}
                  className="form-input"
                  placeholder="Role Snowflake ID (Optional)"
                />
              )}
              <div className="form-help">Optional role stripped from members when they verify.</div>
            </div>

            {/* Verification Channel Dropdown */}
            <div className="form-group">
              <label className="form-label" htmlFor="verification_channel_id">
                Verification Channel
              </label>
              {discordData.channels.length > 0 ? (
                <select
                  id="verification_channel_id"
                  value={config.verification_channel_id || ''}
                  onChange={(e) => setConfig({ ...config, verification_channel_id: e.target.value })}
                  className="form-select"
                >
                  <option value="">-- Select Channel --</option>
                  {discordData.channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="verification_channel_id"
                  value={config.verification_channel_id || ''}
                  onChange={(e) => setConfig({ ...config, verification_channel_id: e.target.value })}
                  className="form-input"
                  placeholder="Channel Snowflake ID"
                />
              )}
              <div className="form-help">Channel where verification embed/button is displayed.</div>
            </div>

            {/* Log Channel Dropdown */}
            <div className="form-group">
              <label className="form-label" htmlFor="log_channel_id">
                Audit Log Channel (Optional)
              </label>
              {discordData.channels.length > 0 ? (
                <select
                  id="log_channel_id"
                  value={config.log_channel_id || ''}
                  onChange={(e) => setConfig({ ...config, log_channel_id: e.target.value })}
                  className="form-select"
                >
                  <option value="">-- None (Log in dashboard only) --</option>
                  {discordData.channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="log_channel_id"
                  value={config.log_channel_id || ''}
                  onChange={(e) => setConfig({ ...config, log_channel_id: e.target.value })}
                  className="form-input"
                  placeholder="Log Channel Snowflake ID"
                />
              )}
              <div className="form-help">Discord channel where verification events and alerts are posted.</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="verification_message">
              Custom Verification Embed Prompt Message
            </label>
            <textarea
              id="verification_message"
              value={config.verification_message || ''}
              onChange={(e) => setConfig({ ...config, verification_message: e.target.value })}
              className="form-textarea"
              rows={3}
              placeholder="Welcome! To access all channels, click the button below to verify your account."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="session_expiration_minutes">
                Session TTL (Minutes)
              </label>
              <input
                type="number"
                id="session_expiration_minutes"
                value={config.session_expiration_minutes || 15}
                onChange={(e) => setConfig({ ...config, session_expiration_minutes: parseInt(e.target.value) || 15 })}
                className="form-input"
                min={1}
                max={1440}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="rate_limit_attempts">
                Max Attempts per Window
              </label>
              <input
                type="number"
                id="rate_limit_attempts"
                value={config.rate_limit_attempts || 5}
                onChange={(e) => setConfig({ ...config, rate_limit_attempts: parseInt(e.target.value) || 5 })}
                className="form-input"
                min={1}
                max={50}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="rate_limit_window_minutes">
                Rate Limit Window (Minutes)
              </label>
              <input
                type="number"
                id="rate_limit_window_minutes"
                value={config.rate_limit_window_minutes || ''}
                onChange={(e) => setConfig({ ...config, rate_limit_window_minutes: parseInt(e.target.value) || 10 })}
                className="form-input"
                min="1"
              />
              <div className="form-help">Time window in minutes (e.g. 10).</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>Anti-Abuse Settings</h3>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                id="minimum_account_age_enabled"
                checked={!!config.minimum_account_age_enabled}
                onChange={(e) => setConfig({ ...config, minimum_account_age_enabled: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: 'var(--discord-blurple)' }}
              />
              <div>
                <label htmlFor="minimum_account_age_enabled" style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}>
                  Require Minimum Discord Account Age
                </label>
                <div className="form-help">If enabled, new Discord accounts will be blocked from verifying.</div>
              </div>
            </div>

            {config.minimum_account_age_enabled && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label" htmlFor="minimum_account_age_days">
                  Minimum Account Age (Days)
                </label>
                <input
                  type="number"
                  id="minimum_account_age_days"
                  value={config.minimum_account_age_days || ''}
                  onChange={(e) => setConfig({ ...config, minimum_account_age_days: parseInt(e.target.value) || 7 })}
                  className="form-input"
                  min="0"
                  style={{ maxWidth: '200px' }}
                />
                <div className="form-help">Accounts younger than this many days will be rejected.</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ConfigPage() {
  return (
    <Suspense
      fallback={
        <div className="center-container">
          <div className="card">
            <div className="spinner"></div>
            <p>Loading server configuration...</p>
          </div>
        </div>
      }
    >
      <ConfigContent />
    </Suspense>
  );
}
