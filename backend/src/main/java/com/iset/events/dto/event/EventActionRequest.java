package com.iset.events.dto.event;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public record EventActionRequest(
        @NotBlank @Size(max = 200) String title,
        String description,
        @NotNull LocalDate actionDate,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime
) {
}
