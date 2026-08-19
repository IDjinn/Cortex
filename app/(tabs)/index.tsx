import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui';
import { ConversationView, Sidebar } from '@/components/chat';
import { BottomSheet } from '@/components/sheets';
import { useOAuthLogin, type OAuthProvider } from '@/hooks/useOAuthLogin';
import { toast } from '@/components/feedback';
import {
  selectIsGuest,
  useAuthStore,
  useConversationsStore,
  useGuestStore,
  useModelPrefsStore,
} from '@/stores';
import { listModels } from '@/api';
import { useTheme } from '@/theme';
import type { ChatProviderKind, ModelResponse } from '@/api/types';

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
  ModelChip,
  ModelChipText,
  ProviderBadge,
  ProviderColumn,
  ProviderLabel,
  ProvidersRow,
  TopBar,
} from '@/components/screens/tabs.styles';

const LOGO = require('@/assets/images/logo.png');

/** Local providers usable for new conversations (OpenRouter requires login). */
const LOCAL_PROVIDERS: ChatProviderKind[] = ['Ollama', 'LmStudio'];
const PROVIDER_LABEL: Record<ChatProviderKind, string> = {
  OpenRouter: 'OpenRouter',
  Ollama: 'Ollama',
  LmStudio: 'LM Studio',
};

type DefaultModel = { provider: ChatProviderKind; model: string } | null;
type PickerGroup = { provider: ChatProviderKind; models: ModelResponse[] };

/**
 * Default model for new conversations: the user's saved preference when the
 * model is still installed, else the server-configured default (isDefault),
 * else the first listed model of any reachable local provider.
 */
async function getDefaultModel(): Promise<DefaultModel> {
  const pref = useModelPrefsStore.getState().preferred;
  if (pref) {
    try {
      const models = await listModels(pref.provider);
      if (models.some((m) => m.id === pref.model)) return pref;
    } catch {
      // Preferred provider unreachable — fall through to server defaults.
    }
  }
  for (const provider of LOCAL_PROVIDERS) {
    try {
      const models = await listModels(provider);
      if (models.length === 0) continue;
      const def = models.find((m) => m.isDefault);
      return { provider, model: (def ?? models[0]).id };
    } catch {
      // Provider unreachable — try the next one.
    }
  }
  throw new Error('Nenhum modelo disponível no servidor.');
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
  const setPreferred = useModelPrefsStore((s) => s.setPreferred);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [input, setInput] = useState('');
  const [starting, setStarting] = useState(false);

  // ChatGPT-style: the conversation takes over the home screen in place.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingInitial, setPendingInitial] = useState<string | null>(null);

  // Model selector (chip + sheet) for new conversations.
  const [selection, setSelection] = useState<DefaultModel>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerGroups, setPickerGroups] = useState<PickerGroup[]>([]);

  const { login: oauthLogin, pending: oauthPending } = useOAuthLogin();

  useEffect(() => {
    getDefaultModel().then(setSelection).catch(() => {});
  }, []);

  const openSidebar = useCallback(() => {
    fetchAll().catch(() => {});
    setSidebarOpen(true);
  }, [fetchAll]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const handleNewChat = useCallback(() => {
    setSidebarOpen(false);
    setActiveId(null);
    setPendingInitial(null);
    setInput('');
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setSidebarOpen(false);
    setPendingInitial(null);
    setActiveId(id);
  }, []);

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

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    setPickerLoading(true);
    try {
      const groups = await Promise.all(
        LOCAL_PROVIDERS.map(async (provider) => {
          try {
            return { provider, models: await listModels(provider) };
          } catch {
            return { provider, models: [] as ModelResponse[] };
          }
        }),
      );
      setPickerGroups(groups.filter((g) => g.models.length > 0));
    } finally {
      setPickerLoading(false);
    }
  }, []);

  const handleChooseModel = useCallback(
    (provider: ChatProviderKind, model: string) => {
      setPreferred({ provider, model });
      setSelection({ provider, model });
      setPickerOpen(false);
    },
    [setPreferred],
  );

  const canSend = useMemo(() => input.trim().length > 0 && !starting, [input, starting]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || starting) return;
    setStarting(true);
    try {
      const def = selection ?? (await getDefaultModel());
      setSelection(def);
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
      setPendingInitial(content);
      setActiveId(id);
    } catch (e) {
      toast.error('Não foi possível iniciar a conversa', String(e));
    } finally {
      setStarting(false);
    }
  }, [input, starting, isGuest, selection, createGuest, createAuthed]);

  const selectionLabel = selection
    ? `${PROVIDER_LABEL[selection.provider]} · ${selection.model}`
    : 'Selecionar modelo';

  return (
    <HomeContainer>
      {activeId ? (
        <ConversationView
          key={activeId}
          id={activeId}
          initial={pendingInitial}
          onExit={handleNewChat}
          onOpenSidebar={openSidebar}
        />
      ) : (
        <View style={{ flex: 1, paddingTop: insets.top }}>
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

            <View style={{ paddingHorizontal: 16 }}>
              <ModelChip
                onPress={openPicker}
                accessibilityRole="button"
                accessibilityLabel="Escolher modelo">
                <ModelChipText numberOfLines={1}>{selectionLabel}</ModelChipText>
              </ModelChip>
            </View>

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
        </View>
      )}

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

      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)}>
        <View style={{ padding: 16, gap: 8 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Modelo
          </Text>
          {pickerLoading ? (
            <ActivityIndicator color={colors.accent} style={{ paddingVertical: 24 }} />
          ) : pickerGroups.length === 0 ? (
            <Text style={{ color: colors.textSecondary, paddingVertical: 24, textAlign: 'center' }}>
              Nenhum modelo disponível. Verifique se o Ollama ou o LM Studio está rodando.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 360 }} nestedScrollEnabled>
              {pickerGroups.map((group) => (
                <View key={group.provider} style={{ marginBottom: 12 }}>
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    {PROVIDER_LABEL[group.provider]}
                  </Text>
                  {group.models.map((m) => {
                    const selected = selection?.provider === group.provider && selection.model === m.id;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => handleChooseModel(group.provider, m.id)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 12,
                          backgroundColor: pressed
                            ? colors.surfaceOverlay
                            : selected
                              ? colors.surfaceOverlay
                              : colors.surface,
                          borderWidth: 1,
                          borderColor: selected ? colors.accent : colors.border,
                        })}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text style={{ color: colors.text, fontSize: 15, fontWeight: 600 }} numberOfLines={1}>
                            {m.name}
                          </Text>
                          <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
                            {m.id}
                            {m.isDefault ? ' · padrão' : ''}
                          </Text>
                        </View>
                        {selected ? (
                          <Text style={{ color: colors.accent, fontSize: 18 }}>✓</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </BottomSheet>
    </HomeContainer>
  );
}
