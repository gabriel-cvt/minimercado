package com.minimercado.backend.dto.product;

public record ProductResponseDTO(
    Long id,
    String name,
    Double price
) {}
