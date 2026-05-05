package com.minimercado.backend.dto.orderItem;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record OrderItemRequestDTO(
        @NotNull Long productId,
        @NotNull Integer quantity
) {
}
