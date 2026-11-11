import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState, useCallback  } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { SHADOW } from '@/constants/theme';
import { createEvent } from '@/lib/events';
import { getTeacherEventSummary, type TeacherEventSummary } from '@/lib/attendance';
import { getProfile } from '@/lib/profiles';
import { useAuth } from '@/lib/auth';
import RotatingQR from '@/components/RotatingQR';


function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  );
}

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${month} ${pad(date.getDate())}, ${date.getFullYear()} at ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

const QUICK_END_OPTIONS = [
  { label: '+30 min', ms: 30 * 60 * 1000 },
  { label: '+1 hour', ms: 60 * 60 * 1000 },
  { label: '+2 hours', ms: 2 * 60 * 60 * 1000 },
];

type EditTarget = 'start' | 'end';

export default function TeacherScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [roleLoading, setRoleLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000)
  );
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [payload, setPayload] = useState<{ eventId: string; title: string; start: string; end: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [myEvents, setMyEvents] = useState<TeacherEventSummary[]>([]);

  const isAndroid = Platform.OS === 'android';

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!user) {
        setRole('student');
        setRoleLoading(false);

        return () => {
          active = false;
        };
      }

      setRoleLoading(true);

      getProfile(user.id)
        .then(async (profile) => {
          if (!active) return;

          const currentRole = profile?.role ?? 'student';
          setRole(currentRole);
          if (currentRole === 'teacher') {
            const summaries = await getTeacherEventSummary(user.id);
            if (active) setMyEvents(summaries);
          }
        })
        .catch((error) => {
          console.error('Failed to load profile:', error);

          if (active) {
            setRole('student');
          }
        })
        .finally(() => {
          if (active) {
            setRoleLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [user?.id])
  );

      

  const openPicker = (target: EditTarget) => {
    setMessage(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget) return;
    if (event.type === 'dismissed' || !selected) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current = editTarget === 'start' ? startDate : endDate;
    const next = new Date(current);
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);

    if (editTarget === 'start') setStartDate(next);
    else setEndDate(next);

    if (isAndroid && editingPart === 'date') {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const handleQuickEnd = (ms: number) => {
    setMessage(null);
    setEndDate(new Date(startDate.getTime() + ms));
  };

const handleCreateEvent = async () => {
  setMessage(null);

  const eventData = {
    eventId: eventId.trim(),
    title: title.trim(),
    start: toLocalISO(startDate),
    end: toLocalISO(endDate),
  };

  if (!eventData.eventId || !eventData.title) {
    setMessage('Event title and code are required.');
    return;
  }

  if (endDate.getTime() <= startDate.getTime()) {
    setMessage('End time must be after start time.');
    return;
  }

  try {
    const { error } = await createEvent(eventData);

    if (error) {
      console.error('Failed to create event:', error);
      setMessage( 'Failed to create event.');
      return;
    }

    // Only create the QR after the database save succeeds.
    setMessage(
      'Event saved! Scan the QR with the Scan tab to test it.'
    );

    setPayload(eventData);
    if (user?.id) setMyEvents(await getTeacherEventSummary(user.id));
  } catch (error) {
    console.error('Failed to create event:', error);
    setMessage('Failed to create event. Please try again.');
  }
};
// 1. Show a loading spinner while checking the profile/role
  if (roleLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Checking your account...</Text>
      </View>
    );
  }

  // 2. Block non-teachers with a lock screen
  if (role !== 'teacher') {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="lock-closed-outline" size={64} color={COLORS.textSecondary} />
        <Text style={styles.lockTitle}>Teachers Only</Text>
        <Text style={styles.lockSubtitle}>Only teacher accounts can create and manage events.</Text>
      </View>
    );
  }

  

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.teacherHero}>
        <Text style={styles.heroEyebrow}>TEACHER WORKSPACE</Text>
        <Text style={styles.title}>Event Management</Text>
        <Text style={styles.subtitle}>Create secure event QR codes and monitor student participation.</Text>
        <View style={styles.teacherStats}>
          <View><Text style={styles.teacherStatValue}>{myEvents.length}</Text><Text style={styles.teacherStatLabel}>My events</Text></View>
          <View><Text style={styles.teacherStatValue}>{myEvents.reduce((sum, event) => sum + event.attendeeCount, 0)}</Text><Text style={styles.teacherStatLabel}>Total scans</Text></View>
        </View>
      </View>
      <View style={styles.eventsHeading}><View><Text style={styles.sectionTitle}>My recent events</Text><Text style={styles.sectionHint}>Live counts from attendance records</Text></View><Pressable onPress={() => router.push('/history')}><Text style={styles.historyLink}>View attendance</Text></Pressable></View>
      {myEvents.length === 0 ? (
        <View style={styles.emptyEvents}><Ionicons name="calendar-outline" size={24} color={COLORS.textSecondary}/><Text style={styles.emptyEventsText}>No events created yet. Create your first event below.</Text></View>
      ) : myEvents.slice(0, 5).map((event) => (
        <View key={event.eventId} style={styles.eventSummaryCard}>
          <View style={styles.eventSummaryIcon}><Ionicons name="qr-code-outline" size={20} color={COLORS.accent}/></View>
          <View style={{ flex: 1 }}><Text style={styles.eventSummaryTitle}>{event.title}</Text><Text style={styles.eventSummaryCode}>{event.eventCode}</Text></View>
          <View style={styles.attendeePill}><Text style={styles.attendeeCount}>{event.attendeeCount}</Text><Text style={styles.attendeeLabel}> scans</Text></View>
        </View>
      ))}
      <Text style={styles.formHeading}>Create a new event</Text>
      <Text style={styles.subtitle}>
        Fill in the event details, then scan the generated QR with the Scan tab.
      </Text>

      <Text style={styles.label}>Event Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Founders Day Assembly"
        placeholderTextColor={COLORS.textSecondary}
      />

      <Text style={styles.label}>Event Code</Text>
      <TextInput
        style={styles.input}
        value={eventId}
        onChangeText={setEventId}
        placeholder="e.g. EVT-2026-0002"
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Starts</Text>
      <PickerField
        value={formatDateTime(startDate)}
        icon="sunny-outline"
        onPress={() => openPicker('start')}
      />

      <Text style={styles.label}>Ends</Text>
      <PickerField
        value={formatDateTime(endDate)}
        icon="moon-outline"
        onPress={() => openPicker('end')}
      />
      <View style={styles.chipRow}>
        {QUICK_END_OPTIONS.map((option) => (
          <Pressable
            key={option.label}
            style={styles.chip}
            onPress={() => handleQuickEnd(option.ms)}
          >
            <Text style={styles.chipText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>Tap a chip to set the end time from start.</Text>

      {message && <Text style={styles.message}>{message}</Text>}

      <AppButton
        theme="primary"
        title="Create Event"
        icon="add-circle-outline"
        onPress={handleCreateEvent}
      />

      {editTarget && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={editTarget === 'start' ? startDate : endDate}
            mode={isAndroid ? editingPart : 'datetime'}
            display={isAndroid ? 'default' : 'spinner'}
            onChange={onPickerChange}
          />
        </View>
      )}

      {payload && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>
            Scan this QR code with the Scan tab:
          </Text>
          <RotatingQR code={payload.eventId} title={payload.title} start={payload.start} end={payload.end} />
        </View>
      )}
    </ScrollView>
  );
}

type PickerFieldProps = {
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function PickerField({ value, icon, onPress }: PickerFieldProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.pickerField, pressed && styles.pickerFieldPressed]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.pickerValue}>{value}</Text>
      <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  teacherHero: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 18, marginBottom: 20 },
  heroEyebrow: { color: COLORS.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 },
  teacherStats: { flexDirection: 'row', gap: 34, marginTop: 16 },
  teacherStatValue: { color: COLORS.textPrimary, fontSize: 23, fontWeight: '900' },
  teacherStatLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  eventsHeading: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyLink: { color: COLORS.accent, fontSize: 11, fontWeight: '800' },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900' },
  sectionHint: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  emptyEvents: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  emptyEventsText: { color: COLORS.textSecondary, fontSize: 12, flex: 1 },
  eventSummaryCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  eventSummaryIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  eventSummaryTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  eventSummaryCode: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  attendeePill: { flexDirection: 'row', backgroundColor: COLORS.surface, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20 },
  attendeeCount: { color: COLORS.accent, fontWeight: '900', fontSize: 12 }, attendeeLabel: { color: COLORS.textSecondary, fontSize: 11 },
  formHeading: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900', marginTop: 12, marginBottom: 4 },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    ...SHADOW.card,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  pickerField: {
    ...SHADOW.card,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerFieldPressed: {
    ...SHADOW.card,
    backgroundColor: COLORS.surface,
  },
  pickerValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginHorizontal: 10,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  chip: {
    ...SHADOW.card,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  pickerContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 12,
  },
  resultCard: {
    ...SHADOW.card,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  payloadText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  lockSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});