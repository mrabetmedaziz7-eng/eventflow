package com.iset.events.controller;

import com.iset.events.dto.reservation.PaymentReceiptResponse;
import com.iset.events.dto.reservation.PaymentResultResponse;
import com.iset.events.dto.reservation.PaymentSimulationRequest;
import com.iset.events.dto.reservation.ReservationRequest;
import com.iset.events.dto.reservation.ReservationResponse;
import com.iset.events.service.ReservationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @PostMapping
    public ResponseEntity<ReservationResponse> create(
            @Valid @RequestBody ReservationRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservationService.create(currentUserId(authentication), request));
    }

    @GetMapping({"/me", "/mine"})
    public List<ReservationResponse> findMine(Authentication authentication) {
        return reservationService.findMine(currentUserId(authentication));
    }

    @PostMapping("/{reservationId}/pay")
    public PaymentResultResponse pay(
            @PathVariable Long reservationId,
            @RequestBody(required = false) PaymentSimulationRequest request,
            Authentication authentication
    ) {
        return reservationService.pay(currentUserId(authentication), reservationId, request);
    }

    @PostMapping("/{reservationId}/cancel")
    public ReservationResponse cancel(
            @PathVariable Long reservationId,
            Authentication authentication
    ) {
        return reservationService.cancel(currentUserId(authentication), reservationId);
    }

    @GetMapping("/{reservationId}/ticket")
    public PaymentReceiptResponse getTicket(
            @PathVariable Long reservationId,
            Authentication authentication
    ) {
        return reservationService.getTicket(currentUserId(authentication), reservationId);
    }

    private Long currentUserId(Authentication authentication) {
        return Long.valueOf(authentication.getName());
    }
}
