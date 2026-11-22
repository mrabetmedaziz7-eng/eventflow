package com.iset.events.dto.event;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record EventRequest(
        @NotBlank @Size(max = 200) String title,
        String description,
        @NotBlank @Size(max = 100) String category,
        @NotNull LocalDate eventDate,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        @NotBlank @Size(max = 255) String location,
        String imageUrl,
        @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal ticketPrice,
        @NotNull @Positive Integer capacity
) {
}
