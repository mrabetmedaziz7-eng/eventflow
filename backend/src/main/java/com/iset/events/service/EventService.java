package com.iset.events.service;

import com.iset.events.dto.event.EventActionRequest;
import com.iset.events.dto.event.EventActionResponse;
import com.iset.events.dto.event.EventDeletionResponse;
import com.iset.events.dto.event.EventParticipantResponse;
import com.iset.events.dto.event.EventRequest;
import com.iset.events.dto.event.EventResponse;
import com.iset.events.dto.event.ReorderEventActionsRequest;
import com.iset.events.exception.EventConflictException;
import com.iset.events.exception.EventValidationException;
import com.iset.events.exception.ResourceNotFoundException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class EventService {

    private static final RowMapper<EventResponse> EVENT_ROW_MAPPER = EventService::mapEvent;
    private static final RowMapper<EventActionResponse> ACTION_ROW_MAPPER = EventService::mapAction;

    private final JdbcTemplate jdbcTemplate;

    public EventService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public List<EventResponse> findPublished() {
        return findPublished(null, null, null, null, null, null);
    }

    @Transactional(readOnly = true)
    public List<EventResponse> findPublished(
            String search,
            String category,
            LocalDate date,
            String location,
            Boolean availableOnly,
            String sortBy
    ) {
        StringBuilder sql = new StringBuilder("""
                SELECT e.*, (u.first_name || ' ' || u.last_name) AS teacher_name
                FROM events e
                LEFT JOIN users u ON u.id = e.teacher_id
                WHERE e.status IN ('PUBLIE', 'COMPLET')
                """);
        List<Object> params = new java.util.ArrayList<>();

        if (search != null && !search.isBlank()) {
            sql.append(" AND (LOWER(e.title) LIKE LOWER(?) OR LOWER(e.location) LIKE LOWER(?) OR LOWER(e.description) LIKE LOWER(?))");
            String pattern = "%" + search.trim() + "%";
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
        }
        if (category != null && !category.isBlank()) {
            sql.append(" AND LOWER(e.category) = LOWER(?)");
            params.add(category.trim());
        }
        if (location != null && !location.isBlank()) {
            sql.append(" AND LOWER(e.location) LIKE LOWER(?)");
            params.add("%" + location.trim() + "%");
        }
        if (date != null) {
            sql.append(" AND e.event_date = ?");
            params.add(date);
        }
        if (Boolean.TRUE.equals(availableOnly)) {
            sql.append(" AND e.available_places > 0 AND e.status = 'PUBLIE'");
        }

        if ("price_asc".equalsIgnoreCase(sortBy) || "price".equalsIgnoreCase(sortBy)) {
            sql.append(" ORDER BY e.ticket_price ASC, e.event_date ASC");
        } else if ("price_desc".equalsIgnoreCase(sortBy)) {
            sql.append(" ORDER BY e.ticket_price DESC, e.event_date ASC");
        } else {
            sql.append(" ORDER BY e.event_date ASC, e.start_time ASC");
        }

        return jdbcTemplate.query(sql.toString(), EVENT_ROW_MAPPER, params.toArray());
    }

    @Transactional(readOnly = true)
    public List<EventResponse> findMine(Long teacherId) {
        return jdbcTemplate.query(
                """
                SELECT e.*, (u.first_name || ' ' || u.last_name) AS teacher_name
                FROM events e
                LEFT JOIN users u ON u.id = e.teacher_id
                WHERE e.teacher_id = ?
                ORDER BY e.created_at DESC
                """,
                EVENT_ROW_MAPPER,
                teacherId
        );
    }

    @Transactional(readOnly = true)
    public EventResponse findVisible(Long eventId, Long requesterId) {
        EventResponse event = requireEvent(eventId);
        if (!isPubliclyVisible(event.status()) && (requesterId == null || !event.teacherId().equals(requesterId))) {
            throw new ResourceNotFoundException("Événement introuvable.");
        }
        List<EventActionResponse> actions = jdbcTemplate.query(
                "SELECT * FROM event_actions WHERE event_id = ? ORDER BY display_order",
                ACTION_ROW_MAPPER,
                eventId
        );
        return new EventResponse(
                event.id(),
                event.title(),
                event.description(),
                event.category(),
                event.eventDate(),
                event.startTime(),
                event.endTime(),
                event.location(),
                event.imageUrl(),
                event.ticketPrice(),
                event.capacity(),
                event.availablePlaces(),
                event.status(),
                event.teacherId(),
                event.teacher(),
                actions,
                event.createdAt(),
                event.updatedAt()
        );
    }

    @Transactional
    public EventResponse create(Long teacherId, EventRequest request) {
        validateEventTimes(request);
        Long eventId = jdbcTemplate.queryForObject(
                """
                INSERT INTO events (
                    title, description, category, event_date, start_time, end_time,
                    location, image_url, ticket_price, capacity, available_places, status, teacher_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BROUILLON', ?)
                RETURNING id
                """,
                Long.class,
                request.title().trim(),
                request.description(),
                request.category().trim(),
                request.eventDate(),
                request.startTime(),
                request.endTime(),
                request.location().trim(),
                request.imageUrl(),
                request.ticketPrice(),
                request.capacity(),
                request.capacity(),
                teacherId
        );
        return requireEvent(eventId);
    }

    @Transactional
    public EventResponse update(Long eventId, Long teacherId, EventRequest request) {
        requireOwnedEvent(eventId, teacherId);
        validateEventTimes(request);
        int reservedPlaces = activeReservedPlaces(eventId);
        if (request.capacity() < reservedPlaces) {
            throw new EventConflictException("La capacité ne peut pas être inférieure au nombre de places déjà réservées.");
        }
        int availablePlaces = request.capacity() - reservedPlaces;
        jdbcTemplate.update(
                """
                UPDATE events
                SET title = ?, description = ?, category = ?, event_date = ?, start_time = ?, end_time = ?,
                    location = ?, image_url = ?, ticket_price = ?, capacity = ?, available_places = ?,
                    status = CASE WHEN status = 'COMPLET' AND ? > 0 THEN 'PUBLIE' ELSE status END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND teacher_id = ?
                """,
                request.title().trim(),
                request.description(),
                request.category().trim(),
                request.eventDate(),
                request.startTime(),
                request.endTime(),
                request.location().trim(),
                request.imageUrl(),
                request.ticketPrice(),
                request.capacity(),
                availablePlaces,
                availablePlaces,
                eventId,
                teacherId
        );
        EventResponse updatedEvent = requireEvent(eventId);
        notifyEventParticipants(eventId, "EVENT_MODIFIED", "Événement modifié",
                "L'événement « " + updatedEvent.title() + " » a été modifié.");
        logEventAction(teacherId, "EVENT_MODIFIED", eventId, "L'événement a été modifié.");
        return updatedEvent;
    }

    @Transactional
    public EventResponse publish(Long eventId, Long teacherId) {
        EventResponse event = requireOwnedEvent(eventId, teacherId);
        if (!"BROUILLON".equals(event.status())) {
            throw new EventConflictException("Seul un événement en brouillon peut être publié.");
        }
        if (!event.eventDate().isAfter(LocalDate.now())) {
            throw new EventValidationException("La date de l'événement doit être future pour être publié.");
        }
        if (!event.endTime().isAfter(event.startTime())) {
            throw new EventValidationException("L'heure de fin doit être après l'heure de début.");
        }
        jdbcTemplate.update(
                "UPDATE events SET status = 'PUBLIE', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND teacher_id = ?",
                eventId,
                teacherId
        );
        return requireEvent(eventId);
    }

    @Transactional
    public EventResponse cancel(Long eventId, Long teacherId) {
        EventResponse event = requireOwnedEvent(eventId, teacherId);
        if ("ANNULE".equals(event.status())) {
            throw new EventConflictException("Cet événement est déjà annulé.");
        }
        jdbcTemplate.update(
                "UPDATE events SET status = 'ANNULE', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND teacher_id = ?",
                eventId,
                teacherId
        );
        notifyEventParticipants(eventId, "EVENT_CANCELLED", "Événement annulé",
                "L'événement « " + event.title() + " » a été annulé.");
        logEventAction(teacherId, "EVENT_CANCELLED", eventId, "L'événement a été annulé.");
        return requireEvent(eventId);
    }

    @Transactional
    public EventDeletionResponse delete(Long eventId, Long teacherId) {
        EventResponse event = requireOwnedEvent(eventId, teacherId);
        boolean hasPayments = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM payments p JOIN reservations r ON r.id = p.reservation_id WHERE r.event_id = ?)",
                Boolean.class,
                eventId
        ));
        boolean hasReservations = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM reservations WHERE event_id = ?)",
                Boolean.class,
                eventId
        ));
        if (hasPayments || hasReservations) {
            jdbcTemplate.update(
                    "UPDATE events SET status = 'ANNULE', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    eventId
            );
            notifyEventParticipants(eventId, "EVENT_CANCELLED", "Événement annulé",
                    "L'événement « " + event.title() + " » a été annulé.");
            logEventAction(teacherId, "EVENT_CANCELLED", eventId, "L'événement a été annulé lors de sa suppression.");
            String message = hasPayments
                    ? "L'événement a été annulé et conservé car il possède des paiements."
                    : "L'événement a été annulé et conservé pour préserver l'historique des réservations.";
            return new EventDeletionResponse(false, message, "ANNULE");
        }

        jdbcTemplate.update("DELETE FROM events WHERE id = ? AND teacher_id = ?", eventId, teacherId);
        return new EventDeletionResponse(true, "L'événement a été supprimé.", null);
    }

    @Transactional(readOnly = true)
    public List<EventActionResponse> findActions(Long eventId, Long requesterId) {
        EventResponse event = requireEvent(eventId);
        if (!isPubliclyVisible(event.status()) && !event.teacherId().equals(requesterId)) {
            throw new ResourceNotFoundException("Événement introuvable.");
        }
        return jdbcTemplate.query(
                "SELECT * FROM event_actions WHERE event_id = ? ORDER BY display_order",
                ACTION_ROW_MAPPER,
                eventId
        );
    }

    @Transactional
    public EventActionResponse addAction(Long eventId, Long teacherId, EventActionRequest request) {
        requireOwnedEvent(eventId, teacherId);
        validateActionTimes(request);
        Integer displayOrder = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(display_order), -1) + 1 FROM event_actions WHERE event_id = ?",
                Integer.class,
                eventId
        );
        Long actionId = jdbcTemplate.queryForObject(
                """
                INSERT INTO event_actions (event_id, title, description, action_date, start_time, end_time, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                RETURNING id
                """,
                Long.class,
                eventId,
                request.title().trim(),
                request.description(),
                request.actionDate(),
                request.startTime(),
                request.endTime(),
                displayOrder
        );
        return requireAction(eventId, actionId);
    }

    @Transactional
    public EventActionResponse updateAction(Long eventId, Long actionId, Long teacherId, EventActionRequest request) {
        requireOwnedEvent(eventId, teacherId);
        requireAction(eventId, actionId);
        validateActionTimes(request);
        jdbcTemplate.update(
                """
                UPDATE event_actions
                SET title = ?, description = ?, action_date = ?, start_time = ?, end_time = ?
                WHERE id = ? AND event_id = ?
                """,
                request.title().trim(),
                request.description(),
                request.actionDate(),
                request.startTime(),
                request.endTime(),
                actionId,
                eventId
        );
        return requireAction(eventId, actionId);
    }

    @Transactional
    public void deleteAction(Long eventId, Long actionId, Long teacherId) {
        requireOwnedEvent(eventId, teacherId);
        requireAction(eventId, actionId);
        jdbcTemplate.update("DELETE FROM event_actions WHERE id = ? AND event_id = ?", actionId, eventId);
        normalizeActionOrder(eventId);
    }

    @Transactional
    public List<EventActionResponse> reorderActions(Long eventId, Long teacherId, ReorderEventActionsRequest request) {
        requireOwnedEvent(eventId, teacherId);
        List<Long> currentIds = jdbcTemplate.queryForList(
                "SELECT id FROM event_actions WHERE event_id = ? ORDER BY display_order",
                Long.class,
                eventId
        );
        List<Long> requestedIds = request.actionIds();
        if (requestedIds.size() != currentIds.size() || new HashSet<>(requestedIds).size() != requestedIds.size()
                || !new HashSet<>(requestedIds).equals(new HashSet<>(currentIds))) {
            throw new EventValidationException("La liste doit contenir une seule fois chaque action de cet événement.");
        }
        shiftActionOrders(eventId);
        for (int order = 0; order < requestedIds.size(); order++) {
            jdbcTemplate.update(
                    "UPDATE event_actions SET display_order = ? WHERE id = ? AND event_id = ?",
                    order,
                    requestedIds.get(order),
                    eventId
            );
        }
        return jdbcTemplate.query(
                "SELECT * FROM event_actions WHERE event_id = ? ORDER BY display_order",
                ACTION_ROW_MAPPER,
                eventId
        );
    }

    private void notifyEventParticipants(Long eventId, String type, String title, String message) {
        List<Long> studentIds = jdbcTemplate.queryForList(
                "SELECT DISTINCT student_id FROM reservations WHERE event_id = ? AND status IN ('EN_ATTENTE', 'CONFIRMEE')",
                Long.class,
                eventId
        );
        for (Long studentId : studentIds) {
            jdbcTemplate.update(
                    "INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)",
                    studentId,
                    type,
                    title,
                    message
            );
        }
    }

    private void logEventAction(Long teacherId, String actionType, Long eventId, String description) {
        jdbcTemplate.update(
                "INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?, ?, 'EVENT', ?, ?)",
                teacherId,
                actionType,
                eventId,
                description
        );
    }

    @Transactional(readOnly = true)
    public List<EventParticipantResponse> findParticipants(Long eventId, Long teacherId) {
        requireOwnedEvent(eventId, teacherId);
        return jdbcTemplate.query(
                """
                SELECT r.id AS reservation_id, u.id AS student_id, u.first_name, u.last_name, u.email,
                       r.reservation_date, r.status AS reservation_status, r.number_of_places,
                       r.confirmation_code, p.status AS payment_status
                FROM reservations r
                JOIN users u ON u.id = r.student_id
                LEFT JOIN payments p ON p.reservation_id = r.id
                WHERE r.event_id = ?
                ORDER BY r.reservation_date DESC
                """,
                (resultSet, rowNumber) -> new EventParticipantResponse(
                        resultSet.getLong("reservation_id"),
                        resultSet.getLong("student_id"),
                        resultSet.getString("first_name"),
                        resultSet.getString("last_name"),
                        resultSet.getString("email"),
                        resultSet.getTimestamp("reservation_date").toInstant(),
                        resultSet.getString("reservation_status"),
                        resultSet.getInt("number_of_places"),
                        resultSet.getString("confirmation_code"),
                        resultSet.getString("payment_status")
                ),
                eventId
        );
    }

    @Transactional
    public void removeParticipant(Long eventId, Long studentId, Long teacherId) {
        requireOwnedEvent(eventId, teacherId);
        jdbcTemplate.queryForObject("SELECT id FROM events WHERE id = ? FOR UPDATE", Long.class, eventId);
        List<ReservationToCancel> reservations = jdbcTemplate.query(
                """
                SELECT r.id, r.number_of_places, p.status AS payment_status
                FROM reservations r
                JOIN users u ON u.id = r.student_id AND u.role = 'ETUDIANT'
                LEFT JOIN payments p ON p.reservation_id = r.id
                WHERE r.event_id = ? AND r.student_id = ? AND r.status IN ('EN_ATTENTE', 'CONFIRMEE')
                FOR UPDATE OF r
                """,
                (resultSet, rowNumber) -> new ReservationToCancel(
                        resultSet.getLong("id"),
                        resultSet.getInt("number_of_places"),
                        resultSet.getString("payment_status")
                ),
                eventId,
                studentId
        );
        if (reservations.isEmpty()) {
            throw new ResourceNotFoundException("Aucune réservation active de cet étudiant pour cet événement.");
        }
        for (ReservationToCancel reservation : reservations) {
            if (reservation.paymentStatus() != null
                    && !Set.of("ECHOUE", "REMBOURSE").contains(reservation.paymentStatus())) {
                throw new EventConflictException("Impossible de retirer cet étudiant tant qu'un paiement est en attente ou payé.");
            }
        }
        int releasedPlaces = reservations.stream().mapToInt(ReservationToCancel::numberOfPlaces).sum();
        for (ReservationToCancel reservation : reservations) {
            jdbcTemplate.update(
                    "UPDATE reservations SET status = 'ANNULEE' WHERE id = ? AND event_id = ?",
                    reservation.id(),
                    eventId
            );
        }
        jdbcTemplate.update(
                """
                UPDATE events
                SET available_places = LEAST(capacity, available_places + ?),
                    status = CASE WHEN status = 'COMPLET' THEN 'PUBLIE' ELSE status END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                releasedPlaces,
                eventId
        );
        jdbcTemplate.update(
                "INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)",
                studentId,
                "STUDENT_REMOVED",
                "Inscription retirée",
                "Votre inscription à l'événement « " + requireEvent(eventId).title() + " » a été retirée par l'enseignant."
        );
        logEventAction(teacherId, "STUDENT_REMOVED", eventId,
                "L'étudiant " + studentId + " a été retiré de l'événement.");
    }

    private EventResponse requireEvent(Long eventId) {
        try {
            return jdbcTemplate.queryForObject(
                    """
                    SELECT e.*, (u.first_name || ' ' || u.last_name) AS teacher_name
                    FROM events e
                    LEFT JOIN users u ON u.id = e.teacher_id
                    WHERE e.id = ?
                    """,
                    EVENT_ROW_MAPPER,
                    eventId
            );
        } catch (EmptyResultDataAccessException exception) {
            throw new ResourceNotFoundException("Événement " + eventId + " introuvable.");
        }
    }

    private EventResponse requireOwnedEvent(Long eventId, Long teacherId) {
        EventResponse event = requireEvent(eventId);
        if (!event.teacherId().equals(teacherId)) {
            throw new ResourceNotFoundException("Événement " + eventId + " introuvable.");
        }
        return event;
    }

    private EventActionResponse requireAction(Long eventId, Long actionId) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT * FROM event_actions WHERE id = ? AND event_id = ?",
                    ACTION_ROW_MAPPER,
                    actionId,
                    eventId
            );
        } catch (EmptyResultDataAccessException exception) {
            throw new ResourceNotFoundException("Action " + actionId + " introuvable pour cet événement.");
        }
    }

    private int activeReservedPlaces(Long eventId) {
        Integer reservedPlaces = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(number_of_places), 0) FROM reservations WHERE event_id = ? AND status IN ('EN_ATTENTE', 'CONFIRMEE')",
                Integer.class,
                eventId
        );
        return reservedPlaces == null ? 0 : reservedPlaces;
    }

    private boolean isPubliclyVisible(String status) {
        return "PUBLIE".equals(status) || "COMPLET".equals(status);
    }

    private void validateEventTimes(EventRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new EventValidationException("L'heure de fin doit être après l'heure de début.");
        }
    }

    private void validateActionTimes(EventActionRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new EventValidationException("L'heure de fin de l'action doit être après l'heure de début.");
        }
    }

    private void normalizeActionOrder(Long eventId) {
        List<Long> actionIds = jdbcTemplate.queryForList(
                "SELECT id FROM event_actions WHERE event_id = ? ORDER BY display_order",
                Long.class,
                eventId
        );
        if (actionIds.isEmpty()) {
            return;
        }
        shiftActionOrders(eventId);
        for (int order = 0; order < actionIds.size(); order++) {
            jdbcTemplate.update(
                    "UPDATE event_actions SET display_order = ? WHERE id = ? AND event_id = ?",
                    order,
                    actionIds.get(order),
                    eventId
            );
        }
    }

    private void shiftActionOrders(Long eventId) {
        Integer maximumOrder = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(display_order), -1) FROM event_actions WHERE event_id = ?",
                Integer.class,
                eventId
        );
        if (maximumOrder != null && maximumOrder >= 0) {
            jdbcTemplate.update(
                    "UPDATE event_actions SET display_order = display_order + ? WHERE event_id = ?",
                    maximumOrder + 1,
                    eventId
            );
        }
    }

    private static EventResponse mapEvent(ResultSet resultSet, int rowNumber) throws SQLException {
        Long teacherId = resultSet.getLong("teacher_id");
        String teacherName = null;
        try {
            teacherName = resultSet.getString("teacher_name");
        } catch (SQLException ignored) {
        }
        EventResponse.TeacherSummary teacher = teacherId != null
                ? new EventResponse.TeacherSummary(teacherId, teacherName != null ? teacherName : ("Enseignant " + teacherId))
                : null;

        return new EventResponse(
                resultSet.getLong("id"),
                resultSet.getString("title"),
                resultSet.getString("description"),
                resultSet.getString("category"),
                resultSet.getObject("event_date", LocalDate.class),
                resultSet.getObject("start_time", LocalTime.class),
                resultSet.getObject("end_time", LocalTime.class),
                resultSet.getString("location"),
                resultSet.getString("image_url"),
                resultSet.getBigDecimal("ticket_price"),
                resultSet.getInt("capacity"),
                resultSet.getInt("available_places"),
                resultSet.getString("status"),
                teacherId,
                teacher,
                List.of(),
                resultSet.getTimestamp("created_at").toInstant(),
                resultSet.getTimestamp("updated_at").toInstant()
        );
    }

    private static EventActionResponse mapAction(ResultSet resultSet, int rowNumber) throws SQLException {
        return new EventActionResponse(
                resultSet.getLong("id"),
                resultSet.getLong("event_id"),
                resultSet.getString("title"),
                resultSet.getString("description"),
                resultSet.getObject("action_date", LocalDate.class),
                resultSet.getObject("start_time", LocalTime.class),
                resultSet.getObject("end_time", LocalTime.class),
                resultSet.getInt("display_order")
        );
    }

    private record ReservationToCancel(Long id, Integer numberOfPlaces, String paymentStatus) {
    }
}
