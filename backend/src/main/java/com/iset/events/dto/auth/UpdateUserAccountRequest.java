package com.iset.events.dto.auth;

import com.iset.events.entity.UserRole;
import com.iset.events.entity.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserAccountRequest(
        @NotNull UserRole role,
        @NotNull UserStatus status
) {
}
