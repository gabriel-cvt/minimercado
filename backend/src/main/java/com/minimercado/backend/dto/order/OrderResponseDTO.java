package com.minimercado.backend.dto.order;

import com.minimercado.backend.dto.client.ClientResponseDTO;
import com.minimercado.backend.dto.orderItem.OrderItemResponseDTO;
import com.minimercado.backend.enums.OrderStatus;
import com.minimercado.backend.enums.PaymentMethod;
import com.minimercado.backend.enums.PaymentStatus;

import java.time.LocalDateTime;
import java.util.List;

public record OrderResponseDTO(
        Long id,
        LocalDateTime orderTime,
        LocalDateTime readyAt,
        LocalDateTime finishedAt,
        LocalDateTime paidAt,
        LocalDateTime cancelledAt,
        OrderStatus status,
        PaymentStatus paymentStatus,
        List<OrderItemResponseDTO> items,
        ClientResponseDTO client,
        PaymentMethod paymentMethod,
        Double totalValue,
        String observation
) {}
