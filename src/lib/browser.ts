"use client";

import { useSyncExternalStore } from "react";

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
