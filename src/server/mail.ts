import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type Message = {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: { filename: string; type: string; content: string }[];
};

export async function canSendMail(): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true });
  return Boolean(env.EMAIL && env.EMAIL_FROM);
}

export async function sendMail(message: Message): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true });
  const mailer = env.EMAIL as SendEmail | undefined;
  const sender = env.EMAIL_FROM as string | undefined;
  if (!mailer || !sender) return false;
  await mailer.send({
    from: { name: "Overlap", email: sender },
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: message.attachments?.map((file) => ({ disposition: "attachment" as const, ...file })),
  });
  return true;
}

export async function sendLater(messages: Message[], event: string): Promise<void> {
  if (messages.length === 0) return;
  const { ctx } = await getCloudflareContext({ async: true });
  ctx.waitUntil(
    Promise.allSettled(messages.map((message) => sendMail(message))).then((results) => {
      const failed = results.filter((result) => result.status === "rejected").length;
      console.log(JSON.stringify({ event, sent: results.length - failed, failed }));
    }),
  );
}
