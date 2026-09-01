'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface VerificationConnectorProps {
  isCompleted: boolean;
  isActive: boolean;
}

export function VerificationConnector({ isCompleted, isActive }: VerificationConnectorProps) {
  return (
    <div
      style={{
        width: '2px',
        height: '24px',
        marginLeft: '19px', // Centered relative to 40px circle (19px left margin)
        background: isCompleted
          ? '#10b981'
          : isActive
          ? 'linear-gradient(to bottom, #10b981, #3b82f6)'
          : '#27272a',
        transition: 'background 0.3s ease',
      }}
      aria-hidden="true"
    />
  );
}
