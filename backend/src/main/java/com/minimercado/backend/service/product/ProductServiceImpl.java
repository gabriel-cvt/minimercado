package com.minimercado.backend.service.product;

import com.minimercado.backend.dto.product.ProductPostDTO;
import com.minimercado.backend.dto.product.ProductResponseDTO;
import com.minimercado.backend.mapper.ProductMapper;
import com.minimercado.backend.model.Product;
import com.minimercado.backend.repository.ProductRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    @Override
    @Transactional(readOnly = true)
    public ProductResponseDTO getById(UUID uuid) {
        return productRepository.findById(uuid)
                .map(productMapper::toResponse)
                .orElseThrow(EntityNotFoundException::new);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> getAll(Pageable pageable) {
        return productRepository.findAll(pageable)
                .map(productMapper::toResponse);
    }

    @Override
    @Transactional
    public ProductResponseDTO create(ProductPostDTO data) {
        Product product = new Product(data.name(), data.price());

        // Validações de negócio nessa parte

        Product savedProduct = productRepository.save(product);
        return productMapper.toResponse(savedProduct);
    }

    @Override
    @Transactional
    public ProductResponseDTO update(UUID id, ProductPostDTO data) {
        Product product = productRepository.findById(id)
                .orElseThrow(EntityNotFoundException::new);

        Optional.ofNullable(data.name()).ifPresent(product::setName);
        Optional.ofNullable(data.price()).ifPresent(product::setPrice);

        return productMapper.toResponse(productRepository.save(product));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        if (!productRepository.existsById(id)) {
            throw new EntityNotFoundException();
        }
        productRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void updateStock(UUID id, Integer quantity) {
        // Implementar atualização de estoque caso vá existir
    }
}