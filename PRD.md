# PRD.md — Discord Member Verification Platform (Simplified MVP)

**Version:** 2.0 (Strictly Simplified for Free-Tier MVP)
**Status:** Implementation-ready
**Audience:** Developers and AI coding agents implementing this system directly from this document

---

## 1. Product Overview

This system verifies Discord members — both new joiners and existing members — via Discord OAuth2 and Cloudflare Turnstile, and automatically assigns a configurable **Verified Role** upon success. 

**Cost Requirement:** Use free tiers wherever realistically possible. The MVP relies on the Discord Developer Platform, Supabase Free, Render Free, and Cloudflare Turnstile Free. No paid external service is required.

---

## 2. Final Verification Flow

The default and only verification flow must be:

1. Member initiates verification (Join / `/verify`)
2. Discord OAuth2 authentication
3. Verify Discord User ID
4. Verify that the user is actually a member of the Discord server
5. Basic Discord account-age check/signal
6. Cloudflare Turnstile validation
7. Basic rate limiting check
8. One-time verification session/token usage
9. Verification successful
10. Automatically assign Verified Role (and remove Unverified Role if configured)
11. Store verification result in Supabase
12. Create basic audit log

---

## 3. Anti-Abuse — Only Essential Checks

Keep ONLY these anti-abuse/security mechanisms. Do not expand beyond this list:

1. Discord OAuth2
2. Discord User ID validation
3. Guild membership validation
4. Basic Discord account-age signal
5. Cloudflare Turnstile
6. Basic rate limiting
7. Short-lived verification sessions
8. One-time verification tokens
9. OAuth2 state / CSRF protection
10. Duplicate verification protection
11. Basic audit logging

### 3.1 Do NOT Add

Explicitly remove or avoid these unless there is an unavoidable technical reason:
- Device fingerprinting or browser fingerprinting
- Advanced behavioral tracking
- AI fraud detection or Machine-learning risk scoring
- External IP reputation, VPN, or Tor databases
- Phone, Email, SMS, or Payment verification
- Redis, Kafka, RabbitMQ, Kubernetes, or Microservice architectures
- Separate fraud services, paid anti-bot services, or paid analytics systems
- Complex geolocation tracking
- Persistent raw IP tracking
- Unnecessary personal-data collection

### 3.2 Risk Engine

Do NOT create a complicated numerical fraud/risk engine. At most, use a very simple decision model:
- **NORMAL** → verification proceeds normally
- **SUSPICIOUS** → temporary cooldown / retry
- **BLOCKED** → verification denied

Only use obvious signals such as:
- Turnstile failure
- Excessive verification attempts
- Invalid/expired token
- Invalid OAuth state
- Account-age policy (if configured)

### 3.3 Account Age

Account age should be a configurable OPTIONAL signal, not an automatic ban.
- `minimum_account_age_enabled: true/false`
- `minimum_account_age_days: [configurable integer]`

If enabled, a Discord account younger than the configured threshold will be shown an appropriate verification restriction/cooldown. Do not permanently ban users only because their account is new.

### 3.4 Turnstile

Use Cloudflare Turnstile as the only CAPTCHA / bot-detection service using the free tier. Turnstile validation MUST happen server-side. Never trust a Turnstile token only because the browser says it passed.

### 3.5 Rate Limiting

Use simple application-level rate limiting (Supabase-backed or in-memory). Do NOT introduce Redis.
Rate-limit:
- Verification initiation
- Failed verification attempts
- OAuth initiation
- Suspicious repeated requests
Keep the limits simple and configurable.

---

## 4. Data Minimization

Only store data actually needed for verification.
**Prefer:**
- Discord User ID
- Discord username/display name (only if required for UI)
- Guild ID
- Verification status, timestamp, attempts
- Session/token metadata required for security
- Audit events

**Do NOT permanently store:**
- Precise location, device fingerprint, browser fingerprint
- Full browsing history or unnecessary IP history
- Unnecessary personal information
*(If IP information is technically needed for rate limiting/security, minimize retention and document it clearly by hashing it).*

---

## 5. Free-Tier Architecture

Use a simple architecture rather than multiple services. Avoid adding paid infrastructure.

**Preferred Architecture:**
```text
Discord
   │
   ▼
Discord Bot
   │
   ▼
Render Web Service (Free Tier)
   ├── Verification Website (Express/Next.js/etc)
   ├── Backend API
   └── Bot process
            │
            ▼
        Supabase (Free Tier Database)
```

### 5.1 Render
Account for Render Free limitations:
- Must include a `/health` endpoint.
- Graceful startup and shutdown.
- Bot reconnect logic (standard Discord.js behavior).
- Cold-start handling.
- Basic external uptime ping if desired.
*IMPORTANT: Do NOT claim that an uptime ping guarantees permanent uptime.*

### 5.2 Supabase
Keep the database schema minimal. Do not create tables unless they serve a clear purpose.
Minimum useful data model:
- Guild configuration
- Members/Users
- Verification sessions
- Verification records/attempts
- Audit logs
Combine tables where appropriate if it keeps the architecture simpler without harming security or maintainability.

---

## 6. Verification States

Keep verification states simple. Recommended:
- `PENDING`
- `IN_PROGRESS`
- `VERIFIED`
- `FAILED`
- `EXPIRED`
- `REVOKED`
Do not introduce unnecessary state complexity.

---

## 7. Member Flows

### 7.1 New Member Flow
1. Member joins server
2. Bot detects member
3. Unverified role applied (if configured)
4. Verification instructions provided (via DM or Channel)
5. Member opens verification page
6. Discord OAuth2 -> Turnstile -> Basic checks
7. Verification succeeds
8. Verified role assigned (Unverified role removed)
9. Supabase updated
10. Audit log created

### 7.2 Existing Member Flow
1. Existing member runs `/verify` or clicks verification button/link
2. Discord OAuth2 -> Turnstile -> Basic checks -> Check existing verification state
3. **If already verified:** Show "Already Verified"
4. **Otherwise:** Assign Verified Role -> Record verification -> Show success

---

## 8. Role Assignment

Role assignment must be safe and idempotent. The bot must handle:
- Missing role / Deleted role
- Bot lacking `Manage Roles` permission
- Bot role hierarchy too low (must not crash, should log or warn)
- Discord API failure
- Member leaving the server mid-verification
- Bot restart

Do not incorrectly show "Verified" in the UI if the role cannot actually be assigned in Discord, unless a clearly defined reconciliation mechanism handles the temporary mismatch.

---

## 9. Admin Features

Keep admin functionality focused. Do NOT create enterprise-level admin tooling.
**Required:**
- Admin Dashboard
- Member search / Verification status
- Verification logs
- Role & Channel configuration
- Verification settings (Account age, etc.)
- Basic bot health
- Revoke verification
- Force re-verification

---

## 10. Security

Keep essential security only:
- OAuth2 state validation (CSRF protection)
- Secure sessions (HTTP-only secure cookies where appropriate)
- Token expiry & one-time tokens
- Server-side Turnstile validation
- Rate limiting & authorization checks
- Secret management (Env vars)
- Input validation
- Supabase RLS where appropriate
- Audit logs
Do not expand the security section with unnecessary surveillance or infrastructure.

---

## 11. MVP Scope

The MVP is strictly defined as:
- Discord bot
- Discord OAuth2
- Turnstile
- Supabase
- Automatic verified role & unverified role
- New-member & Existing-member verification
- Basic admin dashboard & Basic configuration
- Verification logs & Basic audit logs
- Basic rate limiting
- Render deployment & Health monitoring

Everything else should be marked: **"POST-MVP / NOT REQUIRED FOR INITIAL VERSION"**

---

## 12. PRD Quality Rule

Whenever deciding whether to add a feature, ask:
**"Does this provide a meaningful benefit to Discord member verification that cannot be achieved more simply?"**

If **NO**: DO NOT ADD IT.

The final system should be: secure, simple, free-tier friendly, maintainable, fast, production-oriented, and easy for an AI coding agent to implement. Do NOT over-engineer the project.
