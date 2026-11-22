package com.iset.events.dto.auth;

import com.iset.events.entity.UserRole;
import jakarta.validation.constraints.NotNull;

public record ApproveUserRequest(@NotNull UserRole role) {
}
