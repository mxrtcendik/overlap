"use client";

import { useSyncExternalStore } from "react";
import { detectClock, detectWeekStart, wallDate, wallParts, type Clock } from "../lib/time/format";

function subscribe() {
  return () => {};
}

const ZONE_KEY = "overlap:timezone";
const zoneListeners = new Set<() => void>();
let zoneOverride: string | null | undefined;

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export { isTimeZone } from "@/lib/time/format";
import { isTimeZone } from "@/lib/time/format";

function readZoneOverride(): string | null {
  if (zoneOverride === undefined) {
    try {
      const stored = window.localStorage.getItem(ZONE_KEY);
      zoneOverride = stored && isTimeZone(stored) ? stored : null;
    } catch {
      zoneOverride = null;
    }
  }
  return zoneOverride;
}

function readZone(): string {
  return readZoneOverride() ?? deviceTimeZone();
}

function subscribeZone(listener: () => void) {
  zoneListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== ZONE_KEY) return;
    zoneOverride = undefined;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    zoneListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTimeZone(): string | null {
  return useSyncExternalStore(subscribeZone, readZone, () => null);
}

export function useTimeZoneChosen(): boolean {
  return useSyncExternalStore(subscribeZone, () => readZoneOverride() !== null, () => false);
}

export function setTimeZone(zone: string | null) {
  zoneOverride = zone === deviceTimeZone() ? null : zone;
  try {
    if (zoneOverride) window.localStorage.setItem(ZONE_KEY, zoneOverride);
    else window.localStorage.removeItem(ZONE_KEY);
  } catch {
  }
  for (const listener of zoneListeners) listener();
}

export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(listener: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export function useReducedMotion(): boolean | null {
  return useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => null);
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

function readToday() {
  return wallDate(wallParts(Date.now(), readZone()));
}

export function useToday(): string | null {
  return useSyncExternalStore(subscribeZone, readToday, () => null);
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
