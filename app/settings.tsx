import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Card, Divider, IconButton } from '@/components/ui';
import { ProviderKeysCard } from '@/components/settings/ProviderKeysCard';
import { UsageCard } from '@/components/settings/UsageCard';
import { LocalEndpointCard } from '@/components/settings/LocalEndpointCard';
import { MemoriesCard } from '@/components/settings/MemoriesCard';
import { toast } from '@/components/feedback';
import { selectIsGuest, useAuthStore, useConversationsStore, useGuestStore } from '@/stores';
import { useTheme, useThemeControls } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { variant, setVariant } = useThemeControls();
  const isGuest = useAuthStore(selectIsGuest);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const enterGuestMode = useAuthStore((s) => s.enterGuestMode);
  const authedCount = useConversationsStore((s) => s.list.length);
  const guestCount = useGuestStore((s) => s.conversations.length);
  const conversationCount = isGuest ? guestCount : authedCount;

  const handleSignOut = async () => {
    await signOut();
    await enterGuestMode();
    toast.show('Você saiu da conta.');
    (router as { replace: (p: string) => void }).replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <IconButton
          variant="ghost"
          icon={<Text style={{ color: colors.text, fontSize: 22 }}>‹</Text>}
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
        />
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>Ajustes</Text>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        <Card $elevation={0} $padding="lg">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar src={user?.avatarUrl ?? null} name={isGuest ? 'Convidado' : user?.name ?? 'Você'} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
                {isGuest ? 'Convidado' : user?.name ?? 'Usuário'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {isGuest ? 'Sem conta conectada' : user?.email}
              </Text>
            </View>
          </View>
        </Card>

        <Card $elevation={0} $padding="lg">
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 10 }}>
            Estatísticas
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ color: colors.textSecondary }}>Conversas</Text>
            <Text style={{ color: colors.text }}>{conversationCount}</Text>
          </View>
        </Card>

        <Card $elevation={0} $padding="lg">
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 10 }}>
            Aparência
          </Text>
          {(['system', 'dark', 'light'] as const).map((mode) => {
            const label = mode === 'system' ? 'Automático' : mode === 'dark' ? 'Escuro' : 'Claro';
            const active = variant === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setVariant(mode)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}
              >
                <Text style={{ color: active ? colors.accent : colors.text }}>{label}</Text>
                <Text style={{ color: active ? colors.accent : colors.textMuted, fontSize: 18 }}>
                  {active ? '●' : '○'}
                </Text>
              </Pressable>
            );
          })}
        </Card>

        <ProviderKeysCard />

        <LocalEndpointCard />

        <MemoriesCard />

        {isGuest ? null : <UsageCard />}

        <Card $elevation={0} $padding="lg">
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 10 }}>
            Sobre
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
            Cortex — seu copiloto para código, ideias e todo o resto. Versão 1.0.0.
          </Text>
        </Card>

        {isGuest ? null : (
          <>
            <Divider />
            <Button variant="danger" fullWidth size="lg" onPress={handleSignOut}>
              Sair da conta
            </Button>
          </>
        )}
      </View>
    </View>
  );
}
