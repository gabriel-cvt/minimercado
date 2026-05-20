package com.minimercado.backend.controller;

import com.minimercado.backend.dto.product.ProductPostDTO;
import com.minimercado.backend.dto.product.ProductPutDTO;
import com.minimercado.backend.dto.product.ProductResponseDTO;
import com.minimercado.backend.dto.product.ProductStockUpdateDTO;
import com.minimercado.backend.service.product.ProductService;
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
public class ProductController {

    private final ProductService productService;

    @GetMapping(API_PRODUCT)
    public ResponseEntity<Page<ProductResponseDTO>> listAll(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Boolean requiresKitchenPreparation,
            @RequestParam(required = false) Boolean inStock,
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return ResponseEntity.ok(productService.getAll(pageable, name, requiresKitchenPreparation, inStock));
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

    @PatchMapping(API_PRODUCT_STOCK)
    public ResponseEntity<ProductResponseDTO> updateStock(
            @PathVariable Long id,
            @RequestBody @Valid ProductStockUpdateDTO data) {
        return ResponseEntity.ok(productService.updateStock(id, data.quantityChange()));
    }

    @DeleteMapping(API_PRODUCT_ID)
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity
                .noContent()
                .build();
    }
}
