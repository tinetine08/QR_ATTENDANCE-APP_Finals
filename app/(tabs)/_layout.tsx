import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import LinearGradient from '@/components/Gradient';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { COLORS } from '@/constants/colors';
import { GRADIENT, GRADIENT_END, GRADIENT_START, SHADOW } from '@/constants/theme';
import { useOfflineSync } from '@/lib/useOfflineSync';

export default function TabLayout() {
  useOfflineSync(); // background sync of offline scans for the whole app

  return (
    <Tabs
      {...({ sceneContainerStyle: { backgroundColor: 'transparent' } } as any)}
      screenOptions={{
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          ...SHADOW.nav,
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        headerStyle: { backgroundColor: COLORS.primary, ...SHADOW.header },
        headerBackground: () => (
          <LinearGradient
            colors={GRADIENT}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={StyleSheet.absoluteFill}
          />
        ),
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'qr-code' : 'qr-code-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="teacher"
        options={{
          title: 'Teacher',
          tabBarIcon: ({ color }) => <FontAwesome5 name="graduation-cap" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}