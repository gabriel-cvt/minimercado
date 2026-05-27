package com.minimercado.backend.repository;

import com.minimercado.backend.model.Order;
import com.minimercado.backend.enums.OrderStatus;
import com.minimercado.backend.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;


@Repository
public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    Page<Order> findByClientCpf(String clientCpf, Pageable pageable);

    long countByOrderTimeBetween(LocalDateTime from, LocalDateTime to);

    long countByStatus(OrderStatus status);

    long countByFinishedAtBetween(LocalDateTime from, LocalDateTime to);

    long countByCancelledAtBetween(LocalDateTime from, LocalDateTime to);

    long countByPaymentStatus(PaymentStatus paymentStatus);

    List<Order> findAllByOrderTimeBetween(LocalDateTime from, LocalDateTime to);

    List<Order> findAllByPaidAtBetween(LocalDateTime from, LocalDateTime to);

    List<Order> findAllByReadyAtBetween(LocalDateTime from, LocalDateTime to);

    @Query("""
            select coalesce(sum(o.totalValue), 0)
            from #{#entityName} o
            where o.paymentStatus = :paymentStatus
              and o.paidAt between :from and :to
            """)
    Double sumTotalValueByPaymentStatusAndPaidAtBetween(
            @Param("paymentStatus") PaymentStatus paymentStatus,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

}
