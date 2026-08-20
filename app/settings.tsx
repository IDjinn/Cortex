import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Card, Divider, IconButton } from '@/components/ui';
import { ProviderKeysCard } from '@/components/settings/ProviderKeysCard';
import { UsageCard } from '@/components/settings/UsageCard';
import { LocalEndpointCard } from '@/components/settings/LocalEndpointCard';
import { MemoriesCard } from '@/components/settings/MemoriesCard';
import { toast } from '@/components/feedback';
import { useOAuthLogin, type OAuthProvider } from '@/hooks/useOAuthLogin';
import {
  RESPONSE_LANGUAGES,
  selectIsGuest,
  useAuthStore,
  useConversationsStore,
  useGuestStore,
  useMemoriesStore,
  useSettingsStore,
} from '@/stores';
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
  const { login: oauthLogin, pending: oauthPending } = useOAuthLogin();

  const authedCount = useConversationsStore((s) => s.list.length);
  const guestCount = useGuestStore((s) => s.conversations.length);
  const conversationCount = isGuest ? guestCount : authedCount;

  const authedMessageCount = useConversationsStore((s) =>
    s.list.reduce((acc, c) => acc + c.messageCount, 0),
  );
  const guestMessageCount = useGuestStore((s) =>
    Object.values(s.messagesByConv).reduce((acc, msgs) => acc + msgs.length, 0),
  );
  const guestTokens = useGuestStore((s) =>
    Object.values(s.messagesByConv).reduce(
      (acc, msgs) => acc + msgs.reduce((a, m) => a + (m.tokensIn ?? 0) + (m.tokensOut ?? 0), 0),
      0,
    ),
  );
  const authedMemories = useMemoriesStore((s) => s.list.length);
  const guestMemories = useGuestStore((s) => s.memories.length);
  const fetchMemories = useMemoriesStore((s) => s.fetchAll);

  const messageCount = isGuest ? guestMessageCount : authedMessageCount;
  const memoryCount = isGuest ? guestMemories : authedMemories;

  // Authed memory count is a server list — pull it once for the stats card
  // (MemoriesCard below shares the same store).
  useEffect(() => {
    if (!isGuest) fetchMemories().catch(() => {});
  }, [isGuest, fetchMemories]);

  const responseLanguage = useSettingsStore((s) => s.responseLanguage);
  const setResponseLanguage = useSettingsStore((s) => s.setResponseLanguage);
  const showGenerationStats = useSettingsStore((s) => s.showGenerationStats);
  const setShowGenerationStats = useSettingsStore((s) => s.setShowGenerationStats);

  const handleSignOut = async () => {
    await signOut();
    await enterGuestMode();
    toast.show('Você saiu da conta.');
    (router as { replace: (p: string) => void }).replace('/(tabs)');
  };

  const handleProvider = (provider: OAuthProvider) => {
    oauthLogin(provider);
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

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
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

        {isGuest ? (
          <Card $elevation={0} $padding="lg">
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
              Vincular conta
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 10, lineHeight: 18 }}>
              Entre para sincronizar conversas, memórias e usar modelos em nuvem. Seus dados
              de convidado são migrados automaticamente.
            </Text>
            <OAuthRow
              label="Continuar com Google"
              badge={<Text style={{ fontSize: 18, fontWeight: 800, color: '#4285F4' }}>G</Text>}
              pending={oauthPending === 'google'}
              disabled={oauthPending !== null}
              onPress={() => handleProvider('google')}
            />
            <OAuthRow
              label="Continuar com GitHub"
              badge={<Text style={{ fontSize: 16, fontWeight: 800, color: colors.text }}>⌥</Text>}
              pending={oauthPending === 'github'}
              disabled={oauthPending !== null}
              onPress={() => handleProvider('github')}
            />
          </Card>
        ) : null}

        <Card $elevation={0} $padding="lg">
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 10 }}>
            Estatísticas
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ color: colors.textSecondary }}>Conversas</Text>
            <Text style={{ color: colors.text }}>{conversationCount}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ color: colors.textSecondary }}>Mensagens</Text>
            <Text style={{ color: colors.text }}>
              {messageCount.toLocaleString('pt-BR')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ color: colors.textSecondary }}>Memórias</Text>
            <Text style={{ color: colors.text }}>{memoryCount}</Text>
          </View>
          {isGuest ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ color: colors.textSecondary }}>Tokens processados</Text>
              <Text style={{ color: colors.text }}>
                {guestTokens.toLocaleString('pt-BR')}
              </Text>
            </View>
          ) : null}
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

        <Card $elevation={0} $padding="lg">
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 10 }}>
            Conversa
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 6 }}>
            Idioma padrão das respostas
          </Text>
          {RESPONSE_LANGUAGES.map((lang) => {
            const active = responseLanguage === lang.value;
            return (
              <Pressable
                key={lang.value}
                onPress={() => setResponseLanguage(lang.value)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}
              >
                <Text style={{ color: active ? colors.accent : colors.text }}>{lang.label}</Text>
                <Text style={{ color: active ? colors.accent : colors.textMuted, fontSize: 18 }}>
                  {active ? '●' : '○'}
                </Text>
              </Pressable>
            );
          })}
          <Divider />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: colors.text, fontSize: 14 }}>Velocidade de processamento</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                Mostra tok/s e a duração de cada resposta.
              </Text>
            </View>
            <Switch
              value={showGenerationStats}
              onValueChange={setShowGenerationStats}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={showGenerationStats ? colors.accentText : colors.textMuted}
              accessibilityLabel="Mostrar velocidade de processamento"
            />
          </View>
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
      </ScrollView>
    </View>
  );
}

interface OAuthRowProps {
  label: string;
  badge: React.ReactNode;
  pending: boolean;
  disabled: boolean;
  onPress: () => void;
}

function OAuthRow({ label, badge, pending, disabled, onPress }: OAuthRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: pressed ? colors.surfaceOverlay : colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: 8,
        opacity: pending ? 0.5 : 1,
      })}
    >
      {badge}
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: 600 }}>
        {pending ? 'Conectando…' : label}
      </Text>
    </Pressable>
  );
}
