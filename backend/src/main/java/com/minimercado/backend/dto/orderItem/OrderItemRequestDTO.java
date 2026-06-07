package com.minimercado.backend.dto.orderItem;

import jakarta.validation.constraints.NotNull;

import java.util.List;


public record OrderItemRequestDTO(
        @NotNull Long productId,
        @NotNull Integer quantity,
        Long selectedVariantId,
        List<Long> selectedVariantIds
) {
}
