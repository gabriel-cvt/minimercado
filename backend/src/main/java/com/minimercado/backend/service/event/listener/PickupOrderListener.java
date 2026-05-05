package com.minimercado.backend.service.event.listener;

import com.minimercado.backend.dto.orderPickup.OrderReadyForPickupEvent;
import com.minimercado.backend.service.pickupNotifier.PickupNotifier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class PickupOrderListener {

    private final PickupNotifier pickupNotifier;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(OrderReadyForPickupEvent event) {
        pickupNotifier.notifyOrderReady(event);
    }
}
