package com.minimercado.backend.dto.product;

import jakarta.validation.constraints.NotNull;

public record ProductPostDTO(
        @NotNull String name,
        @NotNull Double price,
        String urlImage,
        @NotNull Integer stockQuantity
) {
}
