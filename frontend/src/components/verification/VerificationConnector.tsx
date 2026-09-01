'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface VerificationConnectorProps {
  isCompleted: boolean;
  isActive: boolean;
}

export function VerificationConnector({ isCompleted }: VerificationConnectorProps) {
  return (
    <div
      style={{
        width: 0,
        height: '24px',
        marginLeft: '18px', // Centered relative to 38px circle (18px left margin + 1px border = center of 38)
        borderLeft: isCompleted ? '2px dotted #10b981' : '2px dotted rgba(255, 255, 255, 0.15)',
        transition: 'border-color 0.3s ease',
      }}
      aria-hidden="true"
    />
  );
}
