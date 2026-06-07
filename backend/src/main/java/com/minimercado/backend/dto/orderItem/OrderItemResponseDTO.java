package com.minimercado.backend.dto.orderItem;

import java.util.List;

public record OrderItemResponseDTO(
        Long productId,
        String productName,
        Double unitPrice,
        Integer quantity,
        Double subtotal,
        Long selectedVariantId,
        String selectedVariantName,
        List<Long> selectedVariantIds,
        List<String> selectedVariantNames
) {
}
