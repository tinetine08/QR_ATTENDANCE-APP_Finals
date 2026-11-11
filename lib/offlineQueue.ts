import type { AttendanceStatus } from './smartQR';

const KEY = 'attendance_offline_queue_v1';

// Keep false until your development build has been rebuilt with AsyncStorage
// (npx expo run:android). While false the queue lives in memory and the app never
// touches the native module, so it cannot crash.
const PERSIST = false;

// Load AsyncStorage lazily so a missing native module can never crash the whole app.
// If it is unavailable, the queue falls back to memory (works until the app is closed).
type Store = {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
};
let memory: string | null = null;
let store: Store | null | undefined;

function getStore(): Store | null {
  if (!PERSIST) return null;
  if (store !== undefined) return store;
  try {
    const mod = require('@react-native-async-storage/async-storage');
    const candidate: Store = mod.default ?? mod;
    store = candidate && typeof candidate.getItem === 'function' ? candidate : null;
  } catch {
    store = null;
  }
  return store;
}

async function readRaw(): Promise<string | null> {
  try {
    const s = getStore();
    return s ? await s.getItem(KEY) : memory;
  } catch {
    store = null;
    return memory;
  }
}

async function writeRaw(value: string) {
  memory = value;
  try {
    const s = getStore();
    if (s) await s.setItem(KEY, value);
  } catch {
    store = null;
  }
}

export type QueuedScan = {
  key: string;
  code: string;
  title: string;
  studentId: string;
  scannedAt: string; // ISO, the real scan time (kept for late detection)
  status: AttendanceStatus;
};

export async function getQueue(): Promise<QueuedScan[]> {
  try {
    const raw = await readRaw();
    return raw ? (JSON.parse(raw) as QueuedScan[]) : [];
  } catch {
    return [];
  }
}

async function save(q: QueuedScan[]) {
  await writeRaw(JSON.stringify(q));
}

export async function enqueue(scan: Omit<QueuedScan, 'key'>) {
  const q = await getQueue();
  if (q.some((s) => s.code === scan.code && s.studentId === scan.studentId)) return false;
  q.push({ ...scan, key: `${scan.code}:${scan.studentId}` });
  await save(q);
  return true;
}

export async function removeFromQueue(keys: string[]) {
  const q = await getQueue();
  await save(q.filter((s) => !keys.includes(s.key)));
}