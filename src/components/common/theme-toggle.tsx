"use client";

import { useSyncExternalStore } from "react";

type Theme = "auto" | "light" | "dark";

const KEY = "overlap:theme";
const OPTIONS: { value: Theme; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

const listeners = new Set<() => void>();

function readTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return value === "light" || value === "dark" ? value : "auto";
}

function setTheme(theme: Theme) {
  if (theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    if (theme === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {}
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);

  return (
    <div role="group" aria-label="Theme" className="inline-flex items-center gap-1 text-xs">
      {OPTIONS.map((option, index) => (
        <span key={option.value} className="inline-flex items-center gap-1">
          {index > 0 ? (
            <span aria-hidden="true" className="text-line-strong">
              /
            </span>
          ) : null}
          <button
            type="button"
            aria-pressed={theme === option.value}
            onClick={() => setTheme(option.value)}
            className={`transition-colors ${theme === option.value ? "text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {option.label}
          </button>
        </span>
      ))}
    </div>
  );
}
