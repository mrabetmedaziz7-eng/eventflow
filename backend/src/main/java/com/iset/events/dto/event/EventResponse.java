package com.iset.events.dto.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record EventResponse(
        Long id,
        String title,
        String description,
        String category,
        LocalDate eventDate,
        LocalTime startTime,
        LocalTime endTime,
        String location,
        String imageUrl,
        BigDecimal ticketPrice,
        Integer capacity,
        Integer availablePlaces,
        String status,
        Long teacherId,
        TeacherSummary teacher,
        List<EventActionResponse> actions,
        Instant createdAt,
        Instant updatedAt
) {
    public record TeacherSummary(Long id, String fullName) {}

    public EventResponse(
            Long id,
            String title,
            String description,
            String category,
            LocalDate eventDate,
            LocalTime startTime,
            LocalTime endTime,
            String location,
            String imageUrl,
            BigDecimal ticketPrice,
            Integer capacity,
            Integer availablePlaces,
            String status,
            Long teacherId,
            Instant createdAt,
            Instant updatedAt
    ) {
        this(id, title, description, category, eventDate, startTime, endTime, location, imageUrl,
             ticketPrice, capacity, availablePlaces, status, teacherId, null, List.of(), createdAt, updatedAt);
    }
}
