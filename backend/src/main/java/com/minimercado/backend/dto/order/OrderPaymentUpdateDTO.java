package com.minimercado.backend.dto.order;

import com.minimercado.backend.enums.PaymentMethod;

public record OrderPaymentUpdateDTO(
        PaymentMethod paymentMethod
) {
}
