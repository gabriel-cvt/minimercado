package com.minimercado.backend.controller;

import com.minimercado.backend.dto.order.OrderPaymentUpdateDTO;
import com.minimercado.backend.dto.order.OrderPostDTO;
import com.minimercado.backend.dto.order.OrderPutDTO;
import com.minimercado.backend.dto.order.OrderResponseDTO;
import com.minimercado.backend.enums.OrderStatus;
import com.minimercado.backend.enums.PaymentStatus;
import com.minimercado.backend.service.order.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;


import static com.minimercado.backend.controller.ApiRoutes.*;

@RestController
@RequiredArgsConstructor
public class OrderController {

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
            @RequestParam(required = false) Boolean requiresKitchenPreparation,
            @PageableDefault(size = 10, sort = "orderTime") Pageable pageable) {
        return ResponseEntity.ok(orderService.list(
                status,
                paymentStatus,
                clientCpf,
                from,
                to,
                requiresKitchenPreparation,
                pageable
        ));
    }

    @GetMapping(API_ORDER_GET_BY_CLIENT_CPF)
    public ResponseEntity<Page<OrderResponseDTO>> getByClient(
            @PathVariable("cpf") String clientCpf,
            @PageableDefault(size = 10, sort = "orderTime") Pageable pageable) {
        return ResponseEntity.ok(orderService.getFromClient(clientCpf, pageable));
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
