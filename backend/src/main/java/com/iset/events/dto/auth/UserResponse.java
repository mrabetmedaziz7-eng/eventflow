package com.iset.events.dto.auth;

import com.iset.events.entity.UserRole;
import com.iset.events.entity.UserStatus;

import java.time.Instant;

public record UserResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        UserRole role,
        UserStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}
