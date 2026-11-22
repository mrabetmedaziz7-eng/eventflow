package com.iset.events.dto.event;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record ReorderEventActionsRequest(
        @NotEmpty List<@NotNull @Positive Long> actionIds
) {
}
