import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { getPasswordStrength } from '@/lib/validation';

const BAR_COLORS = ['#C62828', '#E65100', '#F9A825', '#2E7D32', '#1B5E20'];

export default function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = getPasswordStrength(password);

  return (
    <View style={styles.container}>
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { backgroundColor: i <= score ? BAR_COLORS[score] : COLORS.border },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: BAR_COLORS[score] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  bars: { flex: 1, flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  label: { fontSize: 12, fontWeight: '700', minWidth: 62, textAlign: 'right' },
});