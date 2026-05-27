package com.minimercado.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

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

    @Column(nullable = false)
    private Double price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductIcon icon = ProductIcon.GENERAL;

    @Column(nullable = false)
    private Integer stockQuantity;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false)
    private Boolean hasVariants = false;

    private String variantType;

    @Column(nullable = false)
    private Boolean variantSelectionRequired = false;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductVariant> variants = new ArrayList<>();

    public Product(String name, Double price) {
        this.name = name;
        this.price = price;
    }

    public Product(String name, Double price, ProductIcon icon, Integer stockQuantity) {
        this.name = name;
        this.price = price;
        this.icon = icon;
        this.stockQuantity = stockQuantity;
    }

    public void replaceVariants(List<ProductVariant> nextVariants) {
        this.variants.clear();
        this.variants.addAll(nextVariants);
    }

    public void decreaseStock(Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("A quantidade deve ser maior que zero");
        }

        if (this.stockQuantity < quantity) {
            throw new IllegalStateException("Estoque insuficiente para o produto " + this.name);
        }

        this.stockQuantity -= quantity;
    }

    public void increaseStock(Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("A quantidade deve ser maior que zero");
        }

        this.stockQuantity += quantity;
    }
}
