package com.minimercado.backend.dto.orderKitchen;

public record OrderKitchenItemDTO(
        Long productId,
        String productName,
        Integer quantity
) {
}