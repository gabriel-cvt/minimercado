package com.minimercado.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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

    private String urlImage;

    @Column(nullable = false)
    private Boolean requiresKitchenPreparation = true;

    @Column(nullable = false)
    private Integer stockQuantity;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order;

    public Product(String name, Double price) {
        this.name = name;
        this.price = price;
    }

    public Product(String name, Double price, String urlImage, Boolean requiresKitchenPreparation, Integer stockQuantity) {
        this.name = name;
        this.price = price;
        this.urlImage = urlImage;
        this.requiresKitchenPreparation = requiresKitchenPreparation;
        this.stockQuantity = stockQuantity;
    }

    public boolean requiresKitchenPreparation() {
        return Boolean.TRUE.equals(this.requiresKitchenPreparation);
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
