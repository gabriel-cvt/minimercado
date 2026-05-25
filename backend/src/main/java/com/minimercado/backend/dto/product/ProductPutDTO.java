package com.minimercado.backend.dto.product;

public record ProductPutDTO(
        String name,
        Double price,
        String urlImage
) {
}
