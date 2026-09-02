package com.minimercado.backend.dto.order;

import com.minimercado.backend.dto.orderItem.OrderItemRequestDTO;
import com.minimercado.backend.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;


public record OrderPostDTO(
        @NotEmpty(message = "A lista de produtos não pode estar vazia")
        List<@Valid OrderItemRequestDTO> items,

        PaymentMethod paymentMethod,

        Boolean confirmPayment,

        @Size(max = 255) String customerName,

        @Size(max = 20) String customerPhoneNumber,

        @Size(max = 255) String customerTeam,

        @Size(max = 500)
        String observation
) {}
