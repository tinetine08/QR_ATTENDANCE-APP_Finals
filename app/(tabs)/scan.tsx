import { CameraView, useCameraPermissions } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { SHADOW } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { processScan, type ScanOutcome } from '@/lib/smartAttendance';
import { useOfflineSync } from '@/lib/useOfflineSync';

const BADGES: Record<ScanOutcome['kind'], { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  present: { label: 'Present', color: COLORS.success, icon: 'checkmark-circle' },
  late: { label: 'Late', color: COLORS.warning, icon: 'alarm' },
  queued: { label: 'Saved offline', color: COLORS.primary, icon: 'cloud-offline' },
  duplicate: { label: 'Already recorded', color: COLORS.textSecondary, icon: 'information-circle' },
  rejected: { label: 'Not recorded', color: COLORS.danger, icon: 'close-circle' },
};

export default function ScanScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanOutcome | null>(null);
  const lock = useRef(false);
  const { pending, refresh } = useOfflineSync();

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Camera Permission Needed</Text>
        <Text style={styles.subtitle}>We need access to your camera to scan QR codes.</Text>
        <AppButton theme="primary" title="Grant Permission" icon="camera" onPress={requestPermission} />
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (lock.current) return;
    lock.current = true;
    setScanned(true);
    setBusy(true);
    const outcome = await processScan(data, user?.id);
    setResult(outcome);
    setBusy(false);
    refresh();
  };

  const handleScanAgain = () => {
    lock.current = false;
    setScanned(false);
    setResult(null);
  };

  const badge = result ? BADGES[result.kind] : null;

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {pending > 0 && (
        <View style={styles.pendingPill}>
          <Ionicons name="sync" size={14} color="#FFF" />
          <Text style={styles.pendingText}>{pending} waiting to sync</Text>
        </View>
      )}

      <View style={styles.overlay}>
        {busy ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : badge && result ? (
          <>
            <Ionicons name={badge.icon} size={44} color={badge.color} />
            <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
            {result.title && <Text style={styles.eventName}>{result.title}</Text>}
            <Text style={styles.scanResult}>{result.message}</Text>
            <AppButton theme="primary" title="Scan Again" icon="refresh" onPress={handleScanAgain} />
          </>
        ) : (
          <Text style={styles.overlayText}>Point your camera at the live QR code</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  overlay: {
    ...SHADOW.card,
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 40,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  overlayText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  badgeLabel: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  eventName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 6, textAlign: 'center' },
  scanResult: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 8, lineHeight: 20 },
  pendingPill: {
    ...SHADOW.card,
    position: 'absolute',
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pendingText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});