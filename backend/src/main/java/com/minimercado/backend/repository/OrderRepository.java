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
import java.math.BigDecimal;


@Repository
public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    interface PreparationTimeProjection {
        LocalDateTime getOrderTime();
        LocalDateTime getReadyAt();
    }

    interface PaymentMethodProjection {
        com.minimercado.backend.enums.PaymentMethod getPaymentMethod();
        Long getOrdersCount();
    }

    interface HourlyOrdersProjection {
        Integer getHour();
        Long getOrdersCount();
    }

    interface StatusProjection {
        OrderStatus getStatus();
        Long getOrdersCount();
    }

    interface TopProductProjection {
        Long getProductId();
        String getName();
        Long getQuantitySold();
        BigDecimal getTotalValue();
    }

    long countByOrderTimeBetween(LocalDateTime from, LocalDateTime to);

    long countByStatus(OrderStatus status);

    long countByFinishedAtBetween(LocalDateTime from, LocalDateTime to);

    long countByCancelledAtBetween(LocalDateTime from, LocalDateTime to);

    long countByPaymentStatus(PaymentStatus paymentStatus);

    List<Order> findAllByOrderTimeBetween(LocalDateTime from, LocalDateTime to);

    List<Order> findAllByPaidAtBetween(LocalDateTime from, LocalDateTime to);

    List<Order> findAllByReadyAtBetween(LocalDateTime from, LocalDateTime to);

    @Query("select o.orderTime as orderTime, o.readyAt as readyAt from Order o " +
            "where o.readyAt is not null and o.status <> com.minimercado.backend.enums.OrderStatus.CANCELLED")
    List<PreparationTimeProjection> findPreparationTimes();

    @Query("select coalesce(avg(o.totalValue), 0) from Order o where o.paidAt is not null")
    BigDecimal averagePaidTicket();

    @Query("select o.paymentMethod as paymentMethod, count(o) as ordersCount from Order o " +
            "where o.paidAt is not null and o.paymentMethod is not null group by o.paymentMethod")
    List<PaymentMethodProjection> paymentMethodMetrics();

    @Query("select hour(o.orderTime) as hour, count(o) as ordersCount from Order o " +
            "where o.status <> com.minimercado.backend.enums.OrderStatus.CANCELLED group by hour(o.orderTime)")
    List<HourlyOrdersProjection> hourlyOrderMetrics();

    @Query("select o.status as status, count(o) as ordersCount from Order o group by o.status")
    List<StatusProjection> statusMetrics();

    @Query("select i.product.id as productId, i.product.name as name, sum(i.quantity) as quantitySold, " +
            "sum(i.unitPrice * i.quantity) as totalValue from OrderItem i " +
            "where i.order.status <> com.minimercado.backend.enums.OrderStatus.CANCELLED " +
            "group by i.product.id, i.product.name order by sum(i.quantity) desc, sum(i.unitPrice * i.quantity) desc")
    List<TopProductProjection> topProductMetrics();

    @Query("""
            select coalesce(sum(o.totalValue), 0)
            from #{#entityName} o
            where o.paymentStatus = :paymentStatus
              and o.paidAt between :from and :to
            """)
    BigDecimal sumTotalValueByPaymentStatusAndPaidAtBetween(
            @Param("paymentStatus") PaymentStatus paymentStatus,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query("""
            select coalesce(sum(o.totalValue), 0)
            from #{#entityName} o
            where o.paymentStatus = :paymentStatus
            """)
    BigDecimal sumTotalValueByPaymentStatus(@Param("paymentStatus") PaymentStatus paymentStatus);

}
