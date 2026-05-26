package com.minimercado.backend.service.order;


import com.minimercado.backend.dto.orderKitchen.*;
import com.minimercado.backend.dto.order.OrderPostDTO;
import com.minimercado.backend.dto.order.OrderPutDTO;
import com.minimercado.backend.dto.order.OrderResponseDTO;
import com.minimercado.backend.dto.orderItem.OrderItemRequestDTO;
import com.minimercado.backend.dto.orderPickup.OrderReadyForPickupEvent;
import com.minimercado.backend.dto.orderRealtime.OrderRealtimeEvent;
import com.minimercado.backend.enums.OrderKitchenEventType;
import com.minimercado.backend.enums.OrderRealtimeEventType;
import com.minimercado.backend.enums.OrderStatus;
import com.minimercado.backend.enums.PaymentMethod;
import com.minimercado.backend.enums.PaymentStatus;
import com.minimercado.backend.mapper.OrderMapper;
import com.minimercado.backend.model.Client;
import com.minimercado.backend.model.Order;
import com.minimercado.backend.model.OrderItem;
import com.minimercado.backend.model.Product;
import com.minimercado.backend.repository.OrderRepository;
import com.minimercado.backend.repository.ProductRepository;
import com.minimercado.backend.service.client.ClientService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.Predicate;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService{

    private final OrderRepository orderRepository;
    private final ClientService clientService;
    private final ProductRepository productRepository;
    private final OrderMapper mapper;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public OrderResponseDTO get(Long id){
        return mapper.toResponse(findOrderById(id));
    }

    @Override
    public Page<OrderResponseDTO> list(
            OrderStatus status,
            PaymentStatus paymentStatus,
            String clientCpf,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable) {
        return orderRepository.findAll(
                        buildSpecification(status, paymentStatus, clientCpf, from, to),
                        pageable
                )
                .map(mapper::toResponse);
    }

    @Override
    public Page<OrderResponseDTO> getFromClient(String clientCpf, Pageable pageable) {
        return orderRepository
                .findByClientCpf(clientCpf, pageable)
                .map(mapper::toResponse);
    }

    @Override
    @Transactional
    public OrderResponseDTO create(OrderPostDTO data) {
        Order order = new Order();
        Client client = clientService.findEntityByCpf(data.clienteCpf());
        order.setClient(client);

        order.setItems(buildOrderItems(data.items(), order));
        decreaseStock(order.getItems());
        order.setPaymentMethod(data.paymentMethod());
        if (data.paymentMethod() != PaymentMethod.PENDING) {
            order.setPaymentStatus(PaymentStatus.PAID);
            order.setPaidAt(LocalDateTime.now());
        }
        order.calculateTotal();
        
        Order savedOrder = orderRepository.save(order);

        publishKitchenEvent(savedOrder, OrderKitchenEventType.CREATED);
        publishRealtimeEvent(savedOrder, OrderRealtimeEventType.ORDER_CREATED, null, savedOrder.getStatus());
        return mapper.toResponse(savedOrder);
    }

    @Override
    @Transactional
    public OrderResponseDTO edit(Long id, OrderPutDTO data) {
        Order order = findOrderById(id);

        if (order.getStatus() == OrderStatus.CANCELLED ||
                order.getStatus() == OrderStatus.FINISHED) {
            throw new IllegalStateException("Pedidos cancelados ou finalizados nao podem ser editados");
        }

        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new IllegalStateException("Pedidos pagos nao podem ser editados sem ajuste financeiro");
        }

        OrderStatus previousStatus = order.getStatus();
        Client client = clientService.findEntityByCpf(data.clienteCpf());
        if (!order.getClient().getId().equals(client.getId())) {
            order.setClient(client);
        }

        if (data.paymentMethod() != null) {
            order.setPaymentMethod(data.paymentMethod());
        }

        applyStockChangesForUpdate(order, data.items());

        order.getItems().clear();
        order.getItems().addAll(buildOrderItems(data.items(), order));
        order.calculateTotal();

        if (previousStatus == OrderStatus.READY_FOR_PICKUP) {
            order.setStatus(OrderStatus.PENDING);
            order.setReadyAt(null);
        }

        Order savedOrder = orderRepository.save(order);

        publishKitchenEvent(savedOrder, OrderKitchenEventType.UPDATED);
        publishRealtimeEvent(
                savedOrder,
                OrderRealtimeEventType.ORDER_UPDATED,
                previousStatus == savedOrder.getStatus() ? null : previousStatus,
                previousStatus == savedOrder.getStatus() ? null : savedOrder.getStatus()
        );
        return mapper.toResponse(savedOrder);
    }

    @Override
    @Transactional
    public OrderResponseDTO cancel(Long id) {
        Order order = findOrderById(id);

        if (order.getStatus() == OrderStatus.CANCELLED) {
            return mapper.toResponse(order);
        }

        if (order.getStatus() == OrderStatus.FINISHED) {
            throw new IllegalStateException("Pedidos finalizados nao podem ser cancelados");
        }

        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new IllegalStateException("Pedidos pagos nao podem ser cancelados sem estorno");
        }

        OrderStatus previousStatus = order.getStatus();
        increaseStock(order.getItems());
        order.setStatus(OrderStatus.CANCELLED);
        order.setPaymentStatus(PaymentStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        Order savedOrder = orderRepository.save(order);

        publishKitchenEvent(savedOrder, OrderKitchenEventType.CANCELLED);
        publishRealtimeEvent(savedOrder, OrderRealtimeEventType.ORDER_CANCELLED, previousStatus, savedOrder.getStatus());
        return mapper.toResponse(savedOrder);
    }

    @Override
    @Transactional
    public OrderResponseDTO markAsReady(Long id) {
        Order order = findOrderById(id);

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Pedidos cancelados nao podem ser marcados como prontos");
        }

        if (order.getStatus() == OrderStatus.FINISHED) {
            throw new IllegalStateException("Pedidos finalizados nao podem ser marcados como prontos");
        }

        if (order.getStatus() == OrderStatus.READY_FOR_PICKUP) {
            return mapper.toResponse(order);
        }

        OrderStatus previousStatus = order.getStatus();
        order.setStatus(OrderStatus.READY_FOR_PICKUP);
        order.setReadyAt(LocalDateTime.now());
        Order savedOrder = orderRepository.save(order);

        // Evento para avisar que o pedido está pronto para coleta
        eventPublisher.publishEvent(new OrderReadyForPickupEvent(savedOrder.getId()));
        publishRealtimeEvent(savedOrder, OrderRealtimeEventType.ORDER_STATUS_CHANGED, previousStatus, savedOrder.getStatus());
        return mapper.toResponse(savedOrder);
    }

    @Override
    @Transactional
    public OrderResponseDTO markAsPaid(Long id, PaymentMethod paymentMethod) {
        Order order = findOrderById(id);

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Pedidos cancelados nao podem receber pagamento");
        }

        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            return mapper.toResponse(order);
        }

        if (paymentMethod != null) {
            order.setPaymentMethod(paymentMethod);
        }

        order.setPaymentStatus(PaymentStatus.PAID);
        order.setPaidAt(LocalDateTime.now());

        Order savedOrder = orderRepository.save(order);
        publishRealtimeEvent(savedOrder, OrderRealtimeEventType.ORDER_PAID, null, null);
        return mapper.toResponse(savedOrder);
    }


    @Override
    @Transactional
    public OrderResponseDTO finish(Long id) {
        Order order = findOrderById(id);

        if (order.getStatus() != OrderStatus.READY_FOR_PICKUP) {
            throw new IllegalStateException("Somente pedidos prontos para retirada podem ser finalizados");
        }

        OrderStatus previousStatus = order.getStatus();
        order.setStatus(OrderStatus.FINISHED);
        order.setFinishedAt(LocalDateTime.now());
        Order savedOrder = orderRepository.save(order);
        publishRealtimeEvent(savedOrder, OrderRealtimeEventType.ORDER_STATUS_CHANGED, previousStatus, savedOrder.getStatus());
        return mapper.toResponse(savedOrder);
    }

    private Order findOrderById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
    }

    private Product findProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
    }

    private List<OrderItem> buildOrderItems(List<OrderItemRequestDTO> items, Order order) {
        return items.stream()
                .map(itemDto -> {
                    validateOrderItemQuantity(itemDto.quantity());
                    Product product = findProductById(itemDto.productId());
                    return new OrderItem(product, order, itemDto.quantity());
                })
                .toList();
    }

    private void decreaseStock(List<OrderItem> items) {
        items.forEach(item -> item.getProduct().decreaseStock(item.getQuantity()));
    }

    private void increaseStock(List<OrderItem> items) {
        items.forEach(item -> item.getProduct().increaseStock(item.getQuantity()));
    }

    private void applyStockChangesForUpdate(Order order, List<OrderItemRequestDTO> requestedItems) {
        Map<Long, Integer> currentQuantities = groupCurrentItemQuantities(order.getItems());
        Map<Long, Integer> requestedQuantities = groupRequestedItemQuantities(requestedItems);

        requestedQuantities.forEach((productId, requestedQuantity) -> {
            int currentQuantity = currentQuantities.getOrDefault(productId, 0);
            int quantityDifference = requestedQuantity - currentQuantity;

            if (quantityDifference > 0) {
                findProductById(productId).decreaseStock(quantityDifference);
            }

            if (quantityDifference < 0) {
                findProductById(productId).increaseStock(Math.abs(quantityDifference));
            }
        });

        currentQuantities.forEach((productId, currentQuantity) -> {
            if (!requestedQuantities.containsKey(productId)) {
                findProductById(productId).increaseStock(currentQuantity);
            }
        });
    }

    private Map<Long, Integer> groupCurrentItemQuantities(List<OrderItem> items) {
        return items.stream()
                .collect(Collectors.groupingBy(
                        item -> item.getProduct().getId(),
                        Collectors.summingInt(OrderItem::getQuantity)
                ));
    }

    private Map<Long, Integer> groupRequestedItemQuantities(List<OrderItemRequestDTO> items) {
        return items.stream()
                .peek(item -> validateOrderItemQuantity(item.quantity()))
                .collect(Collectors.groupingBy(
                        OrderItemRequestDTO::productId,
                        Collectors.summingInt(OrderItemRequestDTO::quantity)
                ));
    }

    private void validateOrderItemQuantity(Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("A quantidade do item deve ser maior que zero");
        }
    }

    private void publishKitchenEvent(Order order, OrderKitchenEventType eventType) {
        eventPublisher.publishEvent(
                new OrderKitchenEvent(
                        order.getId(),
                        eventType,
                        buildKitchenItems(order)
                )
        );
    }

    private List<OrderKitchenItemDTO> buildKitchenItems(Order order) {
        return order.getItems().stream()
                .map(item -> new OrderKitchenItemDTO(
                        item.getProduct().getId(),
                        item.getProduct().getName(),
                        item.getQuantity()
                ))
                .toList();
    }

    private void publishRealtimeEvent(
            Order order,
            OrderRealtimeEventType eventType,
            OrderStatus fromStatus,
            OrderStatus toStatus) {
        eventPublisher.publishEvent(new OrderRealtimeEvent(
                order.getId(),
                eventType,
                order.getStatus(),
                order.getPaymentStatus(),
                fromStatus,
                toStatus
        ));
    }

    private Specification<Order> buildSpecification(
            OrderStatus status,
            PaymentStatus paymentStatus,
            String clientCpf,
            LocalDateTime from,
            LocalDateTime to) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }

            if (paymentStatus != null) {
                predicates.add(criteriaBuilder.equal(root.get("paymentStatus"), paymentStatus));
            }

            if (clientCpf != null && !clientCpf.isBlank()) {
                predicates.add(criteriaBuilder.equal(root.get("client").get("cpf"), clientCpf));
            }

            if (from != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.<LocalDateTime>get("orderTime"), from));
            }

            if (to != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.<LocalDateTime>get("orderTime"), to));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
