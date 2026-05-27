package com.minimercado.backend.mapper;

import com.minimercado.backend.dto.product.ProductResponseDTO;
import com.minimercado.backend.dto.product.ProductVariantResponseDTO;
import com.minimercado.backend.model.Product;
import org.springframework.stereotype.Component;

@Component
public class ProductMapper {

    public ProductResponseDTO toResponse(Product product) {
        if (product == null) {
            return null;
        }

        return new ProductResponseDTO(
                product.getId(),
                product.getName(),
                product.getPrice(),
                product.getIcon(),
                product.getStockQuantity(),
                product.getHasVariants(),
                product.getVariantType(),
                product.getVariantSelectionRequired(),
                product.getVariants().stream()
                        .map(variant -> new ProductVariantResponseDTO(
                                variant.getId(),
                                variant.getName(),
                                variant.getAvailable()
                        ))
                        .toList()
        );
    }
}
