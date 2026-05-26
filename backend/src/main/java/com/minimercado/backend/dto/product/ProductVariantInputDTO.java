package com.minimercado.backend.dto.product;

import jakarta.validation.constraints.NotBlank;

public record ProductVariantInputDTO(
        Long id,
        @NotBlank String name,
        Boolean available
) {
}
