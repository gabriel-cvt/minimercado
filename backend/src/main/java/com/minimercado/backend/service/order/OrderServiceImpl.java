package com.minimercado.backend.service.order;


import com.minimercado.backend.dto.event.*;
import com.minimercado.backend.dto.order.OrderPostDTO;
import com.minimercado.backend.dto.order.OrderPutDTO;
import com.minimercado.backend.dto.order.OrderResponseDTO;
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
        Order order = orderRepository
                .findById(id)
                .orElseThrow(EntityNotFoundException::new);
        return mapper.toResponse(order);
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
        Client client = clientRepository.findById((data.clientId()))
                .orElseThrow(EntityNotFoundException::new);

        Order order = new Order();
        order.setClient(client);
        List<OrderItem> orderItems = data.items().stream().map(
                itemDto -> {
                    Product product = productRepository.findById(itemDto.productId())
                            .orElseThrow(EntityNotFoundException::new);

                    return new OrderItem(product, order, itemDto.quantity());
                }).toList();

        order.setItems(orderItems);
        order.calculateTotal();
        
        Order savedOrder = orderRepository.save(order);

        sendOrderToKitchen(savedOrder, OrderKitchenEventType.CREATED);
        return mapper.toResponse(savedOrder);
    }

    @Override
    @Transactional
    public OrderResponseDTO edit(Long id, OrderPutDTO data) {
        Order order = orderRepository.findById(id)
                .orElseThrow(EntityNotFoundException::new);

        if (order.getStatus() == OrderStatus.CANCELLED ||
            order.getStatus() == OrderStatus.FINISHED) {
            throw new IllegalStateException();
        }

        if (!order.getClient().getId().equals(data.clientId())) {
            Client newClient = clientRepository.findById(data.clientId()).orElseThrow();
            order.setClient(newClient);
        }

        order.getItems().clear();

        List<OrderItem> updatedItems = data.items().stream().map(itemDto -> {
            Product product = productRepository.findById(itemDto.productId()).orElseThrow();
            return new OrderItem(product, order, itemDto.quantity());
        }).toList();

        order.getItems().addAll(updatedItems);
        order.calculateTotal();
        Order savedOrder = orderRepository.save(order);

        sendOrderToKitchen(savedOrder, OrderKitchenEventType.UPDATED);

        return mapper.toResponse(savedOrder);
    }

    @Override
    @Transactional
    public void cancel(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(EntityNotFoundException::new);

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
