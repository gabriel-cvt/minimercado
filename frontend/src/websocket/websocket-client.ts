import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import type { ConnectionStatus } from "./websocket-types";
import { getOperationalKey } from "@/lib/api";

type Listener<T> = (payload: T, raw: IMessage) => void;
type StatusListener = (status: ConnectionStatus, attempts: number) => void;

const API_BASE_URL = import.meta.env?.VITE_API_URL?.replace(/\/$/, "");
const WS_URL = resolveSockJsUrl(import.meta.env?.VITE_WS_URL, API_BASE_URL);

function resolveSockJsUrl(configuredUrl: string | undefined, apiBaseUrl: string | undefined) {
  const backendBaseUrl = apiBaseUrl || "http://localhost:8080";
  const value = configuredUrl?.trim();

  if (!value) return `${backendBaseUrl}/ws`;

  if (/^https?:\/\//i.test(value)) return value;

  // SockJS receives an HTTP endpoint and upgrades transports internally.
  if (/^wss?:\/\//i.test(value)) return value.replace(/^ws/i, "http");

  if (value.startsWith("/")) return `${backendBaseUrl}${value}`;

  return `${new URL(backendBaseUrl).protocol}//${value}`;
}

class WebSocketService {
  private client: Client | null = null;
  private status: ConnectionStatus = "idle";
  private attempts = 0;
  private statusListeners = new Set<StatusListener>();
  private topicListeners = new Map<string, Set<Listener<unknown>>>();
  private subscriptions = new Map<string, StompSubscription>();

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getAttempts(): number {
    return this.attempts;
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status, this.attempts);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach((l) => l(status, this.attempts));
  }

  async connect(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.client) return;

    this.setStatus("connecting");

    const SockJS = (await import("sockjs-client")).default;

    const client = new Client({
      connectHeaders: getOperationalKey() ? { "X-Admin-Key": getOperationalKey() } : {},
      webSocketFactory: () => new SockJS(WS_URL) as unknown as WebSocket,
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
      onConnect: () => {
        this.attempts = 0;
        this.setStatus("connected");
        // re-subscribe everything
        this.topicListeners.forEach((_set, topic) => this.ensureSubscription(topic));
      },
      onStompError: () => this.setStatus("error"),
      onWebSocketError: () => this.setStatus("error"),
      onWebSocketClose: () => {
        if (this.status === "connected") {
          this.attempts += 1;
          this.setStatus("reconnecting");
        } else if (this.status !== "disconnected") {
          this.attempts += 1;
          this.setStatus("reconnecting");
        }
        // drop stale subscriptions; will recreate on reconnect
        this.subscriptions.clear();
      },
    });

    this.client = client;
    try {
      client.activate();
    } catch {
      this.setStatus("error");
    }
  }

  disconnect(): void {
    if (!this.client) return;
    this.client.deactivate();
    this.client = null;
    this.subscriptions.clear();
    this.setStatus("disconnected");
  }

  subscribe<T>(topic: string, listener: Listener<T>): () => void {
    let set = this.topicListeners.get(topic);
    if (!set) {
      set = new Set();
      this.topicListeners.set(topic, set);
    }
    set.add(listener as Listener<unknown>);
    this.ensureSubscription(topic);

    return () => {
      const s = this.topicListeners.get(topic);
      if (!s) return;
      s.delete(listener as Listener<unknown>);
      if (s.size === 0) {
        this.topicListeners.delete(topic);
        const sub = this.subscriptions.get(topic);
        if (sub) {
          try {
            sub.unsubscribe();
          } catch {
            // ignore
          }
          this.subscriptions.delete(topic);
        }
      }
    };
  }

  private ensureSubscription(topic: string): void {
    if (!this.client?.connected) return;
    if (this.subscriptions.has(topic)) return;

    const sub = this.client.subscribe(topic, (message) => {
      const listeners = this.topicListeners.get(topic);
      if (!listeners || listeners.size === 0) return;
      let payload: unknown = null;
      try {
        payload = JSON.parse(message.body);
      } catch {
        payload = message.body;
      }
      listeners.forEach((l) => {
        try {
          l(payload, message);
        } catch (err) {
          console.error("[ws] listener error", err);
        }
      });
    });
    this.subscriptions.set(topic, sub);
  }
}

export const websocketService = new WebSocketService();
