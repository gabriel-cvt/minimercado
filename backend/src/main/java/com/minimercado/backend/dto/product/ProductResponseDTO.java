package com.minimercado.backend.dto.product;

import com.minimercado.backend.enums.ProductVariantSelectionMode;
import com.minimercado.backend.model.ProductIcon;
import java.util.List;
import java.math.BigDecimal;

public record ProductResponseDTO(
    Long id,
    String name,
    BigDecimal price,
    ProductIcon icon,
    Boolean available,
    Boolean hasVariants,
    String variantType,
    Boolean variantSelectionRequired,
    ProductVariantSelectionMode variantSelectionMode,
    List<ProductVariantResponseDTO> variants
) {}
