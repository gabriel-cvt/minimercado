package com.minimercado.backend.controller;

import com.minimercado.backend.dto.product.ProductPostDTO;
import com.minimercado.backend.dto.product.ProductPutDTO;
import com.minimercado.backend.dto.product.ProductResponseDTO;
import com.minimercado.backend.dto.product.ProductAvailabilityUpdateDTO;
import com.minimercado.backend.dto.PageResponse;
import com.minimercado.backend.service.product.ProductService;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

import static com.minimercado.backend.controller.ApiRoutes.*;

@RestController
@RequiredArgsConstructor
public class ProductController {

    private static final Set<String> PRODUCT_SORT_FIELDS = Set.of("id", "name", "price", "available");

    private final ProductService productService;

    @GetMapping(API_PRODUCT)
    public ResponseEntity<PageResponse<ProductResponseDTO>> listAll(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Boolean available,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Ordenacao no formato campo,direcao. Campos aceitos: id, name, price, available.", example = "id,asc")
            @RequestParam(defaultValue = "name,asc") String sort) {
        return ResponseEntity.ok(PageResponse.from(productService.getAll(
                PageRequestFactory.create(page, size, sort, PRODUCT_SORT_FIELDS),
                name,
                available
        )));
    }

    @GetMapping(API_PRODUCT_ID)
    public ResponseEntity<ProductResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getById(id));
    }

    @PostMapping(API_PRODUCT)
    public ResponseEntity<ProductResponseDTO> create(@RequestBody @Valid ProductPostDTO data) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(productService.create(data));
    }

    @PutMapping(API_PRODUCT_ID)
    public ResponseEntity<ProductResponseDTO> update(
            @PathVariable Long id,
            @RequestBody @Valid ProductPutDTO data) {
        return ResponseEntity.ok(productService.update(id, data));
    }

    @PatchMapping(API_PRODUCT_AVAILABILITY)
    public ResponseEntity<ProductResponseDTO> updateAvailability(
            @PathVariable Long id,
            @RequestBody @Valid ProductAvailabilityUpdateDTO data) {
        return ResponseEntity.ok(productService.updateAvailability(id, data.available()));
    }
}
