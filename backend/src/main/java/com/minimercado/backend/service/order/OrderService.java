package com.minimercado.backend.service.order;

import com.minimercado.backend.dto.order.OrderPostDTO;
import com.minimercado.backend.dto.order.OrderPutDTO;
import com.minimercado.backend.dto.order.OrderResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface OrderService {

    OrderResponseDTO get(Long id);

    Page<OrderResponseDTO> getFromClient(String clientCpf, Pageable pageable);

    OrderResponseDTO create(OrderPostDTO data);

    OrderResponseDTO edit(Long id, OrderPutDTO data);

    void cancel(Long id);

    void markAsReady(Long id);

    void markAsPaid(Long id);

    void finish(Long id);
}