package com.minimercado.backend.dto.product;

import java.util.List;

public record ProductResponseDTO(
    Long id,
    String name,
    Double price,
    String urlImage,
    Integer stockQuantity,
    Boolean hasVariants,
    String variantType,
    Boolean variantSelectionRequired,
    List<ProductVariantResponseDTO> variants
) {}
