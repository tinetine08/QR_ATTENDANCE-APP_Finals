import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { SHADOW } from '@/constants/theme';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, Profile, updateProfile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    const data = await getProfile(user.id);

    setProfile(data);
    setDraftName(data?.full_name ?? '');
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user) return;

    const newName = draftName.trim();

    if (!newName) {
      Alert.alert('Invalid Name', 'Please enter your full name.');
      return;
    }

    setSaving(true);

    const { error } = await updateProfile(user.id, {
      full_name: newName,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    setProfile((prev) =>
      prev ? { ...prev, full_name: newName } : prev
    );

    setEditing(false);

    Alert.alert('Success', 'Your name has been updated.');
  };

  const handlePasswordReset = async () => {
    const email = profile?.email;
    if (!email) { Alert.alert('Unavailable', 'No email address is linked to this account.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) Alert.alert('Could not send email', error.message);
    else Alert.alert('Password reset sent', `Check ${email} for the password reset link.`);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);

            try {
              await signOut();
              router.replace('/login');
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.message || 'Failed to sign out.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const fullName = profile?.full_name || 'User';

  const initials = fullName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Student';
  const isTeacher = profile?.role === 'teacher';
  const isAdmin = profile?.role === 'admin';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>
          Manage your account information
        </Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.name}>{fullName}</Text>

        <View
          style={[
            styles.roleBadge,
            isAdmin ? styles.adminBadge : isTeacher ? styles.teacherBadge : styles.studentBadge,
          ]}
        >
          <Text style={styles.roleBadgeText}>
            {roleLabel}
          </Text>
        </View>
      </View>

      {/* Account Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Account Information
        </Text>

        <View style={styles.infoCard}>
          {/* Full Name */}
          <View style={styles.infoItem}>
            <Text style={styles.label}>Full Name</Text>

            {editing ? (
              <View style={styles.editContainer}>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="Enter your full name"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  autoCapitalize="words"
                />

                <View style={styles.editButtons}>
                  <Pressable
                    onPress={() => {
                      setDraftName(profile?.full_name ?? '');
                      setEditing(false);
                    }}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSaveName}
                    style={styles.saveButton}
                    disabled={saving}
                  >
                    <Text style={styles.saveText}>
                      {saving ? 'Saving...' : 'Save'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.valueRow}>
                <Text style={styles.value}>{fullName}</Text>

                <Pressable
                  onPress={() => setEditing(true)}
                  style={styles.editButton}
                >
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Email */}
          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <Text style={styles.label}>Email Address</Text>
            <Text style={styles.value}>
              {profile?.email || 'user@gmail.com'}
            </Text>
          </View>

          {/* Role */}
          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <Text style={styles.label}>Account Type</Text>
            <Text style={styles.value}>
              {isTeacher ? 'Teacher Account' : 'Student Account'}
            </Text>
          </View>

          {/* User ID */}
          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <Text style={styles.label}>User ID</Text>
            <Text style={styles.userId}>
              {profile?.id || 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.securityCard}><Text style={styles.sectionTitle}>Account security</Text><Text style={styles.securityHint}>Send a secure password reset link to your registered email.</Text><Pressable style={styles.resetButton} onPress={handlePasswordReset}><Text style={styles.resetButtonText}>Send password reset email</Text></Pressable></View>

      <AppButton
          title={loading ? 'Signing Out...' : 'Sign Out'}
          icon="log-out-outline"
          onPress={handleSignOut}
        />
      </View>

      <Text style={styles.footer}>
        Your profile information is securely stored.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 22,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  profileCard: {
    ...SHADOW.card,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 26,
  },

  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },

  name: {
    fontSize: 21,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },

  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },

  securityCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, marginBottom: 20 },
  securityHint: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 5 },
  resetButton: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 13, marginTop: 12, alignItems: 'center' },
  resetButtonText: { color: COLORS.accent, fontWeight: '800', fontSize: 13 },
  adminBadge: { backgroundColor: COLORS.accent + '25' },
  teacherBadge: {
    backgroundColor: COLORS.surface,
  },

  studentBadge: {
    backgroundColor: COLORS.surface,
  },

  roleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },

  infoCard: {
    ...SHADOW.card,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 16,
  },

  infoItem: {
    paddingVertical: 15,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 5,
  },

  value: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  userId: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  editText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },

  editContainer: {
    marginTop: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },

  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },

  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  saveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});