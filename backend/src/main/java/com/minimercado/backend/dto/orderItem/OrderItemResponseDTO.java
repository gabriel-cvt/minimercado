package com.minimercado.backend.dto.orderItem;

public record OrderItemResponseDTO(
        Long productId,
        String productName,
        Double unitPrice,
        Integer quantity,
        Double subtotal,
        Long selectedVariantId,
        String selectedVariantName
) {
}
