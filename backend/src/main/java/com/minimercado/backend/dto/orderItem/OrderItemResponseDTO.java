package com.minimercado.backend.dto.orderItem;

public record OrderItemResponseDTO(
        String productName,
        Double unitPrice,
        Integer quantity,
        Double subtotal
) {
}
