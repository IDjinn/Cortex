import { ComingSoon } from '@/components/screens/ComingSoon';

/** MCP client (Phase 3): external servers, tools/resources surfaced in chat. */
export default function McpsScreen() {
  return (
    <ComingSoon
      title="MCPs"
      glyph="✜"
      description="Conecte servidores MCP externos (HTTP/SSE agora; stdio no desktop) e use as ferramentas deles direto no chat e no loop do agente."
      phase="Fase 3 do roadmap"
    />
  );
}
