import { useEffect, useRef, useState } from 'react';
import type { WsServerEvent } from '../../types/protocol';

export function useWebSocketSync(onEvent: (event: WsServerEvent) => void): boolean {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!active) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      socket = new WebSocket(url);

      socket.onopen = () => {
        if (active) setConnected(true);
      };

      socket.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data as string) as WsServerEvent;
          callbackRef.current(parsed);
        } catch {
          // Ignore invalid payloads
        }
      };

      socket.onclose = () => {
        if (!active) return;
        setConnected(false);
        reconnectTimer = setTimeout(connect, 2500);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  return connected;
}
