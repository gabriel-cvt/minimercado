package com.minimercado.backend.service.pickupNotifier;

import com.minimercado.backend.dto.orderPickup.OrderReadyForPickupEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WebSocketPickupNotifier implements PickupNotifier {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void notifyOrderReady(OrderReadyForPickupEvent event) {
        messagingTemplate.convertAndSend("/topic/pickup/orders", event);
    }
}
