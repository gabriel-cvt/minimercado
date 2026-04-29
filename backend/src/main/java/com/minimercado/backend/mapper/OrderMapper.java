package com.minimercado.backend.mapper;

import com.minimercado.backend.dto.order.OrderResponseDTO;
import com.minimercado.backend.model.Order;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {OrderItemMapper.class})
public interface OrderMapper {

    @Mapping(source = "client.name", target = "clientName")
    @Mapping(source = "client.id", target = "clientId")
    OrderResponseDTO toResponse(Order order);
}