import React from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const blobs = [
  {
    className: 'left-[-12%] top-[-18%] h-[34rem] w-[34rem] bg-accent/20',
    animate: { x: [0, 18, -12, 0], y: [0, -15, 10, 0] },
    duration: 28,
  },
  {
    className: 'right-[-10%] top-[8%] h-[30rem] w-[30rem] bg-gold/10',
    animate: { x: [0, -14, 8, 0], y: [0, 12, -16, 0] },
    duration: 36,
  },
  {
    className: 'left-[24%] bottom-[-24%] h-[32rem] w-[32rem] bg-accent/14',
    animate: { x: [0, 14, -8, 0], y: [0, -12, 8, 0] },
    duration: 32,
  },
];

const AppBackground = () => {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(var(--accent-base),0.16),transparent_50%),radial-gradient(circle_at_80%_10%,rgba(var(--gold-base),0.08),transparent_36%),linear-gradient(180deg,rgba(var(--bg-elevated),0.9),rgba(var(--bg-base),1)_32%,rgba(var(--bg-deep),1))]" />
      <div className="app-grid absolute inset-0 opacity-[0.17]" />
      <div className="app-noise absolute inset-0" />

      {blobs.map((blob, index) => {
        if (reduceMotion) {
          return (
            <div
              key={index}
              className={`absolute rounded-full blur-[130px] ${blob.className}`}
            />
          );
        }

        return (
          <motion.div
            key={index}
            className={`absolute rounded-full blur-[130px] ${blob.className}`}
            animate={blob.animate}
            transition={{
              duration: blob.duration,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
          />
        );
      })}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(var(--bg-deep),0.6)_100%)]" />
    </div>
  );
};

export default AppBackground;
