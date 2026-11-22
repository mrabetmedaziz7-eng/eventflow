package com.iset.events.dto;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        String type,
        String title,
        String message,
        boolean read,
        Instant createdAt
) {
}
