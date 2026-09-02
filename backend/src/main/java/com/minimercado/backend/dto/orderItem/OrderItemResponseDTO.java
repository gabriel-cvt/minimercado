package com.minimercado.backend.dto.orderItem;

import java.util.List;
import java.math.BigDecimal;

public record OrderItemResponseDTO(
        Long productId,
        String productName,
        BigDecimal unitPrice,
        Integer quantity,
        BigDecimal subtotal,
        Long selectedVariantId,
        String selectedVariantName,
        List<Long> selectedVariantIds,
        List<String> selectedVariantNames
) {
}
