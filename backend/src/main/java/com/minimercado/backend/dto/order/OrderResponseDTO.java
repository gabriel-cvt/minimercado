package com.minimercado.backend.dto.order;

import com.minimercado.backend.dto.orderItem.OrderItemResponseDTO;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OrderResponseDTO(
        UUID id,
        LocalDateTime orderTime,
        List<OrderItemResponseDTO> items,
        String clientName,
        UUID clientId
) {}
