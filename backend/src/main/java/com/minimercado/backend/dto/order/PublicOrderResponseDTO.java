package com.minimercado.backend.dto.order;

import com.minimercado.backend.enums.OrderStatus;

import java.time.LocalDateTime;

public record PublicOrderResponseDTO(
        Long id,
        LocalDateTime orderTime,
        LocalDateTime readyAt,
        OrderStatus status) {
}
