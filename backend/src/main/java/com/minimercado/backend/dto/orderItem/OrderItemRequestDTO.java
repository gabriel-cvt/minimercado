package com.minimercado.backend.dto.orderItem;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record OrderItemRequestDTO(
        @NotNull UUID productId,
        @NotNull Integer quantity
) {
}
