import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Não encontrado' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: colors.background }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Página não existe.</Text>
        <Link href="/" style={{ marginTop: 15, paddingVertical: 15 }}>
          <Text style={{ color: colors.accent }}>Voltar ao início</Text>
        </Link>
      </View>
    </>
  );
}
