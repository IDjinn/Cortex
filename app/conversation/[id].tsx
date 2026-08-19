import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { ConversationView } from '@/components/chat';

/**
 * Route entry for deep links/direct navigation. The home screen embeds
 * ConversationView in-place (ChatGPT-style), so this route is only reached
 * when the conversation is opened from outside the app or by URL.
 */
export default function ConversationScreen() {
  const params = useLocalSearchParams<{ id: string; initial?: string }>();
  const router = useRouter();

  return (
    <ConversationView
      id={params.id}
      initial={params.initial ? decodeURIComponent(params.initial) : null}
      onExit={() => router.back()}
    />
  );
}
