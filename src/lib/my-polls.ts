"use client";

import { useSyncExternalStore } from "react";
import { RETAIN_MS, SLOT_MS } from "./constants";

export type MyPoll = {
  id: string;
  token: string;
  title: string;
  createdAt: number;
  expiresAt: number;
};

const KEY = "overlap:polls";
const LIMIT = 50;
const listeners = new Set<() => void>();
let rawSnapshot: string | null | undefined;
let pollsSnapshot: MyPoll[] = [];
const EMPTY: MyPoll[] = [];

export function expiresAtFor(slots: string[], lastEnd?: string): number {
  const end = lastEnd ? Date.parse(lastEnd) : Math.max(...slots.map((slot) => Date.parse(slot))) + SLOT_MS;
  return end + RETAIN_MS;
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): MyPoll[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter(
      (entry): entry is MyPoll =>
        typeof entry?.id === "string" &&
        typeof entry?.token === "string" &&
        typeof entry?.title === "string" &&
        typeof entry?.createdAt === "number" &&
        typeof entry?.expiresAt === "number",
    );
  } catch {
    return [];
  }
}

function snapshot(): MyPoll[] {
  const raw = readRaw();
  if (raw !== rawSnapshot) {
    rawSnapshot = raw;
    const now = Date.now();
    pollsSnapshot = parse(raw)
      .filter((poll) => poll.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  return pollsSnapshot;
}

function write(polls: MyPoll[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(polls.slice(0, LIMIT)));
  } catch {
    return false;
  }
  for (const listener of listeners) listener();
  return true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useMyPolls(): MyPoll[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function rememberPoll(poll: Omit<MyPoll, "createdAt"> & { createdAt?: number }): boolean {
  const current = parse(readRaw());
  const existing = current.find((entry) => entry.id === poll.id);
  const entry: MyPoll = { ...poll, createdAt: existing?.createdAt ?? poll.createdAt ?? Date.now() };
  if (existing && existing.title === entry.title && existing.expiresAt === entry.expiresAt && existing.token === entry.token) {
    return true;
  }
  return write([entry, ...current.filter((other) => other.id !== poll.id)]);
}

export function forgetPoll(match: { id?: string; token?: string }) {
  const current = parse(readRaw());
  const next = current.filter((entry) => entry.id !== match.id && entry.token !== match.token);
  if (next.length !== current.length) write(next);
}
