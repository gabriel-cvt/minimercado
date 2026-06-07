package com.minimercado.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

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
    @Column(nullable = false)
    private String productName;
    private Long selectedVariantId;
    private String selectedVariantName;
    @Column(length = 500)
    private String selectedVariantNames;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "order_item_selected_variant_ids", joinColumns = @JoinColumn(name = "order_item_id"))
    @Column(name = "variant_id")
    private List<Long> selectedVariantIds = new ArrayList<>();

    public OrderItem(Product product, Order order, Integer quantity) {
        this.product = product;
        this.order = order;
        this.quantity = quantity;
        this.unitPrice = product.getPrice();
        this.productName = product.getName();
    }

    public OrderItem(
            Product product,
            Order order,
            Integer quantity,
            ProductVariant selectedVariant) {
        this(product, order, quantity, selectedVariant == null ? List.of() : List.of(selectedVariant));
    }

    public OrderItem(
            Product product,
            Order order,
            Integer quantity,
            List<ProductVariant> selectedVariants) {
        this(product, order, quantity);
        List<ProductVariant> safeVariants = selectedVariants == null ? List.of() : selectedVariants;
        this.selectedVariantIds = new ArrayList<>(safeVariants.stream()
                .map(ProductVariant::getId)
                .toList());
        this.selectedVariantId = safeVariants.isEmpty() ? null : safeVariants.get(0).getId();
        this.selectedVariantName = safeVariants.isEmpty() ? null : safeVariants.get(0).getName();
        this.selectedVariantNames = safeVariants.isEmpty()
                ? null
                : String.join(", ", safeVariants.stream().map(ProductVariant::getName).toList());
    }

    public Double getSubtotal() {
        return this.unitPrice * this.quantity;
    }

    public List<Long> selectedVariantIdsOrLegacy() {
        if (selectedVariantIds != null && !selectedVariantIds.isEmpty()) {
            return selectedVariantIds;
        }
        return selectedVariantId == null ? List.of() : List.of(selectedVariantId);
    }

    public List<String> selectedVariantNamesOrLegacy() {
        if (selectedVariantNames != null && !selectedVariantNames.isBlank()) {
            return List.of(selectedVariantNames.split("\\s*,\\s*"));
        }
        return selectedVariantName == null ? List.of() : List.of(selectedVariantName);
    }
}
