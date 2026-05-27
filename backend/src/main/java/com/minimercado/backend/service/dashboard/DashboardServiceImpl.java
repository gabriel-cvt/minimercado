package com.minimercado.backend.service.dashboard;

import com.minimercado.backend.dto.dashboard.DashboardAnalyticsDTO;
import com.minimercado.backend.dto.dashboard.DashboardAnalyticsDTO.HourlyOrdersDTO;
import com.minimercado.backend.dto.dashboard.DashboardAnalyticsDTO.PaymentMethodMetricDTO;
import com.minimercado.backend.dto.dashboard.DashboardAnalyticsDTO.TopClientDTO;
import com.minimercado.backend.dto.dashboard.DashboardAnalyticsDTO.TopProductDTO;
import com.minimercado.backend.dto.dashboard.DashboardSummaryDTO;
import com.minimercado.backend.enums.OrderStatus;
import com.minimercado.backend.enums.PaymentMethod;
import com.minimercado.backend.enums.PaymentStatus;
import com.minimercado.backend.model.Order;
import com.minimercado.backend.model.OrderItem;
import com.minimercado.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final OrderRepository orderRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryDTO getSummary() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

        return new DashboardSummaryDTO(
                orderRepository.countByOrderTimeBetween(startOfDay, endOfDay),
                orderRepository.sumTotalValueByPaymentStatusAndPaidAtBetween(
                        PaymentStatus.PAID,
                        startOfDay,
                        endOfDay
                ),
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
        List<Order> orders = orderRepository.findAll();
        List<Order> paidOrders = orders.stream()
                .filter(order -> order.getPaidAt() != null)
                .toList();
        List<Order> preparedOrders = orders.stream()
                .filter(order -> order.getReadyAt() != null)
                .toList();
        List<Order> validOrders = orders.stream()
                .filter(order -> order.getStatus() != OrderStatus.CANCELLED)
                .toList();

        return new DashboardAnalyticsDTO(
                averagePreparationMinutes(preparedOrders),
                averageTicket(paidOrders),
                paymentMethods(paidOrders),
                ordersByHour(validOrders),
                topClients(paidOrders),
                topProducts(validOrders)
        );
    }

    private Double averagePreparationMinutes(List<Order> orders) {
        if (orders.isEmpty()) {
            return 0D;
        }

        double totalMinutes = orders.stream()
                .filter(order -> order.getReadyAt() != null)
                .mapToLong(order -> Duration.between(order.getOrderTime(), order.getReadyAt()).toSeconds())
                .average()
                .orElse(0D) / 60D;
        return roundOneDecimal(totalMinutes);
    }

    private Double averageTicket(List<Order> paidOrders) {
        return roundCurrency(paidOrders.stream()
                .mapToDouble(Order::getTotalValue)
                .average()
                .orElse(0D));
    }

    private List<PaymentMethodMetricDTO> paymentMethods(List<Order> paidOrders) {
        return Arrays.stream(PaymentMethod.values())
                .map(paymentMethod -> new PaymentMethodMetricDTO(
                        paymentMethod.name(),
                        paidOrders.stream()
                                .filter(order -> order.getPaymentMethod() == paymentMethod)
                                .count()
                ))
                .filter(metric -> metric.ordersCount() > 0)
                .toList();
    }

    private List<HourlyOrdersDTO> ordersByHour(List<Order> orders) {
        return IntStream.range(0, 24)
                .mapToObj(hour -> new HourlyOrdersDTO(
                        hour,
                        orders.stream()
                                .filter(order -> order.getOrderTime().getHour() == hour)
                                .count()
                ))
                .filter(metric -> metric.ordersCount() > 0)
                .toList();
    }

    private List<TopClientDTO> topClients(List<Order> paidOrders) {
        Map<Long, List<Order>> groupedOrders = paidOrders.stream()
                .collect(Collectors.groupingBy(order -> order.getClient().getId()));

        return groupedOrders.values().stream()
                .map(orders -> new TopClientDTO(
                        orders.getFirst().getClient().getId(),
                        orders.getFirst().getClient().getName(),
                        orders.getFirst().getClient().getCpf(),
                        (long) orders.size(),
                        roundCurrency(orders.stream().mapToDouble(Order::getTotalValue).sum())
                ))
                .sorted((first, second) -> Double.compare(second.totalSpent(), first.totalSpent()))
                .limit(5)
                .toList();
    }

    private List<TopProductDTO> topProducts(List<Order> orders) {
        Map<Long, List<OrderItem>> groupedItems = orders.stream()
                .flatMap(order -> order.getItems().stream())
                .collect(Collectors.groupingBy(item -> item.getProduct().getId()));

        return groupedItems.values().stream()
                .map(items -> new TopProductDTO(
                        items.getFirst().getProduct().getId(),
                        items.getFirst().getProduct().getName(),
                        items.stream().mapToLong(OrderItem::getQuantity).sum(),
                        roundCurrency(items.stream().mapToDouble(OrderItem::getSubtotal).sum())
                ))
                .sorted((first, second) -> Long.compare(second.quantitySold(), first.quantitySold()))
                .limit(5)
                .toList();
    }

    private Double roundOneDecimal(double value) {
        return Math.round(value * 10D) / 10D;
    }

    private Double roundCurrency(double value) {
        return Math.round(value * 100D) / 100D;
    }
}
