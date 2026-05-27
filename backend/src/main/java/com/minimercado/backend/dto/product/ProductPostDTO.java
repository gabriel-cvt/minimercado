package com.minimercado.backend.dto.product;

import com.minimercado.backend.model.ProductIcon;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ProductPostDTO(
        @NotNull String name,
        @NotNull Double price,
        ProductIcon icon,
        @NotNull Integer stockQuantity,
        Boolean hasVariants,
        String variantType,
        Boolean variantSelectionRequired,
        @Valid List<ProductVariantInputDTO> variants
) {
}
