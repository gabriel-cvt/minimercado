package com.minimercado.backend.dto.client;

import jakarta.validation.constraints.NotNull;

public record ClientPostDTO(
        String name,
        @NotNull(message = "O cpf do cliente é obrigatório")
        String cpf,
        String phoneNumber
) {
}
