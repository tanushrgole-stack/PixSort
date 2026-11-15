// Design-system token utilities
// A single source of truth for accent colours per event type,
// plus helper to inject them as CSS custom properties.

export const EVENT_ACCENTS = {
  wedding:   { primary: "#B76E79", light: "#F5D5DA", label: "Rose Gold" },
  trip:      { primary: "#FF6B4A", light: "#FFE5DE", label: "Sunset Orange" },
  party:     { primary: "#FF3CAC", light: "#FFD6F0", label: "Hot Pink" },
  birthday:  { primary: "#FFB703", light: "#FFF3CC", label: "Golden Yellow" },
  family:    { primary: "#7FB77E", light: "#D9F0D8", label: "Sage Green" },
  college:   { primary: "#6C63FF", light: "#E0DEFF", label: "Lavender" },
  corporate: { primary: "#2B4C6F", light: "#D2E0EE", label: "Navy" },
} as const;

export type EventType = keyof typeof EVENT_ACCENTS;

/** Inject event accent as CSS vars on :root so the whole page reacts */
export function applyEventAccent(type: EventType | string): void {
  if (typeof document === "undefined") return;
  const accent = EVENT_ACCENTS[type as EventType] ?? EVENT_ACCENTS.trip;
  const root = document.documentElement;
  root.style.setProperty("--accent",       accent.primary);
  root.style.setProperty("--accent-light", accent.light);
  // compute a slightly darker shade for active states
  root.style.setProperty("--accent-dark",  accent.primary);
}

/** Reset to the default coral accent */
export function resetAccent(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty("--accent");
  root.style.removeProperty("--accent-light");
  root.style.removeProperty("--accent-dark");
}

export const EVENT_DEFAULT_MOMENTS: Record<string, string[]> = {
  wedding:   ['Mehndi', 'Haldi', 'Sangeet', 'Wedding Ceremony', 'Reception'],
  trip:      ['Arrival', 'Day 1', 'Day 2', 'Day 3', 'Departure'],
  party:     ['Arrivals', 'Games', 'Dance Floor', 'Cake Cutting'],
  birthday:  ['Arrivals', 'Cake Cutting', 'Gifts', 'Party'],
  family:    ['Arrival', 'Get-together', 'Meals', 'Farewell'],
  college:   ['Opening Ceremony', 'Events', 'Performances', 'Closing Night'],
  corporate: ['Registration', 'Keynote', 'Sessions', 'Networking', 'Team Dinner'],
};

export const EVENT_EMOJI: Record<string, string> = {
  wedding:   "💍",
  trip:      "✈️",
  party:     "🎉",
  birthday:  "🎂",
  family:    "🏡",
  college:   "🎓",
  corporate: "💼",
};
