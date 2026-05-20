package com.minimercado.backend.dto.orderItem;

public record OrderItemResponseDTO(
        Long productId,
        String productName,
        Boolean requiresKitchenPreparation,
        Double unitPrice,
        Integer quantity,
        Double subtotal
) {
}
