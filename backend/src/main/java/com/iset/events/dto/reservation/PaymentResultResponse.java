package com.iset.events.dto.reservation;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentResultResponse(
        Long paymentId,
        Long reservationId,
        Long eventId,
        String paymentStatus,
        String reservationStatus,
        String confirmationCode,
        BigDecimal amount,
        String method,
        String reference,
        Instant paymentDate
) {
}
