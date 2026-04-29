package com.minimercado.backend.dto.product;

import java.util.UUID;

public record ProductResponseDTO(
    UUID id,
    String name,
    Double price
) {}
