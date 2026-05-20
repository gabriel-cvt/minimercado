package com.minimercado.backend.dto.orderRealtime;

import com.minimercado.backend.enums.OrderRealtimeEventType;
import com.minimercado.backend.enums.OrderStatus;
import com.minimercado.backend.enums.PaymentStatus;

public record OrderRealtimeEvent(
        Long orderId,
        OrderRealtimeEventType type,
        OrderStatus status,
        PaymentStatus paymentStatus,
        OrderStatus fromStatus,
        OrderStatus toStatus
) {
}
