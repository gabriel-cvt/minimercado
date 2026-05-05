package com.minimercado.backend.dto.event;

import java.util.List;

public record OrderCreatedEvent(
        Long orderId,
        List<OrderKitchenItemDTO> items
) {
}