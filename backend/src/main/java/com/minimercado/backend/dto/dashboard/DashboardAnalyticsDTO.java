package com.minimercado.backend.dto.dashboard;

import java.util.List;
import java.math.BigDecimal;
import com.minimercado.backend.enums.PaymentMethod;
import com.minimercado.backend.enums.OrderStatus;

public record DashboardAnalyticsDTO(
        Double averagePreparationMinutes,
        BigDecimal averageTicket,
        List<PaymentMethodMetricDTO> paymentMethods,
        List<HourlyOrdersDTO> ordersByHour,
        List<StatusMetricDTO> statuses,
        List<TopProductDTO> topProducts
) {
    public record PaymentMethodMetricDTO(PaymentMethod paymentMethod, Long ordersCount) {
    }

    public record HourlyOrdersDTO(Integer hour, Long ordersCount) {
    }

    public record StatusMetricDTO(OrderStatus status, Long ordersCount) {
    }

    public record TopProductDTO(Long productId, String name, Long quantitySold, BigDecimal totalValue) {
    }
}
