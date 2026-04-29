package com.minimercado.backend.dto.order;

import com.minimercado.backend.dto.orderItem.OrderItemRequestDTO;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record OrderPostDTO(
        @NotEmpty(message = "A lista de produtos não pode estar vazia")
        List<OrderItemRequestDTO> items,

        @NotNull(message = "O ID do cliente é obrigatório")
        UUID clientId
) {}