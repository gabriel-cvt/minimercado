package com.minimercado.backend.dto.orderItem;

import jakarta.validation.constraints.NotNull;


public record OrderItemRequestDTO(
        @NotNull Long productId,
        @NotNull Integer quantity,
        Long selectedVariantId
) {
}
