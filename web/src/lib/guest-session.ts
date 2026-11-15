/**
 * Guest session management.
 *
 * Since guests have no account, we persist their identity in:
 *   1. localStorage (primary — instant, same device)
 *   2. A "resume token" in the guest_sessions table (cross-device)
 *
 * The resume link encodes the token: /resume/[token]
 * When a guest opens that link on another device they are automatically
 * signed in as the same user.
 */

const SESSION_KEY = "pixsort_guest_session";

export interface GuestSession {
  userId: string;
  eventId: string;
  token: string;        // the server-issued opaque token
  name: string;
  personId?: string;    // set after face enrollment
  memberStatus: "approved" | "pending";
  createdAt: string;
}

// ── Local storage ─────────────────────────────────────────────────────────────

export function saveGuestSession(session: GuestSession): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadAllSessions();
    // keyed by eventId — one session per event
    all[session.eventId] = session;
    localStorage.setItem(SESSION_KEY, JSON.stringify(all));
  } catch {
    // storage full or private browsing — silently ignore
  }
}

export function loadGuestSession(eventId: string): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const all = loadAllSessions();
    return all[eventId] ?? null;
  } catch {
    return null;
  }
}

function loadAllSessions(): Record<string, GuestSession> {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, GuestSession>;
  } catch {
    return {};
  }
}

export function clearGuestSession(eventId: string): void {
  if (typeof window === "undefined") return;
  const all = loadAllSessions();
  delete all[eventId];
  localStorage.setItem(SESSION_KEY, JSON.stringify(all));
}

// ── Server-side session ops (via API) ─────────────────────────────────────────

export async function createServerSession(
  userId: string,
  eventId: string,
  deviceLabel?: string
): Promise<string | null> {
  try {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, event_id: eventId, device_label: deviceLabel }),
    });
    if (!res.ok) return null;
    const { token } = await res.json();
    return token as string;
  } catch {
    return null;
  }
}

export async function resolveSessionToken(token: string): Promise<GuestSession | null> {
  try {
    const res = await fetch(`/api/sessions/${token}`);
    if (!res.ok) return null;
    return (await res.json()) as GuestSession;
  } catch {
    return null;
  }
}

/** Returns the sharable "continue on another device" URL */
export function resumeUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/resume/${token}`;
}

/** Returns device label string for the current browser */
export function getDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;
  const mobile = /iPhone|Android|iPad/i.test(ua);
  const browser = /Chrome/i.test(ua)
    ? "Chrome"
    : /Safari/i.test(ua)
    ? "Safari"
    : /Firefox/i.test(ua)
    ? "Firefox"
    : "Browser";
  return `${mobile ? "Mobile" : "Desktop"} · ${browser}`;
}
