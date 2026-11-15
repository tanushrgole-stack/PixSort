'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ConfettiEffectProps {
  onDone(): void;
}

const COLORS = [
  '#FF6B4A', // coral
  '#FFB703', // golden
  '#FF8FAB', // rose
  '#57CC99', // green
  '#9B5DE5', // purple
  '#FEC89A', // peach
];

const PARTICLE_COUNT = 40;

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

interface Particle {
  id: number;
  color: string;
  shape: 'circle' | 'square';
  size: number;
  x: number;         // start x offset from center (%)
  dx: number;        // end x drift px
  dy: number;        // end y drift px (downward)
  rotate: number;    // end rotation deg
  delay: number;
}

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: Math.random() > 0.5 ? 'circle' : 'square',
    size: rand(6, 12),
    x: rand(-8, 8),   // slight horizontal spread at origin (%)
    dx: rand(-220, 220),
    dy: rand(200, 620),
    rotate: rand(0, 720),
    delay: rand(0, 0.18),
  }));
}

export default function ConfettiEffect({ onDone }: ConfettiEffectProps) {
  const particles = useRef(makeParticles()).current;
  // Track how many have called onAnimationComplete
  const doneCount = useRef(0);

  const handleParticleDone = () => {
    doneCount.current += 1;
    if (doneCount.current >= particles.length) {
      onDone();
    }
  };

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9000] overflow-hidden"
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            opacity: 1,
            x: `calc(50vw + ${p.x}vw)`,
            y: '-10px',
            rotate: 0,
            scale: 1,
          }}
          animate={{
            opacity: 0,
            x: `calc(50vw + ${p.x}vw + ${p.dx}px)`,
            y: p.dy,
            rotate: p.rotate,
            scale: rand(0.4, 1),
          }}
          transition={{
            duration: 1.5,
            ease: 'easeOut',
            delay: p.delay,
          }}
          onAnimationComplete={handleParticleDone}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}
