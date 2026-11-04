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

function shell(lines: { heading: string; body: string[]; link?: { label: string; url: string }; footer: string }): string {
  const paragraph = (text: string) => `<p style="margin:0 0 16px">${escapeHtml(text)}</p>`;
  const link = lines.link
    ? `<p style="margin:0 0 32px"><a href="${escapeHtml(lines.link.url)}" style="color:#221f1b">${escapeHtml(lines.link.label)}</a></p>`
    : "";
  return `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:#f4f3ef;color:#221f1b;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6">
<div style="max-width:520px;margin:0 auto">
<p style="font-size:13px;color:#6d675f;margin:0 0 24px">overlap</p>
<p style="font-size:20px;margin:0 0 24px">${escapeHtml(lines.heading)}</p>
${lines.body.map(paragraph).join("\n")}
${link}
<p style="margin:0;font-size:13px;color:#6d675f">${escapeHtml(lines.footer)}</p>
</div>
</body></html>`;
}

export function newAnswerEmail(input: { title: string; name: string; count: number; publicUrl: string }) {
  const subject = `${input.name} answered “${input.title}”`;
  const body = [`${input.count === 1 ? "That’s the first answer." : `That’s ${input.count} answers so far.`} Open your secret link to see who can make what.`];
  const footer = "You get this because you asked to hear about new answers. Turn it off on your secret link.";
  return {
    subject,
    text: [`${input.name} answered “${input.title}”.`, "", ...body, "", input.publicUrl, "", footer].join("\n"),
    html: shell({ heading: `${input.name} answered “${input.title}”.`, body, link: { label: "Open the poll", url: input.publicUrl }, footer }),
  };
}

export function finalTimeEmail(input: {
  title: string;
  day: string;
  time: string;
  pollUrl: string;
  place?: string | null;
  remind?: boolean;
}) {
  const subject = `“${input.title}” is set for ${input.day}`;
  const when = `${input.day}, ${input.time}`;
  const body = [
    `The time for “${input.title}” is ${when}.`,
    ...(input.place ? [`Where: ${input.place}`] : []),
    "The calendar file attached adds it to your calendar.",
  ];
  const footer = input.remind
    ? "You get this because you asked for the final time when you answered. One reminder follows the day before. Overlap deletes your address with the poll."
    : "You get this because you asked for the final time when you answered. Overlap deletes your address with the poll.";
  return {
    subject,
    text: [...body, "", input.pollUrl, "", footer].join("\n"),
    html: shell({ heading: when, body, link: { label: "Open the poll", url: input.pollUrl }, footer }),
  };
}

export function reminderEmail(input: { title: string; day: string; time: string; pollUrl: string; place?: string | null }) {
  const when = `${input.day}, ${input.time}`;
  const subject = `Reminder: “${input.title}” is ${input.day}`;
  const body = [
    `“${input.title}” is coming up: ${when}.`,
    ...(input.place ? [`Where: ${input.place}`] : []),
    "If you can’t make it any more, let the person who asked know.",
  ];
  const footer = "This is the reminder you asked for when you answered, and the last email you’ll get. Overlap deletes your address with the poll.";
  return {
    subject,
    text: [...body, "", input.pollUrl, "", footer].join("\n"),
    html: shell({ heading: when, body, link: { label: "Open the poll", url: input.pollUrl }, footer }),
  };
}
