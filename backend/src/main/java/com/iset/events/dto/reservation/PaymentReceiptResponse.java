package com.iset.events.dto.reservation;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record PaymentReceiptResponse(
        Long paymentId,
        Long reservationId,
        String eventTitle,
        LocalDate eventDate,
        String location,
        String studentName,
        BigDecimal amount,
        String paymentMethod,
        String paymentReference,
        Instant paymentDate,
        String reservationCode,
        Instant generatedAt
) {
}
