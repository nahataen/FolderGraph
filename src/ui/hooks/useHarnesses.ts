import { useCallback, useEffect, useState } from 'react';
import type {
  HarnessDetectionResult,
  HarnessId,
  HarnessScanResponse,
  McpTransportMode,
} from '../../types/harness';

export function useHarnesses() {
  const [scan, setScan] = useState<HarnessScanResponse | null>(null);
  const [mode, setMode] = useState<McpTransportMode>('stdio');
  const [loading, setLoading] = useState<boolean>(true);
  const [busyId, setBusyId] = useState<HarnessId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchScan = useCallback(async (targetMode: McpTransportMode = mode) => {
    setLoading(true);
    setError(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3000';
      const params = new URLSearchParams({ mode: targetMode, sseUrl: origin });
      const res = await fetch(`/api/mcp/harnesses?${params.toString()}`);
      if (!res.ok) throw new Error('No se pudieron sondear los harnesses instalados.');
      const data = (await res.json()) as HarnessScanResponse;
      setScan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al escanear harnesses.');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void fetchScan(mode);
  }, [fetchScan, mode]);

  const replaceHarness = useCallback((updated: HarnessDetectionResult) => {
    setScan((prev) => {
      if (!prev) return prev;
      const next = prev.harnesses.map((item) => (item.id === updated.id ? updated : item));
      return {
        ...prev,
        harnesses: next,
        detectedCount: next.filter((h) => h.installed).length,
        connectedCount: next.filter((h) => h.mcpConnected).length,
      };
    });
  }, []);

  const connectHarness = useCallback(async (harnessId: HarnessId) => {
    setBusyId(harnessId);
    setError(null);
    setStatusMessage(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3000';
      const res = await fetch(`/api/mcp/harnesses/${encodeURIComponent(harnessId)}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, sseUrl: origin }),
      });
      const json = (await res.json()) as { harness?: HarnessDetectionResult; error?: string };
      if (!res.ok || !json.harness) {
        throw new Error(json.error || 'No se pudo conectar el harness.');
      }
      replaceHarness(json.harness);
      setStatusMessage(`MCP conectado en ${json.harness.name} (${json.harness.configFilePath}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar MCP.');
    } finally {
      setBusyId(null);
    }
  }, [mode, replaceHarness]);

  const disconnectHarness = useCallback(async (harnessId: HarnessId) => {
    setBusyId(harnessId);
    setError(null);
    setStatusMessage(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3000';
      const res = await fetch(`/api/mcp/harnesses/${encodeURIComponent(harnessId)}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, sseUrl: origin }),
      });
      const json = (await res.json()) as { harness?: HarnessDetectionResult; error?: string };
      if (!res.ok || !json.harness) {
        throw new Error(json.error || 'No se pudo desconectar el harness.');
      }
      replaceHarness(json.harness);
      setStatusMessage(`MCP desconectado de ${json.harness.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desconectar MCP.');
    } finally {
      setBusyId(null);
    }
  }, [mode, replaceHarness]);

  return {
    scan,
    mode,
    setMode,
    loading,
    busyId,
    error,
    statusMessage,
    rescan: () => fetchScan(mode),
    connectHarness,
    disconnectHarness,
  };
}
