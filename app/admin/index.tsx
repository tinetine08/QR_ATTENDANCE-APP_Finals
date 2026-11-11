import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Gradient from '@/components/Gradient';
import { COLORS } from '@/constants/colors';
import { GRADIENT, GRADIENT_END, GRADIENT_START, SHADOW } from '@/constants/theme';
import { signOut, useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type Counts = { students: number; teachers: number; events: number; attendance: number };
type RecentEvent = { id: string; title: string; event_code: string; created_at: string };
const ITEMS = [
  { title: 'QR Code & Events', subtitle: 'Create, review and manage school events', icon: 'qr-code-outline' as const, href: '/admin/events', key: 'events' as const },
  { title: 'Attendance Records', subtitle: 'Search and review submitted scans', icon: 'checkmark-done-outline' as const, href: '/admin/attendance', key: 'attendance' as const },
  { title: 'Reports & Analytics', subtitle: 'View event participation and trends', icon: 'bar-chart-outline' as const, href: '/admin/reports' },
  { title: 'Student Accounts', subtitle: 'Browse and search student accounts', icon: 'school-outline' as const, href: '/admin/students', key: 'students' as const },
  { title: 'Teacher Accounts', subtitle: 'Browse and search teacher accounts', icon: 'people-outline' as const, href: '/admin/teachers', key: 'teachers' as const },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('Administrator');
  const [counts, setCounts] = useState<Counts>({ students: 0, teachers: 0, events: 0, attendance: 0 });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const profile = await getProfile(user.id);
      if (!profile || profile.role !== 'admin') { router.replace('/(tabs)'); return; }
      if (profile.full_name) setName(profile.full_name);
      const count = async (table: string, role?: string) => {
        let query = supabase.from(table).select('id', { count: 'exact', head: true });
        if (role) query = query.eq('role', role);
        const result = await query;
        if (result.error) throw result.error;
        return result.count ?? 0;
      };
      const [students, teachers, events, attendance, recent] = await Promise.all([
        count('profiles', 'student'), count('profiles', 'teacher'), count('events'), count('attendance'),
        supabase.from('events').select('id, title, event_code, created_at').order('created_at', { ascending: false }).limit(4),
      ]);
      if (recent.error) throw recent.error;
      setCounts({ students, teachers, events, attendance });
      setRecentEvents((recent.data ?? []) as RecentEvent[]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load dashboard data.'); }
    finally { setLoading(false); }
  }, [user?.id, router]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  const handleSignOut = () => Alert.alert('Sign out', 'Are you sure you want to sign out?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/login'); } },
  ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadDashboard()} tintColor={COLORS.accent}/> }>
      <Gradient colors={GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={styles.hero}>
        <View style={styles.heroTop}><View style={styles.logo}><Ionicons name="shield-checkmark" size={27} color={COLORS.accent}/></View><Text style={styles.heroEyebrow}>SYSTEM ADMINISTRATION</Text></View>
        <Text style={styles.heroTitle}>Welcome back,</Text><Text style={styles.heroName}>{name}</Text>
        <Text style={styles.heroSub}>Monitor users, school events, and attendance in one place.</Text>
        <Pressable onPress={() => void loadDashboard()} style={styles.refreshHero}><Ionicons name="refresh" size={15} color="#07152E"/><Text style={styles.refreshHeroText}>Refresh overview</Text></Pressable>
      </Gradient>

      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>System overview</Text><Text style={styles.sectionHint}>Live database totals</Text></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && counts.events === 0 ? <ActivityIndicator color={COLORS.accent} style={{ margin: 20 }}/> : <View style={styles.statsGrid}>
        <Stat icon="school" label="Students" value={counts.students}/><Stat icon="people" label="Teachers" value={counts.teachers}/><Stat icon="calendar" label="Events" value={counts.events}/><Stat icon="checkmark-done-circle" label="Attendance" value={counts.attendance}/>
      </View>}

      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Management</Text><Text style={styles.sectionHint}>Choose a workspace</Text></View>
      {ITEMS.map((item) => <Pressable key={item.href} onPress={() => router.push(item.href as any)} style={({ pressed }) => [styles.menuCard, pressed && { opacity: 0.78 }]}>
        <View style={styles.menuIcon}><Ionicons name={item.icon} size={23} color={COLORS.accent}/></View><View style={styles.menuText}><Text style={styles.menuTitle}>{item.title}</Text><Text style={styles.menuSub}>{item.subtitle}</Text></View>{item.key ? <Text style={styles.menuCount}>{counts[item.key]}</Text> : null}<Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary}/>
      </Pressable>)}

      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Recently created events</Text><Pressable onPress={() => router.push('/admin/events')}><Text style={styles.viewAll}>View all</Text></Pressable></View>
      {recentEvents.length === 0 ? <Text style={styles.noEvents}>No events have been created yet.</Text> : recentEvents.map((event) => <View key={event.id} style={styles.recentCard}><Ionicons name="calendar-outline" size={20} color={COLORS.accent}/><View style={{ flex: 1 }}><Text style={styles.recentTitle}>{event.title}</Text><Text style={styles.recentMeta}>{event.event_code} · {new Date(event.created_at).toLocaleDateString()}</Text></View></View>)}
      <Pressable onPress={handleSignOut} style={styles.signOut}><Ionicons name="log-out-outline" size={19} color={COLORS.danger}/><Text style={styles.signOutText}>Sign out</Text></Pressable>
    </ScrollView>
  );
}
function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) { return <View style={styles.statCard}><Ionicons name={icon} size={21} color={COLORS.accent}/><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 18, paddingTop: 48, paddingBottom: 38 },
  hero: { ...SHADOW.card, borderRadius: 23, padding: 20, marginBottom: 24 }, heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }, logo: { width: 45, height: 45, borderRadius: 14, backgroundColor: '#FFFFFF1C', alignItems: 'center', justifyContent: 'center' }, heroEyebrow: { color: '#D7E4F5', fontWeight: '900', letterSpacing: 1, fontSize: 10 }, heroTitle: { color: '#D7E4F5', fontSize: 15 }, heroName: { color: '#FFFFFF', fontSize: 27, fontWeight: '900', marginTop: 2 }, heroSub: { color: '#D7E4F5', fontSize: 12, lineHeight: 18, marginTop: 7 }, refreshHero: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9, marginTop: 17 }, refreshHeroText: { color: '#07152E', fontWeight: '900', fontSize: 11 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11, marginTop: 4 }, sectionTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900' }, sectionHint: { color: COLORS.textSecondary, fontSize: 10 }, statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 }, statCard: { width: '48%', flexGrow: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14 }, statValue: { color: COLORS.textPrimary, fontSize: 25, fontWeight: '900', marginTop: 8 }, statLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }, error: { color: COLORS.danger, marginBottom: 12 },
  menuCard: { ...SHADOW.card, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, padding: 12, marginBottom: 10 }, menuIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginRight: 11 }, menuText: { flex: 1 }, menuTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '900' }, menuSub: { color: COLORS.textSecondary, fontSize: 10, marginTop: 3 }, menuCount: { color: COLORS.accent, fontSize: 16, fontWeight: '900', marginRight: 8 },
  viewAll: { color: COLORS.accent, fontWeight: '800', fontSize: 11 }, recentCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: 13, borderRadius: 13, marginBottom: 8 }, recentTitle: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 12 }, recentMeta: { color: COLORS.textSecondary, fontSize: 10, marginTop: 3 }, noEvents: { color: COLORS.textSecondary, fontSize: 12, paddingVertical: 12 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 14, marginTop: 18 }, signOutText: { color: COLORS.danger, fontWeight: '900', fontSize: 13 },
});
