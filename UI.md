You are a senior product designer and frontend architect.

I am building a complete **Discord Verification Bot platform** with a web dashboard. I want you to design the **entire frontend/UI experience** for the bot — not just a basic dashboard.

Use the following websites as the PRIMARY visual and component inspiration:

- https://ui.aceternity.com/
- https://reactbits.dev/
- https://animate-ui.com/
- https://www.untitledui.com/react

I have also provided screenshots of these websites. Study their visual language, layouts, component patterns, animations, spacing, typography, cards, navigation, buttons, backgrounds, grids, hover effects, transitions, dashboards, and micro-interactions.

IMPORTANT:
Do NOT simply copy any website.
Use them as inspiration and create an original visual system specifically for a premium Discord verification platform.

==================================================
CORE DESIGN DIRECTION
==================================================

Create a **premium, modern, dark-first SaaS interface**.

The visual quality should feel comparable to high-end products such as:

- Linear
- Vercel
- Raycast
- Discord
- Aceternity UI
- React Bits
- Animate UI
- Untitled UI

The interface should feel:

- futuristic
- premium
- minimal
- technical
- polished
- highly responsive
- elegant
- slightly cinematic
- visually impressive without becoming cluttered

Use a deep dark background as the foundation.

Preferred visual characteristics:

- near-black / charcoal background (`#08090d` / `#0f1117`)
- subtle gradients
- subtle purple/blue accent lighting (`#5865F2` / `#6366f1`)
- glass/blur effects where appropriate
- thin borders (`rgba(255, 255, 255, 0.08)`)
- soft shadows
- sophisticated cards
- subtle background grids
- animated glow effects
- smooth hover interactions
- elegant typography
- restrained use of color
- high information density without feeling crowded

Avoid:

- generic Bootstrap dashboard appearance
- excessive rounded cards everywhere
- huge unnecessary gradients
- childish Discord-style UI
- excessive neon
- overly bright backgrounds
- clutter
- outdated admin-panel aesthetics

==================================================
PRODUCT
==================================================

The product is a Discord Verification Platform.

It handles:

- New member verification
- Existing member verification
- Discord OAuth2 authentication
- Automatic Verified Role assignment
- Unverified role management
- Verification sessions
- Verification history
- Verification attempts
- Audit logging
- Discord server configuration
- Bot configuration
- Admin dashboard
- System health
- Statistics
- Security monitoring

Backend:

- Discord Bot
- Discord OAuth2
- Supabase PostgreSQL
- Render hosting

The frontend must be designed around this actual product.

==================================================
FRONTEND SHOULD INCLUDE THE ENTIRE PRODUCT
==================================================

Do NOT design only one dashboard screen.

Create the full frontend information architecture.

Include:

1. Marketing/Landing Page
2. Authentication
3. Dashboard
4. Verification Overview
5. Members
6. Member Details
7. Verification Sessions
8. Verification Attempts
9. Verification Logs
10. Audit Logs
11. Discord Server Management
12. Roles Configuration
13. Verification Configuration
14. Verification Page Builder / Message Configuration
15. Bot Configuration
16. Admin Management
17. Security
18. Analytics
19. System Health
20. API / Developer Settings
21. Account Settings
22. Notifications
23. Help / Documentation
24. Error / Empty / Loading states
25. Mobile-responsive layouts

==================================================
1. MARKETING / LANDING PAGE
==================================================

Design a premium landing page inspired by Aceternity UI / React Bits style.

Hero section should communicate:

"Secure Discord Verification, Automated."

Possible supporting message:

"Verify every member, assign roles automatically, and keep your Discord server protected."

Include:

- primary CTA
- secondary CTA
- animated visual
- verification flow visualization
- Discord/server mockup
- live dashboard preview

Create visually impressive sections such as:

- How verification works
- Features
- Security
- Analytics
- Discord integration
- Supabase architecture
- Reliability
- Admin dashboard preview
- Testimonials/social proof style section
- FAQ
- CTA footer

Use sophisticated animations.

==================================================
2. AUTHENTICATION
==================================================

Design:

- Login
- Discord OAuth login
- Loading state
- OAuth redirect state
- Authentication failure
- Session expired
- Unauthorized
- Logout confirmation

The login experience should look premium and minimal.

==================================================
3. MAIN APPLICATION SHELL
==================================================

Create a persistent application layout.

Desktop:

LEFT SIDEBAR
TOPBAR
MAIN CONTENT

Sidebar should contain logical groups.

Example:

OVERVIEW
Dashboard
My Servers

VERIFICATION
Verification
Members
Sessions
Attempts
Logs

DISCORD
Server
Roles
Channels
Bot
Embed Builder

ANALYTICS
Analytics
Security

SYSTEM
Health
API
Settings

Sidebar should be elegant and compact.

Include:

- server selector
- bot status
- account avatar
- collapse/expand sidebar
- command/search palette
- notifications
- theme control if appropriate

==================================================
4. DASHBOARD
==================================================

Design a sophisticated dashboard.

Top:

"Good evening, Admin"

Server selector

Bot status:
● Operational

Stats cards:

Total Members
Verified
Pending
Failed Attempts
Verification Rate

Add animated/statistical visualizations.

Charts:

- Verification activity
- Successful vs failed
- New members
- Verification attempts
- 7 / 30 / 90 day filters

Recent verification activity table.

Example:

User | Discord ID | Status | Attempt | Verified | Time

Create visual status indicators.

Include a "Verification Health" widget.

==================================================
5. MEMBER MANAGEMENT
==================================================

Create a powerful member management page.

Features:

- Search
- Filter
- Sort
- Pagination
- Status filter
- Verified date
- Attempts
- Discord ID
- Username

Table should feel premium and dense.

Clicking a member opens a detailed member view.

Member page:

- avatar
- username
- Discord ID
- account created date
- server joined date
- verification status
- verified time
- attempt history
- assigned roles
- audit history

Actions:

Verify
Revoke
Re-verify
View logs

Use confirmation dialogs for destructive actions.

==================================================
6. VERIFICATION PAGE & ANIMATED EXPERIENCE
==================================================

Design the actual user-facing verification experience.
This is NOT the admin dashboard.

The verification experience MUST NOT feel like a generic website loader or basic spinner.
Create a professional, clean, premium step-by-step verification animation similar in spirit to polished modern SaaS/product onboarding animations.

--------------------------------------------------
VERIFICATION PROGRESS ANIMATION
--------------------------------------------------

When a member starts verification, show a central verification progress interface.
Each verification check appears ONE AFTER ANOTHER:

1. Discord Identity
2. Server Membership
3. Account Check
4. Turnstile / Anti-Bot
5. Verification
6. Role Assignment

The animation sequence behaves as follows:

STEP 1:
→ A check item smoothly enters the interface
→ Its icon rotates/spins subtly into position
→ It performs its check
→ Loading indicator / motion is shown
→ Checkmark appears
→ Item settles into its final position

STEP 2:
→ After Step 1 completes, the next item smoothly enters
→ The icon rotates/spins into position
→ Check executes
→ Checkmark appears
→ Item settles

STEP 3:
→ Same pattern continues until every required verification step is complete.

--------------------------------------------------
ANIMATION STYLE & CHOREOGRAPHY
--------------------------------------------------

Core Concept: "one object arrives → rotates naturally → locks into place → completes → next object arrives"
NOT: "everything is visible immediately and random CSS animations happen everywhere"

Animations should be:
- smooth, clean, subtle, premium, precise
- fast enough to feel responsive, slow enough to clearly communicate progress
- professional and satisfying

Avoid:
- childish bouncing
- excessive elastic movement
- huge scaling
- excessive particles
- rainbow effects
- flashy neon
- distracting transitions
- generic spinning loader
- constant motion everywhere

--------------------------------------------------
STEP ENTRANCE ANIMATION
--------------------------------------------------

Initial State:
- `opacity: 0`
- slight vertical offset (`translateY: +8px` to `+12px`)
- slight blur (`filter: blur(4px)`)
- slight scale reduction (`scale: 0.98`)

Transition:
- `opacity → 1`
- `translateY → 0`
- `filter: blur(0)`
- `scale → 1`

Combine this with subtle rotational motion on the icon:
- `0ms`: icon starts slightly rotated (`rotate: -20deg`)
- `150ms`: icon rotates toward correct orientation
- `300ms`: item settles into resting position

--------------------------------------------------
STEP VERIFICATION ANIMATION
--------------------------------------------------

Three clear states per step:
1. `LOADING`: Active checking animation / subtle harmonic pulse
2. `SUCCESS`: Loading icon slows → transforms → checkmark draws in (SVG stroke animation) → subtle radial glow → resting state
3. `FAILED`: Active icon changes to error → restrained horizontal micro-reaction → explanation text fades in

--------------------------------------------------
SEQUENTIAL TIMING & REAL BACKEND STATE
--------------------------------------------------

Do not start every animation simultaneously.
The animation MUST reflect REAL verification states (`PENDING`, `IN_PROGRESS`, `SUCCESS`, `FAILED`, `NEXT STEP`).
Do NOT fake unnecessary long verification delays, but ensure transitions are polished and readable.

--------------------------------------------------
LAYOUT & ICONOGRAPHY
--------------------------------------------------

Vertical verification timeline / checklist:

```
          Verify your account

      ┌──────────────────────────┐
      ◉  Discord identity
         Verified ✓
      │
      │ ← animated connecting line
      ◉  Server membership
         Verified ✓
      │
      │
      ◉  Account verification
         Checking...
      │
      │
      ○  Anti-bot protection
         Waiting
      │
      │
      ○  Final verification
         Waiting
      │
      │
      ○  Role assignment
         Waiting
      └──────────────────────────┘
```

Icons (Lucide):
- Discord identity: Discord / UserCheck icon
- Server membership: Server / Users icon
- Account check: Clock / Calendar / User icon
- Anti-bot: ShieldCheck / Security icon
- Verification: CheckCircle2 / Badge icon
- Role assignment: UserPlus / Award icon

Active item is visually emphasized with subtle border glow.
Completed items settle calmly.
Future items remain muted.

--------------------------------------------------
CONNECTING LINE ANIMATION
--------------------------------------------------

When Step N completes:
A subtle vertical connector travels downward (`scaleY: 0 → 1` from top) over ~250ms, then Step N+1 begins.

--------------------------------------------------
SUCCESS FINISH ANIMATION
--------------------------------------------------

When all checks complete:
The checklist settles → transition to central checkmark reveal → checkmark path draws → ambient glow → heading fades in ("Verification Complete") → supporting text fades in → "[ Continue to Discord ]" button reveals.

--------------------------------------------------
FAILURE ANIMATION
--------------------------------------------------

If a step fails:
- Active icon changes to warning/error
- Short restrained 4px horizontal micro-shake (never shaking the entire page)
- Explanation text fades in
- "[ Try Again ]" button displays

--------------------------------------------------
EXISTINGLY VERIFIED STATE
--------------------------------------------------

If user is already verified:
Do not replay the full multi-step sequence.
Show a direct, elegant success state:
"✓ You're already verified. Your Discord account has already completed verification."

--------------------------------------------------
ROLE ASSIGNMENT ANIMATION
--------------------------------------------------

Verification and Role Assignment are presented as separate steps:
✓ Security verification passed
↓
◉ Assigning Verified Role in Discord...
↓
✓ Verified Role assigned

If role assignment fails due to server hierarchy:
"⚠️ Verification complete, but role assignment could not be applied automatically. An administrator has been notified."

==================================================
7. VERIFICATION CONFIGURATION
==================================================

Create configuration UI for:

- Verified Role
- Unverified Role
- Verification Channel
- Logging Channel
- Verification enabled/disabled
- Minimum Discord Account Age (Toggle + Days input)
- Session expiration
- Attempt limits
- Cooldowns

Use excellent form design.

Include:

- switches
- selects
- searchable Discord entities
- validation
- inline errors
- save state
- unsaved changes indicator

==================================================
8. VERIFICATION MESSAGE BUILDER
==================================================

Create a visual editor for the Discord verification message.

Left:
Configuration controls

Right:
Live Discord message preview

Allow configuration of:

- title
- description
- icon
- banner
- button label
- button style
- footer
- colors

Preview should look like an actual Discord embed/message.

Make this editor feel like a professional design tool.

==================================================
9. ROLES / CHANNELS
==================================================

Create elegant Discord resource management interfaces.

Roles:

- Verified role
- Unverified role
- role permissions
- hierarchy warning
- missing permission warning

Channels:

- verification channel
- logs channel
- channel accessibility
- configuration status

Clearly show problems such as:
"Bot cannot assign this role because its role hierarchy is too low."

==================================================
10. VERIFICATION LOGS
==================================================

Create a detailed log interface.

Columns:

Timestamp
User
Discord ID
Event
Status
IP/privacy indicator
Source
Details

Include filtering and search.

Detailed log drawer/modal.

Use color carefully:
Success = subtle green
Warning = amber
Failure = red
Information = blue/purple
Do not overuse colors.

==================================================
11. SECURITY PAGE
==================================================

Create a security dashboard.

Show:

- suspicious verification attempts
- repeated failures
- rate-limit events
- revoked sessions
- authentication errors
- OAuth anomalies

Security health score.

Example:
SECURITY STATUS: 98 / 100 • Excellent

Also provide security recommendations.

==================================================
12. ANALYTICS
==================================================

Create a polished analytics experience.

Charts:

- Verification volume
- Success rate
- Failure rate
- Average verification time
- New member verification
- Re-verification
- Daily / weekly / monthly trends

Filters:
24H, 7D, 30D, 90D, Custom

Use beautiful animated charts.

==================================================
13. BOT HEALTH
==================================================

Create a system health page.

Monitor:

- Discord connection
- Bot latency
- Supabase status
- Database latency
- OAuth status
- API status
- Render service status
- Last heartbeat

Use:
Operational / Degraded / Offline visual states.
Include uptime timeline.

==================================================
14. ADMIN MANAGEMENT
==================================================

Create admin management.

Show:

- Admin avatar
- Discord identity
- Permission level
- Last login
- Status

Roles:
Owner / Administrator / Moderator / Viewer

Allow permissions to be clearly represented.

==================================================
15. SETTINGS
==================================================

Design a comprehensive settings area.

Sections:

- General
- Discord
- Verification
- Security
- Notifications
- Appearance
- API
- Advanced

Use a professional settings layout with sidebar navigation.

==================================================
16. COMMAND PALETTE
==================================================

Add a global command/search palette inspired by Linear/Raycast.

Keyboard shortcut:
⌘K / Ctrl+K

Commands:

- Search member
- Open dashboard
- View verification logs
- Configure verification
- Open settings
- Search Discord ID
- Toggle sidebar
- Switch server

Make it animated and polished.

==================================================
17. NOTIFICATIONS
==================================================

Create a notification center.

Examples:
- "Verification role updated."
- "Bot permission issue detected."
- "12 verification attempts failed in the last hour."
- "Verification service operational."

Use notification grouping.

==================================================
18. COMPONENT SYSTEM
==================================================

Build a reusable component design system.

Include:

- Buttons
- Inputs
- Selects
- Dropdowns
- Tabs
- Cards
- Badges
- Avatars
- Tooltips
- Modals
- Drawers
- Tables
- Charts
- Toasts
- Command palette
- Navigation
- Breadcrumbs
- Pagination
- Progress indicators
- Skeleton loaders
- Empty states
- Error states
- Confirmation dialogs
- Timeline
- Activity feed
- Stat cards
- Status indicators

Every component should have:
default, hover, active, focus, disabled, loading, error, success states.

==================================================
19. ANIMATIONS & MOTION DESIGN SYSTEM
==================================================

Use animation heavily but intelligently.

Inspired by:
- Aceternity UI
- React Bits
- Animate UI

Use:
- page transitions
- fade/slide
- blur transitions
- hover elevation
- animated gradients
- subtle glow
- number counting
- chart animation
- modal transitions
- sidebar transitions
- loading effects
- button micro-interactions
- background particles/grid where appropriate

Animations must feel premium. Do NOT make the UI distracting.

Motion library: Motion / Framer Motion.
GPU-friendly properties (`transform`, `opacity`, `filter`).

Respect:
`prefers-reduced-motion`

==================================================
20. BACKGROUND / VISUAL SYSTEM
==================================================

Create a signature dark background.

Potential elements:

- subtle radial gradients
- dot grid
- fine grid
- blurred accent light
- noise texture
- glass layers
- soft glow

Keep contrast high enough for accessibility.

==================================================
21. TYPOGRAPHY
==================================================

Use a modern SaaS typography system.

Strong hierarchy:

Display
H1
H2
H3
Body
Caption
Mono/code

Use monospace selectively for:

- Discord IDs
- timestamps
- logs
- system information
- API keys

==================================================
22. RESPONSIVE DESIGN
==================================================

Design for:

Desktop
Laptop
Tablet
Mobile

Mobile should not simply shrink the desktop UI.
Create appropriate mobile navigation.
Use bottom navigation or mobile drawer where appropriate.
Tables should become cards or horizontally scroll intelligently.

==================================================
23. ACCESSIBILITY
==================================================

Follow strong accessibility practices.

Include:

- keyboard navigation
- focus states
- semantic HTML
- ARIA where necessary
- readable contrast
- reduced motion
- screen-reader-friendly states
- accessible forms
- accessible modals

==================================================
24. DESIGN TOKENS
==================================================

Define a complete design token system:

- Colors
- Backgrounds
- Borders
- Text
- Muted text
- Accent
- Success
- Warning
- Danger
- Info
- Spacing
- Radius
- Shadows
- Blur
- Typography
- Animation durations
- Easing

The entire product must use the same system.

==================================================
25. FRONTEND TECHNOLOGY
==================================================

Prefer:

- React
- TypeScript
- Tailwind CSS

Use modern component architecture.

Suitable libraries:

- Framer Motion / Motion
- Lucide
- Recharts
- shadcn/ui where appropriate

Customize components so the final application feels original and premium.

==================================================
26. PAGE-BY-PAGE SPECIFICATION
==================================================

For EVERY page define:

- Page purpose
- Layout
- Navigation
- Components
- Data displayed
- User actions
- Loading state
- Empty state
- Error state
- Responsive behavior
- Animation
- Interaction behavior

==================================================
27. VISUAL REFERENCE ANALYSIS
==================================================

Based on the provided screenshots and referenced websites, extract design principles such as:

- Aceternity's cinematic dark presentation
- React Bits' animated backgrounds and experimental components
- Animate UI's restrained dark minimalism
- Untitled UI's structured SaaS patterns

Combine these characteristics into ONE coherent visual language.

==================================================
28. IMPORTANT
==================================================

This frontend should look like an actual premium SaaS product that could be launched publicly.

It must NOT look like:

- a generated admin template
- a generic Tailwind dashboard
- a basic Discord bot control panel

Every screen must feel intentionally designed.

Prioritize:

1. Visual hierarchy
2. UX
3. Consistency
4. Information architecture
5. Micro-interactions
6. Responsiveness
7. Accessibility
8. Performance

==================================================
29. OUTPUT
==================================================

Create a complete frontend design specification / frontend PRD.

Include:

- sitemap
- navigation architecture
- page inventory
- component inventory
- design system
- color system
- typography
- spacing
- interaction rules
- animation rules
- responsive rules
- detailed page specifications
- states
- user flows
- wireframe-style ASCII layouts where useful
- Mermaid diagrams where useful

The result should be detailed enough that a coding AI can implement the complete frontend without having to invent major UI decisions.

Do NOT generate backend implementation.
Do NOT generate database implementation.

Focus specifically on making the **Discord Verification Bot frontend beautiful, premium, highly animated, cohesive, and production-ready**.

The final design must use a **dark theme as the primary/default theme**.