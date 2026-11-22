package com.iset.events.dto.reservation;

import jakarta.validation.constraints.NotNull;

public record PaymentSimulationRequest(@NotNull PaymentOutcome status) {
}
