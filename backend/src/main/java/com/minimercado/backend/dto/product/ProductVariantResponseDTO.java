package com.minimercado.backend.dto.product;

public record ProductVariantResponseDTO(
        Long id,
        String name,
        Boolean available
) {
}
