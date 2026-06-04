package com.bikersportal.external;

import com.bikersportal.payment.PaymentRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentGatewayResponse {
    private String transactionId;
    private String status;
    private BigDecimal amount;
    private String message;
}
