"use client";

import { useSyncExternalStore } from "react";
import { detectClock, detectWeekStart, type Clock } from "./format";

function subscribe() {
  return () => {};
}

export function useTimeZone(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
}

export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function useCanShare(): boolean {
  return useSyncExternalStore(subscribe, () => typeof navigator.share === "function", () => false);
}

let locationSnapshot: { origin: string; href: string } | null = null;

function readLocation() {
  const href = window.location.origin + window.location.pathname;
  if (!locationSnapshot || locationSnapshot.href !== href) {
    locationSnapshot = { origin: window.location.origin, href };
  }
  return locationSnapshot;
}

export function usePageLocation(): { origin: string; href: string } | null {
  return useSyncExternalStore(subscribe, readLocation, () => null);
}

const CREATED_KEY = "overlap:created";
const createdListeners = new Set<() => void>();
let createdFromHash: string | null = null;

export function markCreated(token: string): boolean {
  try {
    window.sessionStorage.setItem(CREATED_KEY, token);
    return true;
  } catch {
    return false;
  }
}

function readCreated(): string | null {
  if (window.location.hash === "#created") createdFromHash = window.location.pathname.split("/")[2] ?? null;
  try {
    return window.sessionStorage.getItem(CREATED_KEY) ?? createdFromHash;
  } catch {
    return createdFromHash;
  }
}

function subscribeCreated(listener: () => void) {
  createdListeners.add(listener);
  return () => createdListeners.delete(listener);
}

export function dismissCreated() {
  createdFromHash = null;
  try {
    window.sessionStorage.removeItem(CREATED_KEY);
  } catch {
  }
  for (const listener of createdListeners) listener();
}

export function useJustCreated(token: string | null): boolean {
  const created = useSyncExternalStore(subscribeCreated, readCreated, () => null);
  return token !== null && created === token;
}

let todaySnapshot: string | null = null;

function readToday() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (todaySnapshot !== today) todaySnapshot = today;
  return todaySnapshot;
}

export function useToday(): string | null {
  return useSyncExternalStore(subscribe, readToday, () => null);
}

export type Prefs = { clock: Clock; weekStart: number };

const CLOCK_KEY = "overlap:clock";
const prefsListeners = new Set<() => void>();
let clockOverride: Clock | null | undefined;
let prefsSnapshot: Prefs | null = null;

function readClockOverride(): Clock | null {
  if (clockOverride === undefined) {
    try {
      const stored = window.localStorage.getItem(CLOCK_KEY);
      clockOverride = stored === "h12" || stored === "h23" ? stored : null;
    } catch {
      clockOverride = null;
    }
  }
  return clockOverride;
}

function readPrefs(): Prefs {
  const locale = navigator.language;
  const clock = readClockOverride() ?? detectClock(locale);
  if (!prefsSnapshot || prefsSnapshot.clock !== clock) {
    prefsSnapshot = { clock, weekStart: prefsSnapshot?.weekStart ?? detectWeekStart(locale) };
  }
  return prefsSnapshot;
}

function subscribePrefs(listener: () => void) {
  prefsListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== CLOCK_KEY) return;
    clockOverride = undefined;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    prefsListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePrefs(): Prefs | null {
  return useSyncExternalStore(subscribePrefs, readPrefs, () => null);
}

export function setClock(clock: Clock) {
  clockOverride = clock;
  try {
    window.localStorage.setItem(CLOCK_KEY, clock);
  } catch {
  }
  for (const listener of prefsListeners) listener();
}
