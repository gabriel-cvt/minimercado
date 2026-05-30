package com.minimercado.backend.dto.order;

import com.minimercado.backend.dto.orderItem.OrderItemRequestDTO;
import com.minimercado.backend.enums.PaymentMethod;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;


public record OrderPostDTO(
        @NotEmpty(message = "A lista de produtos não pode estar vazia")
        List<OrderItemRequestDTO> items,

        @NotNull(message = "O cpf do cliente é obrigatório")
        String clienteCpf,

        PaymentMethod paymentMethod,

        @Size(max = 500)
        String observation
) {}
