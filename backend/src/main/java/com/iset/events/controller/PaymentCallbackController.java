package com.iset.events.controller;

import com.iset.events.dto.reservation.PaymentResultRequest;
import com.iset.events.dto.reservation.PaymentResultResponse;
import com.iset.events.dto.reservation.PaymentReceiptResponse;
import com.iset.events.dto.reservation.PaymentSimulationRequest;
import com.iset.events.exception.PaymentCallbackAuthenticationException;
import com.iset.events.exception.PaymentCallbackUnavailableException;
import com.iset.events.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping("/api/payments")
public class PaymentCallbackController {

    private final PaymentService paymentService;
    private final String paymentSecretKey;

    public PaymentCallbackController(
            PaymentService paymentService,
            @Value("${app.payment.secret-key:}") String paymentSecretKey
    ) {
        this.paymentService = paymentService;
        this.paymentSecretKey = paymentSecretKey;
    }

    @PostMapping("/{paymentId}/result")
    public PaymentResultResponse recordResult(
            @PathVariable Long paymentId,
            @RequestHeader(value = "X-Payment-Secret", required = false) String providedSecret,
            @Valid @RequestBody PaymentResultRequest request
    ) {
        verifyCallbackSecret(providedSecret);
        return paymentService.recordResult(paymentId, request);
    }

    @PostMapping("/{paymentId}/simulate")
    public PaymentResultResponse simulate(
            @PathVariable Long paymentId,
            @Valid @RequestBody PaymentSimulationRequest request,
            org.springframework.security.core.Authentication authentication
    ) {
        return paymentService.simulateResult(paymentId, Long.valueOf(authentication.getName()), request);
    }

    @GetMapping("/{paymentId}/receipt")
    public PaymentReceiptResponse receipt(
            @PathVariable Long paymentId,
            org.springframework.security.core.Authentication authentication
    ) {
        return paymentService.findReceipt(paymentId, Long.valueOf(authentication.getName()));
    }

    private void verifyCallbackSecret(String providedSecret) {
        if (paymentSecretKey.isBlank()) {
            throw new PaymentCallbackUnavailableException("Le callback de paiement n'est pas configuré.");
        }
        if (providedSecret == null || !MessageDigest.isEqual(
                paymentSecretKey.getBytes(StandardCharsets.UTF_8),
                providedSecret.getBytes(StandardCharsets.UTF_8)
        )) {
            throw new PaymentCallbackAuthenticationException("Le secret du callback de paiement est invalide.");
        }
    }
}
