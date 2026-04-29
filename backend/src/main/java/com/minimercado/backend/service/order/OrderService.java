package com.minimercado.backend.service.order;

import com.minimercado.backend.dto.order.OrderPostDTO;
import com.minimercado.backend.dto.order.OrderPutDTO;
import com.minimercado.backend.dto.order.OrderResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface OrderService {

    OrderResponseDTO get(UUID uuid);

    Page<OrderResponseDTO> getFromClient(UUID clientUuid, Pageable pageable);

    OrderResponseDTO create(OrderPostDTO data);

    OrderResponseDTO edit(UUID uuid, OrderPutDTO data);

    void cancel(UUID uuid);
}