package com.minimercado.backend.dto.product;

import jakarta.validation.constraints.NotNull;

public record ProductStockUpdateDTO(
        @NotNull Integer quantityChange
) {
}
