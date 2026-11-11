import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import LinearGradient from '@/components/Gradient';
import { COLORS } from '@/constants/colors';
import { GRADIENT, GRADIENT_END, GRADIENT_START, SHADOW } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type UpcomingEvent = { id: string; title: string; event_code: string; start_time: string | null; end_time: string | null };
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Schedule to be announced';

export default function Index() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('Student');
  const [stats, setStats] = useState({ attended: 0, events: 0 });
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setRefreshing(true);
    try {
      const [profile, attendanceResult, eventsResult] = await Promise.all([
        getProfile(user.id),
        supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('student_id', user.id),
        supabase.from('events').select('id, title, event_code, start_time, end_time').gte('end_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5),
      ]);
      if (profile?.full_name) setName(profile.full_name.split(' ')[0]);
      setStats({ attended: attendanceResult.count ?? 0, events: eventsResult.data?.length ?? 0 });
      setUpcoming((eventsResult.data ?? []) as UpcomingEvent[]);
    } catch (error) { console.warn('Dashboard refresh failed:', error); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { void loadDashboard(); }, [loadDashboard]));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={styles.hero}>
        <View style={styles.heroTop}><View><Text style={styles.eyebrow}>QR ATTENDANCE • STUDENT PORTAL</Text><Text style={styles.greeting}>Hello, {name}!</Text><Text style={styles.heroSub}>Stay on track with your school activities.</Text></View><View style={styles.heroIcon}><Ionicons name="school" size={30} color={COLORS.accent}/></View></View>
        <Pressable style={styles.scanButton} onPress={() => router.push('/scan')}><Ionicons name="qr-code" size={21} color="#07152E"/><Text style={styles.scanText}>Scan event QR</Text><Ionicons name="arrow-forward" size={18} color="#07152E"/></Pressable>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={styles.statCard}><View style={styles.statIcon}><Ionicons name="checkmark-circle" size={21} color={COLORS.success}/></View><Text style={styles.statValue}>{loading ? '—' : stats.attended}</Text><Text style={styles.statLabel}>My attendance</Text></View>
        <View style={styles.statCard}><View style={styles.statIcon}><Ionicons name="calendar" size={21} color={COLORS.accent}/></View><Text style={styles.statValue}>{loading ? '—' : stats.events}</Text><Text style={styles.statLabel}>Upcoming events</Text></View>
      </View>

      <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Upcoming events</Text><Text style={styles.sectionSub}>Don't miss your next school activity</Text></View><Pressable onPress={() => router.push('/history')}><Text style={styles.link}>My history</Text></Pressable></View>
      {loading ? <ActivityIndicator color={COLORS.accent} style={{ marginTop: 24 }}/> : upcoming.length === 0 ? <View style={styles.emptyCard}><Ionicons name="calendar-outline" size={28} color={COLORS.textSecondary}/><Text style={styles.emptyTitle}>No upcoming events</Text><Text style={styles.emptySub}>New school events will appear here.</Text></View> : upcoming.map((event) => <View key={event.id} style={styles.eventCard}><View style={styles.eventIcon}><Ionicons name="calendar-outline" size={22} color={COLORS.accent}/></View><View style={{ flex: 1 }}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventMeta}>{event.event_code} · {dateLabel(event.start_time)}</Text></View><Ionicons name="chevron-forward" color={COLORS.textSecondary} size={18}/></View>)}

      <Text style={styles.sectionTitle}>Quick access</Text>
      <View style={styles.quickGrid}>
        <QuickAction icon="time-outline" title="Attendance history" onPress={() => router.push('/history')}/>
        <QuickAction icon="person-circle-outline" title="My profile" onPress={() => router.push('/profile')}/>
      </View>
      <Pressable style={styles.refresh} onPress={() => void loadDashboard()} disabled={refreshing}><Ionicons name="refresh" size={16} color={COLORS.accent}/><Text style={styles.refreshText}>{refreshing ? 'Refreshing…' : 'Refresh dashboard'}</Text></Pressable>
      <Text style={styles.credit}>QR Attendance Management System</Text>
    </ScrollView>
  );
}
function QuickAction({ icon, title, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void }) { return <Pressable style={styles.quickCard} onPress={onPress}><Ionicons name={icon} size={24} color={COLORS.accent}/><Text style={styles.quickText}>{title}</Text><Ionicons name="arrow-forward" size={16} color={COLORS.textSecondary}/></Pressable>; }
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 18, paddingBottom: 36 },
  hero: { ...SHADOW.card, borderRadius: 24, padding: 20, marginBottom: 16 }, heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { color: '#C8D8F0', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }, greeting: { color: '#FFFFFF', fontSize: 27, fontWeight: '900', marginTop: 8 }, heroSub: { color: '#D5E2F4', fontSize: 13, marginTop: 4 }, heroIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#FFFFFF1A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF35' },
  scanButton: { marginTop: 22, borderRadius: 14, backgroundColor: COLORS.accent, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, scanText: { color: '#07152E', fontWeight: '900', fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 }, statCard: { flex: 1, backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1, borderRadius: 18, padding: 15 }, statIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }, statValue: { color: COLORS.textPrimary, fontSize: 25, fontWeight: '900', marginTop: 9 }, statLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900', marginBottom: 4 }, sectionSub: { color: COLORS.textSecondary, fontSize: 12 }, link: { color: COLORS.accent, fontWeight: '800', fontSize: 12 },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 }, eventIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }, eventTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' }, eventMeta: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 }, emptyCard: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 22, alignItems: 'center', marginBottom: 22 }, emptyTitle: { color: COLORS.textPrimary, fontWeight: '800', marginTop: 8 }, emptySub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  quickGrid: { gap: 10, marginTop: 8 }, quickCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 15, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border }, quickText: { color: COLORS.textPrimary, fontWeight: '700', flex: 1 }, refresh: { flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 22, padding: 10 }, refreshText: { color: COLORS.accent, fontWeight: '700', fontSize: 12 }, credit: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 11, marginTop: 10 },
});
