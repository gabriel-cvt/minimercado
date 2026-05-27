package com.minimercado.backend.model;

import com.minimercado.backend.enums.OrderStatus;
import com.minimercado.backend.enums.PaymentMethod;
import com.minimercado.backend.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter @Setter
@NoArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime orderTime = LocalDateTime.now();

    private LocalDateTime readyAt;

    private LocalDateTime finishedAt;

    private LocalDateTime paidAt;

    private LocalDateTime cancelledAt;

    @Enumerated(EnumType.STRING)
    private OrderStatus status = OrderStatus.PENDING;

    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items;

    @ManyToOne
    @JoinColumn(name = "client_id")
    private Client client;

    private Double totalValue;

    @Column(length = 500)
    private String observation;

    public void calculateTotal() {
        this.totalValue = this.items
                .stream()
                .mapToDouble(OrderItem::getSubtotal)
                .sum();
    }
}
