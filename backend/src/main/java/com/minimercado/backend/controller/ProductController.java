package com.minimercado.backend.controller;

import com.minimercado.backend.dto.product.ProductPostDTO;
import com.minimercado.backend.dto.product.ProductResponseDTO;
import com.minimercado.backend.service.product.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import static com.minimercado.backend.controller.ApiRoutes.*;

@RestController
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping(API_PRODUCT)
    public ResponseEntity<Page<ProductResponseDTO>> listAll(
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return ResponseEntity.ok(productService.getAll(pageable));
    }

    @GetMapping(API_PRODUCT_ID)
    public ResponseEntity<ProductResponseDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.getById(id));
    }

    @PostMapping(API_PRODUCT)
    public ResponseEntity<ProductResponseDTO> create(@RequestBody @Valid ProductPostDTO data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(data));
    }

    @PutMapping(API_PRODUCT_ID)
    public ResponseEntity<ProductResponseDTO> update(
            @PathVariable UUID id,
            @RequestBody @Valid ProductPostDTO data) {
        return ResponseEntity.ok(productService.update(id, data));
    }

    @DeleteMapping(API_PRODUCT_ID)
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }
}