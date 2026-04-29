package com.minimercado.backend.service.product;

import com.minimercado.backend.dto.product.ProductPostDTO;
import com.minimercado.backend.dto.product.ProductResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ProductService {
    ProductResponseDTO getById(UUID uuid);
    Page<ProductResponseDTO> getAll(Pageable pageable);
    ProductResponseDTO create(ProductPostDTO data);
    ProductResponseDTO update(UUID uuid, ProductPostDTO data);
    void delete(UUID uuid);
    void updateStock(UUID uuid, Integer quantity);
}