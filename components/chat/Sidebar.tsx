import React, { useCallback, useEffect, useMemo } from 'react';
import { BackHandler, FlatList, Text, TouchableWithoutFeedback } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, IconButton } from '@/components/ui';
import { selectIsGuest, useAuthStore, useConversationsStore, useGuestStore } from '@/stores';
import { useTheme } from '@/theme';
import { easings } from '@/theme/motion';
import { formatRelativeDate } from '@/lib/format';

import {
  BrandMark,
  BrandRow,
  ConversationItem,
  ConversationSub,
  ConversationTitle,
  DrawerBody,
  DrawerSurface,
  DRAWER_WIDTH,
  DrawerHost,
  Footer,
  HistoryEmpty,
  HistoryEmptyText,
  HistoryListWrap,
  NewChatButton,
  NewChatLabel,
  ProfileHint,
  ProfileMeta,
  ProfileName,
  ProfileRow,
  TopBar,
} from './Sidebar.styles';

export interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onOpenProfile: () => void;
}

const ENTRY_MS = 280;
const EXIT_MS = 200;

interface Row {
  id: string;
  title: string;
  subtitle: string;
  updatedAt: string;
}

export function Sidebar({
  open,
  onClose,
  onNewChat,
  onSelectConversation,
  onOpenProfile,
}: SidebarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isGuest = useAuthStore(selectIsGuest);
  const user = useAuthStore((s) => s.user);

  const authedList = useConversationsStore((s) => s.list);
  const guestList = useGuestStore((s) => s.conversations);
  const guestMessagesByConv = useGuestStore((s) => s.messagesByConv);

  const translateX = useSharedValue(-DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);

  // Animate in / out based on `open`. Always mounted so the exit animation plays.
  useEffect(() => {
    if (open) {
      translateX.value = withTiming(0, { duration: ENTRY_MS, easing: Easing.bezier(...easings.drawer) });
      backdropOpacity.value = withTiming(0.5, { duration: ENTRY_MS });
    } else {
      translateX.value = withTiming(-DRAWER_WIDTH, { duration: EXIT_MS, easing: Easing.bezier(...easings.decelerate) });
      backdropOpacity.value = withTiming(0, { duration: EXIT_MS });
    }
  }, [open, translateX, backdropOpacity]);

  // Android back closes the drawer instead of the screen.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          'worklet';
          cancelAnimation(translateX);
        })
        .onUpdate((e) => {
          'worklet';
          const next = Math.min(0, Math.max(-DRAWER_WIDTH, e.translationX));
          translateX.value = next;
          backdropOpacity.value = 0.5 * (1 + next / DRAWER_WIDTH);
        })
        .onEnd((e) => {
          'worklet';
          const past = e.translationX < -DRAWER_WIDTH * 0.4 || e.velocityX < -600;
          if (past) {
            runOnJS(onClose)();
          } else {
            translateX.value = withTiming(0, { duration: ENTRY_MS, easing: Easing.bezier(...easings.drawer) });
            backdropOpacity.value = withTiming(0.5, { duration: ENTRY_MS });
          }
        }),
    [translateX, backdropOpacity, onClose],
  );

  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  const rows: Row[] = useMemo(() => {
    if (isGuest) {
      return guestList.map((c) => ({
        id: c.id,
        title: c.title || 'Nova conversa',
        subtitle: `${guestMessagesByConv[c.id]?.length ?? 0} mensagens`,
        updatedAt: c.updatedAt,
      }));
    }
    return authedList.map((c) => ({
      id: c.id,
      title: c.title || 'Nova conversa',
      subtitle: `${c.messageCount} mensagens`,
      updatedAt: c.updatedAt,
    }));
  }, [isGuest, guestList, guestMessagesByConv, authedList]);

  const renderRow = useCallback(
    ({ item }: { item: Row }) => (
      <ConversationItem
        onPress={() => onSelectConversation(item.id)}
        style={({ pressed }) => ({ backgroundColor: pressed ? colors.surfaceOverlay : 'transparent' })}
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${item.title}`}
      >
        <ConversationTitle numberOfLines={1}>{item.title}</ConversationTitle>
        <ConversationSub numberOfLines={1}>
          {item.subtitle} · {formatRelativeDate(item.updatedAt)}
        </ConversationSub>
      </ConversationItem>
    ),
    [colors.surfaceOverlay, onSelectConversation],
  );

  return (
    <DrawerHost pointerEvents={open ? 'auto' : 'none'}>
      <TouchableWithoutFeedback onPressIn={onClose} accessible={false}>
        <Animated.View
          style={[
            { position: 'absolute', inset: 0, backgroundColor: '#000' },
            backdropStyle,
          ]}
        />
      </TouchableWithoutFeedback>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: DRAWER_WIDTH,
            },
            drawerStyle,
          ]}
        >
          <DrawerSurface>
            <DrawerBody style={{ paddingTop: insets.top }}>
              <TopBar>
                <BrandRow>
                  <BrandMark>Cortex</BrandMark>
                </BrandRow>
                <IconButton
                  variant="ghost"
                  icon={<Text style={{ color: colors.text, fontSize: 20 }}>✕</Text>}
                  onPress={onClose}
                  accessibilityLabel="Fechar menu"
                />
              </TopBar>

              <NewChatButton
                onPress={onNewChat}
                accessibilityRole="button"
                accessibilityLabel="Nova conversa"
              >
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 700 }}>+</Text>
                <NewChatLabel>Nova conversa</NewChatLabel>
              </NewChatButton>

              {rows.length === 0 ? (
                <HistoryEmpty>
                  <HistoryEmptyText>Suas conversas aparecerão aqui.</HistoryEmptyText>
                </HistoryEmpty>
              ) : (
                <HistoryListWrap>
                  <FlatList
                    data={rows}
                    keyExtractor={(item: Row) => item.id}
                    renderItem={renderRow}
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                  />
                </HistoryListWrap>
              )}

              <Footer style={{ paddingBottom: insets.bottom + 8 }}>
                <ProfileRow
                  onPress={onOpenProfile}
                  style={({ pressed }) => ({ backgroundColor: pressed ? colors.surfaceOverlay : 'transparent' })}
                  accessibilityRole="button"
                  accessibilityLabel={isGuest ? 'Entrar na conta' : 'Opções da conta'}
                >
                  <Avatar src={user?.avatarUrl ?? null} name={isGuest ? 'Convidado' : user?.name ?? 'Você'} size={36} />
                  <ProfileMeta>
                    <ProfileName numberOfLines={1}>
                      {isGuest ? 'Convidado' : user?.name ?? 'Você'}
                    </ProfileName>
                    <ProfileHint numberOfLines={1}>
                      {isGuest ? 'Toque para entrar' : user?.email ?? 'Conta conectada'}
                    </ProfileHint>
                  </ProfileMeta>
                  <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
                </ProfileRow>
              </Footer>
            </DrawerBody>
          </DrawerSurface>
        </Animated.View>
      </GestureDetector>
    </DrawerHost>
  );
}
