import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Input } from '@/components/ui';
import { toast } from '@/components/feedback';
import { useLocalEndpointStore } from '@/stores/localEndpointStore';
import { useTheme } from '@/theme';

/** Custom local inference endpoint (LM Studio / llama.cpp / Ollama elsewhere). */
export function LocalEndpointCard() {
  const { colors } = useTheme();
  const baseUrl = useLocalEndpointStore((s) => s.baseUrl);
  const setBaseUrl = useLocalEndpointStore((s) => s.setBaseUrl);
  const [draft, setDraft] = useState(baseUrl ?? '');

  const save = () => {
    const url = draft.trim();
    if (url && !/^https?:\/\/.+/i.test(url)) {
      toast.error('Endpoint inválido', 'Use http://host:porta (/v1 para llama.cpp/LM Studio).');
      return;
    }
    setBaseUrl(url || null);
    toast.show(url ? 'Endpoint local salvo.' : 'Endpoint local removido.');
  };

  return (
    <Card $elevation={0} $padding="lg">
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
        Endpoint local
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>
        LM Studio, llama.cpp ou Ollama em outra máquina (ex.: http://192.168.15.4:1234/v1).
        Aplicado ao listar modelos e ao conversar como convidado.
      </Text>
      <View style={{ gap: 8 }}>
        <Input
          value={draft}
          onChangeText={setDraft}
          placeholder="http://localhost:1234/v1"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button size="sm" onPress={save}>
            Salvar
          </Button>
          {baseUrl ? (
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                setDraft('');
                setBaseUrl(null);
                toast.show('Endpoint local removido.');
              }}
            >
              Remover
            </Button>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
