package com.iset.events.dto.statistics;

import java.math.BigDecimal;
import java.util.Map;

public record AdminStatisticsResponse(
        Map<String, Long> usersByRole,
        Map<String, Long> usersByStatus,
        long eventCount,
        long reservationCount,
        BigDecimal simulatedRevenue
) {
}
