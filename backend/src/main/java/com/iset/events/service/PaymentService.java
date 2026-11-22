package com.iset.events.service;

import com.iset.events.dto.reservation.PaymentOutcome;
import com.iset.events.dto.reservation.PaymentReceiptResponse;
import com.iset.events.dto.reservation.PaymentResultRequest;
import com.iset.events.dto.reservation.PaymentResultResponse;
import com.iset.events.dto.reservation.PaymentSimulationRequest;
import com.iset.events.exception.ReservationConflictException;
import com.iset.events.exception.ResourceNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class PaymentService {

    private final JdbcTemplate jdbcTemplate;

    public PaymentService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public PaymentResultResponse recordResult(Long paymentId, PaymentResultRequest request) {
        return recordResult(paymentId, request, null);
    }

    private PaymentResultResponse recordResult(Long paymentId, PaymentResultRequest request, String methodOverride) {
        List<LockedPayment> payments = jdbcTemplate.query(
                """
                SELECT p.id AS payment_id, p.status AS payment_status, p.amount,
                       p.method AS payment_method, p.reference, p.payment_date,
                       r.id AS reservation_id, r.event_id, r.student_id,
                       r.status AS reservation_status, r.number_of_places, r.confirmation_code,
                       e.teacher_id, e.title AS event_title
                FROM payments p
                JOIN reservations r ON r.id = p.reservation_id
                JOIN events e ON e.id = r.event_id
                WHERE p.id = ?
                FOR UPDATE OF p, r, e
                """,
                PaymentService::mapLockedPayment,
                paymentId
        );
        if (payments.isEmpty()) {
            throw new ResourceNotFoundException("Paiement " + paymentId + " introuvable.");
        }
        LockedPayment payment = payments.get(0);
        String targetPaymentStatus = request.status().name();
        String targetReservationStatus = request.status() == PaymentOutcome.PAYE ? "CONFIRMEE" : "ANNULEE";
        if (targetPaymentStatus.equals(payment.paymentStatus())
                && targetReservationStatus.equals(payment.reservationStatus())) {
            return response(payment, targetPaymentStatus, targetReservationStatus, payment.confirmationCode(),
                    payment.paymentMethod(), payment.reference(), payment.paymentDate());
        }
        if (!"EN_ATTENTE".equals(payment.paymentStatus()) || !"EN_ATTENTE".equals(payment.reservationStatus())) {
            throw new ReservationConflictException("Ce paiement a déjà reçu un résultat différent ou la réservation n'est plus en attente.");
        }

        String confirmationCode = payment.confirmationCode();
        if (request.status() == PaymentOutcome.PAYE) {
            confirmationCode = newConfirmationCode();
            jdbcTemplate.update(
                    "UPDATE payments SET status = 'PAYE', payment_date = CURRENT_TIMESTAMP, reference = COALESCE(?, reference), method = COALESCE(?, method) WHERE id = ?",
                    request.reference(),
                    methodOverride,
                    paymentId
            );
            jdbcTemplate.update(
                    "UPDATE reservations SET status = 'CONFIRMEE', confirmation_code = ? WHERE id = ? AND status = 'EN_ATTENTE'",
                    confirmationCode,
                    payment.reservationId()
            );
            jdbcTemplate.update(
                    "INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)",
                    payment.studentId(),
                    "PAYMENT_SUCCEEDED",
                    "Paiement confirmé",
                    "Votre paiement est confirmé. Code de réservation : " + confirmationCode + "."
            );
            jdbcTemplate.update(
                    "INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)",
                    payment.teacherId(),
                    "STUDENT_REGISTERED",
                    "Nouvelle inscription",
                    "Un étudiant a confirmé son inscription à l'événement « " + payment.eventTitle() + " »."
            );
            jdbcTemplate.update(
                    "INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)",
                    payment.studentId(),
                    "PAYMENT_SUCCEEDED",
                    "PAYMENT",
                    paymentId,
                    "Le paiement a été confirmé par le callback de paiement."
            );
        } else {
            jdbcTemplate.update(
                    "UPDATE payments SET status = 'ECHOUE', payment_date = CURRENT_TIMESTAMP, reference = COALESCE(?, reference), method = COALESCE(?, method) WHERE id = ?",
                    request.reference(),
                    methodOverride,
                    paymentId
            );
            jdbcTemplate.update(
                    "UPDATE reservations SET status = 'ANNULEE' WHERE id = ? AND status = 'EN_ATTENTE'",
                    payment.reservationId()
            );
            jdbcTemplate.update(
                    """
                    UPDATE events
                    SET available_places = LEAST(capacity, available_places + ?),
                        status = CASE WHEN status = 'COMPLET' THEN 'PUBLIE' ELSE status END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    payment.numberOfPlaces(),
                    payment.eventId()
            );
            jdbcTemplate.update(
                    "INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)",
                    payment.studentId(),
                    "PAYMENT_FAILED",
                    "Paiement échoué",
                    "Le paiement a échoué. La réservation a été annulée et les places libérées."
            );
            jdbcTemplate.update(
                    "INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)",
                    payment.studentId(),
                    "PAYMENT_FAILED",
                    "PAYMENT",
                    paymentId,
                    "Le paiement a échoué; la réservation a été annulée et ses places libérées."
            );
        }
        String resultReference = request.reference() == null ? payment.reference() : request.reference();
        String resultMethod = methodOverride == null ? payment.paymentMethod() : methodOverride;
        Timestamp resultDate = jdbcTemplate.queryForObject("SELECT payment_date FROM payments WHERE id = ?", Timestamp.class, paymentId);
        return response(payment, targetPaymentStatus, targetReservationStatus, confirmationCode,
                resultMethod, resultReference, resultDate == null ? null : resultDate.toInstant());
    }

    @Transactional
    public PaymentResultResponse simulateResult(Long paymentId, Long studentId, PaymentSimulationRequest request) {
        Boolean owned = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM payments p JOIN reservations r ON r.id = p.reservation_id WHERE p.id = ? AND r.student_id = ?)",
                Boolean.class,
                paymentId,
                studentId
        );
        if (!Boolean.TRUE.equals(owned)) {
            throw new ResourceNotFoundException("Paiement " + paymentId + " introuvable.");
        }
        String reference = "SIM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase(Locale.ROOT);
        return recordResult(paymentId, new PaymentResultRequest(request.status(), reference), "CARTE_SIMULEE");
    }

    @Transactional(readOnly = true)
    public PaymentReceiptResponse findReceipt(Long paymentId, Long studentId) {
        List<PaymentReceiptResponse> receipts = jdbcTemplate.query(
                """
                SELECT p.id AS payment_id, r.id AS reservation_id, e.title AS event_title, e.event_date,
                       e.location, u.first_name || ' ' || u.last_name AS student_name, p.amount,
                       p.method, p.reference, p.payment_date, r.confirmation_code
                FROM payments p
                JOIN reservations r ON r.id = p.reservation_id
                JOIN events e ON e.id = r.event_id
                JOIN users u ON u.id = r.student_id
                WHERE p.id = ? AND r.student_id = ? AND p.status = 'PAYE'
                """,
                (resultSet, rowNumber) -> new PaymentReceiptResponse(
                        resultSet.getLong("payment_id"),
                        resultSet.getLong("reservation_id"),
                        resultSet.getString("event_title"),
                        resultSet.getObject("event_date", java.time.LocalDate.class),
                        resultSet.getString("location"),
                        resultSet.getString("student_name"),
                        resultSet.getBigDecimal("amount"),
                        resultSet.getString("method"),
                        resultSet.getString("reference"),
                        resultSet.getTimestamp("payment_date").toInstant(),
                        resultSet.getString("confirmation_code"),
                        Instant.now()
                ),
                paymentId,
                studentId
        );
        if (receipts.isEmpty()) {
            throw new ResourceNotFoundException("Reçu de paiement introuvable ou paiement non confirmé.");
        }
        return receipts.get(0);
    }

    private PaymentResultResponse response(
            LockedPayment payment,
            String paymentStatus,
            String reservationStatus,
            String confirmationCode,
            String method,
            String reference,
            java.time.Instant paymentDate
    ) {
        return new PaymentResultResponse(
                payment.id(),
                payment.reservationId(),
                payment.eventId(),
                paymentStatus,
                reservationStatus,
                confirmationCode,
                payment.amount(),
                method,
                reference,
                paymentDate
        );
    }

    private String newConfirmationCode() {
        return "EVT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT);
    }

    private static LockedPayment mapLockedPayment(ResultSet resultSet, int rowNumber) throws SQLException {
        return new LockedPayment(
                resultSet.getLong("payment_id"),
                resultSet.getString("payment_status"),
                resultSet.getBigDecimal("amount"),
                resultSet.getString("payment_method"),
                resultSet.getString("reference"),
                resultSet.getTimestamp("payment_date") == null ? null : resultSet.getTimestamp("payment_date").toInstant(),
                resultSet.getLong("reservation_id"),
                resultSet.getLong("event_id"),
                resultSet.getLong("student_id"),
                resultSet.getString("reservation_status"),
                resultSet.getInt("number_of_places"),
                resultSet.getString("confirmation_code"),
                resultSet.getLong("teacher_id"),
                resultSet.getString("event_title")
        );
    }

    private record LockedPayment(
            Long id,
            String paymentStatus,
            BigDecimal amount,
            String paymentMethod,
            String reference,
            java.time.Instant paymentDate,
            Long reservationId,
            Long eventId,
            Long studentId,
            String reservationStatus,
            Integer numberOfPlaces,
            String confirmationCode,
            Long teacherId,
            String eventTitle
    ) {
    }
}
