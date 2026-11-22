package com.iset.events.dto.statistics;

import java.math.BigDecimal;
import java.util.List;

public record TeacherStatisticsResponse(
        long publishedEventCount,
        long placesSold,
        BigDecimal fillRatePercent,
        BigDecimal totalRevenue,
        List<TeacherEventStatistics> events
) {
}