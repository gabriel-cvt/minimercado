package com.minimercado.backend.dto.client;

public record ClientResponseDTO(
        Long id,
        String name,
        String cpf,
        String phoneNumber,
        String team
) {
}
