import { Image, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { SHADOW } from '@/constants/theme';

type Props = { title: string };

// Shows your own logo (assets/images/icon.png) instead of the old graduation-cap icon.
export default function Header({ title }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.logoShadow}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  logoShadow: {
    ...SHADOW.card,
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#000000',
    marginBottom: 12,
  },
  logo: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});