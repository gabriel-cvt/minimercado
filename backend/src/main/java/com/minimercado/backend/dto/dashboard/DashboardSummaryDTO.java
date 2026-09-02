package com.minimercado.backend.dto.dashboard;

import java.math.BigDecimal;

public record DashboardSummaryDTO(
        Long ordersToday,
        Long totalOrders,
        BigDecimal revenueToday,
        BigDecimal totalRevenue,
        Long pendingPayments,
        Long preparingOrders,
        Long readyForPickupOrders,
        Long finishedToday,
        Long cancelledToday,
        Double averagePreparationMinutes
) {
}
