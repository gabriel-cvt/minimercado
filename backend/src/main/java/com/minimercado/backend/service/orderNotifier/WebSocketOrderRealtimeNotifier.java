package com.minimercado.backend.service.orderNotifier;

import com.minimercado.backend.dto.orderRealtime.OrderRealtimeEvent;
import com.minimercado.backend.enums.OrderRealtimeEventType;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WebSocketOrderRealtimeNotifier implements OrderRealtimeNotifier {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void notify(OrderRealtimeEvent event) {
        messagingTemplate.convertAndSend("/topic/orders", event);

        if (isPublicEvent(event)) {
            messagingTemplate.convertAndSend("/topic/orders/public", event);
        }
    }

    private boolean isPublicEvent(OrderRealtimeEvent event) {
        return event.type() != OrderRealtimeEventType.ORDER_PAID;
    }
}
