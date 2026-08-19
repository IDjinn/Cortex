import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { listProviders, listVaultKeys, removeVaultKey, saveVaultKey } from '@/api';
import type { ChatProviderKind, ProviderKeyResponse, ProviderResponse } from '@/api/types';
import { Button, Card, Input } from '@/components/ui';
import { toast } from '@/components/feedback';
import { selectIsGuest, useAuthStore, useKeysStore } from '@/stores';
import { useTheme } from '@/theme';

type KeyStatus = 'none' | 'device' | 'vault' | 'server';

const STATUS_LABEL: Record<KeyStatus, string> = {
  none: 'Sem chave',
  device: 'Neste dispositivo',
  vault: 'No cofre da conta',
  server: 'Chave do servidor',
};

/**
 * BYOK management: cloud providers listed from /api/providers with the key
 * status for each — device (SecureStore), account vault (encrypted at rest,
 * authed only) or the server's own configured key.
 */
export function ProviderKeysCard() {
  const { colors } = useTheme();
  const isGuest = useAuthStore(selectIsGuest);
  const deviceKeys = useKeysStore((s) => s.deviceKeys);
  const hydrate = useKeysStore((s) => s.hydrate);
  const setDeviceKey = useKeysStore((s) => s.setDeviceKey);
  const clearDeviceKey = useKeysStore((s) => s.clearDeviceKey);

  const [providers, setProviders] = useState<ProviderResponse[]>([]);
  const [vault, setVault] = useState<ProviderKeyResponse[]>([]);
  const [expanded, setExpanded] = useState<ChatProviderKind | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    listProviders().then(setProviders).catch(() => {});
    if (!isGuest) listVaultKeys().then(setVault).catch(() => {});
  };

  useEffect(() => {
    hydrate();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]);

  const statusFor = (p: ProviderResponse): KeyStatus => {
    if (deviceKeys[p.kind]) return 'device';
    if (vault.some((v) => v.provider === p.kind)) return 'vault';
    if (p.serverKeyConfigured) return 'server';
    return 'none';
  };

  const handleSaveDevice = async (kind: ChatProviderKind) => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await setDeviceKey(kind, draft.trim());
      setDraft('');
      setExpanded(null);
      toast.success('Chave salva no dispositivo.');
    } catch {
      toast.error('Não foi possível salvar a chave.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVault = async (kind: ChatProviderKind) => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await saveVaultKey(kind, draft.trim());
      setDraft('');
      setExpanded(null);
      setVault(await listVaultKeys());
      toast.success('Chave salva no cofre da conta.');
    } catch {
      toast.error('Não foi possível salvar a chave.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async (p: ProviderResponse) => {
    setSaving(true);
    try {
      if (deviceKeys[p.kind]) await clearDeviceKey(p.kind);
      if (!isGuest && vault.some((v) => v.provider === p.kind)) await removeVaultKey(p.kind);
      if (!isGuest) setVault(await listVaultKeys());
      toast.show('Chave removida.');
    } catch {
      toast.error('Não foi possível remover a chave.');
    } finally {
      setSaving(false);
    }
  };

  const remote = providers.filter((p) => p.requiresKey);

  return (
    <Card $elevation={0} $padding="lg">
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
        Provedores & chaves
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>
        Use suas próprias chaves (BYOK). Chaves no dispositivo nunca são enviadas ao servidor
        exceto como cabeçalho da requisição.
      </Text>
      {remote.map((p) => {
        const status = statusFor(p);
        const open = expanded === p.kind;
        return (
          <View key={p.kind} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 }}>
            <Pressable
              onPress={() => {
                setExpanded(open ? null : p.kind);
                setDraft('');
              }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}
              accessibilityLabel={`Configurar ${p.name}`}
            >
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>{p.name}</Text>
              <Text
                style={{
                  color:
                    status === 'none' ? colors.textMuted : status === 'server' ? colors.textSecondary : colors.accent,
                  fontSize: 12,
                }}
              >
                {STATUS_LABEL[status]}
              </Text>
            </Pressable>
            {open ? (
              <View style={{ gap: 8, paddingBottom: 12 }}>
                {status === 'server' ? (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    O servidor já tem uma chave própria; salvar a sua substitui o uso nesta conta.
                  </Text>
                ) : null}
                <Input
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="sk-…"
                  secureTextEntry
                  autoCapitalize="none"
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button size="sm" loading={saving} onPress={() => handleSaveDevice(p.kind)}>
                    No dispositivo
                  </Button>
                  {isGuest ? null : (
                    <Button size="sm" variant="ghost" loading={saving} onPress={() => handleSaveVault(p.kind)}>
                      No cofre da conta
                    </Button>
                  )}
                  {status === 'none' ? null : (
                    <Button size="sm" variant="ghost" disabled={saving} onPress={() => handleClear(p)}>
                      Remover
                    </Button>
                  )}
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}
