'use client';

import { Clock } from 'lucide-react';

export default function ExpiredPage() {
  return (
    <div className="center-container">
      <div className="card">
        <div className="status-icon-wrapper status-expired">
          <Clock size={36} color="#FEE75C" />
        </div>

        <h1>Verification Link Expired</h1>
        <p>For security reasons, verification sessions expire after a short time window.</p>

        <div className="alert alert-info">
          To generate a fresh verification link, open Discord and run <code>/verify</code>.
        </div>

        <a href="https://discord.com/channels/@me" className="btn btn-secondary btn-block">
          Open Discord
        </a>
      </div>
    </div>
  );
}
