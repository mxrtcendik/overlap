"use client";

import { useCallback, useEffect, useRef } from "react";

const SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
  (process.env.NODE_ENV === "development" ? "1x00000000000000000000AA" : "0x4AAAAAAFvCsJu7MQTAVW_P");

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const WAIT_MS = 15_000;

type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let loading: Promise<Turnstile> | null = null;

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    script.onerror = () => {
      loading = null;
      reject(new Error("turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export function useTurnstile(action: string) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiters = useRef<((token: string | null) => void)[]>([]);
  const startNow = useRef<() => void>(() => {});

  const settle = useCallback((value: string | null) => {
    token.current = value;
    for (const wake of waiters.current.splice(0)) wake(value);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let observer: IntersectionObserver | undefined;
    const near = new Promise<void>((resolve) => {
      startNow.current = () => {
        observer?.disconnect();
        resolve();
      };
      if (!container.current || typeof IntersectionObserver !== "function") return resolve();
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          resolve();
        },
        { threshold: 0 },
      );
      observer.observe(container.current);
    });
    near
      .then(() => (cancelled ? Promise.reject(new Error("unmounted")) : loadTurnstile()))
      .then((turnstile) => {
        if (cancelled || !container.current) return;
        widget.current = turnstile.render(container.current, {
          sitekey: SITE_KEY,
          action,
          appearance: "interaction-only",
          theme: "auto",
          size: "flexible",
          "refresh-expired": "auto",
          callback: (value: string) => settle(value),
          "expired-callback": () => {
            token.current = null;
          },
          "error-callback": () => {
            settle(null);
            return true;
          },
        });
      })
      .catch(() => {
        if (!cancelled) settle(null);
      });
    return () => {
      cancelled = true;
      observer?.disconnect();
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [action, settle]);

  const getToken = useCallback((): Promise<string | null> => {
    if (token.current) return Promise.resolve(token.current);
    startNow.current();
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        waiters.current = waiters.current.filter((wake) => wake !== done);
        resolve(null);
      }, WAIT_MS);
      const done = (value: string | null) => {
        window.clearTimeout(timer);
        resolve(value);
      };
      waiters.current.push(done);
    });
  }, []);

  const reset = useCallback(() => {
    token.current = null;
    if (widget.current) window.turnstile?.reset(widget.current);
  }, []);

  return { container, getToken, reset };
}
