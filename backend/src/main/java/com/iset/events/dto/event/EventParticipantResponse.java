package com.iset.events.dto.event;

import java.time.Instant;

public record EventParticipantResponse(
        Long reservationId,
        Long studentId,
        String firstName,
        String lastName,
        String email,
        Instant reservationDate,
        String reservationStatus,
        Integer numberOfPlaces,
        String confirmationCode,
        String paymentStatus
) {
}
