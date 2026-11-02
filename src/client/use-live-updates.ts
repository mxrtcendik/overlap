"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EDITING,
  EDITING_EVERY_MS,
  EDITING_SHOWN_MS,
  parseLiveMessage,
  PING,
  PING_EVERY_MS,
  POLL_EVERY_MS,
  reconnectDelay,
  REFRESH_DEBOUNCE_MS,
  SILENT_LIMIT_MS,
  STALE_AFTER_HIDDEN_MS,
} from "../lib/live";

export type Presence = {
  /** Open pages for this poll, including this one. Null until the live room answers. */
  here: number | null;
  /** Someone on another page is marking times right now. */
  othersEditing: boolean;
  /** Call while this visitor edits; throttled, and a no-op without a live connection. */
  announceEditing: () => void;
};

export function useLiveUpdates(pollId: string, enabled = true): Presence {
  const router = useRouter();
  const [here, setHere] = useState<number | null>(null);
  const [othersEditing, setOthersEditing] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const lastAnnounced = useRef(0);

  const announceEditing = useCallback(() => {
    const socket = socketRef.current;
    const now = Date.now();
    if (!socket || socket.readyState !== WebSocket.OPEN || now - lastAnnounced.current < EDITING_EVERY_MS) return;
    lastAnnounced.current = now;
    try {
      socket.send(EDITING);
    } catch {}
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let socket: WebSocket | null = null;
    let connected = false;
    let everOpened = false;
    let attempts = 0;
    let lastHeard = 0;
    let hiddenAt: number | null = document.hidden ? Date.now() : null;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let editingTimer: ReturnType<typeof setTimeout> | undefined;

    function refresh() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (!stopped) startTransition(() => router.refresh());
      }, REFRESH_DEBOUNCE_MS);
    }

    function scheduleReconnect() {
      clearTimeout(reconnectTimer);
      if (stopped) return;
      reconnectTimer = setTimeout(connect, reconnectDelay(attempts));
      attempts += 1;
    }

    function connect() {
      if (stopped || socket) return;
      const url = new URL(`/p/${pollId}/live`, window.location.href);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      let opened: WebSocket;
      try {
        opened = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      socket = opened;
      socketRef.current = opened;
      opened.onopen = () => {
        connected = true;
        lastHeard = Date.now();
        attempts = 0;
        if (everOpened) refresh();
        everOpened = true;
      };
      opened.onmessage = (event) => {
        lastHeard = Date.now();
        const message = parseLiveMessage(event.data);
        if (!message) return;
        if (message.type === "changed") refresh();
        if (message.type === "presence") setHere(message.here);
        if (message.type === "editing") {
          setOthersEditing(true);
          clearTimeout(editingTimer);
          editingTimer = setTimeout(() => setOthersEditing(false), EDITING_SHOWN_MS);
        }
      };
      opened.onclose = () => {
        if (socket === opened) socket = null;
        if (socketRef.current === opened) socketRef.current = null;
        connected = false;
        setHere(null);
        setOthersEditing(false);
        scheduleReconnect();
      };
      opened.onerror = () => {};
    }

    let ticks = 0;
    const tickMs = 5_000;
    const ticker = setInterval(() => {
      ticks += 1;
      if (document.hidden) return;
      if (connected && socket) {
        if (Date.now() - lastHeard > SILENT_LIMIT_MS) {
          socket.close();
          return;
        }
        if ((ticks * tickMs) % PING_EVERY_MS === 0) socket.send(PING);
      } else if ((ticks * tickMs) % POLL_EVERY_MS === 0) {
        refresh();
      }
    }, tickMs);

    function onVisibility() {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      const hiddenFor = hiddenAt === null ? 0 : Date.now() - hiddenAt;
      hiddenAt = null;
      if (!connected) {
        refresh();
        attempts = 0;
        if (!socket) {
          clearTimeout(reconnectTimer);
          connect();
        }
      } else if (hiddenFor > STALE_AFTER_HIDDEN_MS) {
        refresh();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    connect();

    return () => {
      stopped = true;
      clearInterval(ticker);
      clearTimeout(refreshTimer);
      clearTimeout(reconnectTimer);
      clearTimeout(editingTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      socket?.close(1000);
      socket = null;
      socketRef.current = null;
    };
  }, [pollId, enabled, router]);

  return { here, othersEditing, announceEditing };
}

const MAX_TIMER_MS = 2 ** 31 - 1;

export function useRefreshAt(iso: string | null) {
  const router = useRouter();
  useEffect(() => {
    if (!iso) return;
    const wait = Date.parse(iso) - Date.now() + 1000;
    if (wait <= 0 || wait > MAX_TIMER_MS) return;
    const timer = setTimeout(() => startTransition(() => router.refresh()), wait);
    return () => clearTimeout(timer);
  }, [iso, router]);
}
