package com.iset.events.dto.reservation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ReservationRequest(
        @NotNull @Positive Long eventId,
        @NotNull @Positive Integer numberOfPlaces,
        @Size(max = 40) String paymentMethod
) {
}
