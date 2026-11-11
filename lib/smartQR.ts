// Smart QR: rotating + time-limited + signed. A screenshot stops working after ~1 minute.
export const ROTATE_SECONDS = 30;
export const EARLY_MINUTES = 15; // scanning allowed this long before start
export const LATE_MINUTES = 10; // grace period; after this the scan counts as "late"

export type AttendanceStatus = 'present' | 'late';

export type SmartPayload = {
  v: 2;
  c: string; // event code
  t: string; // title
  s?: string; // start (local ISO)
  e?: string; // end (local ISO)
  n: number; // rotation slot
  g: string; // signature
};

// NOTE: the secret ships inside the app, so this deters casual sharing/screenshots.
// For hard security, verify the signature in a Supabase Edge Function instead.
const SECRET = 'qr-attendance-v2-change-me';

function cyrb53(str: string) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

const sign = (code: string, slot: number) =>
  cyrb53(`${SECRET}|${code}|${slot}`).toString(36);

const slotOf = (ms: number) => Math.floor(ms / (ROTATE_SECONDS * 1000));

export function buildSmartPayload(
  ev: { code: string; title: string; start?: string | null; end?: string | null },
  now = Date.now()
) {
  const n = slotOf(now);
  const p: SmartPayload = {
    v: 2,
    c: ev.code,
    t: ev.title,
    s: ev.start ?? undefined,
    e: ev.end ?? undefined,
    n,
    g: sign(ev.code, n),
  };
  return JSON.stringify(p);
}

export function parseSmartPayload(raw: string): SmartPayload | null {
  try {
    const p = JSON.parse(raw);
    if (p && p.v === 2 && typeof p.c === 'string' && typeof p.n === 'number') return p;
  } catch {}
  return null;
}

export type Validation =
  | { ok: true; status: AttendanceStatus; minutesLate: number }
  | { ok: false; reason: string };

export function validateSmartPayload(p: SmartPayload, now = Date.now()): Validation {
  if (sign(p.c, p.n) !== p.g) return { ok: false, reason: 'Invalid QR code.' };

  if (Math.abs(slotOf(now) - p.n) > 1)
    return { ok: false, reason: 'This QR code expired. Scan the live code shown by your teacher.' };

  const start = p.s ? new Date(p.s).getTime() : NaN;
  const end = p.e ? new Date(p.e).getTime() : NaN;

  if (!Number.isNaN(end) && now > end)
    return { ok: false, reason: 'This event has already ended.' };
  if (!Number.isNaN(start) && now < start - EARLY_MINUTES * 60000)
    return { ok: false, reason: 'This event has not started yet.' };

  if (!Number.isNaN(start) && now > start + LATE_MINUTES * 60000)
    return { ok: true, status: 'late', minutesLate: Math.round((now - start) / 60000) };
  return { ok: true, status: 'present', minutesLate: 0 };
}