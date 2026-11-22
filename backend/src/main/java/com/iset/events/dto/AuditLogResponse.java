package com.iset.events.dto;

import java.time.Instant;

public record AuditLogResponse(
        Long id,
        Long userId,
        String actionType,
        String entityType,
        Long entityId,
        String description,
        Instant createdAt
) {
}
