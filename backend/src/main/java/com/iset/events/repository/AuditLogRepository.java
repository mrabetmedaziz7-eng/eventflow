package com.iset.events.repository;

import com.iset.events.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findAllByOrderByCreatedAtDesc();

    List<AuditLog> findAllByUserIdOrderByCreatedAtDesc(Long userId);
}
