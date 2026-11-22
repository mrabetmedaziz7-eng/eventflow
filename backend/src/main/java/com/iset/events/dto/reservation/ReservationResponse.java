package com.iset.events.dto.reservation;

import java.math.BigDecimal;
import java.time.Instant;

public record ReservationResponse(
        Long id,
        Long eventId,
        String eventTitle,
        Integer numberOfPlaces,
        BigDecimal amount,
        String status,
        String confirmationCode,
        Long paymentId,
        String paymentStatus,
        Instant reservationDate
) {
}
