package com.minimercado.backend.dto.product;

import jakarta.validation.Valid;

import java.util.List;

public record ProductPutDTO(
        String name,
        Double price,
        String urlImage,
        Boolean hasVariants,
        String variantType,
        Boolean variantSelectionRequired,
        @Valid List<ProductVariantInputDTO> variants
) {
}
