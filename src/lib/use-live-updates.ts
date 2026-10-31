"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CHANGED,
  PING,
  PING_EVERY_MS,
  POLL_EVERY_MS,
  reconnectDelay,
  REFRESH_DEBOUNCE_MS,
  SILENT_LIMIT_MS,
  STALE_AFTER_HIDDEN_MS,
} from "./live";

export function useLiveUpdates(pollId: string, enabled = true) {
  const router = useRouter();

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
      opened.onopen = () => {
        connected = true;
        lastHeard = Date.now();
        attempts = 0;
        if (everOpened) refresh();
        everOpened = true;
      };
      opened.onmessage = (event) => {
        lastHeard = Date.now();
        if (event.data === CHANGED) refresh();
      };
      opened.onclose = () => {
        if (socket === opened) socket = null;
        connected = false;
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
      document.removeEventListener("visibilitychange", onVisibility);
      socket?.close(1000);
      socket = null;
    };
  }, [pollId, enabled, router]);
}
