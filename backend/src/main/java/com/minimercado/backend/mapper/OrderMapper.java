package com.minimercado.backend.mapper;

import com.minimercado.backend.dto.order.OrderResponseDTO;
import com.minimercado.backend.model.Order;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", uses = {OrderItemMapper.class, ClientMapper.class})
public interface OrderMapper {

    OrderResponseDTO toResponse(Order order);
}