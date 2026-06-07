package com.minimercado.backend.service.product;

import com.minimercado.backend.dto.product.ProductPostDTO;
import com.minimercado.backend.dto.product.ProductPutDTO;
import com.minimercado.backend.dto.product.ProductResponseDTO;
import com.minimercado.backend.dto.product.ProductVariantInputDTO;
import com.minimercado.backend.enums.ProductVariantSelectionMode;
import com.minimercado.backend.mapper.ProductMapper;
import com.minimercado.backend.model.Product;
import com.minimercado.backend.model.ProductIcon;
import com.minimercado.backend.model.ProductVariant;
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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    @Override
    @Transactional(readOnly = true)
    public ProductResponseDTO getById(Long id) {
        return productMapper.toResponse(findActiveProductById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> getAll(
            Pageable pageable,
            String name,
            Boolean inStock) {
        return productRepository.findAll(buildSpecification(name, inStock), pageable)
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
        Product product = findActiveProductById(id);

        updateProductFields(product, data);

        return productMapper.toResponse(productRepository.save(product));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Product product = findProductById(id);
        product.setActive(false);
        productRepository.save(product);
    }

    @Override
    @Transactional
    public ProductResponseDTO  updateStock(Long id, Integer quantityChange) {
        Product product = findActiveProductById(id);

        applyStockChange(product, quantityChange);

        return productMapper.toResponse(productRepository.save(product));
    }

    private Product findProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
    }

    private Product findActiveProductById(Long id) {
        Product product = findProductById(id);
        if (Boolean.FALSE.equals(product.getActive())) {
            throw new EntityNotFoundException();
        }
        return product;
    }

    private Product buildProduct(ProductPostDTO data) {
        validateStockQuantity(data.stockQuantity());

        Product product = new Product(
                data.name(),
                data.price(),
                data.icon() != null ? data.icon() : ProductIcon.GENERAL,
                data.stockQuantity()
        );
        configureProduct(
                product,
                data.hasVariants(),
                data.variantType(),
                data.variantSelectionRequired(),
                data.variantSelectionMode(),
                data.variants()
        );
        return product;
    }

    private void updateProductFields(Product product, ProductPutDTO data) {
        if (data.name() != null) {
            product.setName(data.name());
        }

        if (data.price() != null) {
            product.setPrice(data.price());
        }

        if (data.icon() != null) {
            product.setIcon(data.icon());
        }

        if (data.hasVariants() != null ||
                data.variantType() != null ||
                data.variantSelectionRequired() != null ||
                data.variantSelectionMode() != null ||
                data.variants() != null) {
            configureProduct(
                    product,
                    data.hasVariants() != null ? data.hasVariants() : product.getHasVariants(),
                    data.variantType() != null ? data.variantType() : product.getVariantType(),
                    data.variantSelectionRequired() != null
                            ? data.variantSelectionRequired()
                            : product.getVariantSelectionRequired(),
                    data.variantSelectionMode() != null
                            ? data.variantSelectionMode()
                            : product.getVariantSelectionMode(),
                    data.variants() != null
                            ? data.variants()
                            : product.getVariants().stream()
                                    .map(variant -> new ProductVariantInputDTO(
                                            variant.getId(),
                                            variant.getName(),
                                            variant.getAvailable()
                                    ))
                                    .toList()
            );
        }
    }

    private void configureProduct(
            Product product,
            Boolean hasVariants,
            String variantType,
            Boolean variantSelectionRequired,
            ProductVariantSelectionMode variantSelectionMode,
            List<ProductVariantInputDTO> variants) {
        boolean resolvedHasVariants = Boolean.TRUE.equals(hasVariants);
        ProductVariantSelectionMode resolvedSelectionMode = variantSelectionMode == null
                ? ProductVariantSelectionMode.SINGLE
                : variantSelectionMode;

        product.setHasVariants(resolvedHasVariants);

        if (resolvedHasVariants) {
            if (variantType == null || variantType.isBlank()) {
                throw new IllegalArgumentException("Informe o tipo de variacao do produto");
            }
            if (variants == null || variants.isEmpty()) {
                throw new IllegalArgumentException("Informe ao menos uma variante do produto");
            }
            validateVariantNames(variants);
            product.setVariantType(variantType.trim());
            product.setVariantSelectionRequired(Boolean.TRUE.equals(variantSelectionRequired));
            product.setVariantSelectionMode(resolvedSelectionMode);
            product.replaceVariants(buildVariants(product, variants));
        } else {
            product.setVariantType(null);
            product.setVariantSelectionRequired(false);
            product.setVariantSelectionMode(ProductVariantSelectionMode.SINGLE);
            product.replaceVariants(List.of());
        }
    }

    private void validateVariantNames(List<ProductVariantInputDTO> variants) {
        Set<String> names = new HashSet<>();
        for (ProductVariantInputDTO variant : variants) {
            String name = variant.name().trim().toLowerCase();
            if (!names.add(name)) {
                throw new IllegalArgumentException("Nao podem existir variantes repetidas");
            }
        }
    }

    private List<ProductVariant> buildVariants(Product product, List<ProductVariantInputDTO> variants) {
        Map<Long, ProductVariant> existingVariants = product.getVariants().stream()
                .collect(Collectors.toMap(ProductVariant::getId, Function.identity()));

        return variants.stream()
                .map(input -> {
                    if (input.id() == null) {
                        return new ProductVariant(product, input.name().trim(), input.available());
                    }

                    ProductVariant existing = existingVariants.get(input.id());
                    if (existing == null) {
                        throw new IllegalArgumentException("A variante nao pertence ao produto informado");
                    }
                    existing.setName(input.name().trim());
                    existing.setAvailable(input.available() == null || input.available());
                    return existing;
                })
                .toList();
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

    private Specification<Product> buildSpecification(
            String name,
            Boolean inStock) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(criteriaBuilder.isTrue(root.<Boolean>get("active")));

            if (name != null && !name.isBlank()) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("name")),
                        "%" + name.toLowerCase() + "%"
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
