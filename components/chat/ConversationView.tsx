import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, IconButton } from '@/components/ui';
import { MarkdownView } from '@/components/markdown';
import { useChatSession } from '@/hooks/useChatSession';
import { useTheme } from '@/theme';

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
  TypingIndicator,
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
}

/**
 * The full chat experience (header + message list + composer). Used both by the
 * /conversation/[id] route and embedded in-place on the home screen, so a new
 * chat never leaves the screen it started on.
 */
export function ConversationView({ id, initial, onExit, onOpenSidebar }: ConversationViewProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { conversation, messages, loading, streaming, error, send, cancel } = useChatSession(id);

  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const pendingInitialRef = useRef<string | null>(initial ?? null);

  // Autoscroll on new content. Trigger is the message count.
  const messageCount = messages.length;
  const autoscroll = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);
  useEffect(() => {
    void messageCount;
    autoscroll();
  }, [messageCount, autoscroll]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || streaming) return;
    Keyboard.dismiss();
    setInput('');
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
          <ChatHeaderSubtitle numberOfLines={1}>{conversation?.model}</ChatHeaderSubtitle>
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
        <ChatScroll ref={scrollRef} contentContainerStyle={{ flexGrow: 1 }}>
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
                  <UserBubble key={m.id} staggerIndex={i} animateIn={i < 6}>
                    {m.content}
                  </UserBubble>
                ) : (
                  <AssistantBubble
                    key={m.id}
                    staggerIndex={i}
                    animateIn={i < 6}
                    avatarName="Cortex"
                    meta={
                      m.tokensIn && m.tokensOut ? `${m.tokensIn}/${m.tokensOut} tokens` : undefined
                    }
                  >
                    {m.content || (streaming && i === messages.length - 1 ? '…' : '') ? (
                      <MarkdownView>{m.content}</MarkdownView>
                    ) : null}
                  </AssistantBubble>
                ),
              )
            )}
            {streaming ? (
              <TypingIndicator>Cortex está escrevendo…</TypingIndicator>
            ) : null}
          </ChatScrollContent>
        </ChatScroll>

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
    </ChatScreenContainer>
  );
}
