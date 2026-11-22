package com.iset.events.service;

import com.iset.events.dto.reservation.PaymentOutcome;
import com.iset.events.dto.reservation.PaymentReceiptResponse;
import com.iset.events.dto.reservation.PaymentResultResponse;
import com.iset.events.dto.reservation.PaymentSimulationRequest;
import com.iset.events.dto.reservation.ReservationRequest;
import com.iset.events.dto.reservation.ReservationResponse;
import com.iset.events.exception.EventValidationException;
import com.iset.events.exception.ReservationConflictException;
import com.iset.events.exception.ResourceNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class ReservationService {

    private static final RowMapper<ReservationResponse> RESERVATION_ROW_MAPPER = ReservationService::mapReservation;

    private final JdbcTemplate jdbcTemplate;
    private final PaymentService paymentService;

    public ReservationService(JdbcTemplate jdbcTemplate, PaymentService paymentService) {
        this.jdbcTemplate = jdbcTemplate;
        this.paymentService = paymentService;
    }

    @Transactional
    public ReservationResponse create(Long studentId, ReservationRequest request) {
        List<Long> activeStudent = jdbcTemplate.query(
                "SELECT id FROM users WHERE id = ? AND role = 'ETUDIANT' AND status = 'ACTIF' FOR SHARE",
                (resultSet, rowNumber) -> resultSet.getLong("id"),
                studentId
        );
        if (activeStudent.isEmpty()) {
            throw new ReservationConflictException("Seul un compte étudiant actif peut réserver.");
        }

        List<LockedEvent> lockedEvents = jdbcTemplate.query(
                """
                SELECT id, title, event_date, end_time, ticket_price, available_places, status, teacher_id, capacity
                FROM events WHERE id = ? FOR UPDATE
                """,
                (resultSet, rowNumber) -> new LockedEvent(
                        resultSet.getLong("id"),
                        resultSet.getString("title"),
                        resultSet.getObject("event_date", LocalDate.class),
                        resultSet.getObject("end_time", LocalTime.class),
                        resultSet.getBigDecimal("ticket_price"),
                        resultSet.getInt("available_places"),
                        resultSet.getString("status"),
                        resultSet.getLong("teacher_id"),
                        resultSet.getInt("capacity")
                ),
                request.eventId()
        );
        if (lockedEvents.isEmpty()) {
            throw new ResourceNotFoundException("Événement " + request.eventId() + " introuvable.");
        }
        LockedEvent event = lockedEvents.get(0);
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        boolean eventEnded = event.eventDate().isBefore(today)
                || (event.eventDate().isEqual(today) && !event.endTime().isAfter(now));
        if ("COMPLET".equals(event.status()) || event.availablePlaces() <= 0 || event.availablePlaces() < request.numberOfPlaces()) {
            throw new ReservationConflictException("Le nombre de places disponibles est insuffisant.");
        }
        if (!"PUBLIE".equals(event.status()) || eventEnded) {
            throw new ReservationConflictException("Cet événement n'est pas publié ou est déjà terminé.");
        }

        Boolean activeReservationExists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM reservations
                    WHERE student_id = ? AND event_id = ? AND status IN ('EN_ATTENTE', 'CONFIRMEE')
                )
                """,
                Boolean.class,
                studentId,
                event.id()
        );
        if (Boolean.TRUE.equals(activeReservationExists)) {
            throw new ReservationConflictException("Cet étudiant possède déjà une réservation active pour cet événement.");
        }

        BigDecimal amount = event.ticketPrice()
                .multiply(BigDecimal.valueOf(request.numberOfPlaces()))
                .setScale(2, RoundingMode.UNNECESSARY);
        String paymentMethod = request.paymentMethod() == null ? null : request.paymentMethod().trim();
        if (amount.signum() > 0 && (paymentMethod == null || paymentMethod.isBlank())) {
            throw new EventValidationException("Le moyen de paiement est obligatoire pour un événement payant.");
        }

        int updatedEvents = jdbcTemplate.update(
                """
                UPDATE events
                SET available_places = available_places - ?,
                    status = CASE WHEN available_places - ? = 0 THEN 'COMPLET' ELSE status END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'PUBLIE' AND available_places >= ?
                """,
                request.numberOfPlaces(),
                request.numberOfPlaces(),
                event.id(),
                request.numberOfPlaces()
        );
        if (updatedEvents != 1) {
            throw new ReservationConflictException("Les places disponibles ont changé. Réessayez la réservation.");
        }

        boolean freeEvent = amount.signum() == 0;
        String reservationStatus = freeEvent ? "CONFIRMEE" : "EN_ATTENTE";
        String confirmationCode = freeEvent ? newConfirmationCode() : null;
        Long reservationId = jdbcTemplate.queryForObject(
                """
                INSERT INTO reservations (student_id, event_id, status, number_of_places, confirmation_code)
                VALUES (?, ?, ?, ?, ?)
                RETURNING id
                """,
                Long.class,
                studentId,
                event.id(),
                reservationStatus,
                request.numberOfPlaces(),
                confirmationCode
        );

        Long paymentId = null;
        if (!freeEvent) {
            paymentId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payments (reservation_id, amount, method, status)
                    VALUES (?, ?, ?, 'EN_ATTENTE')
                    RETURNING id
                    """,
                    Long.class,
                    reservationId,
                    amount,
                    paymentMethod
            );
        }

        if (freeEvent) {
            jdbcTemplate.update(
                    "INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)",
                    event.teacherId(),
                    "STUDENT_REGISTERED",
                    "Nouvelle inscription",
                    "Un étudiant s'est inscrit à l'événement « " + event.title() + " »."
            );
        }

        int remainingPlaces = event.availablePlaces() - request.numberOfPlaces();
        int almostFullThreshold = Math.max(1, (int) Math.ceil(event.capacity() * 0.10));
        if (remainingPlaces <= almostFullThreshold) {
            Boolean alreadyNotified = jdbcTemplate.queryForObject(
                    "SELECT EXISTS (SELECT 1 FROM audit_logs WHERE action_type = 'EVENT_ALMOST_FULL' AND entity_type = 'EVENT' AND entity_id = ?)",
                    Boolean.class,
                    event.id()
            );
            if (!Boolean.TRUE.equals(alreadyNotified)) {
                jdbcTemplate.update(
                        "INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)",
                        event.teacherId(),
                        "EVENT_ALMOST_FULL",
                        "Événement presque complet",
                        "Il ne reste que " + remainingPlaces + " place(s) pour « " + event.title() + " »."
                );
                jdbcTemplate.update(
                        "INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)",
                        studentId,
                        "EVENT_ALMOST_FULL",
                        "EVENT",
                        event.id(),
                        "Le seuil de 10 % de places restantes a été atteint."
                );
            }
        }

        String notificationTitle = freeEvent ? "Réservation confirmée" : "Paiement en attente";
        String notificationMessage = freeEvent
                ? "Votre réservation pour « " + event.title() + " » est confirmée."
                : "Votre réservation pour « " + event.title() + " » attend la confirmation du paiement.";
        jdbcTemplate.update(
                "INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)",
                studentId,
                "RESERVATION_CREATED",
                notificationTitle,
                notificationMessage
        );
        jdbcTemplate.update(
                "INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)",
                studentId,
                "RESERVATION_CREATED",
                "RESERVATION",
                reservationId,
                freeEvent ? "Réservation gratuite confirmée." : "Réservation créée en attente du résultat du paiement."
        );
        return requireReservation(studentId, reservationId);
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> findMine(Long studentId) {
        return jdbcTemplate.query(
                reservationQuery() + " WHERE r.student_id = ? ORDER BY r.reservation_date DESC",
                RESERVATION_ROW_MAPPER,
                studentId
        );
    }

    @Transactional
    public PaymentResultResponse pay(Long studentId, Long reservationId, PaymentSimulationRequest request) {
        List<Long> paymentIds = jdbcTemplate.query(
                """
                SELECT p.id FROM payments p
                JOIN reservations r ON r.id = p.reservation_id
                WHERE r.id = ? AND r.student_id = ? AND r.status = 'EN_ATTENTE'
                """,
                (rs, rn) -> rs.getLong("id"),
                reservationId,
                studentId
        );
        if (paymentIds.isEmpty()) {
            // Check if reservation exists
            Boolean exists = jdbcTemplate.queryForObject(
                    "SELECT EXISTS (SELECT 1 FROM reservations WHERE id = ? AND student_id = ?)",
                    Boolean.class,
                    reservationId,
                    studentId
            );
            if (!Boolean.TRUE.equals(exists)) {
                throw new ResourceNotFoundException("Réservation introuvable.");
            }
            throw new ReservationConflictException("Cette réservation n'est pas en attente de paiement.");
        }
        PaymentSimulationRequest simulationRequest = request != null ? request : new PaymentSimulationRequest(PaymentOutcome.PAYE);
        return paymentService.simulateResult(paymentIds.get(0), studentId, simulationRequest);
    }

    @Transactional
    public ReservationResponse cancel(Long studentId, Long reservationId) {
        List<ReservationToCancelDetail> details = jdbcTemplate.query(
                """
                SELECT r.id, r.event_id, r.status AS reservation_status, r.number_of_places,
                       e.event_date, e.capacity, p.id AS payment_id, p.status AS payment_status,
                       e.title AS event_title
                FROM reservations r
                JOIN events e ON e.id = r.event_id
                LEFT JOIN payments p ON p.reservation_id = r.id
                WHERE r.id = ? AND r.student_id = ?
                FOR UPDATE OF r, e
                """,
                (rs, rn) -> new ReservationToCancelDetail(
                        rs.getLong("id"),
                        rs.getLong("event_id"),
                        rs.getString("reservation_status"),
                        rs.getInt("number_of_places"),
                        rs.getObject("event_date", LocalDate.class),
                        rs.getInt("capacity"),
                        rs.getObject("payment_id", Long.class),
                        rs.getString("payment_status"),
                        rs.getString("event_title")
                ),
                reservationId,
                studentId
        );
        if (details.isEmpty()) {
            throw new ResourceNotFoundException("Réservation introuvable.");
        }
        ReservationToCancelDetail detail = details.get(0);
        if (!"EN_ATTENTE".equals(detail.reservationStatus()) && !"CONFIRMEE".equals(detail.reservationStatus())) {
            throw new ReservationConflictException("Seule une réservation en attente ou confirmée peut être annulée.");
        }
        if (detail.eventDate().isBefore(LocalDate.now())) {
            throw new EventValidationException("Impossible d'annuler une réservation pour un événement déjà passé.");
        }

        jdbcTemplate.update("UPDATE reservations SET status = 'ANNULEE' WHERE id = ?", reservationId);

        if (detail.paymentId() != null) {
            if ("PAYE".equals(detail.paymentStatus())) {
                jdbcTemplate.update("UPDATE payments SET status = 'REMBOURSE' WHERE id = ?", detail.paymentId());
            } else if ("EN_ATTENTE".equals(detail.paymentStatus())) {
                jdbcTemplate.update("UPDATE payments SET status = 'ECHOUE' WHERE id = ?", detail.paymentId());
            }
        }

        jdbcTemplate.update(
                """
                UPDATE events
                SET available_places = LEAST(capacity, available_places + ?),
                    status = CASE WHEN status = 'COMPLET' THEN 'PUBLIE' ELSE status END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                detail.numberOfPlaces(),
                detail.eventId()
        );

        jdbcTemplate.update(
                "INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)",
                studentId,
                "RESERVATION_CANCELLED",
                "Réservation annulée",
                "Votre réservation pour « " + detail.eventTitle() + " » a été annulée et vos places libérées."
        );
        jdbcTemplate.update(
                "INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)",
                studentId,
                "RESERVATION_CANCELLED",
                "RESERVATION",
                reservationId,
                "L'étudiant a annulé sa réservation."
        );

        return requireReservation(studentId, reservationId);
    }

    @Transactional(readOnly = true)
    public PaymentReceiptResponse getTicket(Long studentId, Long reservationId) {
        List<PaymentReceiptResponse> tickets = jdbcTemplate.query(
                """
                SELECT COALESCE(p.id, 0) AS payment_id, r.id AS reservation_id, e.title AS event_title, e.event_date,
                       e.location, u.first_name || ' ' || u.last_name AS student_name,
                       COALESCE(p.amount, 0.00) AS amount,
                       COALESCE(p.method, 'GRATUIT') AS method,
                       COALESCE(p.reference, 'N/A') AS reference,
                       COALESCE(p.payment_date, r.reservation_date) AS payment_date,
                       r.confirmation_code
                FROM reservations r
                JOIN events e ON e.id = r.event_id
                JOIN users u ON u.id = r.student_id
                LEFT JOIN payments p ON p.reservation_id = r.id
                WHERE r.id = ? AND r.student_id = ? AND r.status = 'CONFIRMEE'
                """,
                (resultSet, rowNumber) -> new PaymentReceiptResponse(
                        resultSet.getLong("payment_id"),
                        resultSet.getLong("reservation_id"),
                        resultSet.getString("event_title"),
                        resultSet.getObject("event_date", LocalDate.class),
                        resultSet.getString("location"),
                        resultSet.getString("student_name"),
                        resultSet.getBigDecimal("amount"),
                        resultSet.getString("method"),
                        resultSet.getString("reference"),
                        resultSet.getTimestamp("payment_date").toInstant(),
                        resultSet.getString("confirmation_code"),
                        Instant.now()
                ),
                reservationId,
                studentId
        );
        if (tickets.isEmpty()) {
            throw new ResourceNotFoundException("Ticket introuvable ou réservation non confirmée.");
        }
        return tickets.get(0);
    }

    private ReservationResponse requireReservation(Long studentId, Long reservationId) {
        List<ReservationResponse> reservations = jdbcTemplate.query(
                reservationQuery() + " WHERE r.student_id = ? AND r.id = ?",
                RESERVATION_ROW_MAPPER,
                studentId,
                reservationId
        );
        if (reservations.isEmpty()) {
            throw new ResourceNotFoundException("Réservation introuvable.");
        }
        return reservations.get(0);
    }

    private String reservationQuery() {
        return """
                SELECT r.id, r.event_id, e.title AS event_title, r.number_of_places,
                       COALESCE(p.amount, 0.00) AS amount, r.status, r.confirmation_code,
                       p.id AS payment_id, p.status AS payment_status, r.reservation_date
                FROM reservations r
                JOIN events e ON e.id = r.event_id
                LEFT JOIN payments p ON p.reservation_id = r.id
                """;
    }

    private static ReservationResponse mapReservation(ResultSet resultSet, int rowNumber) throws SQLException {
        long paymentIdValue = resultSet.getLong("payment_id");
        Long paymentId = resultSet.wasNull() ? null : paymentIdValue;
        return new ReservationResponse(
                resultSet.getLong("id"),
                resultSet.getLong("event_id"),
                resultSet.getString("event_title"),
                resultSet.getInt("number_of_places"),
                resultSet.getBigDecimal("amount"),
                resultSet.getString("status"),
                resultSet.getString("confirmation_code"),
                paymentId,
                resultSet.getString("payment_status"),
                resultSet.getTimestamp("reservation_date").toInstant()
        );
    }

    private String newConfirmationCode() {
        return "EVT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT);
    }

    private record LockedEvent(
            Long id,
            String title,
            LocalDate eventDate,
            LocalTime endTime,
            BigDecimal ticketPrice,
            Integer availablePlaces,
            String status,
            Long teacherId,
            Integer capacity
    ) {
    }

    private record ReservationToCancelDetail(
            Long id,
            Long eventId,
            String reservationStatus,
            Integer numberOfPlaces,
            LocalDate eventDate,
            Integer capacity,
            Long paymentId,
            String paymentStatus,
            String eventTitle
    ) {
    }
}
