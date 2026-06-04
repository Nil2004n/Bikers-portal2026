package com.bikersportal.payment;

import com.bikersportal.exception.PaymentException;
import com.bikersportal.external.InsuranceClient;
import com.bikersportal.external.PaymentGatewayClient;
import com.bikersportal.external.PaymentGatewayResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentGatewayClient paymentGatewayClient;
    private final InsuranceClient insuranceClient;

    @Transactional
    public PaymentResponse processPayment(PaymentRequest req) {
        if (req == null || req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }
        try {
            PaymentGatewayResponse charge = paymentGatewayClient.charge(req).block();
            if (charge == null || !"SUCCESS".equalsIgnoreCase(charge.getStatus())) {
                throw new PaymentException("Payment failed at gateway");
            }

            if ("INSURANCE".equalsIgnoreCase(req.getType())) {
                try {
                    insuranceClient.issue(req).block();
                } catch (Exception ex) {
                    log.warn("Insurance issuance failed but payment succeeded: {}", ex.getMessage());
                }
            }

            return PaymentResponse.builder()
                    .paymentId(charge.getTransactionId() != null ? charge.getTransactionId() : UUID.randomUUID().toString())
                    .status("SUCCESS")
                    .amount(charge.getAmount() != null ? charge.getAmount() : req.getAmount())
                    .message(charge.getMessage() != null ? charge.getMessage() : "Payment processed")
                    .build();
        } catch (PaymentException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Payment pipeline failure", ex);
            throw new PaymentException("Payment service error: " + ex.getMessage());
        }
    }

    public void initiatePayment(PaymentRequest req) {
        // Fire-and-forget variant for the rental flow.
        // Errors are logged but never propagated.
        try {
            processPayment(req);
        } catch (Exception ex) {
            log.warn("initiatePayment failed (swallowed): {}", ex.getMessage());
        }
    }
}
