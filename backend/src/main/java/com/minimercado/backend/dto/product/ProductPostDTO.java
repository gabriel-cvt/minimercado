package com.minimercado.backend.dto.product;

import com.minimercado.backend.enums.ProductVariantSelectionMode;
import com.minimercado.backend.model.ProductIcon;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Digits;

import java.util.List;
import java.math.BigDecimal;

public record ProductPostDTO(
        @NotBlank @Size(max = 255) String name,
        @NotNull @Positive @Digits(integer = 10, fraction = 2) BigDecimal price,
        ProductIcon icon,
        Boolean available,
        Boolean hasVariants,
        @Size(max = 255) String variantType,
        Boolean variantSelectionRequired,
        ProductVariantSelectionMode variantSelectionMode,
        @Valid List<ProductVariantInputDTO> variants
) {
}
