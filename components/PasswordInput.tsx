import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '@/constants/colors';

/** Password field with a show/hide toggle. */
export default function PasswordInput(props: TextInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <TextInput
        {...props}
        style={[styles.input, props.style]}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={COLORS.textSecondary}
      />
      <Pressable
        style={styles.toggle}
        onPress={() => setVisible((v) => !v)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      >
        <Ionicons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={COLORS.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { justifyContent: 'center' },
  input: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 44,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  toggle: { position: 'absolute', right: 14 },
});