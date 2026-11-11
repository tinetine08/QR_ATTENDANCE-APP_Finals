import Ionicons from '@expo/vector-icons/Ionicons';
import LinearGradient from '@/components/Gradient';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { COLORS } from '@/constants/colors';
import { GRADIENT, GRADIENT_END, GRADIENT_START, SHADOW } from '@/constants/theme';

type Props = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  theme?: 'primary';
  disabled?: boolean;
  style?: ViewStyle;
};

export default function AppButton({ title, icon, onPress, theme, disabled, style }: Props) {
  const primary = theme === 'primary';
  const fg = primary ? '#FFFFFF' : COLORS.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        SHADOW.card,
        !primary && styles.secondary,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {primary && (
        <LinearGradient
          colors={GRADIENT}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={StyleSheet.absoluteFill}
        />
      )}
      {icon && <Ionicons name={icon} size={20} color={fg} style={{ marginRight: 8 }} />}
      <Text style={[styles.text, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    marginVertical: 6,
  },
  secondary: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  text: { fontSize: 15, fontWeight: '700' },
});