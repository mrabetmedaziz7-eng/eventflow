package com.iset.events.dto.statistics;

import java.math.BigDecimal;
import java.util.List;

public record StudentStatisticsResponse(
        long confirmedReservationCount,
        long paymentCount,
        BigDecimal paidAmount,
        List<StudentEventSummary> upcomingEvents,
        List<StudentEventSummary> pastEvents
) {
}
