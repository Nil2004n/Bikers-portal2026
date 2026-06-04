package com.bikersportal.external;

import com.bikersportal.payment.PaymentRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.UUID;

@Component
@Slf4j
public class InsuranceClient {

    private final WebClient webClient;

    public InsuranceClient(WebClient.Builder builder,
                           @Value("${external.insurance-url:https://mock-insurance.example.com}") String insuranceUrl) {
        this.webClient = builder.baseUrl(insuranceUrl).build();
    }

    public Mono<InsuranceResponse> issue(PaymentRequest req) {
        return webClient.post()
                .uri("/issue")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(req)
                .retrieve()
                .bodyToMono(InsuranceResponse.class)
                .timeout(Duration.ofSeconds(10))
                .onErrorResume(ex -> {
                    log.debug("Insurance provider unreachable ({}), returning mock policy", ex.getMessage());
                    return Mono.just(InsuranceResponse.builder()
                            .policyId("MOCK-" + UUID.randomUUID())
                            .status("ISSUED")
                            .message("Mock insurance policy issued")
                            .build());
                });
    }
}
