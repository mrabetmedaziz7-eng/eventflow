package com.iset.events.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
                errors.putIfAbsent(error.getField(), error.getDefaultMessage())
        );
        return response(HttpStatus.BAD_REQUEST, "Données invalides.", "VALIDATION_ERROR", request.getRequestURI(), Map.of("fields", errors));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(HttpServletRequest request) {
        return response(HttpStatus.UNAUTHORIZED, "Email ou mot de passe invalide.", "INVALID_CREDENTIALS", request.getRequestURI());
    }

    @ExceptionHandler(AccountNotActiveException.class)
    public ResponseEntity<Map<String, Object>> handleInactiveAccount(AccountNotActiveException exception, HttpServletRequest request) {
        return response(HttpStatus.FORBIDDEN, exception.getMessage(), "ACCOUNT_NOT_ACTIVE", request.getRequestURI());
    }

    @ExceptionHandler({RegistrationRoleNotAllowedException.class, PasswordTooLongException.class})
    public ResponseEntity<Map<String, Object>> handleBadRequest(RuntimeException exception, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, exception.getMessage(), "BAD_REQUEST", request.getRequestURI());
    }

    @ExceptionHandler(InvalidAccountRoleException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidAccountRole(InvalidAccountRoleException exception, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, exception.getMessage(), "INVALID_ROLE", request.getRequestURI());
    }

    @ExceptionHandler(InvalidAccountStateException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidAccountState(InvalidAccountStateException exception, HttpServletRequest request) {
        return response(HttpStatus.CONFLICT, exception.getMessage(), "INVALID_STATE", request.getRequestURI());
    }

    @ExceptionHandler(EmailAlreadyRegisteredException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateEmail(EmailAlreadyRegisteredException exception, HttpServletRequest request) {
        return response(HttpStatus.CONFLICT, exception.getMessage(), "EMAIL_ALREADY_EXISTS", request.getRequestURI());
    }

    @ExceptionHandler(LastActiveAdminException.class)
    public ResponseEntity<Map<String, Object>> handleLastActiveAdmin(LastActiveAdminException exception, HttpServletRequest request) {
        return response(HttpStatus.CONFLICT, exception.getMessage(), "LAST_ADMIN_CONFLICT", request.getRequestURI());
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleUserNotFound(UserNotFoundException exception, HttpServletRequest request) {
        return response(HttpStatus.NOT_FOUND, exception.getMessage(), "USER_NOT_FOUND", request.getRequestURI());
    }

    @ExceptionHandler(NotificationNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotificationNotFound(NotificationNotFoundException exception, HttpServletRequest request) {
        return response(HttpStatus.NOT_FOUND, exception.getMessage(), "NOTIFICATION_NOT_FOUND", request.getRequestURI());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(ResourceNotFoundException exception, HttpServletRequest request) {
        return response(HttpStatus.NOT_FOUND, exception.getMessage(), "RESOURCE_NOT_FOUND", request.getRequestURI());
    }

    @ExceptionHandler(EventValidationException.class)
    public ResponseEntity<Map<String, Object>> handleEventValidation(EventValidationException exception, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, exception.getMessage(), "EVENT_VALIDATION_ERROR", request.getRequestURI());
    }

    @ExceptionHandler(EventConflictException.class)
    public ResponseEntity<Map<String, Object>> handleEventConflict(EventConflictException exception, HttpServletRequest request) {
        return response(HttpStatus.CONFLICT, exception.getMessage(), "EVENT_CONFLICT", request.getRequestURI());
    }

    @ExceptionHandler(ReservationConflictException.class)
    public ResponseEntity<Map<String, Object>> handleReservationConflict(ReservationConflictException exception, HttpServletRequest request) {
        String code = "RESERVATION_CONFLICT";
        if (exception.getMessage() != null && exception.getMessage().toLowerCase().contains("places")) {
            code = "INSUFFICIENT_CAPACITY";
        }
        return response(HttpStatus.CONFLICT, exception.getMessage(), code, request.getRequestURI());
    }

    @ExceptionHandler(PaymentCallbackAuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handlePaymentCallbackAuthentication(
            PaymentCallbackAuthenticationException exception,
            HttpServletRequest request
    ) {
        return response(HttpStatus.UNAUTHORIZED, exception.getMessage(), "PAYMENT_AUTH_ERROR", request.getRequestURI());
    }

    @ExceptionHandler(PaymentCallbackUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handlePaymentCallbackUnavailable(
            PaymentCallbackUnavailableException exception,
            HttpServletRequest request
    ) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, exception.getMessage(), "PAYMENT_UNAVAILABLE", request.getRequestURI());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(HttpServletRequest request) {
        return response(HttpStatus.CONFLICT, "Cette opération entre en conflit avec les données existantes.", "DATA_INTEGRITY_VIOLATION", request.getRequestURI());
    }

    private ResponseEntity<Map<String, Object>> response(HttpStatus status, String message, String code, String path) {
        return response(status, message, code, path, Map.of());
    }

    private ResponseEntity<Map<String, Object>> response(
            HttpStatus status,
            String message,
            String code,
            String path,
            Map<String, ?> details
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now());
        body.put("status", status.value());
        body.put("message", message);
        body.put("code", code);
        body.put("path", path);
        body.putAll(details);
        return ResponseEntity.status(status).body(body);
    }
}
