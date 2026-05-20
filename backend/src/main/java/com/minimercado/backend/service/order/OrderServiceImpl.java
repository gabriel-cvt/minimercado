package com.minimercado.backend.service.order;


import com.minimercado.backend.dto.orderKitchen.*;
import com.minimercado.backend.dto.order.OrderPostDTO;
import com.minimercado.backend.dto.order.OrderPutDTO;
import com.minimercado.backend.dto.order.OrderResponseDTO;
import com.minimercado.backend.dto.orderItem.OrderItemRequestDTO;
import com.minimercado.backend.dto.orderPickup.OrderReadyForPickupEvent;
import com.minimercado.backend.enums.OrderKitchenEventType;
import com.minimercado.backend.enums.OrderStatus;
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
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

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
        order.calculateTotal();
        
        Order savedOrder = orderRepository.save(order);

        publishKitchenEvent(savedOrder, OrderKitchenEventType.CREATED);
        return mapper.toResponse(savedOrder);
    }

    @Override
    @Transactional
    public OrderResponseDTO edit(Long id, OrderPutDTO data) {
        Order order = findOrderById(id);

        if (order.getStatus() == OrderStatus.CANCELLED ||
                order.getStatus() == OrderStatus.FINISHED) {
            throw new IllegalStateException();
        }

        Client client = clientService.findEntityByCpf(data.clienteCpf());
        if (!order.getClient().getId().equals(client.getId())) {
            order.setClient(client);
        }

        if (data.paymentMethod() != null) {
            order.setPaymentMethod(data.paymentMethod());
        }

        boolean hadKitchenItems = hasKitchenItems(order);
        applyStockChangesForUpdate(order, data.items());

        order.getItems().clear();
        order.getItems().addAll(buildOrderItems(data.items(), order));
        order.calculateTotal();

        Order savedOrder = orderRepository.save(order);

        publishKitchenEvent(savedOrder, OrderKitchenEventType.UPDATED, hadKitchenItems);
        return mapper.toResponse(savedOrder);
    }

    @Override
    @Transactional
    public void cancel(Long id) {
        Order order = findOrderById(id);

        if (order.getStatus() == OrderStatus.CANCELLED) {
            return;
        }

        if (order.getStatus() == OrderStatus.FINISHED) {
            throw new IllegalStateException();
        }

        increaseStock(order.getItems());
        order.setStatus(OrderStatus.CANCELLED);
        order.setPaymentStatus(PaymentStatus.CANCELLED);
        orderRepository.save(order);

        publishKitchenEvent(order, OrderKitchenEventType.CANCELLED);
    }

    @Override
    @Transactional
    public void markAsReady(Long id) {
        Order order = findOrderById(id);

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("");
        }

        if (order.getStatus() == OrderStatus.FINISHED) {
            throw new IllegalStateException();
        }

        order.setStatus(OrderStatus.READY_FOR_PICKUP);
        orderRepository.save(order);

        // Evento para avisar que o pedido está pronto para coleta
        eventPublisher.publishEvent(new OrderReadyForPickupEvent(order.getId()));
    }

    @Transactional
    public void markAsPaid(Long id) {
        Order order = findOrderById(id);

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException();
        }

        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            return;
        }

        order.setPaymentStatus(PaymentStatus.PAID);

        orderRepository.save(order);
    }


    @Override
    public void finish(Long id) {
        Order order = findOrderById(id);

        if (order.getStatus() != OrderStatus.READY_FOR_PICKUP) {
            throw new IllegalStateException();
        }

        order.setStatus(OrderStatus.FINISHED);
        orderRepository.save(order);
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
        publishKitchenEvent(order, eventType, false);
    }

    private void publishKitchenEvent(Order order, OrderKitchenEventType eventType, boolean forcePublish) {
        List<OrderKitchenItemDTO> kitchenItems = buildKitchenItems(order);
        if (!forcePublish && kitchenItems.isEmpty()) {
            return;
        }

        eventPublisher.publishEvent(
                new OrderKitchenEvent(
                        order.getId(),
                        eventType,
                        kitchenItems
                )
        );
    }

    private List<OrderKitchenItemDTO> buildKitchenItems(Order order) {
        return order.getItems().stream()
                .filter(item -> item.getProduct().requiresKitchenPreparation())
                .map(item -> new OrderKitchenItemDTO(
                        item.getProduct().getId(),
                        item.getProduct().getName(),
                        item.getQuantity()
                ))
                .toList();
    }

    private boolean hasKitchenItems(Order order) {
        return order.getItems().stream()
                .anyMatch(item -> item.getProduct().requiresKitchenPreparation());
    }
}
