package com.minimercado.backend.model;

import com.minimercado.backend.enums.ProductVariantSelectionMode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter @Setter
@NoArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Version
    private Long version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductIcon icon = ProductIcon.GENERAL;

    @Column(name = "active", nullable = false)
    private Boolean available = true;

    @Column(nullable = false)
    private Boolean hasVariants = false;

    private String variantType;

    @Column(nullable = false)
    private Boolean variantSelectionRequired = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductVariantSelectionMode variantSelectionMode = ProductVariantSelectionMode.SINGLE;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductVariant> variants = new ArrayList<>();

    public Product(String name, BigDecimal price) {
        this.name = name;
        this.price = price;
    }

    public Product(String name, BigDecimal price, ProductIcon icon, Boolean available) {
        this.name = name;
        this.price = price;
        this.icon = icon;
        this.available = available == null || available;
    }

    public void replaceVariants(List<ProductVariant> nextVariants) {
        this.variants.clear();
        this.variants.addAll(nextVariants);
    }

}
