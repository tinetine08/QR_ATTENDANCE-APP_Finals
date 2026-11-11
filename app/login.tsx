import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import PasswordInput from '@/components/PasswordInput';
import { COLORS } from '@/constants/colors';
import { SHADOW } from '@/constants/theme';
import { signIn } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { isValidEmail } from '@/lib/validation';

const PROFILE_TIMEOUT_MS = 10000;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setStatus(null);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setLoading(true);
    setStatus('Signing in…');
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const { data, error: authError } = await signIn(email.trim(), password);

      if (authError) {
        setError(authError.message);
        return;
      }

      const userId = data?.session?.user?.id ?? data?.user?.id;
      if (!userId) {
        setError('No user session was returned. Please try signing in again.');
        return;
      }

      setStatus('Signed in. Loading your profile…');
      const profile = await Promise.race([
        getProfile(userId),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Profile loading timed out. Please try again.')),
            PROFILE_TIMEOUT_MS
          );
        }),
      ]);

      if (!profile) {
        setError('Your profile could not be found. Please contact the administrator.');
        return;
      }

      setStatus(`Profile loaded (${profile.role}). Opening…`);
      router.replace(profile.role === 'admin' ? '/admin' : '/(tabs)');
      // If this message is still visible after 3 seconds, navigation did not happen.
      setTimeout(
        () => setStatus('Signed in, but the app could not open the home page. Please report this.'),
        3000
      );
    } catch (err: unknown) {
      if (__DEV__) console.error('[LOGIN ERROR]', err);
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      if (timer) clearTimeout(timer);
      setLoading(false);
    }
  };

  // Feature: forgot password (sends a Supabase reset email)
  const handleForgotPassword = async () => {
    if (!isValidEmail(email)) {
      setError('Enter your email above first, then tap “Forgot password?”.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim()
      );
      if (resetError) {
        setError(resetError.message);
      } else {
        Alert.alert(
          'Check your email',
          `If an account exists for ${email.trim()}, a reset link is on its way.`
        );
      }
    } catch {
      setError('Could not send the reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <Header title="QR Attendance" />
            </View>

            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to record your attendance</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your.email@school.edu"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!loading}
              />

              <Text style={styles.label}>Password</Text>
              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                textContentType="password"
                editable={!loading}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />

              <Pressable
                onPress={handleForgotPassword}
                disabled={loading}
                style={styles.forgot}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>

              {status && !error && <Text style={styles.status}>{status}</Text>}
              {error && <Text style={styles.error}>{error}</Text>}

              {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
              ) : (
                <AppButton
                  theme="primary"
                  title="Sign In"
                  icon="log-in-outline"
                  onPress={handleLogin}
                />
              )}
            </View>

            <Link href="/register" style={styles.link}>
              Don’t have an account? Sign up
            </Link>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  headerContainer: { alignItems: 'center', marginTop: 20, marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: { marginBottom: 24 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  forgot: { alignSelf: 'flex-end', paddingVertical: 10 },
  forgotText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  error: {
    fontSize: 14,
    color: '#C62828',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  loader: { marginVertical: 16 },
  status: { fontSize: 13, color: COLORS.primary, textAlign: 'center', marginTop: 4, marginBottom: 8, fontWeight: '600' },
  link: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
});