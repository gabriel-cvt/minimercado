package com.minimercado.backend.dto.event;

public record OrderKitchenItemDTO(
        Long productId,
        String productName,
        Integer quantity
) {
}