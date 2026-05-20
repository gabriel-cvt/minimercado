package com.minimercado.backend.dto.client;

import jakarta.validation.constraints.NotNull;

public record ClientPostDTO(
        @NotNull(message = "O nome do cliente é obrigatório")
        String name,
        @NotNull(message = "O cpf do cliente é obrigatório")
        String cpf,
        String phoneNumber
) {
}
