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

let locationSnapshot: { origin: string; href: string } | null = null;

function readLocation() {
  const href = window.location.href;
  if (!locationSnapshot || locationSnapshot.href !== href) {
    locationSnapshot = { origin: window.location.origin, href };
  }
  return locationSnapshot;
}

export function usePageLocation(): { origin: string; href: string } | null {
  return useSyncExternalStore(subscribe, readLocation, () => null);
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
