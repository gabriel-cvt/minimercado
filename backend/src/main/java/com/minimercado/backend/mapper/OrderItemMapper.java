package com.minimercado.backend.mapper;

import com.minimercado.backend.dto.orderItem.OrderItemResponseDTO;
import com.minimercado.backend.model.OrderItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OrderItemMapper {

    @Mapping(source = "product.id", target = "productId")
    @Mapping(source = "product.name", target = "productName")
    @Mapping(source = "product.requiresKitchenPreparation", target = "requiresKitchenPreparation")
    @Mapping(source = "unitPrice", target = "unitPrice")
    @Mapping(expression = "java(item.getUnitPrice() * item.getQuantity())", target = "subtotal")
    OrderItemResponseDTO toResponse(OrderItem item);
}
