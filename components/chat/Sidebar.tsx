import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, ScrollView, Text, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
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

import { Avatar, Button, IconButton, Input } from '@/components/ui';
import { BottomSheet } from '@/components/sheets';
import { toast } from '@/components/feedback';
import {
  buildProjectTree,
  selectIsGuest,
  useAuthStore,
  useConversationsStore,
  useGuestStore,
  useProjectsStore,
} from '@/stores';
import type { ProjectResponse } from '@/api/types';
import { useTheme } from '@/theme';
import { easings } from '@/theme/motion';
import { formatRelativeDate } from '@/lib/format';

import { ConversationActionsSheet, type ConversationTarget } from './ConversationActionsSheet';
import { ProjectActionsSheet } from './ProjectActionsSheet';
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
  Indented,
  IndentedDeep,
  NavBadge,
  NavChevron,
  NavLabel,
  NavRow,
  NewChatButton,
  NewChatLabel,
  ProfileHint,
  ProfileMeta,
  ProfileName,
  ProfileRow,
  SectionAction,
  SectionActionLabel,
  SectionHeader,
  SectionHint,
  SectionLabel,
  SheetSection,
  TopBar,
  TreeChevron,
  TreeCount,
  TreeName,
  TreeNewChat,
  TreeNewChatLabel,
  TreeRow,
} from './Sidebar.styles';

export interface SidebarProps {
  open: boolean;
  onClose: () => void;
  /** Starts a new chat; passing a project/folder id makes it born filed there. */
  onNewChat: (projectId?: string) => void;
  onSelectConversation: (id: string) => void;
  onOpenProfile: () => void;
  /** Notifies the host screen when a conversation is deleted (may reset the view). */
  onConversationDeleted: (id: string) => void;
}

const ENTRY_MS = 280;
const EXIT_MS = 200;

interface Row extends ConversationTarget {
  subtitle: string;
  updatedAt: string;
}

/** Navigation entries below the chat sections (screens under app/). */
const NAV_ITEMS: { label: string; route: string; soon?: boolean }[] = [
  { label: 'Memórias', route: '/memories' },
  { label: 'Skills', route: '/skills', soon: true },
  { label: 'Commands', route: '/commands', soon: true },
  { label: 'MCPs', route: '/mcps', soon: true },
  { label: 'Plugins', route: '/plugins', soon: true },
  { label: 'Tarefas', route: '/tasks', soon: true },
];

export function Sidebar({
  open,
  onClose,
  onNewChat,
  onSelectConversation,
  onOpenProfile,
  onConversationDeleted,
}: SidebarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isGuest = useAuthStore(selectIsGuest);
  const user = useAuthStore((s) => s.user);

  const authedList = useConversationsStore((s) => s.list);
  const guestList = useGuestStore((s) => s.conversations);
  const guestMessagesByConv = useGuestStore((s) => s.messagesByConv);
  const projects = useProjectsStore((s) => s.list);

  // Collapsed/expanded state of the project tree.
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Action sheets: driven by non-null targets.
  const [convActions, setConvActions] = useState<Row | null>(null);
  const [projectActions, setProjectActions] = useState<ProjectResponse | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');

  useEffect(() => {
    if (open && !isGuest) useProjectsStore.getState().fetchAll().catch(() => {});
  }, [open, isGuest]);

  useEffect(() => {
    if (createOpen) setCreateName('');
  }, [createOpen]);

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
        pinned: c.pinned,
      }));
    }
    return authedList.map((c) => ({
      id: c.id,
      title: c.title || 'Nova conversa',
      subtitle: `${c.messageCount} mensagens`,
      updatedAt: c.updatedAt,
      pinned: c.pinned,
      projectId: c.projectId,
    }));
  }, [isGuest, guestList, guestMessagesByConv, authedList]);

  const tree = useMemo(() => (isGuest ? [] : buildProjectTree(projects)), [isGuest, projects]);
  const unfiled = useMemo(() => rows.filter((r) => !r.projectId), [rows]);
  const convsByProject = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      if (!r.projectId) continue;
      const bucket = map.get(r.projectId);
      if (bucket) bucket.push(r);
      else map.set(r.projectId, [r]);
    }
    return map;
  }, [rows]);

  const toggleIn = (set: Set<string>, id: string, setter: (next: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const renderConversation = useCallback(
    (item: Row) => (
      <ConversationItem
        key={item.id}
        onPress={() => onSelectConversation(item.id)}
        onLongPress={() => setConvActions(item)}
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

  const handleCreateProject = async () => {
    const name = createName.trim();
    if (!name) return;
    try {
      await useProjectsStore.getState().create({ name });
      toast.success('Projeto criado.');
      setCreateOpen(false);
    } catch (e) {
      toast.error('Não foi possível criar', String(e));
    }
  };

  const handleNavigate = useCallback(
    (route: string) => {
      onClose();
      (router as { push: (p: string) => void }).push(route);
    },
    [onClose, router],
  );

  const empty = rows.length === 0 && (isGuest || tree.length === 0);

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
                onPress={() => onNewChat()}
                accessibilityRole="button"
                accessibilityLabel="Nova conversa"
              >
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 700 }}>+</Text>
                <NewChatLabel>Nova conversa</NewChatLabel>
              </NewChatButton>

              {empty ? (
                <HistoryEmpty>
                  <HistoryEmptyText>Suas conversas aparecerão aqui.</HistoryEmptyText>
                </HistoryEmpty>
              ) : (
                <HistoryListWrap>
                  <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 12 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {isGuest ? null : (
                      <>
                        <SectionHeader>
                          <SectionLabel>Projetos</SectionLabel>
                          <SectionAction
                            onPress={() => setCreateOpen(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Novo projeto"
                          >
                            <SectionActionLabel>+</SectionActionLabel>
                          </SectionAction>
                        </SectionHeader>
                        {tree.length === 0 ? (
                          <SectionHint>
                            Agrupe conversas por projeto — ex.: “clone google drive” com pastas
                            backend e frontend.
                          </SectionHint>
                        ) : null}
                        {tree.map(({ project, folders, totalCount }) => {
                          const projectOpen = expandedProjects.has(project.id);
                          return (
                            <React.Fragment key={project.id}>
                              <TreeRow
                                onPress={() => toggleIn(expandedProjects, project.id, setExpandedProjects)}
                                onLongPress={() => setProjectActions(project)}
                                style={({ pressed }) => ({
                                  backgroundColor: pressed ? colors.surfaceOverlay : 'transparent',
                                })}
                                accessibilityRole="button"
                                accessibilityLabel={`Projeto ${project.name}`}
                              >
                                <TreeChevron>{projectOpen ? '▾' : '▸'}</TreeChevron>
                                <TreeName numberOfLines={1}>{project.name}</TreeName>
                                <TreeCount>{totalCount}</TreeCount>
                                <TreeNewChat
                                  onPress={() => onNewChat(project.id)}
                                  hitSlop={8}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Nova conversa em ${project.name}`}
                                >
                                  <TreeNewChatLabel>+</TreeNewChatLabel>
                                </TreeNewChat>
                              </TreeRow>
                              {projectOpen ? (
                                <React.Fragment>
                                  {folders.map((folder) => {
                                    const folderOpen = expandedFolders.has(folder.id);
                                    return (
                                      <React.Fragment key={folder.id}>
                                        <Indented>
                                          <TreeRow
                                            onPress={() =>
                                              toggleIn(expandedFolders, folder.id, setExpandedFolders)
                                            }
                                            onLongPress={() => setProjectActions(folder)}
                                            style={({ pressed }) => ({
                                              backgroundColor: pressed ? colors.surfaceOverlay : 'transparent',
                                            })}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Pasta ${folder.name}`}
                                          >
                                            <TreeChevron>{folderOpen ? '▾' : '▸'}</TreeChevron>
                                            <TreeName numberOfLines={1}>{folder.name}</TreeName>
                                            <TreeCount>{folder.conversationCount}</TreeCount>
                                            <TreeNewChat
                                              onPress={() => onNewChat(folder.id)}
                                              hitSlop={8}
                                              accessibilityRole="button"
                                              accessibilityLabel={`Nova conversa em ${folder.name}`}
                                            >
                                              <TreeNewChatLabel>+</TreeNewChatLabel>
                                            </TreeNewChat>
                                          </TreeRow>
                                        </Indented>
                                        {folderOpen ? (
                                          <IndentedDeep>
                                            {(convsByProject.get(folder.id) ?? []).map(renderConversation)}
                                          </IndentedDeep>
                                        ) : null}
                                      </React.Fragment>
                                    );
                                  })}
                                  {(convsByProject.get(project.id) ?? []).map(renderConversation)}
                                </React.Fragment>
                              ) : null}
                            </React.Fragment>
                          );
                        })}
                      </>
                    )}

                    <SectionHeader>
                      <SectionLabel>Conversas</SectionLabel>
                    </SectionHeader>
                    {unfiled.map(renderConversation)}
                    {unfiled.length === 0 && tree.length > 0 ? (
                      <SectionHint>Todas as conversas estão em projetos.</SectionHint>
                    ) : null}

                    <SectionHeader>
                      <SectionLabel>Workspace</SectionLabel>
                    </SectionHeader>
                    {NAV_ITEMS.map((item) => (
                      <NavRow
                        key={item.route}
                        onPress={() => handleNavigate(item.route)}
                        style={({ pressed }) => ({
                          backgroundColor: pressed ? colors.surfaceOverlay : 'transparent',
                        })}
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                      >
                        <NavLabel>{item.label}</NavLabel>
                        {item.soon ? <NavBadge>Em breve</NavBadge> : null}
                        <NavChevron>›</NavChevron>
                      </NavRow>
                    ))}
                  </ScrollView>
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

      <ConversationActionsSheet
        visible={convActions !== null}
        conversation={convActions}
        isGuest={isGuest}
        projects={projects}
        onClose={() => setConvActions(null)}
        onDeleted={onConversationDeleted}
      />

      <ProjectActionsSheet
        visible={projectActions !== null}
        project={projectActions}
        onClose={() => setProjectActions(null)}
      />

      <BottomSheet visible={createOpen} onClose={() => setCreateOpen(false)}>
        <SheetSection>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: 700 }}>Novo projeto</Text>
          <Input
            value={createName}
            onChangeText={setCreateName}
            placeholder="Ex.: clone google drive"
            autoFocus
            maxLength={100}
          />
          <Button size="sm" onPress={handleCreateProject}>
            Criar
          </Button>
          <Button size="sm" variant="ghost" onPress={() => setCreateOpen(false)}>
            Cancelar
          </Button>
        </SheetSection>
      </BottomSheet>
    </DrawerHost>
  );
}
