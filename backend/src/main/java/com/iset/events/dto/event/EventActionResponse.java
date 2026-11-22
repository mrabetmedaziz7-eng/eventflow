package com.iset.events.dto.event;

import java.time.LocalDate;
import java.time.LocalTime;

public record EventActionResponse(
        Long id,
        Long eventId,
        String title,
        String description,
        LocalDate actionDate,
        LocalTime startTime,
        LocalTime endTime,
        Integer displayOrder
) {
}
