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
        return toResponse(findProductById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> getAll(
            Pageable pageable,
            String name,
            Boolean available) {
        return productRepository.findAll(buildSpecification(name, available), pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional
    public ProductResponseDTO create(ProductPostDTO data) {
        Product product = buildProduct(data);
        Product savedProduct = productRepository.save(product);
        return toResponse(savedProduct);
    }

    @Override
    @Transactional
    public ProductResponseDTO update(Long id, ProductPutDTO data) {
        Product product = findProductById(id);

        updateProductFields(product, data);

        return toResponse(productRepository.save(product));
    }

    @Override
    @Transactional
    public ProductResponseDTO updateAvailability(Long id, Boolean available) {
        Product product = findProductById(id);
        product.setAvailable(available);
        return toResponse(productRepository.save(product));
    }

    private Product findProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
    }

    private Product buildProduct(ProductPostDTO data) {
        Product product = new Product(
                data.name().trim(),
                data.price(),
                data.icon() != null ? data.icon() : ProductIcon.GENERAL,
                data.available()
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
            String normalizedName = data.name().trim();
            if (normalizedName.isEmpty()) {
                throw new IllegalArgumentException("O nome do produto nao pode estar vazio");
            }
            product.setName(normalizedName);
        }

        if (data.price() != null) {
            product.setPrice(data.price());
        }

        if (data.icon() != null) {
            product.setIcon(data.icon());
        }

        if (data.available() != null) {
            product.setAvailable(data.available());
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
            validateExistingVariantsAreRetained(product, variants);
            product.setVariantType(variantType.trim());
            product.setVariantSelectionRequired(Boolean.TRUE.equals(variantSelectionRequired));
            product.setVariantSelectionMode(resolvedSelectionMode);
            product.replaceVariants(buildVariants(product, variants));
        } else {
            if (product.getId() != null && !product.getVariants().isEmpty()) {
                throw new IllegalArgumentException(
                        "Produtos com variantes existentes devem manter a configuracao e desabilitar as opcoes"
                );
            }
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

    private void validateExistingVariantsAreRetained(Product product, List<ProductVariantInputDTO> variants) {
        if (product.getId() == null || product.getVariants().isEmpty()) {
            return;
        }
        Set<Long> requestedIds = variants.stream()
                .map(ProductVariantInputDTO::id)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        boolean removedExistingVariant = product.getVariants().stream()
                .map(ProductVariant::getId)
                .anyMatch(id -> !requestedIds.contains(id));
        if (removedExistingVariant) {
            throw new IllegalArgumentException("Variantes existentes devem ser desabilitadas, nao removidas");
        }
    }

    private Specification<Product> buildSpecification(
            String name,
            Boolean available) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (name != null && !name.isBlank()) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("name")),
                        "%" + name.toLowerCase() + "%"
                ));
            }

            if (available != null) {
                predicates.add(criteriaBuilder.equal(root.<Boolean>get("available"), available));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private ProductResponseDTO toResponse(Product product) {
        return productMapper.toResponse(product);
    }
}
