package com.minimercado.backend.service.event.listener;

import com.minimercado.backend.dto.event.OrderCancelledEvent;
import com.minimercado.backend.dto.event.OrderKitchenEvent;
import com.minimercado.backend.enums.OrderKitchenEventType;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class KitchenOrderListener {


    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(OrderKitchenEvent event) {
        if (event.type() == OrderKitchenEventType.CREATED) {
            handleCreation(event);
            return;
        }

        if (event.type() == OrderKitchenEventType.UPDATED) {
            handleEdition(event);
            return;
        }

    }

    private void handleCreation(OrderKitchenEvent event) {
        // send info via webSockets
    }

    private void handleEdition(OrderKitchenEvent event) {
        // send info via webSockets
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(OrderCancelledEvent event) {
        // Send info via websocket

    }
}

