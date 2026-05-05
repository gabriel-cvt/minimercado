package com.minimercado.backend.service.kitchenNotifier;

import com.minimercado.backend.dto.orderKitchen.OrderKitchenEvent;

public interface KitchenNotifier {
    void notify(OrderKitchenEvent event);
}
