export function Footer() {
  return (
    <footer className="footer">
      <div className="header-container" style={{ justifyContent: 'center', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          Secure Discord OAuth2 Verification &bull; Frontend on Vercel &bull; Backend on Render &bull; Supabase PostgreSQL
        </p>
      </div>
    </footer>
  );
}
