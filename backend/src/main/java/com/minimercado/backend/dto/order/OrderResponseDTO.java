package com.minimercado.backend.dto.order;

import com.minimercado.backend.dto.client.ClientResponseDTO;
import com.minimercado.backend.dto.orderItem.OrderItemResponseDTO;
import com.minimercado.backend.enums.PaymentMethod;

import java.time.LocalDateTime;
import java.util.List;

public record OrderResponseDTO(
        Long id,
        LocalDateTime orderTime,
        List<OrderItemResponseDTO> items,
        ClientResponseDTO client,
        PaymentMethod paymentMethod,
        Double totalValue
) {}
