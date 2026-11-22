package com.iset.events.dto.statistics;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StudentEventSummary(
        Long reservationId,
        Long eventId,
        String eventTitle,
        LocalDate eventDate,
        String location,
        int numberOfPlaces,
        String reservationStatus,
        String confirmationCode,
        String paymentStatus,
        BigDecimal amount
) {
}
