import { useEffect, useState } from "react";
import { websocketService } from "./websocket-client";
import {
  WS_TOPICS,
  type ConnectionStatus,
  type KitchenOrderEvent,
  type PickupOrderEvent,
} from "./websocket-types";

export function useWebSocketStatus() {
  const [state, setState] = useState<{ status: ConnectionStatus; attempts: number }>({
    status: websocketService.getStatus(),
    attempts: websocketService.getAttempts(),
  });

  useEffect(() => {
    return websocketService.onStatusChange((status, attempts) =>
      setState({ status, attempts }),
    );
  }, []);

  return state;
}

export function useKitchenOrdersSocket(
  onEvent: (event: KitchenOrderEvent) => void,
): void {
  useEffect(() => {
    return websocketService.subscribe<KitchenOrderEvent>(
      WS_TOPICS.kitchenOrders,
      (payload) => onEvent(payload),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onEvent]);
}

export function usePickupOrdersSocket(
  onEvent: (event: PickupOrderEvent) => void,
): void {
  useEffect(() => {
    return websocketService.subscribe<PickupOrderEvent>(
      WS_TOPICS.pickupOrders,
      (payload) => onEvent(payload),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onEvent]);
}