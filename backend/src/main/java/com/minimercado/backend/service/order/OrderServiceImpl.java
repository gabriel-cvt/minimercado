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
import com.minimercado.backend.enums.ProductVariantSelectionMode;
import com.minimercado.backend.mapper.OrderMapper;
import com.minimercado.backend.model.Order;
import com.minimercado.backend.model.OrderItem;
import com.minimercado.backend.model.Product;
import com.minimercado.backend.model.ProductVariant;
import com.minimercado.backend.repository.OrderRepository;
import com.minimercado.backend.repository.ProductRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService{

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final OrderMapper mapper;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public OrderResponseDTO get(Long id){
        return mapper.toResponse(findOrderById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderResponseDTO> list(
            OrderStatus status,
            PaymentStatus paymentStatus,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable) {
        return orderRepository.findAll(
                        buildSpecification(status, paymentStatus, from, to),
                        pageable
                )
                .map(mapper::toResponse);
    }

    @Override
    @Transactional
    public OrderResponseDTO create(OrderPostDTO data) {
        Order order = new Order();
        order.setOrderTime(LocalDateTime.now(clock));

        order.setItems(buildOrderItems(data.items(), order, true));
        order.setPaymentMethod(data.paymentMethod());
        applyCustomerBillingData(
                order,
                data.customerName(),
                data.customerPhoneNumber(),
                data.customerTeam()
        );
        order.setObservation(normalizeObservation(data.observation()));
        if (Boolean.TRUE.equals(data.confirmPayment())) {
            if (order.getPaymentMethod() == null) {
                throw new IllegalArgumentException("Informe o metodo de pagamento para confirmar o recebimento");
            }
            order.setPaymentStatus(PaymentStatus.PAID);
            order.setPaidAt(LocalDateTime.now(clock));
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

        if (data.paymentMethod() != null) {
            order.setPaymentMethod(data.paymentMethod());
        }
        applyCustomerBillingData(
                order,
                data.customerName(),
                data.customerPhoneNumber(),
                data.customerTeam()
        );
        order.setObservation(normalizeObservation(data.observation()));

        validateProductsAvailableForUpdate(order, data.items());
        List<OrderItem> updatedItems = buildOrderItems(data.items(), order, false);

        order.getItems().clear();
        order.getItems().addAll(updatedItems);
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
        order.setStatus(OrderStatus.CANCELLED);
        order.setPaymentStatus(PaymentStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now(clock));
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
        order.setReadyAt(LocalDateTime.now(clock));
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

        if (order.getPaymentMethod() == null) {
            throw new IllegalArgumentException("Informe o metodo de pagamento para confirmar o recebimento");
        }

        order.setPaymentStatus(PaymentStatus.PAID);
        order.setPaidAt(LocalDateTime.now(clock));

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
        order.setFinishedAt(LocalDateTime.now(clock));
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

    private Product findOrderableProductById(Long id) {
        Product product = findProductById(id);
        if (Boolean.FALSE.equals(product.getAvailable())) {
            throw new IllegalStateException("Produtos desabilitados nao podem ser adicionados a pedidos");
        }
        return product;
    }

    private List<OrderItem> buildOrderItems(List<OrderItemRequestDTO> items, Order order, boolean requireActiveProduct) {
        Map<String, Integer> remainingReservedVariants = new HashMap<>();
        List<OrderItem> currentItems = order.getItems() == null ? List.of() : order.getItems();
        currentItems.forEach(item ->
                item.selectedVariantIdsOrLegacy().forEach(variantId ->
                        remainingReservedVariants.merge(
                                variantReservationKey(item.getProduct().getId(), variantId),
                                item.getQuantity(),
                                Integer::sum
                        )
                )
        );

        return new ArrayList<>(items.stream()
                .map(itemDto -> {
                    validateOrderItemQuantity(itemDto.quantity());
                    Product product = requireActiveProduct
                            ? findOrderableProductById(itemDto.productId())
                            : findProductById(itemDto.productId());
                    List<ProductVariant> selectedVariants = resolveSelectedVariants(product, itemDto);
                    selectedVariants.forEach(variant ->
                            validateVariantAvailability(
                                    product,
                                    variant,
                                    itemDto.quantity(),
                                    remainingReservedVariants
                            )
                    );
                    OrderItem nextItem = new OrderItem(
                            product,
                            order,
                            itemDto.quantity(),
                            selectedVariants
                    );
                    currentItems.stream()
                            .filter(current -> current.getProduct().getId().equals(product.getId()))
                            .filter(current -> current.selectedVariantIdsOrLegacy().equals(
                                    nextItem.selectedVariantIdsOrLegacy()
                            ))
                            .findFirst()
                            .ifPresent(current -> preserveItemSnapshot(current, nextItem));
                    return nextItem;
                })
                .toList());
    }

    private void preserveItemSnapshot(OrderItem current, OrderItem next) {
        next.setProductName(current.getProductName());
        next.setUnitPrice(current.getUnitPrice());
        next.setSelectedVariantId(current.getSelectedVariantId());
        next.setSelectedVariantName(current.getSelectedVariantName());
        next.setSelectedVariantNames(current.getSelectedVariantNames());
        next.setSelectedVariantIds(new ArrayList<>(current.selectedVariantIdsOrLegacy()));
    }

    private List<ProductVariant> resolveSelectedVariants(Product product, OrderItemRequestDTO itemDto) {
        List<Long> selectedVariantIds = normalizeSelectedVariantIds(itemDto);
        if (!Boolean.TRUE.equals(product.getHasVariants())) {
            if (!selectedVariantIds.isEmpty()) {
                throw new IllegalArgumentException("O produto informado nao possui variantes");
            }
            return List.of();
        }

        if (selectedVariantIds.isEmpty()) {
            if (Boolean.TRUE.equals(product.getVariantSelectionRequired())) {
                throw new IllegalArgumentException("Selecione " + product.getVariantType() + " para " + product.getName());
            }
            return List.of();
        }

        ProductVariantSelectionMode selectionMode = product.getVariantSelectionMode() == null
                ? ProductVariantSelectionMode.SINGLE
                : product.getVariantSelectionMode();
        if (selectionMode == ProductVariantSelectionMode.SINGLE && selectedVariantIds.size() > 1) {
            throw new IllegalArgumentException("Selecione apenas uma opcao de " + product.getVariantType() + " para " + product.getName());
        }

        Map<Long, ProductVariant> variantsById = product.getVariants().stream()
                .collect(Collectors.toMap(ProductVariant::getId, variant -> variant));
        return selectedVariantIds.stream()
                .map(variantId -> {
                    ProductVariant variant = variantsById.get(variantId);
                    if (variant == null) {
                        throw new IllegalArgumentException("A variante nao pertence ao produto informado");
                    }
                    return variant;
                })
                .toList();
    }

    private List<Long> normalizeSelectedVariantIds(OrderItemRequestDTO itemDto) {
        LinkedHashSet<Long> selectedVariantIds = new LinkedHashSet<>();
        if (itemDto.selectedVariantIds() != null) {
            itemDto.selectedVariantIds().stream()
                    .filter(java.util.Objects::nonNull)
                    .forEach(selectedVariantIds::add);
        }
        if (itemDto.selectedVariantId() != null) {
            selectedVariantIds.add(itemDto.selectedVariantId());
        }
        return selectedVariantIds.stream().sorted().toList();
    }

    private void validateVariantAvailability(
            Product product,
            ProductVariant variant,
            Integer quantity,
            Map<String, Integer> remainingReservedVariants) {
        if (variant == null || Boolean.TRUE.equals(variant.getAvailable())) {
            return;
        }

        String key = variantReservationKey(product.getId(), variant.getId());
        int reservedQuantity = remainingReservedVariants.getOrDefault(key, 0);
        if (reservedQuantity < quantity) {
            throw new IllegalStateException("A variante " + variant.getName() + " esta indisponivel");
        }
        remainingReservedVariants.put(key, reservedQuantity - quantity);
    }

    private String variantReservationKey(Long productId, Long variantId) {
        return productId + ":" + variantId;
    }

    private String normalizeObservation(String observation) {
        return observation == null || observation.isBlank() ? null : observation.trim();
    }

    private void applyCustomerBillingData(
            Order order,
            String customerName,
            String customerPhoneNumber,
            String customerTeam) {
        boolean isCreditOrder = order.getPaymentMethod() == null;

        if (!isCreditOrder) {
            order.setCustomerName(null);
            order.setCustomerPhoneNumber(null);
            order.setCustomerTeam(null);
            return;
        }

        String normalizedName = normalizeRequiredBillingField(
                customerName,
                "Informe o nome da pessoa para pedidos fiados"
        );
        String normalizedPhone = normalizePhoneNumber(customerPhoneNumber);
        if (normalizedPhone == null) {
            throw new IllegalArgumentException("Informe o telefone da pessoa para pedidos fiados");
        }
        String normalizedTeam = normalizeRequiredBillingField(
                customerTeam,
                "Informe a equipe da pessoa para pedidos fiados"
        );

        order.setCustomerName(normalizedName);
        order.setCustomerPhoneNumber(normalizedPhone);
        order.setCustomerTeam(normalizedTeam);
    }

    private String normalizeRequiredBillingField(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    private String normalizePhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return null;
        }
        String digits = phoneNumber.replaceAll("\\D", "");
        return digits.isBlank() ? null : digits;
    }

    private void validateProductsAvailableForUpdate(Order order, List<OrderItemRequestDTO> requestedItems) {
        Map<Long, Integer> currentQuantities = groupCurrentItemQuantities(order.getItems());
        Map<Long, Integer> requestedQuantities = groupRequestedItemQuantities(requestedItems);

        requestedQuantities.forEach((productId, requestedQuantity) -> {
            int currentQuantity = currentQuantities.getOrDefault(productId, 0);
            Product product = findProductById(productId);
            if (Boolean.FALSE.equals(product.getAvailable()) && requestedQuantity > currentQuantity) {
                throw new IllegalStateException(
                        "O produto " + product.getName() + " esta desabilitado para novas vendas"
                );
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
                        buildKitchenItems(order),
                        order.getObservation()
                )
        );
    }

    private List<OrderKitchenItemDTO> buildKitchenItems(Order order) {
        return order.getItems().stream()
                .map(item -> new OrderKitchenItemDTO(
                        item.getProduct().getId(),
                        item.getProductName(),
                        item.getQuantity(),
                        item.getSelectedVariantNames() == null
                                ? item.getSelectedVariantName()
                                : item.getSelectedVariantNames()
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
