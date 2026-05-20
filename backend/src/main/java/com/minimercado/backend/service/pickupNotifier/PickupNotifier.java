package com.minimercado.backend.service.pickupNotifier;

import com.minimercado.backend.dto.orderPickup.OrderReadyForPickupEvent;

public interface PickupNotifier {
    void notifyOrderReady(OrderReadyForPickupEvent event);
}
