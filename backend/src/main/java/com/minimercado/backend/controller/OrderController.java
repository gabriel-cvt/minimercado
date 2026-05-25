package com.minimercado.backend.controller;

import com.minimercado.backend.dto.order.OrderPaymentUpdateDTO;
import com.minimercado.backend.dto.order.OrderPostDTO;
import com.minimercado.backend.dto.order.OrderPutDTO;
import com.minimercado.backend.dto.order.OrderResponseDTO;
import com.minimercado.backend.enums.OrderStatus;
import com.minimercado.backend.enums.PaymentStatus;
import com.minimercado.backend.service.order.OrderService;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Set;

import static com.minimercado.backend.controller.ApiRoutes.*;

@RestController
@RequiredArgsConstructor
public class OrderController {

    private static final Set<String> ORDER_SORT_FIELDS =
            Set.of("id", "orderTime", "status", "paymentStatus", "paymentMethod", "totalValue");

    private final OrderService orderService;

    @GetMapping(API_ORDER_ID)
    public ResponseEntity<OrderResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.get(id));
    }

    @GetMapping(API_ORDER)
    public ResponseEntity<Page<OrderResponseDTO>> list(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) PaymentStatus paymentStatus,
            @RequestParam(required = false) String clientCpf,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Ordenacao no formato campo,direcao. Campos aceitos: id, orderTime, status, paymentStatus, paymentMethod, totalValue.", example = "id,asc")
            @RequestParam(defaultValue = "orderTime,asc") String sort) {
        return ResponseEntity.ok(orderService.list(
                status,
                paymentStatus,
                clientCpf,
                from,
                to,
                PageRequestFactory.create(page, size, sort, ORDER_SORT_FIELDS)
        ));
    }

    @GetMapping(API_ORDER_GET_BY_CLIENT_CPF)
    public ResponseEntity<Page<OrderResponseDTO>> getByClient(
            @PathVariable("cpf") String clientCpf,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Ordenacao no formato campo,direcao. Campos aceitos: id, orderTime, status, paymentStatus, paymentMethod, totalValue.", example = "id,asc")
            @RequestParam(defaultValue = "orderTime,asc") String sort) {
        return ResponseEntity.ok(orderService.getFromClient(
                clientCpf,
                PageRequestFactory.create(page, size, sort, ORDER_SORT_FIELDS)
        ));
    }

    @PostMapping(API_ORDER)
    public ResponseEntity<OrderResponseDTO> create(@RequestBody @Valid OrderPostDTO data) {
        OrderResponseDTO response = orderService.create(data);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping(API_ORDER_ID)
    public ResponseEntity<OrderResponseDTO> update(
            @PathVariable Long id,
            @RequestBody @Valid OrderPutDTO data) {
        return ResponseEntity.ok(orderService.edit(id, data));
    }

    @PatchMapping(API_ORDER_CANCEL)
    public ResponseEntity<OrderResponseDTO> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.cancel(id));
    }

    @PatchMapping(API_ORDER_MARK_AS_READY)
    public ResponseEntity<OrderResponseDTO> markAsReady(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.markAsReady(id));
    }

    @PatchMapping(API_ORDER_MARK_AS_PAID)
    public ResponseEntity<OrderResponseDTO> markAsPaid(
            @PathVariable Long id,
            @RequestBody(required = false) OrderPaymentUpdateDTO data) {
        return ResponseEntity.ok(orderService.markAsPaid(
                id,
                data != null ? data.paymentMethod() : null
        ));
    }

    @PatchMapping(API_ORDER_FINISH)
    public ResponseEntity<OrderResponseDTO> finish(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.finish(id));
    }

}
