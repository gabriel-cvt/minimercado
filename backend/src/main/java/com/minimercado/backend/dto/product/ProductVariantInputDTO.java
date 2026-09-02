package com.minimercado.backend.dto.product;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProductVariantInputDTO(
        Long id,
        @NotBlank @Size(max = 255) String name,
        Boolean available
) {
}
