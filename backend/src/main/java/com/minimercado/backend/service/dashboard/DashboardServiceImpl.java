package com.minimercado.backend.service.dashboard;

import com.minimercado.backend.dto.dashboard.DashboardSummaryDTO;
import com.minimercado.backend.enums.OrderStatus;
import com.minimercado.backend.enums.PaymentStatus;
import com.minimercado.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

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
                orderRepository.sumTotalValueByPaymentStatusAndOrderTimeBetween(
                        PaymentStatus.PAID,
                        startOfDay,
                        endOfDay
                ),
                orderRepository.countByPaymentStatus(PaymentStatus.PENDING),
                orderRepository.countByStatus(OrderStatus.PENDING),
                orderRepository.countByStatus(OrderStatus.READY_FOR_PICKUP),
                orderRepository.countByStatusAndOrderTimeBetween(OrderStatus.FINISHED, startOfDay, endOfDay),
                orderRepository.countByStatusAndOrderTimeBetween(OrderStatus.CANCELLED, startOfDay, endOfDay)
        );
    }
}
