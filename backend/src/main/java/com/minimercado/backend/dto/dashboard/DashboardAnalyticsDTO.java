package com.minimercado.backend.dto.dashboard;

import java.util.List;

public record DashboardAnalyticsDTO(
        Double averagePreparationMinutes,
        Double averageTicket,
        List<PaymentMethodMetricDTO> paymentMethods,
        List<HourlyOrdersDTO> ordersByHour,
        List<TopClientDTO> topClients,
        List<TopProductDTO> topProducts
) {
    public record PaymentMethodMetricDTO(String paymentMethod, Long ordersCount) {
    }

    public record HourlyOrdersDTO(Integer hour, Long ordersCount) {
    }

    public record TopClientDTO(Long clientId, String name, String cpf, Long ordersCount, Double totalSpent) {
    }

    public record TopProductDTO(Long productId, String name, Long quantitySold, Double totalValue) {
    }
}
