package com.minimercado.backend.service.orderNotifier;

import com.minimercado.backend.dto.orderRealtime.OrderRealtimeEvent;

public interface OrderRealtimeNotifier {
    void notify(OrderRealtimeEvent event);
}
