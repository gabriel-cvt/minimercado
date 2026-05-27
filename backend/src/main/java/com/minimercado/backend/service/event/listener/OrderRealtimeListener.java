package com.minimercado.backend.service.event.listener;

import com.minimercado.backend.dto.orderRealtime.OrderRealtimeEvent;
import com.minimercado.backend.service.orderNotifier.OrderRealtimeNotifier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class OrderRealtimeListener {

    private final OrderRealtimeNotifier orderRealtimeNotifier;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(OrderRealtimeEvent event) {
        orderRealtimeNotifier.notify(event);
    }
}
