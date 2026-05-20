package com.minimercado.backend.service.kitchenNotifier;

import com.minimercado.backend.dto.orderKitchen.OrderKitchenEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WebSocketKitchenNotifier implements KitchenNotifier{

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void notify(OrderKitchenEvent event) {
        messagingTemplate.convertAndSend("/topic/kitchen/orders", event);
    }
}
