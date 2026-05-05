package com.minimercado.backend.service.event.listener;

import com.minimercado.backend.dto.orderKitchen.OrderKitchenEvent;
import com.minimercado.backend.service.kitchenNotifier.KitchenNotifier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class KitchenOrderListener {

    private final KitchenNotifier kitchenNotifier;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(OrderKitchenEvent event) {
        kitchenNotifier.notify(event);
    }
}

