package com.minimercado.backend.mapper;

import com.minimercado.backend.dto.orderItem.OrderItemResponseDTO;
import com.minimercado.backend.dto.order.OrderResponseDTO;
import com.minimercado.backend.model.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class OrderMapper {

    private final OrderItemMapper orderItemMapper;
    private final ClientMapper clientMapper;

    public OrderMapper(OrderItemMapper orderItemMapper, ClientMapper clientMapper) {
        this.orderItemMapper = orderItemMapper;
        this.clientMapper = clientMapper;
    }

    public OrderResponseDTO toResponse(Order order) {
        if (order == null) {
            return null;
        }

        List<OrderItemResponseDTO> items = order.getItems() == null
                ? null
                : order.getItems().stream().map(orderItemMapper::toResponse).toList();

        return new OrderResponseDTO(
                order.getId(),
                order.getOrderTime(),
                order.getStatus(),
                order.getPaymentStatus(),
                items,
                clientMapper.toResponse(order.getClient()),
                order.getPaymentMethod(),
                order.getTotalValue()
        );
    }
}
