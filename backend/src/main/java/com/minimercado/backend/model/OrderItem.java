package com.minimercado.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "order_items")
@Getter @Setter
@NoArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;
    private Integer quantity;
    private Double unitPrice;
    private Long selectedVariantId;
    private String selectedVariantName;

    public OrderItem(Product product, Order order, Integer quantity) {
        this.product = product;
        this.order = order;
        this.quantity = quantity;
        this.unitPrice = product.getPrice();
    }

    public OrderItem(
            Product product,
            Order order,
            Integer quantity,
            ProductVariant selectedVariant) {
        this(product, order, quantity);
        this.selectedVariantId = selectedVariant == null ? null : selectedVariant.getId();
        this.selectedVariantName = selectedVariant == null ? null : selectedVariant.getName();
    }

    public Double getSubtotal() {
        return this.unitPrice * this.quantity;
    }
}
