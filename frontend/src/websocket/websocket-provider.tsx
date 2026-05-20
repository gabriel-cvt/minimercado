import { createContext, useContext, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Loader2, AlertTriangle } from "lucide-react";
import { websocketService } from "./websocket-client";
import { useWebSocketStatus } from "./websocket-hooks";
import {
  useKitchenOrderToast,
  usePickupOrderToast,
} from "./websocket-events";
import {
  useKitchenOrdersSocket,
  usePickupOrdersSocket,
} from "./websocket-hooks";
import type { ConnectionStatus } from "./websocket-types";

const WebSocketContext = createContext<{ enabled: boolean }>({ enabled: true });

export function useWebSocketContext() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void websocketService.connect();
    return () => {
      // keep connection alive across route changes; only disconnect on unload
    };
  }, []);

  // Global toast bridge — events are already delivered to per-page subscribers,
  // these listeners add app-wide toasts + cache invalidations.
  const onKitchen = useKitchenOrderToast();
  const onPickup = usePickupOrderToast();
  useKitchenOrdersSocket(onKitchen);
  usePickupOrdersSocket(onPickup);

  return (
    <WebSocketContext.Provider value={{ enabled: true }}>
      {children}
      <ConnectionStatusIndicator />
    </WebSocketContext.Provider>
  );
}

const statusMap: Record<
  ConnectionStatus,
  { label: string; cls: string; Icon: typeof Wifi; pulse: boolean }
> = {
  idle: { label: "Aguardando", cls: "bg-muted text-muted-foreground", Icon: Loader2, pulse: false },
  connecting: { label: "Conectando", cls: "bg-amber-500/15 text-amber-600", Icon: Loader2, pulse: true },
  connected: { label: "Conectado", cls: "bg-emerald-500/15 text-emerald-600", Icon: Wifi, pulse: false },
  reconnecting: { label: "Reconectando", cls: "bg-amber-500/15 text-amber-600", Icon: Loader2, pulse: true },
  disconnected: { label: "Desconectado", cls: "bg-muted text-muted-foreground", Icon: WifiOff, pulse: false },
  error: { label: "Erro de conexão", cls: "bg-destructive/15 text-destructive", Icon: AlertTriangle, pulse: true },
};

export function ConnectionStatusIndicator() {
  const { status, attempts } = useWebSocketStatus();
  const cfg = statusMap[status];
  const Icon = cfg.Icon;
  const show = status !== "connected";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className={`fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 px-3 py-2 rounded-full shadow-elegant text-xs font-bold ${cfg.cls}`}
          role="status"
          aria-live="polite"
        >
          <Icon className={`w-3.5 h-3.5 ${cfg.pulse ? "animate-spin" : ""}`} />
          <span>{cfg.label}</span>
          {attempts > 0 && status === "reconnecting" && (
            <span className="opacity-70">· tentativa {attempts}</span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}