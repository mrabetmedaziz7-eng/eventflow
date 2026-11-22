package com.iset.events.controller;

import com.iset.events.dto.AuditLogResponse;
import com.iset.events.service.AuditLogService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/teacher/history")
public class TeacherHistoryController {

    private final AuditLogService auditLogService;

    public TeacherHistoryController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<AuditLogResponse> findForTeacher(Authentication authentication) {
        return auditLogService.findForTeacher(Long.valueOf(authentication.getName()));
    }
}
