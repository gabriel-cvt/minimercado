package com.minimercado.backend.dto.orderKitchen;

import com.minimercado.backend.enums.OrderKitchenEventType;

import java.util.List;

public record OrderKitchenEvent(
        Long orderId,
        OrderKitchenEventType type,
        List<OrderKitchenItemDTO> items
) {
}
