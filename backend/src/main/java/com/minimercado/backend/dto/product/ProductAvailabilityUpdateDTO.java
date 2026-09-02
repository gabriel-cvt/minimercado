package com.minimercado.backend.dto.product;

import jakarta.validation.constraints.NotNull;

public record ProductAvailabilityUpdateDTO(
        @NotNull Boolean available
) {
}
