import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { SHADOW } from '@/constants/theme';
import { getAttendanceHistory, getTeacherEventAttendance, type TeacherEventAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import { fetchStudentHistory, getPendingRows, type HistoryRow } from '@/lib/smartAttendance';
import { useOfflineSync } from '@/lib/useOfflineSync';

const formatDate = (iso: string) => new Date(iso).toLocaleString();
const shortId = (id: string) => (id ? `…${id.slice(-8)}` : 'unknown');

export default function HistoryScreen() {
  const { user } = useAuth();
  const { pending } = useOfflineSync();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);

  const loadHistory = useCallback(async () => {
    if (!user) return setLoading(false);
    setLoading(true);
    try {
      const currentRole = (await getProfile(user.id))?.role ?? 'student';
      setRole(currentRole);

      if (currentRole === 'teacher') {
        setTeacherEvents(await getTeacherEventAttendance(user.id));
        setRows([]);
      } else {
        const queued = await getPendingRows(user.id);
        let saved: HistoryRow[];
        try {
          saved = await fetchStudentHistory(user.id);
        } catch {
          // Fallback to the original query if the join/status column isn't available.
          const old = await getAttendanceHistory(user.id);
          saved = old.map((r) => ({
            id: String(r.id), title: r.eventTitle, code: r.eventId, scannedAt: r.scannedAt, status: 'present' as const,
          }));
        }
        setRows([...queued, ...saved]);
        setTeacherEvents([]);
      }
    } catch (error) {
      console.error('Failed to load attendance history:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory, pending]));

  if (role === 'teacher') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>My Events</Text>
        {loading ? (
          <Text style={styles.subtitle}>Loading events...</Text>
        ) : teacherEvents.length === 0 ? (
          <Text style={styles.subtitle}>No events created yet.</Text>
        ) : (
          <FlatList
            data={teacherEvents}
            keyExtractor={(item) => item.eventId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventMeta}>Event Code: {item.eventCode}</Text>
                <Text style={styles.eventMeta}>Attendees: {item.attendeeCount}</Text>
                {item.attendees.map((a) => (
                  <Text key={`${item.eventId}-${a.studentId}-${a.scannedAt}`} style={styles.eventMeta}>
                    Student: {shortId(a.studentId)} · {formatDate(a.scannedAt)}
                  </Text>
                ))}
              </View>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance History</Text>
      {loading ? (
        <Text style={styles.subtitle}>Loading records...</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.subtitle}>No records yet. Scan a QR code to register your attendance.</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const late = item.status === 'late';
            return (
              <View style={styles.card}>
                <View style={styles.rowTop}>
                  <Text style={[styles.eventTitle, { flex: 1 }]}>{item.title}</Text>
                  <View style={[styles.badge, { backgroundColor: (late ? COLORS.warning : COLORS.success) + '22' }]}>
                    <Text style={[styles.badgeText, { color: late ? COLORS.warning : COLORS.success }]}>
                      {late ? 'Late' : 'Present'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.eventMeta}>{item.code}</Text>
                <Text style={styles.eventMeta}>{formatDate(item.scannedAt)}</Text>
                {item.pending && (
                  <View style={styles.pendingRow}>
                    <Ionicons name="cloud-upload-outline" size={14} color={COLORS.accent} />
                    <Text style={styles.pendingText}>Waiting to sync</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 32 },
  list: { paddingBottom: 24 },
  card: { ...SHADOW.card, backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  eventMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  pendingText: { fontSize: 12, fontWeight: '700', color: COLORS.accent },
});