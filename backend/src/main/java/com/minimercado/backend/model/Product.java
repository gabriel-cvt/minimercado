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
    @GeneratedValue(strategy = GenerationType.UUID)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double price;

    // private String description;
    // private Integer stockQuantity;
    // private String category;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order;

    public Product(String name, Double price) {
        this.name = name;
        this.price = price;
    }
}