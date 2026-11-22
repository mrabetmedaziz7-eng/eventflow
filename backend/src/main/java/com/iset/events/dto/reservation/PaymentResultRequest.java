package com.iset.events.dto.reservation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PaymentResultRequest(
        @NotNull PaymentOutcome status,
        @Size(max = 255) String reference
) {
}
