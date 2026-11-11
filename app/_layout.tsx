import { useEffect } from 'react';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import Gradient from '@/components/Gradient';
import { COLORS } from '@/constants/colors';
import { BG_END, BG_GRADIENT, BG_START } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

// The login screen decides where to go after signing in (admin dashboard or
// home tabs). This layout only does two things:
//   1. keeps the navigator mounted at all times, and
//   2. sends signed-out users away from protected screens.
export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navReady = !!useRootNavigationState()?.key;

  const path = segments?.[0] as string | undefined;
  const protectedRoute = path === '(tabs)' || path === 'admin';
  const mustLogin = navReady && !loading && !session && protectedRoute;

  // Signed out on a protected screen: go to login immediately.
  useEffect(() => {
    if (mustLogin) router.replace('/login');
  }, [mustLogin, router]);

  return (
    <Gradient colors={BG_GRADIENT} start={BG_START} end={BG_END} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" />
      </Stack>

      {/* Cover the screen while auth loads or while redirecting to login,
          so the home screen never flashes. */}
      {(loading || mustLogin) && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </Gradient>
  );
}

const styles = StyleSheet.create({
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#07152E',
  },
});