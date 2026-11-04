import { DurableObject } from "cloudflare:workers";
import { CHANGED, EDITING, EDITING_EVERY_MS, MAX_SOCKETS, PING, PONG, presenceMessage } from "../lib/live";

type Attachment = { editedAt?: number };

export class PollRoom extends DurableObject<CloudflareEnv> {
  constructor(ctx: DurableObjectState, env: CloudflareEnv) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected a WebSocket.", { status: 426 });
    }
    if (this.ctx.getWebSockets().length >= MAX_SOCKETS) {
      return new Response("Too many open pages for this poll.", { status: 503 });
    }
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    this.broadcastPresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcastPresence(leaving?: WebSocket) {
    const open = this.ctx.getWebSockets().filter((socket) => socket !== leaving && socket.readyState === WebSocket.OPEN);
    const message = presenceMessage(open.length);
    for (const socket of open) {
      try {
        socket.send(message);
      } catch {}
    }
  }

  async notify(): Promise<number> {
    let sent = 0;
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(CHANGED);
        sent += 1;
      } catch {
      }
    }
    return sent;
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (message !== EDITING) return;
    const now = Date.now();
    const attachment = (socket.deserializeAttachment() ?? {}) as Attachment;
    if (attachment.editedAt && now - attachment.editedAt < EDITING_EVERY_MS) return;
    socket.serializeAttachment({ ...attachment, editedAt: now } satisfies Attachment);
    for (const other of this.ctx.getWebSockets()) {
      if (other === socket) continue;
      try {
        other.send(EDITING);
      } catch {}
    }
  }

  async webSocketClose(socket: WebSocket, code: number) {
    try {
      socket.close(code === 1005 || code === 1006 ? 1000 : code);
    } catch {
    }
    this.broadcastPresence(socket);
  }

  async webSocketError(socket: WebSocket) {
    try {
      socket.close(1011);
    } catch {
    }
    this.broadcastPresence(socket);
  }
}
