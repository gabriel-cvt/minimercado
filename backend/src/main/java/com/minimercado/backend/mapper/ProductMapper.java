package com.minimercado.backend.mapper;

import com.minimercado.backend.dto.product.ProductResponseDTO;
import com.minimercado.backend.model.Product;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ProductMapper {
    ProductResponseDTO toResponse(Product product);
}