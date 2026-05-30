package com.minimercado.backend.dto.dashboard;

public record DashboardSummaryDTO(
        Long ordersToday,
        Long totalOrders,
        Double revenueToday,
        Double totalRevenue,
        Long pendingPayments,
        Long preparingOrders,
        Long readyForPickupOrders,
        Long finishedToday,
        Long cancelledToday,
        Double averagePreparationMinutes
) {
}
