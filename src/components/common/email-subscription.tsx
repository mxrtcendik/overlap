"use client";

import { useId, useState, type FormEvent } from "react";
import { messageOf } from "@/client/request";
import { MAX_EMAIL } from "@/lib/email";
import { appear, button, cn, field, link } from "@/components/ui/styles";

export function EmailSubscription({
  label,
  current,
  activeText,
  hint,
  onSave,
}: {
  label: string;
  current: string | null;
  activeText: (address: string) => string;
  hint: string;
  onSave: (email: string | null) => Promise<void>;
}) {
  const inputId = useId();
  const [address, setAddress] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(email: string | null) {
    setPending(true);
    setError(null);
    try {
      await onSave(email);
      setAddress("");
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setPending(false);
    }
  }

  if (current) {
    return (
      <div className="text-sm">
        <p className="text-muted">
          {activeText(current)}{" "}
          <button type="button" className={link()} disabled={pending} onClick={() => void save(null)}>
            Stop
          </button>
        </p>
        {error ? (
          <p className={cn(appear, "mt-2 text-danger")} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void save(address);
      }}
    >
      <label htmlFor={inputId} className="text-sm text-muted">
        {label}
      </label>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <input
          id={inputId}
          type="email"
          required
          autoComplete="email"
          maxLength={MAX_EMAIL}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="you@example.com"
          className={cn(field(), "w-64")}
        />
        <button type="submit" className={button({ variant: "secondary" })} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {error ? (
        <p className={cn(appear, "mt-2 text-sm text-danger")} role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">{hint}</p>
      )}
    </form>
  );
}
