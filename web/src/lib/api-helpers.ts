import { NextResponse } from "next/server";

export type ApiError = {
  error: string;
  status: number;
};

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/** Uppercase alphanumeric join code, 8 chars */
export function generateJoinCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

/**
 * Returns the shareable join URL for an event.
 * In production replace APP_URL with the real domain.
 */
export function joinUrl(joinCode: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/join/${joinCode}`;
}

/**
 * Returns the QR payload (the same join URL — any QR library
 * can encode this string on the client).
 */
export function qrPayload(joinCode: string): string {
  return joinUrl(joinCode);
}
