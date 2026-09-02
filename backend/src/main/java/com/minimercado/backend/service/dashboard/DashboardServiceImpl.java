package com.minimercado.backend.service.dashboard;

import com.minimercado.backend.dto.dashboard.DashboardAnalyticsDTO;
import com.minimercado.backend.dto.dashboard.DashboardAnalyticsDTO.HourlyOrdersDTO;
import com.minimercado.backend.dto.dashboard.DashboardAnalyticsDTO.PaymentMethodMetricDTO;
import com.minimercado.backend.dto.dashboard.DashboardAnalyticsDTO.TopProductDTO;
import com.minimercado.backend.dto.dashboard.DashboardAnalyticsDTO.StatusMetricDTO;
import com.minimercado.backend.dto.dashboard.DashboardSummaryDTO;
import com.minimercado.backend.enums.OrderStatus;
import com.minimercado.backend.enums.PaymentMethod;
import com.minimercado.backend.enums.PaymentStatus;
import com.minimercado.backend.model.Order;
import com.minimercado.backend.repository.OrderRepository;
import com.minimercado.backend.repository.OrderRepository.PreparationTimeProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final OrderRepository orderRepository;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryDTO getSummary() {
        LocalDate today = LocalDate.now(clock);
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

        return new DashboardSummaryDTO(
                orderRepository.countByOrderTimeBetween(startOfDay, endOfDay),
                orderRepository.count(),
                orderRepository.sumTotalValueByPaymentStatusAndPaidAtBetween(
                        PaymentStatus.PAID,
                        startOfDay,
                        endOfDay
                ),
                orderRepository.sumTotalValueByPaymentStatus(PaymentStatus.PAID),
                orderRepository.countByPaymentStatus(PaymentStatus.PENDING),
                orderRepository.countByStatus(OrderStatus.PENDING),
                orderRepository.countByStatus(OrderStatus.READY_FOR_PICKUP),
                orderRepository.countByFinishedAtBetween(startOfDay, endOfDay),
                orderRepository.countByCancelledAtBetween(startOfDay, endOfDay),
                averagePreparationMinutes(orderRepository.findAllByReadyAtBetween(startOfDay, endOfDay))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardAnalyticsDTO getAnalytics() {
        return new DashboardAnalyticsDTO(
                averagePreparationMinutesFromProjection(orderRepository.findPreparationTimes()),
                orderRepository.averagePaidTicket().setScale(2, RoundingMode.HALF_UP),
                orderRepository.paymentMethodMetrics().stream()
                        .map(metric -> new PaymentMethodMetricDTO(metric.getPaymentMethod(), metric.getOrdersCount()))
                        .toList(),
                orderRepository.hourlyOrderMetrics().stream()
                        .map(metric -> new HourlyOrdersDTO(metric.getHour(), metric.getOrdersCount()))
                        .toList(),
                orderRepository.statusMetrics().stream()
                        .map(metric -> new StatusMetricDTO(metric.getStatus(), metric.getOrdersCount()))
                        .toList(),
                topProducts(5)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<TopProductDTO> getTopProducts() {
        return topProducts(Long.MAX_VALUE);
    }

    private Double averagePreparationMinutes(List<Order> orders) {
        if (orders.isEmpty()) {
            return 0D;
        }

        double totalMinutes = orders.stream()
                .filter(order -> order.getReadyAt() != null)
                .filter(order -> order.getStatus() != OrderStatus.CANCELLED)
                .mapToLong(order -> Duration.between(order.getOrderTime(), order.getReadyAt()).toSeconds())
                .average()
                .orElse(0D) / 60D;
        return roundOneDecimal(totalMinutes);
    }

    private List<TopProductDTO> topProducts(long limit) {
        return orderRepository.topProductMetrics().stream()
                .map(metric -> new TopProductDTO(metric.getProductId(), metric.getName(),
                        metric.getQuantitySold(), metric.getTotalValue()))
                .limit(limit)
                .toList();
    }

    private Double averagePreparationMinutesFromProjection(List<PreparationTimeProjection> orders) {
        if (orders.isEmpty()) return 0D;
        return roundOneDecimal(orders.stream()
                .mapToLong(order -> Duration.between(order.getOrderTime(), order.getReadyAt()).toSeconds())
                .average().orElse(0D) / 60D);
    }

    private Double roundOneDecimal(double value) {
        return Math.round(value * 10D) / 10D;
    }

}
