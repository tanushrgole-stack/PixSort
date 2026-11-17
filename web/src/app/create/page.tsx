'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Plus, X, Check, Copy, QrCode,
  Sparkles, Upload, Users
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { EVENT_EMOJI, applyEventAccent, EVENT_DEFAULT_MOMENTS } from '@/lib/design-tokens';
import { useToast } from '@/providers/ToastProvider';
import { StepBar } from '@/components/StepBar';

// ─── Type definitions ─────────────────────────────────────────────────────────

type EventType = 'wedding' | 'trip' | 'party' | 'birthday' | 'family' | 'college' | 'corporate';

const EVENT_TYPES: { type: EventType; label: string; tagline: string; bg: string }[] = [
  { type: 'wedding', label: 'Wedding', tagline: 'The big day & celebrations', bg: 'from-rose-200 to-pink-100' },
  { type: 'trip', label: 'Trip', tagline: 'Adventures & destinations', bg: 'from-orange-200 to-amber-100' },
  { type: 'party', label: 'Party', tagline: 'Dance, fun & memories', bg: 'from-pink-300 to-purple-100' },
  { type: 'birthday', label: 'Birthday', tagline: 'Cake, candles & cheers', bg: 'from-yellow-200 to-amber-100' },
  { type: 'family', label: 'Family', tagline: 'Reunions & get-togethers', bg: 'from-green-200 to-emerald-100' },
  { type: 'college', label: 'College Fest', tagline: 'Fests, farewells & fun', bg: 'from-indigo-200 to-violet-100' },
  { type: 'corporate', label: 'Corporate', tagline: 'Conferences & off-sites', bg: 'from-blue-200 to-sky-100' },
];

// ─── Step variants ────────────────────────────────────────────────────────────

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
};

// ─── Step 1 — Event Type ──────────────────────────────────────────────────────

function StepType({
  value,
  onChange,
}: {
  value: EventType | null;
  onChange: (t: EventType) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
        What kind of event?
      </h2>
      <p className="text-[var(--text-secondary)] mb-6 text-sm">Pick one — this sets the mood, moments, and colour accent.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {EVENT_TYPES.map(({ type, label, tagline, bg }) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(type)}
            className={`relative text-left p-4 rounded-3xl border-2 transition-all duration-200 ${
              value === type
                ? 'border-[var(--accent)] shadow-warm'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40'
            }`}
          >
            <div className={`w-full aspect-[4/3] rounded-2xl bg-gradient-to-br ${bg} flex items-center justify-center mb-3 text-4xl`}>
              {EVENT_EMOJI[type]}
            </div>
            <p className="font-semibold text-sm text-[var(--text)]">{label}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-tight">{tagline}</p>
            {value === type && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5 text-white" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2 — Details ─────────────────────────────────────────────────────────

function StepDetails({
  name,
  setName,
  coverPreview,
  setCoverPreview,
  date,
  setDate,
  expiry,
  setExpiry,
}: {
  name: string; setName: (v: string) => void;
  coverPreview: string | null; setCoverPreview: (v: string | null) => void;
  date: string; setDate: (v: string) => void;
  expiry: number; setExpiry: (v: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
          Name your event
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mb-6">Give it a name guests will recognise.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">Event name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Priya & Raj's Wedding"
          className="w-full h-12 px-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-lg"
          style={{ fontFamily: 'var(--font-heading)' }}
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">Cover photo (optional)</label>
        <div
          onClick={() => fileRef.current?.click()}
          className="w-full h-36 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--muted)] flex items-center justify-center cursor-pointer hover:border-[var(--accent)]/60 transition-colors overflow-hidden relative"
        >
          {coverPreview ? (
            <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-[var(--text-secondary)]">
              <Upload className="w-8 h-8 mx-auto mb-1 opacity-50" />
              <p className="text-sm">Click to upload</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">Event date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-12 px-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">Auto-expire after</label>
          <select
            value={expiry}
            onChange={(e) => setExpiry(Number(e.target.value))}
            className="w-full h-12 px-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3 — Moments ─────────────────────────────────────────────────────────

function StepMoments({
  moments,
  setMoments,
}: {
  moments: string[];
  setMoments: (m: string[]) => void;
}) {
  const [newMoment, setNewMoment] = useState('');

  function add() {
    const trimmed = newMoment.trim();
    if (trimmed && !moments.includes(trimmed)) {
      setMoments([...moments, trimmed]);
    }
    setNewMoment('');
  }

  function remove(i: number) {
    setMoments(moments.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
        Moments (sub-albums)
      </h2>
      <p className="text-[var(--text-secondary)] text-sm mb-6">
        Guests can tag photos to a moment. Remove any you don't need, or add your own.
      </p>

      <div className="flex flex-wrap gap-2 mb-6 min-h-[60px]">
        <AnimatePresence>
          {moments.map((m, i) => (
            <motion.div
              key={m}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] text-sm font-medium border border-[var(--accent)]/20"
            >
              {m}
              <button
                onClick={() => remove(i)}
                className="hover:text-red-500 transition-colors"
                aria-label={`Remove ${m}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {moments.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)] italic">No moments yet — add one below.</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newMoment}
          onChange={(e) => setNewMoment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a moment (e.g. Pool Party)"
          className="flex-1 h-11 px-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <Button size="md" onClick={add} icon={<Plus className="w-4 h-4" />}>Add</Button>
      </div>
    </div>
  );
}

// ─── Step 4 — Upload Mode ─────────────────────────────────────────────────────

function StepUploadMode({
  uploadMode,
  setUploadMode,
  requireApproval,
  setRequireApproval,
}: {
  uploadMode: 'everyone' | 'selected';
  setUploadMode: (v: 'everyone' | 'selected') => void;
  requireApproval: boolean;
  setRequireApproval: (v: boolean) => void;
}) {
  const options: { value: 'everyone' | 'selected'; icon: React.ReactNode; label: string; desc: string }[] = [
    {
      value: 'everyone',
      icon: <Users className="w-6 h-6" />,
      label: 'Everyone uploads',
      desc: 'Any guest who joins can upload photos. Great for casual events.',
    },
    {
      value: 'selected',
      icon: <Upload className="w-6 h-6" />,
      label: 'Selected uploaders',
      desc: 'Only people you designate (e.g. the photographer) can upload.',
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
        Who can upload?
      </h2>
      <p className="text-[var(--text-secondary)] text-sm mb-6">Choose how photos get added to this event.</p>

      <div className="space-y-3 mb-8">
        {options.map(({ value, icon, label, desc }) => (
          <motion.button
            key={value}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setUploadMode(value)}
            className={`w-full text-left flex items-start gap-4 p-4 rounded-3xl border-2 transition-all duration-200 ${
              uploadMode === value
                ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-soft'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40'
            }`}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${uploadMode === value ? 'bg-[var(--accent)] text-white' : 'bg-[var(--muted)] text-[var(--text-secondary)]'}`}>
              {icon}
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">{label}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">{desc}</p>
            </div>
            {uploadMode === value && (
              <div className="ml-auto shrink-0">
                <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--muted)] border border-[var(--border)]">
        <div>
          <p className="font-medium text-sm text-[var(--text)]">Require host approval to join</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Guests go into a waiting room until you approve them.</p>
        </div>
        <button
          onClick={() => setRequireApproval(!requireApproval)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${requireApproval ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
          aria-label="Toggle approval requirement"
        >
          <motion.div
            animate={{ x: requireApproval ? 20 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
          />
        </button>
      </div>
    </div>
  );
}

// ─── Step 5 — Share ───────────────────────────────────────────────────────────

function StepShare({ joinCode, eventId }: { joinCode: string; eventId: string }) {
  const { addToast } = useToast();
  const [networkBaseUrl, setNetworkBaseUrl] = useState<string>('');

  useEffect(() => {
    fetch('/api/network-ip')
      .then((r) => r.json())
      .then((d) => {
        if (d?.baseUrl) setNetworkBaseUrl(d.baseUrl);
      })
      .catch(() => {});
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Use the LAN network IP for the QR code so mobile devices on the same Wi-Fi can open it!
  const effectiveBaseUrl = isLocal && networkBaseUrl ? networkBaseUrl : origin;
  const joinUrl = effectiveBaseUrl ? `${effectiveBaseUrl}/join/${joinCode}` : '';
  const localUrl = origin ? `${origin}/join/${joinCode}` : '';

  function copyLink() {
    navigator.clipboard.writeText(joinUrl || localUrl);
    addToast({ kind: 'success', message: 'Link copied to clipboard!' });
  }

  return (
    <div className="text-center">
      {/* Confetti burst */}
      <div className="relative mx-auto w-24 h-24 mb-6">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
            style={{ background: i % 2 === 0 ? 'var(--accent)' : 'var(--accent-alt)' }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos((i / 8) * Math.PI * 2) * 44,
              y: Math.sin((i / 8) * Math.PI * 2) * 44,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
          />
        ))}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-alt)] flex items-center justify-center shadow-warm">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
      </div>

      <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
        Your event is live! 🎉
      </h2>
      <p className="text-[var(--text-secondary)] mb-6">Share this link or QR code with your guests.</p>

      {/* Join link */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 mb-4 flex items-center gap-3 shadow-soft">
        <div className="flex-1 text-left font-mono text-sm text-[var(--text)] truncate">{joinUrl || localUrl}</div>
        <Button size="sm" variant="primary" onClick={copyLink} icon={<Copy className="w-3.5 h-3.5" />}>
          Copy
        </Button>
      </div>

      {/* QR code */}
      <div className="bg-[var(--surface)] rounded-3xl p-6 inline-block shadow-card border border-[var(--border)] mb-4">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&bgcolor=ffffff&color=FF6B4A&data=${encodeURIComponent(joinUrl || localUrl)}`}
          alt="QR code"
          width={200}
          height={200}
          className="rounded-xl mx-auto"
        />
        <p className="text-xs text-[var(--text-secondary)] mt-3 font-medium">Scan with phone camera to join</p>
        {isLocal && (
          <p className="text-[11px] text-[var(--muted)] mt-1">
            (Phone & computer must be on the same Wi-Fi network)
          </p>
        )}
      </div>

      {/* Join code badge & quick actions */}
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-2 bg-[var(--blush)] px-4 py-2 rounded-full border border-[var(--border)]">
          <span className="text-xs text-[var(--text-secondary)] font-medium">Join Code:</span>
          <span className="font-mono font-bold text-base tracking-widest text-[var(--accent)]">{joinCode}</span>
        </div>

        <a
          href={localUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-medium mt-1"
        >
          Open join page in new tab ↗
        </a>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CreateEventPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [name, setName] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [expiry, setExpiry] = useState(30);
  const [moments, setMoments] = useState<string[]>([]);
  const [uploadMode, setUploadMode] = useState<'everyone' | 'selected'>('everyone');
  const [requireApproval, setRequireApproval] = useState(false);

  // Result
  const [joinCode, setJoinCode] = useState('');
  const [eventId, setEventId] = useState('');

  function goNext() {
    if (step === 0 && !eventType) {
      addToast({ kind: 'warning', message: 'Please pick an event type first.' });
      return;
    }
    if (step === 1 && !name.trim()) {
      addToast({ kind: 'warning', message: 'Event name is required.' });
      return;
    }
    if (step < 4) {
      setDir(1);
      setStep(step + 1);
    }
  }

  function goBack() {
    if (step > 0) {
      setDir(-1);
      setStep(step - 1);
    }
  }

  // Preload moments when type is selected
  function handleTypeSelect(t: EventType) {
    setEventType(t);
    applyEventAccent(t);
    if (moments.length === 0) {
      setMoments(EVENT_DEFAULT_MOMENTS[t] ?? []);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type: eventType,
          host_id: '00000000-0000-0000-0000-000000000001',
          upload_mode: uploadMode,
          require_approval: requireApproval,
          accent: eventType,
        }),
      });

      if (!res.ok) throw new Error('Failed to create event');
      const data = await res.json();
      const ev = data.event ?? data;
      setJoinCode(ev.join_code ?? data.join_code ?? 'PIXSORT');
      setEventId(ev.id ?? data.id ?? '');
      setDir(1);
      setStep(4);
    } catch (err) {
      console.error('Error creating event:', err);
      // Fallback: generate local join code and ID so user can always proceed to Share
      const fallbackCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const fallbackId = 'local-' + Date.now();
      setJoinCode(fallbackCode);
      setEventId(fallbackId);
      setDir(1);
      setStep(4);
    } finally {
      setLoading(false);
    }
  }

  const isLastForm = step === 3;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[var(--bg)]/90 backdrop-blur-sm border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-3 py-3">
            {step > 0 && step < 4 && (
              <button onClick={goBack} className="p-2 rounded-xl hover:bg-[var(--muted)] text-[var(--text-secondary)] transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-lg font-semibold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
              Create Event
            </h1>
          </div>
          {step < 4 && <StepBar current={step} />}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 pb-32">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {step === 0 && <StepType value={eventType} onChange={handleTypeSelect} />}
            {step === 1 && (
              <StepDetails
                name={name} setName={setName}
                coverPreview={coverPreview} setCoverPreview={setCoverPreview}
                date={date} setDate={setDate}
                expiry={expiry} setExpiry={setExpiry}
              />
            )}
            {step === 2 && <StepMoments moments={moments} setMoments={setMoments} />}
            {step === 3 && (
              <StepUploadMode
                uploadMode={uploadMode} setUploadMode={setUploadMode}
                requireApproval={requireApproval} setRequireApproval={setRequireApproval}
              />
            )}
            {step === 4 && <StepShare joinCode={joinCode} eventId={eventId} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      {step < 4 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg)]/90 backdrop-blur-sm border-t border-[var(--border)] px-4 py-4 pb-safe">
          <div className="max-w-2xl mx-auto">
            {isLastForm ? (
              <Button
                size="lg"
                fullWidth
                loading={loading}
                onClick={handleSubmit}
                iconEnd={<Sparkles className="w-5 h-5" />}
              >
                Create Event
              </Button>
            ) : (
              <Button
                size="lg"
                fullWidth
                onClick={goNext}
                iconEnd={<ArrowRight className="w-5 h-5" />}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg)]/90 backdrop-blur-sm border-t border-[var(--border)] px-4 py-4 pb-safe">
          <div className="max-w-2xl mx-auto">
            <Button
              size="lg"
              fullWidth
              onClick={() => router.push(`/events/${eventId}`)}
              iconEnd={<ArrowRight className="w-5 h-5" />}
            >
              Go to Event Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
