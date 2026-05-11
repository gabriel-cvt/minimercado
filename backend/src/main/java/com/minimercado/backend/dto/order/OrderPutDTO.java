package com.minimercado.backend.dto.order;

import com.minimercado.backend.dto.orderItem.OrderItemRequestDTO;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record OrderPutDTO(
        @NotEmpty(message = "O pedido deve conter ao menos um produto")
        List<OrderItemRequestDTO> items,

        @NotNull(message = "O cpf do cliente é obrigatório")
        String clienteCpf
) {}
