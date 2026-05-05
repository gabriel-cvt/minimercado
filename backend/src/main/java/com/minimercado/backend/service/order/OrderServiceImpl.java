package com.minimercado.backend.service.order;


import com.minimercado.backend.dto.event.*;
import com.minimercado.backend.dto.order.OrderPostDTO;
import com.minimercado.backend.dto.order.OrderPutDTO;
import com.minimercado.backend.dto.order.OrderResponseDTO;
import com.minimercado.backend.dto.orderItem.OrderItemRequestDTO;
import com.minimercado.backend.enums.OrderKitchenEventType;
import com.minimercado.backend.enums.OrderStatus;
import com.minimercado.backend.mapper.OrderMapper;
import com.minimercado.backend.model.Client;
import com.minimercado.backend.model.Order;
import com.minimercado.backend.model.OrderItem;
import com.minimercado.backend.model.Product;
import com.minimercado.backend.repository.ClientRepository;
import com.minimercado.backend.repository.OrderRepository;
import com.minimercado.backend.repository.ProductRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;


@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService{

    private final OrderRepository orderRepository;
    private final ClientRepository clientRepository;
    private final ProductRepository productRepository;
    private final OrderMapper mapper;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public OrderResponseDTO get(Long id){
        return mapper.toResponse(findOrderById(id));
    }

    @Override
    public Page<OrderResponseDTO> getFromClient(Long clienteId, Pageable pageable) {
        return orderRepository
                .findByClientId(clienteId, pageable)
                .map(mapper::toResponse);
    }

    @Override
    @Transactional
    public OrderResponseDTO create(OrderPostDTO data) {
        Order order = new Order();
        order.setClient(findClientById(data.clientId()));
        order.setItems(buildOrderItems(data.items(), order));
        order.calculateTotal();
        
        Order savedOrder = orderRepository.save(order);

        sendOrderToKitchen(savedOrder, OrderKitchenEventType.CREATED);
        return mapper.toResponse(savedOrder);
    }

    @Override
    @Transactional
    public OrderResponseDTO edit(Long id, OrderPutDTO data) {
        Order order = findOrderById(id);

        validateOrderCanBeChanged(order);

        if (!order.getClient().getId().equals(data.clientId())) {
            order.setClient(findClientById(data.clientId()));
        }

        order.getItems().clear();
        order.getItems().addAll(buildOrderItems(data.items(), order));
        order.calculateTotal();

        Order savedOrder = orderRepository.save(order);

        sendOrderToKitchen(savedOrder, OrderKitchenEventType.UPDATED);
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

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);

        eventPublisher.publishEvent(new OrderCancelledEvent(order.getId()));
    }

    private Order findOrderById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
    }

    private Client findClientById(Long id) {
        return clientRepository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
    }

    private Product findProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
    }

    private List<OrderItem> buildOrderItems(List<OrderItemRequestDTO> items, Order order) {
        return items.stream()
                .map(itemDto -> {
                    Product product = findProductById(itemDto.productId());
                    return new OrderItem(product, order, itemDto.quantity());
                })
                .toList();
    }

    private void validateOrderCanBeChanged(Order order) {
        if (order.getStatus() == OrderStatus.CANCELLED ||
                order.getStatus() == OrderStatus.FINISHED) {
            throw new IllegalStateException();
        }
    }


    private void sendOrderToKitchen(Order order, OrderKitchenEventType eventType){
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
}
