package com.bikersportal.payment;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {
    private Long userId;
    private Long rentalId;

    @NotNull
    @Positive
    private BigDecimal amount;

    @Builder.Default
    private String currency = "INR";

    @Builder.Default
    private String type = "RENTAL";
}
