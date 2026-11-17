'use client';

import Link from 'next/link';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
  useReducedMotion,
} from 'framer-motion';
import {
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Camera, QrCode, Smile, Sparkles, Users, Zap } from 'lucide-react';
import { Logo } from '@/components/ui';

/* ─────────────────────────── Types ─────────────────────────────────────── */

interface CardDef {
  id: string;
  src: string;
  caption: string;
  rotation: number;
  isDemo?: boolean;
}

/* ─────────────────────────── Constants ──────────────────────────────────── */

const ROTATING_WORDS = ['wedding', 'trip', 'party', 'birthday', 'family moment'];

const LEFT_CARDS: CardDef[] = [
  { id: 'wedding',   src: '/landing/wedding.svg',   caption: 'The Big Day 💍',  rotation: -4 },
  { id: 'haldi',     src: '/landing/haldi.svg',      caption: 'Haldi 🌼',        rotation: 3  },
  { id: 'bday',      src: '/landing/birthday.svg',   caption: 'Happy Birthday 🎂', rotation: -2 },
];

const RIGHT_CARDS: CardDef[] = [
  { id: 'beach',     src: '/landing/beach-trip.svg', caption: 'Beach Trip 🌊',   rotation: 5,  isDemo: true },
  { id: 'dinner',    src: '/landing/family-dinner.svg', caption: 'Family Dinner 🍽️', rotation: -3 },
  { id: 'selfie',    src: '/landing/group-selfie.svg',  caption: 'Golden Hour 🌅',   rotation: 4  },
];

const MARQUEE_CARDS: CardDef[] = [
  ...LEFT_CARDS,
  ...RIGHT_CARDS,
  { id: 'fest',  src: '/landing/college-fest.svg', caption: 'College Fest 🎵', rotation: 0 },
];

const HOW_IT_WORKS = [
  {
    icon: QrCode,
    step: '01',
    title: 'Create & Share',
    desc: 'Set up your event in seconds. Share a link or QR code — anyone can join without signing up.',
    color: '#FF6B4A',
  },
  {
    icon: Camera,
    step: '02',
    title: 'Everyone Uploads',
    desc: 'Guests upload from any device. Photos stream in live as the event unfolds.',
    color: '#FFB703',
  },
  {
    icon: Smile,
    step: '03',
    title: 'Your Face, Your Album',
    desc: 'Scan your selfie once. PixSort finds every photo you appear in — instantly sorted, yours to download.',
    color: '#FF6B4A',
  },
];

const DEMO_FACES = [
  { id: 'f1', name: 'Tanush', x: 32, y: 25, w: 28, h: 32, delay: 600 },
  { id: 'f2', name: 'Rahul',  x: 62, y: 30, w: 24, h: 28, delay: 1300 },
  { id: 'f3', name: 'Anju',   x: 15, y: 50, w: 22, h: 26, delay: 2000 },
];

/* ─────────────────────────── Animated Background ───────────────────────── */

function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      style={{ background: 'var(--bg)' }}
    >
      {/* Blob 1 — coral */}
      <div
        className="blob-1 absolute rounded-full opacity-25 dark:opacity-15"
        style={{
          width: 600, height: 600,
          top: '-15%', left: '-10%',
          background: 'radial-gradient(circle, #FF6B4A 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      {/* Blob 2 — gold */}
      <div
        className="blob-2 absolute rounded-full opacity-20 dark:opacity-12"
        style={{
          width: 500, height: 500,
          top: '20%', right: '-12%',
          background: 'radial-gradient(circle, #FFB703 0%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />
      {/* Blob 3 — rose */}
      <div
        className="blob-3 absolute rounded-full opacity-20 dark:opacity-12"
        style={{
          width: 450, height: 450,
          bottom: '-5%', left: '30%',
          background: 'radial-gradient(circle, #FFD9CC 0%, transparent 70%)',
          filter: 'blur(75px)',
        }}
      />
      {/* Grain overlay */}
      <div className="grain-overlay" />
    </div>
  );
}

/* ─────────────────────────── Face Demo Card ─────────────────────────────── */

function FaceDetectionDemo({ src, caption, rotation }: { src: string; caption: string; rotation: number }) {
  const [visibleFaces, setVisibleFaces] = useState<string[]>([]);
  const [showChip, setShowChip]       = useState(false);
  const shouldReduceMotion            = useReducedMotion();

  const run = useCallback(() => {
    setVisibleFaces([]);
    setShowChip(false);
    if (shouldReduceMotion) {
      setVisibleFaces(['f1', 'f2', 'f3']);
      setShowChip(true);
      return;
    }
    DEMO_FACES.forEach(f => {
      setTimeout(() => setVisibleFaces(v => [...v, f.id]), f.delay);
    });
    setTimeout(() => setShowChip(true), 2700);
  }, [shouldReduceMotion]);

  useEffect(() => {
    run();
    const interval = setInterval(run, 6000);
    return () => clearInterval(interval);
  }, [run]);

  return (
    <div
      className="polaroid select-none"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className="relative w-40 h-36 rounded-lg overflow-hidden mb-2 bg-[var(--blush)]">
        <img
          src={src}
          alt={caption}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        {/* Face detection boxes */}
        {DEMO_FACES.map(face => (
          <AnimatePresence key={face.id}>
            {visibleFaces.includes(face.id) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="absolute"
                style={{
                  left: `${face.x}%`, top: `${face.y}%`,
                  width: `${face.w}%`, height: `${face.h}%`,
                }}
              >
                <div
                  className="w-full h-full rounded-sm border-2"
                  style={{ borderColor: '#FF6B4A' }}
                />
                <div
                  className="absolute -bottom-5 left-0 text-[9px] font-semibold px-1 py-0.5 rounded whitespace-nowrap"
                  style={{ background: '#FF6B4A', color: 'white' }}
                >
                  {face.name}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
        {/* "N faces found" chip */}
        <AnimatePresence>
          {showChip && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ background: '#FF6B4A', color: 'white', boxShadow: '0 2px 8px rgba(255,107,74,0.5)' }}
            >
              3 faces found ✓
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="text-center text-xs font-medium text-[var(--text-secondary)]">{caption}</p>
    </div>
  );
}

/* ─────────────────────────── Polaroid Card ──────────────────────────────── */

function PolaroidCard({
  card,
  index,
}: {
  card: CardDef;
  index: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 120, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 20 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-4, 4]);

  if (card.isDemo) {
    return <FaceDetectionDemo src={card.src} caption={card.caption} rotation={card.rotation} />;
  }

  return (
    <motion.div
      className="polaroid select-none cursor-pointer"
      style={{
        rotate: card.rotation,
        rotateX: shouldReduceMotion ? 0 : rotateX,
        rotateY: shouldReduceMotion ? 0 : rotateY,
        transformStyle: 'preserve-3d',
      }}
      animate={shouldReduceMotion ? {} : {
        y: [0, -10 - index * 3, 0],
      }}
      transition={shouldReduceMotion ? {} : {
        duration: 5 + index * 1.2,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: index * 0.8,
      }}
      whileHover={shouldReduceMotion ? {} : {
        rotate: 0,
        scale: 1.06,
        zIndex: 20,
        transition: { duration: 0.3, ease: 'easeOut' },
      }}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set(((e.clientX - rect.left) / rect.width - 0.5));
        mouseY.set(((e.clientY - rect.top)  / rect.height - 0.5));
      }}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
    >
      <div className="w-40 h-36 rounded-lg overflow-hidden mb-2 bg-[var(--blush)]">
        <img
          src={card.src}
          alt={card.caption}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
      <p className="text-center text-xs font-medium text-[var(--text-secondary)]">{card.caption}</p>
    </motion.div>
  );
}

/* ─────────────────────────── Card Column ────────────────────────────────── */

function CardColumn({ cards, side }: { cards: CardDef[]; side: 'left' | 'right' }) {
  return (
    <div
      className="hidden xl:flex flex-col gap-6 items-center justify-center py-12"
      style={{ perspective: 800 }}
    >
      {cards.map((card, i) => (
        <PolaroidCard key={card.id} card={card} index={i} />
      ))}
    </div>
  );
}

/* ─────────────────────────── Rotating Word ──────────────────────────────── */

function RotatingWord() {
  const [wordIndex, setWordIndex] = useState(0);
  const shouldReduceMotion        = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return;
    const id = setInterval(() => setWordIndex(i => (i + 1) % ROTATING_WORDS.length), 2600);
    return () => clearInterval(id);
  }, [shouldReduceMotion]);

  return (
    <span
      className="relative inline-block overflow-hidden"
      style={{ minWidth: '11ch', display: 'inline-flex', justifyContent: 'center' }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={wordIndex}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -28 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="gradient-text font-bold"
        >
          {ROTATING_WORDS[wordIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ─────────────────────────── Confetti Particle ─────────────────────────── */

interface Particle { id: number; x: number; y: number; color: string; angle: number; size: number; }

const CONFETTI_COLORS = ['#FF6B4A', '#FFB703', '#A855F7', '#EC4899', '#10B981'];

function ConfettiBurst({ particles, originX, originY }: {
  particles: Particle[];
  originX: number;
  originY: number;
}) {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 100 }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            width: p.size, height: p.size * 0.5,
            backgroundColor: p.color,
            left: originX, top: originY,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: Math.cos(p.angle) * (120 + p.size * 8),
            y: Math.sin(p.angle) * (100 + p.size * 6) + 60,
            opacity: 0,
            rotate: p.angle * 180,
          }}
          transition={{ duration: 0.9 + Math.random() * 0.5, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────── Animated Counter ───────────────────────────── */

function AnimatedCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const [count, setCount]  = useState(0);
  const ref                = useRef<HTMLDivElement>(null);
  const inView             = useInView(ref, { once: true, margin: '-80px' });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (shouldReduceMotion) { setCount(target); return; }
    const duration = 1800;
    const steps    = 60;
    const stepTime = duration / steps;
    let current    = 0;
    const id = setInterval(() => {
      current += target / steps;
      setCount(Math.min(Math.round(current), target));
      if (current >= target) clearInterval(id);
    }, stepTime);
    return () => clearInterval(id);
  }, [inView, target, shouldReduceMotion]);

  return (
    <div ref={ref} className="text-center">
      <div
        className="text-4xl sm:text-5xl font-bold gradient-text"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {count.toLocaleString()}{suffix}
      </div>
      <div className="mt-1 text-sm text-[var(--text-secondary)] font-medium">{label}</div>
    </div>
  );
}

/* ─────────────────────────── Navbar ─────────────────────────────────────── */

function Navbar() {
  return (
    <nav
      className="sticky top-0 z-50 w-full px-4 sm:px-6 py-3 flex items-center justify-between"
      style={{
        background: 'rgba(var(--bg-rgb, 255,247,240), 0.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <Logo />
      <div className="flex items-center gap-3">
        <ThemeToggleButton />
        <Link
          href="/create"
          className="btn-primary text-sm flex items-center gap-1.5"
        >
          <Sparkles size={14} />
          Create Event
        </Link>
      </div>
    </nav>
  );
}

/* ─── Minimal theme toggle (no extra dep) ─── */
function ThemeToggleButton() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setDark(isDark);
  };
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--blush)] transition-colors"
      style={{ color: 'var(--text-secondary)' }}
    >
      {dark ? (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      ) : (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

/* ─────────────────────────── Mobile Swipe Strip ────────────────────────── */

function MobilePhotoStrip() {
  const allCards = [...LEFT_CARDS, ...RIGHT_CARDS];
  return (
    <div className="xl:hidden overflow-x-auto scrollbar-hide flex gap-5 px-4 py-6 snap-x snap-mandatory">
      {allCards.map(card => (
        <div
          key={card.id}
          className="polaroid flex-shrink-0 snap-center"
          style={{ transform: `rotate(${card.rotation}deg)` }}
        >
          <div className="w-32 h-28 rounded-lg overflow-hidden mb-1.5 bg-[var(--blush)]">
            <img
              src={card.src}
              alt={card.caption}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-center text-[10px] font-medium text-[var(--text-secondary)]">{card.caption}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── Medium Breakpoint Cards ───────────────────── */

function MediumCards() {
  const twoCards = [LEFT_CARDS[0], RIGHT_CARDS[0]];
  return (
    <div className="hidden md:flex xl:hidden gap-8 justify-center py-6">
      {twoCards.map((card, i) => (
        <div
          key={card.id}
          className="polaroid"
          style={{ transform: `rotate(${card.rotation}deg)` }}
        >
          <div className="w-32 h-28 rounded-lg overflow-hidden mb-1.5 bg-[var(--blush)]">
            <img
              src={card.src}
              alt={card.caption}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-center text-[10px] font-medium text-[var(--text-secondary)]">{card.caption}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── Main Page Component ───────────────────────── */

export default function HomePage() {
  const [particles, setParticles]       = useState<Particle[]>([]);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0, y: 0 });
  const shouldReduceMotion              = useReducedMotion();

  /* ── Confetti burst on CTA click ── */
  const handleCTAClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (shouldReduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const newParticles: Particle[] = Array.from({ length: 22 }, (_, i) => ({
      id: Date.now() + i,
      x: 0, y: 0,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      angle: (i / 22) * Math.PI * 2,
      size: 6 + Math.random() * 6,
    }));
    setConfettiOrigin(origin);
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1600);
  }, [shouldReduceMotion]);

  /* ── Refs for how-it-works ── */
  const howRef  = useRef<HTMLElement>(null);
  const howView = useInView(howRef, { once: true, margin: '-60px' });

  const statRef  = useRef<HTMLElement>(null);
  const statView = useInView(statRef, { once: true, margin: '-60px' });

  return (
    <>
      <AnimatedBackground />
      {particles.length > 0 && (
        <ConfettiBurst particles={particles} originX={confettiOrigin.x} originY={confettiOrigin.y} />
      )}

      <div className="relative z-10 min-h-screen flex flex-col">
        <Navbar />

        {/* ══════════ HERO SECTION ══════════ */}
        <section className="relative flex-1 grid grid-cols-1 xl:grid-cols-[300px_1fr_300px] min-h-[88vh] items-center">
          {/* Left card column */}
          <CardColumn cards={LEFT_CARDS} side="left" />

          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center text-center px-5 sm:px-8 py-12 xl:py-16">
            {/* Medium-only 2 cards above text */}
            <MediumCards />

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide"
              style={{
                background: 'var(--accent-light)',
                color: 'var(--accent)',
                border: '1px solid rgba(255,107,74,0.25)',
              }}
            >
              <Zap size={12} />
              AI-powered photo sorting
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-5"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--text)',
                maxWidth: '640px',
              }}
            >
              Every{' '}
              <RotatingWord />
              {'.'}
              <br />
              Every face.{' '}
              <span className="gradient-text">Sorted.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="mb-8 font-medium"
              style={{
                fontSize: '1.125rem',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                maxWidth: '480px',
              }}
            >
              Upload together, find yourself instantly. PixSort uses AI to group
              every photo by face — your personal album, ready in seconds.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-none"
            >
              <Link
                href="/create"
                onClick={handleCTAClick}
                className="btn-primary shimmer-btn relative overflow-hidden inline-flex items-center gap-2 text-base font-semibold w-full sm:w-auto justify-center"
                style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}
              >
                <Sparkles size={18} />
                Create Free Event
              </Link>

              <Link
                href="/join"
                className="inline-flex items-center gap-2 justify-center w-full sm:w-auto font-semibold rounded-full transition-all duration-200"
                style={{
                  padding: '0.875rem 2rem',
                  fontSize: '1rem',
                  border: '2px solid var(--accent)',
                  color: 'var(--accent)',
                  background: 'transparent',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--accent-light)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                }}
              >
                <QrCode size={18} />
                Join with code
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.6 }}
              className="mt-8 flex items-center gap-3 text-sm"
              style={{ color: 'var(--muted)' }}
            >
              <div className="flex -space-x-2">
                {['#FF6B4A','#FFB703','#A855F7','#10B981'].map((c, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-[var(--bg)] flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: c }}
                  >
                    {['T','R','A','S'][i]}
                  </div>
                ))}
              </div>
              <span>Join <strong style={{ color: 'var(--text)' }}>10,000+</strong> photos sorted</span>
            </motion.div>

            {/* Mobile swipe strip */}
            <div className="w-full mt-8">
              <MobilePhotoStrip />
            </div>
          </div>

          {/* Right card column */}
          <CardColumn cards={RIGHT_CARDS} side="right" />
        </section>

        {/* ══════════ MARQUEE ══════════ */}
        <section
          className="overflow-hidden py-4"
          style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
          aria-hidden="true"
        >
          <div className="marquee-track flex gap-6 w-max items-center">
            {[...MARQUEE_CARDS, ...MARQUEE_CARDS].map((card, i) => (
              <div
                key={`${card.id}-${i}`}
                className="polaroid flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity"
                style={{ transform: `rotate(${card.rotation}deg)` }}
              >
                <div className="w-24 h-20 rounded-md overflow-hidden mb-1 bg-[var(--blush)]">
                  <img
                    src={card.src}
                    alt={card.caption}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-center text-[9px] text-[var(--text-secondary)]">{card.caption}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════ HOW IT WORKS ══════════ */}
        <section
          ref={howRef}
          className="relative z-10 py-20 sm:py-28 px-5 sm:px-8 max-w-5xl mx-auto w-full"
          id="how-it-works"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={howView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <h2
              className="text-3xl sm:text-4xl font-bold mb-3"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}
            >
              How it works
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
              Three steps, zero hassle.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 32 }}
                animate={howView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                whileHover={shouldReduceMotion ? {} : { y: -4, transition: { duration: 0.2 } }}
                className="card p-7 flex flex-col items-center text-center card-hover"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-white relative"
                  style={{ background: `linear-gradient(135deg, ${step.color}, #FFB703)` }}
                >
                  <step.icon size={26} />
                  {/* Pulsing ring */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    animate={shouldReduceMotion ? {} : {
                      boxShadow: [
                        `0 0 0 0px ${step.color}60`,
                        `0 0 0 10px ${step.color}00`,
                      ],
                    }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  />
                </div>
                <div
                  className="text-xs font-bold tracking-widest mb-2 uppercase"
                  style={{ color: step.color }}
                >
                  Step {step.step}
                </div>
                <h3
                  className="text-lg font-bold mb-2"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}
                >
                  {step.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65 }}>
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ══════════ STATS / COUNTERS ══════════ */}
        <section
          ref={statRef}
          className="relative z-10 py-16 sm:py-20 px-5"
          style={{ background: 'var(--blush)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={statView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6"
          >
            <AnimatedCounter target={10000} suffix="+" label="photos sorted" />
            <AnimatedCounter target={500}   suffix="+"  label="events created" />
            <AnimatedCounter target={50000} suffix="+"  label="faces matched" />
          </motion.div>
        </section>

        {/* ══════════ CTA BANNER ══════════ */}
        <section
          className="relative z-10 py-20 sm:py-28 px-5 text-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--golden) 100%)',
          }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -top-24 -left-24 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'rgba(255,255,255,0.3)' }}
          />
          <div
            className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-20"
            style={{ background: 'rgba(255,255,255,0.3)' }}
          />
          <div className="relative z-10 max-w-xl mx-auto">
            <h2
              className="text-3xl sm:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Ready to sort your memories?
            </h2>
            <p className="text-white/85 text-lg mb-8 font-medium">
              Free forever for personal events. No app download needed.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 font-semibold rounded-full bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              style={{
                padding: '0.95rem 2.25rem',
                fontSize: '1rem',
                color: 'var(--accent)',
                boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
              }}
            >
              <Sparkles size={18} />
              Create your first event →
            </Link>
          </div>
        </section>

        {/* ══════════ FOOTER ══════════ */}
        <footer
          className="relative z-10 py-10 px-5 sm:px-8"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo />
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Link href="/privacy" className="hover:text-[var(--accent)] transition-colors">Privacy</Link>
              <Link href="/how-it-works" className="hover:text-[var(--accent)] transition-colors">How it works</Link>
              <Link href="/create" className="hover:text-[var(--accent)] transition-colors">Create Event</Link>
            </nav>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              © {new Date().getFullYear()} PixSort. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
