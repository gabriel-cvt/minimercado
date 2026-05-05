package com.minimercado.backend.controller;

import com.minimercado.backend.dto.order.OrderPostDTO;
import com.minimercado.backend.dto.order.OrderPutDTO;
import com.minimercado.backend.dto.order.OrderResponseDTO;
import com.minimercado.backend.service.order.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import static com.minimercado.backend.controller.ApiRoutes.*;

@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping(API_ORDER_ID)
    public ResponseEntity<OrderResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.get(id));
    }

    @GetMapping(API_ORDER_GET_BY_CLIENT)
    public ResponseEntity<Page<OrderResponseDTO>> getByClient(
            @PathVariable("id") Long clientId,
            @PageableDefault(size = 10, sort = "orderTime") Pageable pageable) {
        return ResponseEntity.ok(orderService.getFromClient(clientId, pageable));
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
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        orderService.cancel(id);
        return ResponseEntity.noContent().build();
    }
}