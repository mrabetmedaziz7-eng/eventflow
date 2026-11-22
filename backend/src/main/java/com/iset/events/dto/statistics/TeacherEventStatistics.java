package com.iset.events.dto.statistics;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TeacherEventStatistics(
        Long eventId,
        String title,
        LocalDate eventDate,
        String status,
        int capacity,
        int placesSold,
        BigDecimal fillRatePercent,
        BigDecimal revenue
) {
}
