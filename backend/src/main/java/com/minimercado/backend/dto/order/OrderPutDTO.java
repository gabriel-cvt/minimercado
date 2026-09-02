package com.minimercado.backend.dto.order;

import com.minimercado.backend.dto.orderItem.OrderItemRequestDTO;
import com.minimercado.backend.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record OrderPutDTO(
        @NotEmpty(message = "O pedido deve conter ao menos um produto")
        List<@Valid OrderItemRequestDTO> items,

        PaymentMethod paymentMethod,

        @Size(max = 255) String customerName,

        @Size(max = 20) String customerPhoneNumber,

        @Size(max = 255) String customerTeam,

        @Size(max = 500)
        String observation
) {}
