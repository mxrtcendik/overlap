export const MAX_EMAIL = 254;

export function readEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const address = input.trim();
  if (address.length === 0 || address.length > MAX_EMAIL) return null;
  return /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(address) ? address : null;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function linksEmail(poll: { title: string; publicUrl: string; secretUrl: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Your links for “${poll.title}”`;
  const text = [
    `Here are the links for “${poll.title}”.`,
    "",
    "Share this one with everyone you're asking:",
    poll.publicUrl,
    "",
    "Keep this one to yourself. It's the only way to edit or delete the poll:",
    poll.secretUrl,
    "",
    "Overlap doesn't keep your email address. This is the only message you'll get.",
  ].join("\n");
  const link = (url: string) =>
    `<a href="${escapeHtml(url)}" style="color:#221f1b;word-break:break-all">${escapeHtml(url)}</a>`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:#f4f3ef;color:#221f1b;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6">
<div style="max-width:520px;margin:0 auto">
<p style="font-size:13px;color:#6d675f;margin:0 0 24px">overlap</p>
<p style="font-size:20px;margin:0 0 24px">Here are the links for “${escapeHtml(poll.title)}”.</p>
<p style="margin:0 0 4px;color:#6d675f">Share this one with everyone you're asking:</p>
<p style="margin:0 0 24px">${link(poll.publicUrl)}</p>
<p style="margin:0 0 4px;color:#6d675f">Keep this one to yourself. It's the only way to edit or delete the poll:</p>
<p style="margin:0 0 32px">${link(poll.secretUrl)}</p>
<p style="margin:0;font-size:13px;color:#6d675f">Overlap doesn't keep your email address. This is the only message you'll get.</p>
</div>
</body></html>`;
  return { subject, text, html };
}
