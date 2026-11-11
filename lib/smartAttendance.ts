import { registerAttendance } from '@/lib/attendance';
import { supabase } from '@/lib/supabase';
import { enqueue, getQueue, removeFromQueue, type QueuedScan } from './offlineQueue';
import {
  parseSmartPayload,
  validateSmartPayload,
  type AttendanceStatus,
} from './smartQR';

export type ScanOutcome = {
  kind: 'present' | 'late' | 'queued' | 'duplicate' | 'rejected';
  message: string;
  title?: string;
};

type InsertResult = 'ok' | 'duplicate' | 'network' | 'noevent' | 'error';

const isNetworkError = (e: any) =>
  /network|fetch|timeout|offline|connection/i.test(String(e?.message ?? e));

async function insertRecord(scan: QueuedScan): Promise<InsertResult> {
  try {
    const ev = await supabase
      .from('events')
      .select('id')
      .eq('event_code', scan.code)
      .maybeSingle();
    if (ev.error) return isNetworkError(ev.error) ? 'network' : 'error';
    if (!ev.data) return 'noevent';

    const dup = await supabase
      .from('attendance')
      .select('id')
      .eq('event_id', ev.data.id)
      .eq('student_id', scan.studentId)
      .maybeSingle();
    if (dup.error) return isNetworkError(dup.error) ? 'network' : 'error';
    if (dup.data) return 'duplicate';

    const row = {
      event_id: ev.data.id,
      student_id: scan.studentId,
      scanned_at: scan.scannedAt,
    };
    let res = await supabase.from('attendance').insert({ ...row, status: scan.status });
    // "status" column not added yet? Save without it so attendance still works.
    if (res.error && /status|42703|PGRST204/i.test(`${res.error.code} ${res.error.message}`)) {
      res = await supabase.from('attendance').insert(row);
    }
    if (res.error) return isNetworkError(res.error) ? 'network' : 'error';
    return 'ok';
  } catch (e) {
    return isNetworkError(e) ? 'network' : 'error';
  }
}

export async function processScan(raw: string, studentId?: string): Promise<ScanOutcome> {
  if (!studentId) return { kind: 'rejected', message: 'Please sign in again to record attendance.' };

  const parsed = parseSmartPayload(raw);

  // Older static QR codes still work through the original flow.
  if (!parsed) {
    const r = await registerAttendance(raw, studentId);
    return { kind: r.success ? 'present' : 'rejected', message: r.message };
  }

  const check = validateSmartPayload(parsed);
  if (!check.ok) return { kind: 'rejected', message: check.reason, title: parsed.t };

  const scan: QueuedScan = {
    key: '',
    code: parsed.c,
    title: parsed.t,
    studentId,
    scannedAt: new Date().toISOString(),
    status: check.status,
  };

  const result = await insertRecord(scan);
  const label = check.status === 'late' ? `Late by ${check.minutesLate} min` : 'On time';

  switch (result) {
    case 'ok':
      return { kind: check.status, title: parsed.t, message: `Attendance recorded. ${label}.` };
    case 'duplicate':
      return { kind: 'duplicate', title: parsed.t, message: 'You already checked in to this event.' };
    case 'network':
      await enqueue({ ...scan });
      return {
        kind: 'queued',
        title: parsed.t,
        message: `You're offline. Saved on this device (${label}) and will sync automatically.`,
      };
    case 'noevent':
      return { kind: 'rejected', title: parsed.t, message: 'This event was not found.' };
    default:
      return { kind: 'rejected', title: parsed.t, message: 'Could not record attendance. Try again.' };
  }
}

let syncing = false;
export async function syncQueue() {
  if (syncing) return { synced: 0 };
  syncing = true;
  let synced = 0;
  try {
    const done: string[] = [];
    for (const scan of await getQueue()) {
      const r = await insertRecord(scan);
      if (r === 'ok' || r === 'duplicate') {
        done.push(scan.key);
        synced += r === 'ok' ? 1 : 0;
      } else if (r === 'network') break; // still offline, try later
    }
    if (done.length) await removeFromQueue(done);
  } finally {
    syncing = false;
  }
  return { synced };
}

export type HistoryRow = {
  id: string;
  title: string;
  code: string;
  scannedAt: string;
  status: AttendanceStatus;
  pending?: boolean;
};

export async function fetchStudentHistory(userId: string): Promise<HistoryRow[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, status, events(title, event_code)')
    .eq('student_id', userId)
    .order('scanned_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => {
    const ev = Array.isArray(r.events) ? r.events[0] : r.events;
    return {
      id: String(r.id),
      title: ev?.title ?? 'Event',
      code: ev?.event_code ?? '',
      scannedAt: r.scanned_at,
      status: r.status === 'late' ? 'late' : 'present',
    };
  });
}

export async function getPendingRows(userId: string): Promise<HistoryRow[]> {
  return (await getQueue())
    .filter((s) => s.studentId === userId)
    .map((s) => ({
      id: `pending-${s.key}`,
      title: s.title,
      code: s.code,
      scannedAt: s.scannedAt,
      status: s.status,
      pending: true,
    }));
}