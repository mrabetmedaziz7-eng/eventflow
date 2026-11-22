package com.iset.events.dto.auth;

import com.iset.events.entity.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
        @NotNull(message = "Le statut est obligatoire.")
        UserStatus status
) {
}
