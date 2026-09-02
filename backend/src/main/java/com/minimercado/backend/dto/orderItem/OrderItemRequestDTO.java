package com.minimercado.backend.dto.orderItem;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;


public record OrderItemRequestDTO(
        @NotNull Long productId,
        @NotNull @Positive Integer quantity,
        Long selectedVariantId,
        List<Long> selectedVariantIds
) {
}
