package com.minimercado.backend.dto.product;

import com.minimercado.backend.model.ProductIcon;
import java.util.List;

public record ProductResponseDTO(
    Long id,
    String name,
    Double price,
    ProductIcon icon,
    Integer stockQuantity,
    Boolean hasVariants,
    String variantType,
    Boolean variantSelectionRequired,
    List<ProductVariantResponseDTO> variants
) {}
