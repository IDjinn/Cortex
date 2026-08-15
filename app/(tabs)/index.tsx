import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui';
import { Sidebar } from '@/components/chat';
import { BottomSheet } from '@/components/sheets';
import { useOAuthLogin, type OAuthProvider } from '@/hooks/useOAuthLogin';
import { toast } from '@/components/feedback';
import {
  selectIsGuest,
  useAuthStore,
  useConversationsStore,
  useGuestStore,
} from '@/stores';
import { listModels } from '@/api';
import { useTheme } from '@/theme';
import type { ChatProviderKind } from '@/api/types';

import {
  Brand,
  BrandLogo,
  ChatComposer,
  ComposerInput,
  ComposerInputWrap,
  ComposerRow,
  EmptyStage,
  GreetSubtitle,
  GreetTitle,
  HomeContainer,
  ProviderBadge,
  ProviderColumn,
  ProviderLabel,
  ProvidersRow,
  TopBar,
} from '@/components/screens/tabs.styles';

const LOGO = require('@/assets/images/logo.png');

type DefaultModel = { provider: ChatProviderKind; model: string } | null;
let cachedDefault: DefaultModel = null;

async function getDefaultModel(isGuest: boolean): Promise<DefaultModel> {
  if (cachedDefault) return cachedDefault;
  const provider: ChatProviderKind = isGuest ? 'Ollama' : 'Ollama';
  try {
    const models = await listModels(provider);
    if (models.length === 0) {
      throw new Error('Nenhum modelo disponível no servidor.');
    }
    cachedDefault = { provider, model: models[0].id };
    return cachedDefault;
  } catch (e) {
    cachedDefault = null;
    throw e;
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isGuest = useAuthStore(selectIsGuest);
  const user = useAuthStore((s) => s.user);
  const createAuthed = useConversationsStore((s) => s.create);
  const createGuest = useGuestStore((s) => s.create);
  const fetchAll = useConversationsStore((s) => s.fetchAll);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [input, setInput] = useState('');
  const [starting, setStarting] = useState(false);

  const { login: oauthLogin, pending: oauthPending } = useOAuthLogin();

  const openSidebar = useCallback(() => {
    fetchAll().catch(() => {});
    setSidebarOpen(true);
  }, [fetchAll]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const handleNewChat = useCallback(() => {
    setSidebarOpen(false);
    setInput('');
  }, []);

  const handleSelectConversation = useCallback(
    (id: string) => {
      setSidebarOpen(false);
      (router as { push: (p: string) => void }).push(`/conversation/${id}`);
    },
    [router],
  );

  const handleOpenProfile = useCallback(() => {
    if (isGuest) {
      setProfileSheetOpen(true);
    } else {
      setSidebarOpen(false);
      (router as { push: (p: string) => void }).push('/settings');
    }
  }, [isGuest, router]);

  const handleProvider = useCallback(
    (provider: OAuthProvider) => {
      setProfileSheetOpen(false);
      setSidebarOpen(false);
      oauthLogin(provider);
    },
    [oauthLogin],
  );

  const handleCenterProvider = useCallback(
    (provider: OAuthProvider) => {
      oauthLogin(provider);
    },
    [oauthLogin],
  );

  const canSend = useMemo(() => input.trim().length > 0 && !starting, [input, starting]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || starting) return;
    setStarting(true);
    try {
      const def = await getDefaultModel(isGuest);
      if (!def) {
        toast.warning('Nenhum modelo disponível.');
        return;
      }
      let id: string;
      if (isGuest) {
        const conv = createGuest({ provider: def.provider, model: def.model });
        id = conv.id;
      } else {
        const conv = await createAuthed({
          provider: def.provider,
          model: def.model,
        });
        id = conv.id;
      }
      setInput('');
      (router as { push: (p: string) => void }).push(
        `/conversation/${id}?initial=${encodeURIComponent(content)}`,
      );
    } catch (e) {
      toast.error('Não foi possível iniciar a conversa', String(e));
    } finally {
      setStarting(false);
    }
  }, [input, starting, isGuest, createGuest, createAuthed, router]);

  return (
    <HomeContainer style={{ paddingTop: insets.top }}>
      <TopBar>
        <IconButton
          variant="ghost"
          icon={<Text style={{ color: colors.text, fontSize: 20 }}>☰</Text>}
          onPress={openSidebar}
          accessibilityLabel="Histórico"
        />
        <Brand>Cortex</Brand>
        <IconButton
          variant="ghost"
          icon={<Text style={{ color: colors.text, fontSize: 20 }}>✎</Text>}
          onPress={handleNewChat}
          accessibilityLabel="Nova conversa"
        />
      </TopBar>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={8}
      >
        <EmptyStage>
          <BrandLogo source={LOGO} />
          <GreetTitle>Como posso ajudar?</GreetTitle>
          <GreetSubtitle>
            {isGuest
              ? 'Faça login quando quiser sincronizar suas conversas.'
              : `Oi, ${user?.name?.split(' ')[0] ?? 'tudo bem'}? Pergunte qualquer coisa.`}
          </GreetSubtitle>

          {isGuest ? (
            <ProvidersRow>
              <ProviderColumn>
                <ProviderBadge
                  onPress={() => handleCenterProvider('google')}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? colors.surfaceOverlay : colors.surface,
                    opacity: oauthPending === 'google' ? 0.5 : 1,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel="Entrar com Google"
                  disabled={oauthPending !== null}
                >
                  <Text style={{ fontSize: 22, fontWeight: 800, color: '#4285F4' }}>G</Text>
                </ProviderBadge>
                <ProviderLabel>Google</ProviderLabel>
              </ProviderColumn>
              <ProviderColumn>
                <ProviderBadge
                  onPress={() => handleCenterProvider('github')}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? colors.surfaceOverlay : colors.surface,
                    opacity: oauthPending === 'github' ? 0.5 : 1,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel="Entrar com GitHub"
                  disabled={oauthPending !== null}
                >
                  <Text style={{ fontSize: 16, fontWeight: 800, color: colors.text }}>⌥</Text>
                </ProviderBadge>
                <ProviderLabel>GitHub</ProviderLabel>
              </ProviderColumn>
            </ProvidersRow>
          ) : null}
        </EmptyStage>

        <ChatComposer style={{ paddingBottom: insets.bottom + 8 }}>
          <ComposerRow>
            <ComposerInputWrap>
              <ComposerInput
                value={input}
                onChangeText={setInput}
                placeholder="Mensagem…"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={8000}
                editable={!starting}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                blurOnSubmit={false}
              />
            </ComposerInputWrap>
            <IconButton
              variant={canSend ? 'accent' : 'default'}
              icon={
                <Text style={{ color: canSend ? colors.accentText : colors.textMuted, fontSize: 18 }}>
                  ↑
                </Text>
              }
              disabled={!canSend}
              onPress={handleSend}
              accessibilityLabel="Enviar"
            />
          </ComposerRow>
        </ChatComposer>
      </KeyboardAvoidingView>

      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onOpenProfile={handleOpenProfile}
      />

      <BottomSheet visible={profileSheetOpen} onClose={() => setProfileSheetOpen(false)}>
        <View style={{ padding: 16, gap: 8 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Entrar na conta
          </Text>
          <Pressable
            onPress={() => handleProvider('google')}
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
            })}
          >
            <Text style={{ fontSize: 18, fontWeight: 800, color: '#4285F4' }}>G</Text>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: 600 }}>
              Continuar com Google
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleProvider('github')}
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
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: 800, color: colors.text }}>⌥</Text>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: 600 }}>
              Continuar com GitHub
            </Text>
          </Pressable>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
            Ao entrar, suas conversas serão sincronizadas.
          </Text>
        </View>
      </BottomSheet>
    </HomeContainer>
  );
}
