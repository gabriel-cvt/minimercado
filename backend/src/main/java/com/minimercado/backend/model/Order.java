package com.minimercado.backend.model;

import com.minimercado.backend.enums.OrderStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
@Getter @Setter
@NoArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime orderTime = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    private OrderStatus status = OrderStatus.PENDING;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<Product> items;

    @ManyToOne
    @JoinColumn(name = "client_id")
    private Client client;

    private Double totalValue;

    public Order(List<Product> products, Client client) {
        this.client = client;
    }

    public void calculateTotal() {
        this.totalValue = this.items
                .stream()
                .mapToDouble(Product::getPrice)
                .sum();
    }
}