import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from '@/components/Gradient';
import QRCode from 'react-native-qrcode-svg';

import { COLORS } from '@/constants/colors';
import { GRADIENT, GRADIENT_END, GRADIENT_START, SHADOW } from '@/constants/theme';
import { ROTATE_SECONDS, buildSmartPayload } from '@/lib/smartQR';

type Props = { code: string; title: string; start?: string | null; end?: string | null; size?: number };

export default function RotatingQR({ code, title, start, end, size = 200 }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const slot = Math.floor(now / (ROTATE_SECONDS * 1000));
  const payload = useMemo(
    () => buildSmartPayload({ code, title, start, end }, slot * ROTATE_SECONDS * 1000),
    [code, title, start, end, slot]
  );
  const left = ROTATE_SECONDS - Math.floor((now / 1000) % ROTATE_SECONDS);

  return (
    <View style={styles.wrap}>
      <View style={styles.qrBox}>
        <QRCode value={payload} size={size} />
      </View>
      <View style={styles.track}>
        <LinearGradient
          colors={GRADIENT}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={[styles.fill, { width: `${(left / ROTATE_SECONDS) * 100}%` }]}
        />
      </View>
      <Text style={styles.caption}>Live code · refreshes in {left}s</Text>
      <Text style={styles.hint}>Screenshots stop working after about a minute.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  qrBox: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, ...SHADOW.card },
  track: { width: '80%', height: 8, borderRadius: 8, backgroundColor: COLORS.surface, overflow: 'hidden', marginTop: 18 },
  fill: { height: '100%', borderRadius: 8 },
  caption: { marginTop: 10, fontSize: 13, fontWeight: '700', color: COLORS.primary },
  hint: { marginTop: 4, fontSize: 12, color: COLORS.textSecondary },
});