import { Tabs } from 'expo-router';

import { useTheme } from '@/theme';

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        tabBarActiveTintColor: colors.accent,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', tabBarLabel: 'Início', href: null }}
      />
    </Tabs>
  );
}
