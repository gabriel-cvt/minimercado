package com.minimercado.backend.service.event.listener;

import com.minimercado.backend.dto.event.OrderCancelledEvent;
import com.minimercado.backend.dto.event.OrderCreatedEvent;
import com.minimercado.backend.dto.event.OrderUpdatedEvent;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

public class KitchenOrderListener {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(OrderCreatedEvent event) {
        // Send via WebSocket

        // Pedido enviado
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(OrderCancelledEvent event) {
        // Send via websocket

        // Pedido Cancelado
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(OrderUpdatedEvent event) {
        // Send via websocket

        // Pedido atualizado
    }
}

