package com.minimercado.backend.dto.dashboard;

public record DashboardSummaryDTO(
        Long ordersToday,
        Double revenueToday,
        Long pendingPayments,
        Long preparingOrders,
        Long readyForPickupOrders,
        Long finishedToday,
        Long cancelledToday
) {
}
