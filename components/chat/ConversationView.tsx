import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, IconButton } from '@/components/ui';
import { MarkdownView } from '@/components/markdown';
import { useChatSession } from '@/hooks/useChatSession';
import { selectIsGuest, useAuthStore, useConversationsStore, useGuestStore, useMemoriesStore, useModelPrefsStore, useSettingsStore } from '@/stores';
import type { ChatProviderKind } from '@/api/types';
import { PROVIDER_LABEL } from '@/stores/providersStore';
import { toast } from '@/components/feedback';
import { useTheme } from '@/theme';

import { ModelPickerSheet } from './ModelPickerSheet';
import { MemoryProposalSheet } from './MemoryProposalSheet';
import { ReasoningBlock } from './ReasoningBlock';
import { TypingDots } from './TypingDots';

import { AssistantBubble, UserBubble } from './Bubble';
import {
  ChatComposer,
  ChatHeader,
  ChatHeaderMeta,
  ChatHeaderSubtitle,
  ChatHeaderTitle,
  ChatScreenContainer,
  ChatScroll,
  ChatScrollContent,
  ComposerInput,
  ComposerInputWrap,
  ComposerRow,
} from '@/components/screens/conversation.styles';

interface ConversationViewProps {
  /** Conversation id — resolved reactively from the guest/authed stores. */
  id: string;
  /** Message auto-sent once the conversation is available (first message flow). */
  initial?: string | null;
  /** Shown when this view is embedded (home screen) — returns to the greet state. */
  onExit?: () => void;
  /** When provided, renders a menu (☰) button that opens the history sidebar. */
  onOpenSidebar?: () => void;
  /** Play the bubble entrance stagger (disable when swapping between conversations). */
  animateBubbles?: boolean;
}

/**
 * The full chat experience (header + message list + composer). Used both by the
 * /conversation/[id] route and embedded in-place on the home screen, so a new
 * chat never leaves the screen it started on.
 */
export function ConversationView({ id, initial, onExit, onOpenSidebar, animateBubbles = true }: ConversationViewProps) {
  const insets = useSafeAreaInsets();
  const { colors, elevation } = useTheme();
  const isGuest = useAuthStore(selectIsGuest);
  const showGenerationStats = useSettingsStore((s) => s.showGenerationStats);

  const {
    conversation,
    messages,
    loading,
    streaming,
    error,
    memoryProposals,
    dismissProposals,
    send,
    cancel,
  } = useChatSession(id);

  const [input, setInput] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pendingInitialRef = useRef<string | null>(initial ?? null);

  // Switch the conversation's provider × model (persisted server-side or on-device).
  // The choice also becomes the default for NEW conversations (ChatGPT-style).
  const handleSelectModel = useCallback(
    async (provider: ChatProviderKind, model: string) => {
      setPickerOpen(false);
      useModelPrefsStore.getState().setPreferred({ provider, model });
      try {
        if (isGuest) {
          useGuestStore.getState().setModel(id, provider, model);
        } else {
          await useConversationsStore.getState().setModel(id, provider, model);
        }
      } catch (e) {
        toast.error('Não foi possível trocar o modelo', String(e));
      }
    },
    [id, isGuest],
  );

  // Configure/clear the routing fallback (authed conversations only).
  const handleSelectFallback = useCallback(
    async (provider: ChatProviderKind | null, model: string | null) => {
      setPickerOpen(false);
      try {
        await useConversationsStore.getState().setFallback(id, provider, model);
        toast.show(provider ? 'Reserva configurada.' : 'Reserva removida.');
      } catch (e) {
        toast.error('Não foi possível configurar a reserva', String(e));
      }
    },
    [id],
  );

  // Confirmed extraction proposals become global memories.
  const handleSaveProposals = useCallback(
    async (confirmed: string[]) => {
      dismissProposals();
      if (confirmed.length === 0) return;
      try {
        for (const content of confirmed) {
          await useMemoriesStore.getState().create({ scope: 'Global', content });
        }
        toast.success(`${confirmed.length} memória${confirmed.length === 1 ? ' salva' : 's salvas'}.`);
      } catch (e) {
        toast.error('Não foi possível salvar as memórias', String(e));
      }
    },
    [dismissProposals],
  );

  // Estimated conversation cost so far (null when every model is local/free).
  const totalCost = useMemo(
    () => messages.reduce((acc, m) => acc + (m.costUsd ?? 0), 0),
    [messages],
  );

  // ---- Scroll: follow the stream, but yield to manual scrolling ----
  // Follow mode stays on while the user is at (or near) the bottom; scrolling
  // up pauses following and shows a jump-to-bottom button.
  const followRef = useRef(true);
  const firstLayoutRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const nearBottom = distanceFromBottom < 80;
    if (nearBottom !== followRef.current) {
      followRef.current = nearBottom;
      setShowJump(!nearBottom);
    }
  }, []);

  const jumpToBottom = useCallback(() => {
    followRef.current = true;
    setShowJump(false);
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  // Follow every content change (the messages identity changes on each delta).
  // Instant on the first layout and while streaming; animated otherwise.
  useEffect(() => {
    if (!followRef.current) return;
    const instant = firstLayoutRef.current || streaming;
    firstLayoutRef.current = false;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: !instant });
    });
  }, [messages, streaming]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || streaming) return;
    Keyboard.dismiss();
    setInput('');
    // Sending always re-engages follow mode, even if the user was reading up.
    followRef.current = true;
    setShowJump(false);
    await send(content);
  }, [input, streaming, send]);

  const canSend = useMemo(() => input.trim().length > 0 && !streaming, [input, streaming]);

  // Auto-send the initial message passed in by the caller (first message flow).
  useEffect(() => {
    if (!conversation) return;
    const pending = pendingInitialRef.current;
    if (!pending) return;
    pendingInitialRef.current = null;
    void send(pending);
  }, [conversation, send]);

  return (
    <ChatScreenContainer style={{ paddingTop: insets.top }}>
      <ChatHeader>
        {onOpenSidebar ? (
          <IconButton
            variant="ghost"
            icon={<Text style={{ color: colors.text, fontSize: 20 }}>☰</Text>}
            onPress={onOpenSidebar}
            accessibilityLabel="Histórico"
          />
        ) : null}
        {onExit ? (
          <IconButton
            variant="ghost"
            icon={<Text style={{ color: colors.text, fontSize: 22 }}>‹</Text>}
            onPress={onExit}
            accessibilityLabel="Voltar"
          />
        ) : null}
        <ChatHeaderMeta>
          <ChatHeaderTitle numberOfLines={1}>{conversation?.title ?? 'Conversa'}</ChatHeaderTitle>
          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Trocar modelo"
          >
            <ChatHeaderSubtitle numberOfLines={1}>
              {conversation
                ? `${PROVIDER_LABEL[conversation.provider]} · ${conversation.model}`
                : '—'}
            </ChatHeaderSubtitle>
          </Pressable>
        </ChatHeaderMeta>
        {streaming ? (
          <IconButton
            variant="ghost"
            icon={<Text style={{ color: colors.textSecondary, fontSize: 13 }}>Parar</Text>}
            onPress={cancel}
            accessibilityLabel="Parar geração"
          />
        ) : null}
      </ChatHeader>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={8}
      >
        <View style={{ flex: 1 }}>
          <ChatScroll
            ref={scrollRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <ChatScrollContent>
              {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : error ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                  <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{error}</Text>
                </View>
              ) : messages.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                  <Avatar name="Cortex" size={56} />
                  <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 15 }}>
                    Comece a conversar abaixo.
                  </Text>
                </View>
              ) : (
                messages.map((m, i) =>
                  m.role === 'User' ? (
                    <UserBubble key={m.id} staggerIndex={i} animateIn={animateBubbles && i < 6}>
                      {m.content}
                    </UserBubble>
                  ) : (
                    <AssistantBubble
                      key={m.id}
                      staggerIndex={i}
                      animateIn={animateBubbles && i < 6}
                      avatarName="Cortex"
                      hug={streaming && i === messages.length - 1 && !m.content && !m.reasoning}
                      header={
                        m.reasoning ? (
                          <ReasoningBlock
                            text={m.reasoning}
                            active={streaming && i === messages.length - 1 && !m.content}
                          />
                        ) : undefined
                      }
                      meta={(() => {
                        const parts: string[] = [];
                        if (m.tokensIn && m.tokensOut) parts.push(`${m.tokensIn}/${m.tokensOut} tokens`);
                        if (m.costUsd != null) parts.push(`$${m.costUsd.toFixed(4)}`);
                        if (showGenerationStats) {
                          if (m.tokensPerSecond != null) {
                            parts.push(
                              `${m.tokensPerSecond.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} tok/s`,
                            );
                          }
                          if (m.durationMs != null && m.durationMs > 0) {
                            parts.push(
                              `${(m.durationMs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`,
                            );
                          }
                        }
                        return parts.length > 0 ? parts.join(' · ') : undefined;
                      })()}
                    >
                      {m.content ? (
                        <MarkdownView>{m.content}</MarkdownView>
                      ) : streaming && i === messages.length - 1 ? (
                        <TypingDots />
                      ) : null}
                    </AssistantBubble>
                  ),
                )
              )}
              {totalCost > 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', paddingTop: 4 }}>
                  Custo estimado da conversa: ${totalCost.toFixed(4)}
                </Text>
              ) : null}
            </ChatScrollContent>
          </ChatScroll>

          {showJump ? (
            <View
              style={{
                position: 'absolute',
                right: 12,
                bottom: 12,
                borderRadius: 999,
                ...elevation(2),
              }}
            >
              <IconButton
                variant="default"
                round
                icon={<Text style={{ color: colors.textSecondary, fontSize: 20, lineHeight: 22 }}>↓</Text>}
                onPress={jumpToBottom}
                accessibilityLabel="Ir para a mensagem mais recente"
              />
            </View>
          ) : null}
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
                editable={!streaming}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                blurOnSubmit={false}
              />
            </ComposerInputWrap>
            <IconButton
              variant="accent"
              icon={<Text style={{ color: colors.accentText, fontSize: 18 }}>↑</Text>}
              disabled={!canSend}
              onPress={handleSend}
              accessibilityLabel="Enviar"
            />
          </ComposerRow>
        </ChatComposer>
      </KeyboardAvoidingView>

      <ModelPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        isGuest={isGuest}
        title="Trocar modelo"
        selection={conversation ? { provider: conversation.provider, model: conversation.model } : null}
        onSelect={handleSelectModel}
        fallbackSelection={
          conversation?.fallbackProvider && conversation.fallbackModel
            ? { provider: conversation.fallbackProvider, model: conversation.fallbackModel }
            : null
        }
        onSelectFallback={isGuest ? undefined : handleSelectFallback}
      />

      <MemoryProposalSheet
        visible={memoryProposals !== null}
        proposals={memoryProposals}
        onSave={handleSaveProposals}
        onClose={dismissProposals}
      />
    </ChatScreenContainer>
  );
}
