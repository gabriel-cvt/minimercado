package com.minimercado.backend.service.order;

import com.minimercado.backend.dto.order.OrderPostDTO;
import com.minimercado.backend.dto.order.OrderPutDTO;
import com.minimercado.backend.dto.order.OrderResponseDTO;
import com.minimercado.backend.enums.OrderStatus;
import com.minimercado.backend.enums.PaymentMethod;
import com.minimercado.backend.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

public interface OrderService {

    OrderResponseDTO get(Long id);

    Page<OrderResponseDTO> list(
            OrderStatus status,
            PaymentStatus paymentStatus,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable);

    OrderResponseDTO create(OrderPostDTO data);

    OrderResponseDTO edit(Long id, OrderPutDTO data);

    OrderResponseDTO cancel(Long id);

    OrderResponseDTO markAsReady(Long id);

    OrderResponseDTO markAsPaid(Long id, PaymentMethod paymentMethod);

    OrderResponseDTO finish(Long id);
}
