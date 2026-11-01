"use client";

import { useId, useState, type FormEvent } from "react";
import { json, messageOf, request, UserFacingError } from "@/client/request";
import { useTurnstile } from "@/client/use-turnstile";
import { MAX_EMAIL } from "@/lib/email";
import { EMAIL_ACTION } from "@/lib/turnstile";

export function EmailLinks({ className = "" }: { className?: string }) {
  const inputId = useId();
  const [address, setAddress] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { container: turnstileRef, getToken, reset: resetTurnstile } = useTurnstile(EMAIL_ACTION);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new UserFacingError("We couldn’t confirm you’re not a bot. Check your connection and try again.");
      const path = `${window.location.pathname.replace(/\/$/, "")}/email`;
      await request(path, { method: "POST", ...json({ email: address, "cf-turnstile-response": token }) });
      setSentTo(address.trim());
      setAddress("");
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setPending(false);
      resetTurnstile();
    }
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <label htmlFor={inputId} className="text-sm text-muted">
        Email me both links
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
          className="field w-64 placeholder:text-muted/60"
        />
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      <div ref={turnstileRef} className="mt-3 max-w-sm empty:mt-0" />
      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : sentTo ? (
        <p className="appear mt-2 text-sm text-muted" role="status">
          Sent to {sentTo}. We didn’t keep the address.
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">One email, nothing stored.</p>
      )}
    </form>
  );
}
