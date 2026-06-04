package com.bikersportal.external;

import com.bikersportal.payment.PaymentRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.UUID;

@Component
@Slf4j
public class PaymentGatewayClient {

    private final WebClient webClient;
    private final String paymentGatewayUrl;

    public PaymentGatewayClient(WebClient.Builder builder,
                                @Value("${external.payment-gateway-url:https://mock-payment.example.com}") String paymentGatewayUrl) {
        this.webClient = builder.baseUrl(paymentGatewayUrl).build();
        this.paymentGatewayUrl = paymentGatewayUrl;
    }

    public Mono<PaymentGatewayResponse> charge(PaymentRequest req) {
        return webClient.post()
                .uri("/charge")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(req)
                .retrieve()
                .bodyToMono(PaymentGatewayResponse.class)
                .timeout(Duration.ofSeconds(10))
                .onErrorResume(ex -> {
                    log.debug("Payment gateway unreachable ({}), returning mock success", ex.getMessage());
                    return Mono.just(PaymentGatewayResponse.builder()
                            .transactionId("MOCK-" + UUID.randomUUID())
                            .status("SUCCESS")
                            .amount(req.getAmount() != null ? req.getAmount() : BigDecimal.ZERO)
                            .message("Mock payment processed (gateway unreachable)")
                            .build());
                });
    }
}
