import { DurableObject } from "cloudflare:workers";
import { CHANGED, MAX_SOCKETS, PING, PONG } from "./live";

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
    return new Response(null, { status: 101, webSocket: client });
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

  async webSocketMessage() {}

  async webSocketClose(socket: WebSocket, code: number) {
    try {
      socket.close(code === 1005 || code === 1006 ? 1000 : code);
    } catch {
    }
  }

  async webSocketError(socket: WebSocket) {
    try {
      socket.close(1011);
    } catch {
    }
  }
}
