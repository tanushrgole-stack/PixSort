'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';
import { ArrowRight, Sparkles, QrCode, Upload, Smile } from 'lucide-react';
import { Button, ThemeToggle, Logo } from '@/components/ui';
import { EVENT_EMOJI } from '@/lib/design-tokens';

// ─── Floating Polaroid Card ──────────────────────────────────────────────────

interface PolaroidProps {
  gradient: string;
  rotation: number;
  x: string;
  y: string;
  delay?: number;
  label?: string;
}

function Polaroid({ gradient, rotation, x, y, delay = 0, label }: PolaroidProps) {
  return (
    <motion.div
      className="polaroid absolute select-none"
      style={{ left: x, top: y, rotate: rotation }}
      animate={{
        y: [0, -14, 0],
        rotate: [rotation, rotation + 1.5, rotation - 1, rotation],
      }}
      transition={{
        duration: 5 + delay,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
      whileHover={{ scale: 1.06, zIndex: 20 }}
    >
      <div
        className="w-32 h-28 sm:w-40 sm:h-36 rounded-lg mb-2"
        style={{ background: gradient }}
      />
      {label && (
        <p className="text-center text-xs font-medium text-[var(--text-secondary)] mt-1">
          {label}
        </p>
      )}
    </motion.div>
  );
}

// ─── Event Type Chips ────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { type: 'wedding', label: 'Wedding' },
  { type: 'trip', label: 'Trip' },
  { type: 'party', label: 'Party' },
  { type: 'birthday', label: 'Birthday' },
  { type: 'family', label: 'Family' },
  { type: 'college', label: 'College Fest' },
  { type: 'corporate', label: 'Corporate' },
] as const;

function EventChip({
  type,
  label,
  index,
}: {
  type: string;
  label: string;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ scale: 1.08, y: -3 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="cursor-pointer shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--surface)] shadow-card text-sm font-medium text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-200"
    >
      <span className="text-xl">{EVENT_EMOJI[type as keyof typeof EVENT_EMOJI]}</span>
      {label}
    </motion.div>
  );
}

// ─── How It Works Steps ───────────────────────────────────────────────────────

const STEPS = [
  {
    num: '01',
    icon: QrCode,
    title: 'Create & Share',
    desc: 'Host creates an event in seconds and shares a QR code or link. No app download needed.',
  },
  {
    num: '02',
    icon: Upload,
    title: 'Upload Together',
    desc: 'Guests upload photos from their phones. Everything lands in one shared pool, sorted by moment.',
  },
  {
    num: '03',
    icon: Smile,
    title: 'Your Face, Your Album',
    desc: 'Scan your face once — AI finds every photo you appear in across the entire event. Download them all.',
  },
];

// ─── Landing Page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const polaroidY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center group transition-transform hover:scale-[1.02]">
            <Logo size={32} />
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/create">
              <Button size="sm" variant="primary" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                Create Event
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        ref={heroRef}
        className="relative overflow-hidden min-h-[88svh] flex items-center"
        style={{ background: 'linear-gradient(135deg, var(--bg) 0%, #FFE8D6 50%, var(--bg) 100%)' }}
      >
        {/* Floating polaroids */}
        <motion.div style={{ y: polaroidY }} className="absolute inset-0 pointer-events-none hidden sm:block">
          <Polaroid
            gradient="linear-gradient(135deg,#FFB703,#FF6B4A)"
            rotation={-6}
            x="5%"
            y="12%"
            delay={0}
            label="Sangeet 💃"
          />
          <Polaroid
            gradient="linear-gradient(135deg,#FFD9CC,#B76E79)"
            rotation={4}
            x="78%"
            y="8%"
            delay={1.2}
            label="Reception 🥂"
          />
          <Polaroid
            gradient="linear-gradient(135deg,#7FB77E,#FFB703)"
            rotation={-3}
            x="82%"
            y="55%"
            delay={0.6}
            label="Goa Day 2 🌊"
          />
          <Polaroid
            gradient="linear-gradient(135deg,#6C63FF,#FF3CAC)"
            rotation={5}
            x="2%"
            y="62%"
            delay={1.8}
            label="Fest Night 🎉"
          />
          <Polaroid
            gradient="linear-gradient(135deg,#FF6B4A,#FFD9CC)"
            rotation={-8}
            x="60%"
            y="70%"
            delay={2.4}
            label="Family 👨‍👩‍👧"
          />
        </motion.div>

        {/* Hero text */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-24 sm:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-sm font-medium mb-6 border border-[var(--accent)]/20">
              <Sparkles className="w-3.5 h-3.5" />
              AI-powered photo sorting
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
              Every moment.
              <br />
              Every face.
              <br />
              <span className="gradient-text">Sorted.</span>
            </h1>

            <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-xl mx-auto mb-10 leading-relaxed">
              Host creates the event, everyone uploads photos — AI finds every photo{' '}
              <em>you</em> appear in and builds your personal album. No account needed.
            </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/create">
                <Button
                  size="lg"
                  variant="primary"
                  iconEnd={<ArrowRight className="w-5 h-5" />}
                >
                  Create an Event
                </Button>
              </Link>
              <Link href="/join">
                <Button size="lg" variant="ghost">
                  Join with code
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            <div className="w-5 h-8 rounded-full border-2 border-[var(--border)] flex items-start justify-center pt-1.5">
              <div className="w-1 h-1.5 rounded-full bg-[var(--text-secondary)]" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Event types ── */}
      <section className="py-16 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest mb-8"
          >
            Perfect for every occasion
          </motion.p>
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide justify-center flex-wrap">
            {EVENT_TYPES.map(({ type, label }, i) => (
              <EventChip key={type} type={type} label={label} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              How it works
            </h2>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
              Three simple steps — from chaos to curated albums in minutes.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {STEPS.map(({ num, icon: Icon, title, desc }, i) => (
              <motion.div
                key={num}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5, ease: 'easeOut' }}
                className="relative p-6 rounded-3xl bg-[var(--bg)] shadow-card border border-[var(--border)] group hover:border-[var(--accent)]/40 transition-colors duration-300"
              >
                {/* Number */}
                <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-alt)] flex items-center justify-center shadow-soft">
                  <span className="text-white text-xs font-bold">{num}</span>
                </div>

                <div className="mt-4 mb-4 w-12 h-12 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)]/20 transition-colors duration-300">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 text-center">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-4xl p-12 sm:p-16 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,var(--accent) 0%,var(--accent-alt) 100%)' }}
          >
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 60%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
            <h2 className="relative text-3xl sm:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Your next event deserves<br />a personal album.
            </h2>
            <p className="relative text-white/80 max-w-md mx-auto mb-8">
              Free during beta. No account, no app, no fuss.
            </p>
            <Link href="/create">
              <Button
                size="lg"
                variant="ghost"
                className="bg-white text-[var(--accent)] hover:bg-white/90 border-0"
                iconEnd={<ArrowRight className="w-5 h-5" />}
              >
                Create your first event
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-xs">© 2026 Pixsort · AI face sorting for real moments</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/privacy" className="hover:text-[var(--accent)] transition-colors">Privacy</Link>
            <a href="https://github.com/tanushrgole-stack/PixSort" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)] transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
