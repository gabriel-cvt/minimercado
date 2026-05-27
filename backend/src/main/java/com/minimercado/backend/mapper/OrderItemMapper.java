package com.minimercado.backend.mapper;

import com.minimercado.backend.dto.orderItem.OrderItemResponseDTO;
import com.minimercado.backend.model.OrderItem;
import org.springframework.stereotype.Component;

@Component
public class OrderItemMapper {

    public OrderItemResponseDTO toResponse(OrderItem item) {
        if (item == null) {
            return null;
        }

        return new OrderItemResponseDTO(
                item.getProduct().getId(),
                item.getProductName(),
                item.getUnitPrice(),
                item.getQuantity(),
                item.getSubtotal(),
                item.getSelectedVariantId(),
                item.getSelectedVariantName()
        );
    }
}
