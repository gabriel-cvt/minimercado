package com.minimercado.backend.service.product;

import com.minimercado.backend.dto.product.ProductPostDTO;
import com.minimercado.backend.dto.product.ProductPutDTO;
import com.minimercado.backend.dto.product.ProductResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ProductService {
    ProductResponseDTO getById(Long id);
    Page<ProductResponseDTO> getAll(Pageable pageable, String name, Boolean available);
    ProductResponseDTO create(ProductPostDTO data);
    ProductResponseDTO update(Long id, ProductPutDTO data);
    ProductResponseDTO updateAvailability(Long id, Boolean available);
}
