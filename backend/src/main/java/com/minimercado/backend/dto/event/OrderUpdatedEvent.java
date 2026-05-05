package com.minimercado.backend.dto.event;

import java.util.List;

public record OrderUpdatedEvent(
        Long orderId,
        List<OrderKitchenItemDTO> items
) {
}
