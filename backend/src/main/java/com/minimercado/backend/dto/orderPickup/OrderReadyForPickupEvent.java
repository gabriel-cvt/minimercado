package com.minimercado.backend.dto.orderPickup;

public record OrderReadyForPickupEvent(
        Long orderId
) {
}
