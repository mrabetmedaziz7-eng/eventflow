package com.iset.events.service;

import com.iset.events.dto.AuditLogResponse;
import com.iset.events.repository.AuditLogRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final JdbcTemplate jdbcTemplate;

    public AuditLogService(AuditLogRepository auditLogRepository, JdbcTemplate jdbcTemplate) {
        this.auditLogRepository = auditLogRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> findAll() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> findMine(Long userId) {
        return auditLogRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> findForTeacher(Long teacherId) {
        return jdbcTemplate.query(
                """
                SELECT DISTINCT al.id, al.user_id, al.action_type, al.entity_type, al.entity_id,
                       al.description, al.created_at
                FROM audit_logs al
                LEFT JOIN reservations r ON al.entity_type = 'RESERVATION' AND al.entity_id = r.id
                LEFT JOIN payments p ON al.entity_type = 'PAYMENT' AND al.entity_id = p.id
                LEFT JOIN reservations payment_reservation ON p.reservation_id = payment_reservation.id
                WHERE (al.entity_type = 'EVENT' AND al.entity_id IN (SELECT id FROM events WHERE teacher_id = ?))
                   OR r.event_id IN (SELECT id FROM events WHERE teacher_id = ?)
                   OR payment_reservation.event_id IN (SELECT id FROM events WHERE teacher_id = ?)
                ORDER BY al.created_at DESC
                """,
                (resultSet, rowNumber) -> new AuditLogResponse(
                        resultSet.getLong("id"),
                        resultSet.getObject("user_id", Long.class),
                        resultSet.getString("action_type"),
                        resultSet.getString("entity_type"),
                        resultSet.getObject("entity_id", Long.class),
                        resultSet.getString("description"),
                        resultSet.getTimestamp("created_at").toInstant()
                ),
                teacherId,
                teacherId,
                teacherId
        );
    }

    private AuditLogResponse toResponse(com.iset.events.entity.AuditLog auditLog) {
        return new AuditLogResponse(
                auditLog.getId(),
                auditLog.getUserId(),
                auditLog.getActionType(),
                auditLog.getEntityType(),
                auditLog.getEntityId(),
                auditLog.getDescription(),
                auditLog.getCreatedAt()
        );
    }
}
