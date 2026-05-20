package com.minimercado.backend.service.product;

import com.minimercado.backend.dto.product.ProductPostDTO;
import com.minimercado.backend.dto.product.ProductPutDTO;
import com.minimercado.backend.dto.product.ProductResponseDTO;
import com.minimercado.backend.mapper.ProductMapper;
import com.minimercado.backend.model.Product;
import com.minimercado.backend.repository.ProductRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    @Override
    @Transactional(readOnly = true)
    public ProductResponseDTO getById(Long id) {
        return productMapper.toResponse(findProductById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> getAll(
            Pageable pageable,
            String name,
            Boolean requiresKitchenPreparation,
            Boolean inStock) {
        return productRepository.findAll(buildSpecification(name, requiresKitchenPreparation, inStock), pageable)
                .map(productMapper::toResponse);
    }

    @Override
    @Transactional
    public ProductResponseDTO create(ProductPostDTO data) {
        Product product = buildProduct(data);
        Product savedProduct = productRepository.save(product);
        return productMapper.toResponse(savedProduct);
    }

    @Override
    @Transactional
    public ProductResponseDTO update(Long id, ProductPutDTO data) {
        Product product = findProductById(id);

        updateProductFields(product, data);

        return productMapper.toResponse(productRepository.save(product));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!productRepository.existsById(id)) {
            throw new EntityNotFoundException();
        }
        productRepository.deleteById(id);
    }

    @Override
    @Transactional
    public ProductResponseDTO  updateStock(Long id, Integer quantityChange) {
        Product product = findProductById(id);

        applyStockChange(product, quantityChange);

        return productMapper.toResponse(productRepository.save(product));
    }

    private Product findProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
    }

    private Product buildProduct(ProductPostDTO data) {
        validateStockQuantity(data.stockQuantity());

        return new Product(
                data.name(),
                data.price(),
                data.urlImage(),
                kitchenPreparationOrDefault(data.requiresKitchenPreparation()),
                data.stockQuantity()
        );
    }

    private void updateProductFields(Product product, ProductPutDTO data) {
        if (data.name() != null) {
            product.setName(data.name());
        }

        if (data.price() != null) {
            product.setPrice(data.price());
        }

        if (data.urlImage() != null) {
            product.setUrlImage(data.urlImage());
        }

        if (data.requiresKitchenPreparation() != null) {
            product.setRequiresKitchenPreparation(data.requiresKitchenPreparation());
        }
    }

    private void applyStockChange(Product product, Integer quantityChange) {
        if (quantityChange == null || quantityChange == 0) {
            throw new IllegalArgumentException("A alteracao de estoque deve ser diferente de zero");
        }

        int updatedStock = product.getStockQuantity() + quantityChange;
        validateStockQuantity(updatedStock);
        product.setStockQuantity(updatedStock);
    }

    private void validateStockQuantity(Integer stockQuantity) {
        if (stockQuantity == null || stockQuantity < 0) {
            throw new IllegalArgumentException("A quantidade em estoque nao pode ser negativa");
        }
    }

    private Boolean kitchenPreparationOrDefault(Boolean requiresKitchenPreparation) {
        return requiresKitchenPreparation != null ? requiresKitchenPreparation : true;
    }

    private Specification<Product> buildSpecification(
            String name,
            Boolean requiresKitchenPreparation,
            Boolean inStock) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (name != null && !name.isBlank()) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("name")),
                        "%" + name.toLowerCase() + "%"
                ));
            }

            if (requiresKitchenPreparation != null) {
                predicates.add(criteriaBuilder.equal(
                        root.get("requiresKitchenPreparation"),
                        requiresKitchenPreparation
                ));
            }

            if (inStock != null) {
                if (inStock) {
                    predicates.add(criteriaBuilder.greaterThan(root.<Integer>get("stockQuantity"), 0));
                } else {
                    predicates.add(criteriaBuilder.equal(root.<Integer>get("stockQuantity"), 0));
                }
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
