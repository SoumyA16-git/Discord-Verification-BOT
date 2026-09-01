'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface VerificationConnectorProps {
  isCompleted: boolean;
  isActive: boolean;
}

export function VerificationConnector({ isCompleted, isActive }: VerificationConnectorProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      style={{
        width: '2px',
        height: '24px',
        marginLeft: '19px', // Centered relative to the 40px icon
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <motion.div
        initial={shouldReduceMotion ? { height: isCompleted ? '100%' : '0%' } : { scaleY: 0 }}
        animate={
          shouldReduceMotion
            ? { height: isCompleted ? '100%' : '0%' }
            : { scaleY: isCompleted ? 1 : 0 }
        }
        transition={{
          duration: shouldReduceMotion ? 0.01 : 0.28,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to bottom, #5865f2, #10b981)',
          transformOrigin: 'top',
        }}
      />
    </div>
  );
}
