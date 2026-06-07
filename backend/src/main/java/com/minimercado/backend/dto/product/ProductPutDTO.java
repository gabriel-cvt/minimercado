package com.minimercado.backend.dto.product;

import com.minimercado.backend.enums.ProductVariantSelectionMode;
import com.minimercado.backend.model.ProductIcon;
import jakarta.validation.Valid;

import java.util.List;

public record ProductPutDTO(
        String name,
        Double price,
        ProductIcon icon,
        Boolean hasVariants,
        String variantType,
        Boolean variantSelectionRequired,
        ProductVariantSelectionMode variantSelectionMode,
        @Valid List<ProductVariantInputDTO> variants
) {
}
